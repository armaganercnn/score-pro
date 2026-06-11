#!/usr/bin/env python3
import sys
import subprocess
import re

def filter_git_diff(output):
    """Filters verbose file contents from git diff, e.g. lock files, SVGs, build artifacts."""
    lines = output.splitlines()
    filtered = []
    skip_file = False
    
    # Files we want to completely omit content changes for
    ignore_patterns = [
        r"package-lock\.json",
        r"yarn\.lock",
        r"pnpm-lock\.yaml",
        r"\.svg$",
        r"\.png$",
        r"\.jpg$",
        r"\.jpeg$",
        r"\.gif$",
        r"\.pdf$",
        r"dist/",
        r"build/",
        r"node_modules/"
    ]
    
    for line in lines:
        if line.startswith("diff --git"):
            # Check if this file should be skipped
            skip_file = False
            for pattern in ignore_patterns:
                if re.search(pattern, line):
                    skip_file = True
                    break
            
            if skip_file:
                filtered.append(f"{line} (Content changes truncated for token optimization)")
                continue
        
        if skip_file:
            # Skip diff detail lines for ignored files
            if line.startswith("---") or line.startswith("+++") or line.startswith("@@") or line.startswith("+") or line.startswith("-") or line.startswith(" "):
                continue
            else:
                skip_file = False # reset if we hit other logs
        
        filtered.append(line)
        
    return "\n".join(filtered)

def filter_logs(output, is_error=False):
    """Filters compiler/test/lint logs, showing only failures/errors and reducing noise."""
    lines = output.splitlines()
    if not is_error:
        # If successful, keep it very brief
        success_indicators = ["success", "succeeded", "pass", "passed", "done", "completed"]
        for line in lines:
            for ind in success_indicators:
                if ind in line.lower() and len(line) < 120:
                    return f"Command executed successfully.\nKey output: {line.strip()}"
        return f"Command executed successfully (Output truncated, {len(lines)} lines)."
        
    # If it failed, filter for critical warnings/errors
    filtered = []
    error_patterns = [
        r"error", r"fail", r"exception", r"critical", r"fatal", r"warning",
        r"at\s+.*:\d+",  # stack trace lines
        r"ValidationError"
    ]
    
    for line in lines:
        for pattern in error_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                filtered.append(line)
                break
                
    if not filtered:
        # Fallback to last 20 lines if no clear errors matched
        return "\n".join(lines[-20:])
        
    return "\n".join(filtered[:50]) # cap at 50 critical lines

def main():
    if len(sys.argv) < 2:
        print("Usage: python clean_runner.py <command> [args...]")
        sys.exit(1)
        
    cmd = sys.argv[1:]
    cmd_str = " ".join(cmd)
    
    try:
        # Run command capturing output
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        stdout = result.stdout
        stderr = result.stderr
        code = result.returncode
        
        # Determine filtering based on command
        if "git" in cmd[0] and "diff" in cmd:
            filtered_out = filter_git_diff(stdout)
            print(filtered_out)
        else:
            if code == 0:
                print(filter_logs(stdout, is_error=False))
            else:
                print(f"--- Command Failed (Exit Code: {code}) ---", file=sys.stderr)
                if stderr:
                    print("Error Output (Stderr):", file=sys.stderr)
                    print(filter_logs(stderr, is_error=True), file=sys.stderr)
                if stdout:
                    print("Standard Output (Stdout):", file=sys.stderr)
                    print(filter_logs(stdout, is_error=True), file=sys.stderr)
                    
        sys.exit(code)
        
    except Exception as e:
        print(f"Error running command '{cmd_str}': {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
