#!/usr/bin/env python3
import os
import subprocess
import sys
import argparse

HANDOFF_TEMPLATE = """# Handoff Report - {timestamp}

## 1. Observation
{observation_content}

## 2. Logic Chain
- [ ] Logic Step 1: Based on observation, we need to ...
- [ ] Logic Step 2: Therefore, we changed ...

## 3. Caveats
{caveats_content}

## 4. Conclusion
{conclusion_content}

## 5. Verification Method
{verification_content}
"""

def run_cmd(cmd, cwd=None):
    try:
        res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd)
        if res.returncode == 0:
            return res.stdout.strip()
        return f"Error running '{cmd}': {res.stderr.strip()}"
    except Exception as e:
        return f"Exception executing command '{cmd}': {e}"

def main():
    parser = argparse.ArgumentParser(description="Session Handoff Generator")
    parser.add_argument("--dir", default=".", help="Project directory")
    parser.add_argument("--output", default="handoff_draft.md", help="Output draft file name")
    args = parser.parse_args()

    target_dir = os.path.abspath(args.dir)
    print(f"Generating handoff draft for directory: {target_dir}")

    # Check if git repository
    is_git = False
    git_check = run_cmd("git rev-parse --is-inside-work-tree", cwd=target_dir)
    if "true" in git_check.lower():
        is_git = True

    timestamp = run_cmd("date +'%Y-%m-%dT%H:%M:%S%z'")

    observation_content = ""
    conclusion_content = ""
    caveats_content = "No caveats."
    verification_content = ""

    if is_git:
        print("Git repository detected. Extracting recent changes...")
        # Get status
        status = run_cmd("git status --short", cwd=target_dir)
        # Get recent commits
        recent_commits = run_cmd("git log -n 5 --oneline", cwd=target_dir)
        # Get diff stat
        diff_stat = run_cmd("git diff --stat", cwd=target_dir)

        observation_content += "### Modified and Untracked Files:\n"
        if status:
            observation_content += f"```\n{status}\n```\n"
        else:
            observation_content += "No local modifications.\n"

        if diff_stat:
            observation_content += f"\n### Diff Stat:\n```\n{diff_stat}\n```\n"

        observation_content += f"\n### Recent Commits:\n```\n{recent_commits}\n```\n"
        
        conclusion_content = "### Completed Actions:\n"
        if status:
            conclusion_content += "Implemented changes in files:\n"
            for line in status.splitlines():
                parts = line.strip().split()
                if len(parts) >= 2:
                    conclusion_content += f"- Modified `{parts[-1]}`\n"
        else:
            conclusion_content += "- Codebase is up to date with no local changes.\n"
        
        verification_content = "### Verification Steps:\n1. Check git status to ensure changes are correct.\n2. Run automated test suite: `pytest` or `cargo test` depending on project type."
    else:
        print("Not a git repository. Listing directory contents...")
        files = []
        for root, _, filenames in os.walk(target_dir):
            if any(part.startswith('.') for part in root.split(os.sep)):
                continue
            for f in filenames:
                files.append(os.path.relpath(os.path.join(root, f), target_dir))
        
        observation_content = "### Directory Files:\n" + "\n".join(f"- {f}" for f in files[:20])
        if len(files) > 20:
            observation_content += f"\n... and {len(files) - 20} more files."
        
        conclusion_content = "- Manual check completed. List of files analyzed."
        verification_content = "- Run files manually to verify their functionality."

    content = HANDOFF_TEMPLATE.format(
        timestamp=timestamp,
        observation_content=observation_content,
        caveats_content=caveats_content,
        conclusion_content=conclusion_content,
        verification_content=verification_content
    )

    output_path = os.path.join(target_dir, args.output)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[+] Handoff draft generated successfully at: {output_path}")
    except Exception as e:
        print(f"[-] Failed to write handoff draft: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
