#!/usr/bin/env python3
import os
import re
import sys
import argparse

# Regex patterns for scanning
SECRET_PATTERNS = [
    # Match variables like api_key = "xyz123" with minimum length to avoid false positives
    (r'(?i)(api[-_]?key|secret|password|passwd|private[-_]?key|token|auth[-_]?token|credentials|aws[-_]?key)\s*=\s*[\'"][a-zA-Z0-9_\-\+\/\=\.]{8,}[\'"]', "Potential hardcoded secret/API key/password"),
    # Match AWS Client ID / secrets
    (r'([^A-Z0-9][A-Z0-9]{20}[^A-Z0-9])', "Potential AWS Access Key ID"),
    # Match standard slack token
    (r'xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}', "Potential Slack Token"),
]

INSECURE_FUNCTIONS = [
    (r'\beval\s*\(', "Use of eval() is dangerous"),
    (r'\bexec\s*\(', "Use of exec() is dangerous"),
    (r'subprocess\.(Popen|run|call|check_output)\s*\(.*shell\s*=\s*True', "subprocess call with shell=True"),
    (r'pickle\.loads\s*\(', "Insecure deserialization using pickle.loads()"),
    (r'yaml\.load\s*\([^,]*\)', "Insecure YAML loading. Use yaml.safe_load() instead"),
]

KNOWN_VULNERABLE_PACKAGES = {
    "django": "<4.2.11",
    "flask": "<2.3.0",
    "requests": "<2.31.0",
    "urllib3": "<1.26.17",
    "jinja2": "<3.1.3",
    "pyyaml": "<6.0.1",
}

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception as e:
        return [f"Could not read file {file_path}: {e}"]

    for i, line in enumerate(lines, 1):
        # 1. Scan for secrets
        for pattern, desc in SECRET_PATTERNS:
            if re.search(pattern, line):
                # Don't trigger if it's obviously a mock value or variable name without assignment
                if "placeholder" not in line.lower() and "dummy" not in line.lower() and "your_" not in line.lower():
                    findings.append(f"{file_path}:{i} - {desc}: {line.strip()}")

        # 2. Scan for insecure functions/calls
        for pattern, desc in INSECURE_FUNCTIONS:
            if re.search(pattern, line):
                findings.append(f"{file_path}:{i} - {desc}: {line.strip()}")

    return findings

def parse_requirement_version(line):
    # Match library==version
    match = re.match(r'^([a-zA-Z0-9\-_]+)\s*==\s*([0-9\.]+)', line.strip())
    if match:
        return match.group(1).lower(), match.group(2)
    return None, None

def check_requirements(file_path):
    findings = []
    if not os.path.exists(file_path):
        return findings

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                pkg, ver = parse_requirement_version(line)
                if pkg and pkg in KNOWN_VULNERABLE_PACKAGES:
                    target_ver = KNOWN_VULNERABLE_PACKAGES[pkg]
                    # Simple version comparison helper
                    ver_parts = [int(x) for x in ver.split('.') if x.isdigit()]
                    target_parts = [int(x) for x in target_ver.lstrip('<').split('.') if x.isdigit()]
                    if ver_parts < target_parts:
                        findings.append(f"{file_path}:{i} - Outdated and potentially vulnerable dependency '{pkg}=={ver}'. Upgrade to >= {target_ver.lstrip('<')}")
    except Exception as e:
        print(f"Error reading requirements file: {e}")
    return findings

def main():
    parser = argparse.ArgumentParser(description="Security & Secret Scanner")
    parser.add_argument("--path", default=".", help="Directory or file to scan")
    args = parser.parse_args()

    target = os.path.abspath(args.path)
    print("Running Security & Secret Scanner...")
    print(f"Scanning path: {target}")

    files_to_scan = []
    req_files = []

    if os.path.isfile(target):
        if target.endswith("requirements.txt"):
            req_files.append(target)
        else:
            files_to_scan.append(target)
    else:
        for root, _, files in os.walk(target):
            # Skip hidden folders, virtual environments
            if any((part.startswith('.') and part not in ['.', '..']) or part in ["venv", "env", "node_modules", ".agents"] for part in root.split(os.sep)):
                continue
            for f in files:
                full_path = os.path.join(root, f)
                if f == "requirements.txt":
                    req_files.append(full_path)
                elif f.endswith((".py", ".env", ".json", ".yml", ".yaml", ".ini", ".conf")):
                    files_to_scan.append(full_path)

    all_findings = []

    # Scan code and config files
    for file_path in files_to_scan:
        findings = scan_file(file_path)
        all_findings.extend(findings)

    # Scan dependencies
    for req_file in req_files:
        findings = check_requirements(req_file)
        all_findings.extend(findings)

    if all_findings:
        print("\n[!] Security Auditor Findings:")
        for finding in all_findings:
            print(f"  {finding}")
        sys.exit(1)
    else:
        print("\n[+] No security issues or hardcoded secrets found. Check passed.")
        sys.exit(0)

if __name__ == "__main__":
    main()
