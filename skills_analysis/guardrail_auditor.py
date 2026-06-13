#!/usr/bin/env python3
import os
import ast
import json
import sys
import argparse

DEFAULT_RULES = {
    "forbidden_imports": {
        "presentation": ["db", "database", "sqlalchemy", "psycopg2", "mysql"],
        "ui": ["db", "database", "sqlalchemy", "psycopg2", "mysql"],
        "domain": ["flask", "fastapi", "django", "sqlalchemy", "requests", "ui", "presentation"]
    }
}

class ImportVisitor(ast.NodeVisitor):
    def __init__(self):
        self.imports = []

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append((alias.name, node.lineno))
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            self.imports.append((node.module, node.lineno))
        self.generic_visit(node)

def audit_file(file_path, rules):
    violations = []
    # Normalize path and split into components
    normalized_path = os.path.normpath(file_path)
    parts = normalized_path.split(os.sep)
    
    # Determine which rule keys match the file path components
    matched_keys = []
    for key in rules.get("forbidden_imports", {}):
        if key in parts:
            matched_keys.append(key)
    
    if not matched_keys:
        return violations

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=file_path)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return violations

    visitor = ImportVisitor()
    visitor.visit(tree)

    for imp, lineno in visitor.imports:
        for key in matched_keys:
            forbidden_list = rules["forbidden_imports"][key]
            for forbidden in forbidden_list:
                # Check if the imported module starts with or matches forbidden import
                if imp == forbidden or imp.startswith(forbidden + "."):
                    violations.append({
                        "file": file_path,
                        "line": lineno,
                        "imported": imp,
                        "rule_key": key,
                        "forbidden": forbidden
                    })

    return violations

def main():
    parser = argparse.ArgumentParser(description="Architectural Guardrail Auditor")
    parser.add_argument("--path", default=".", help="Project directory to scan")
    parser.add_argument("--rules", help="Path to JSON file containing architectural rules")
    args = parser.parse_args()

    rules = DEFAULT_RULES
    if args.rules:
        if os.path.exists(args.rules):
            try:
                with open(args.rules, "r") as f:
                    rules = json.load(f)
            except Exception as e:
                print(f"Failed to load rules JSON: {e}")
                sys.exit(1)
        else:
            print(f"Rules file {args.rules} not found. Using default rules.")

    print("Running Architectural Guardrail Auditor...")
    print(f"Rules: {json.dumps(rules, indent=2)}")
    print(f"Scanning directory: {args.path}")

    all_violations = []
    for root, _, files in os.walk(args.path):
        # Skip hidden files and directories (except '.' and '..')
        if any(part.startswith('.') and part not in ['.', '..'] for part in root.split(os.sep)):
            continue
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                violations = audit_file(file_path, rules)
                all_violations.extend(violations)

    if all_violations:
        print("\n[!] Architectural Guardrail Violations Found:")
        for v in all_violations:
            print(f"  {v['file']}:{v['line']} - Domain/Layer '{v['rule_key']}' is importing '{v['imported']}' which is forbidden (matches rule '{v['forbidden']}')")
        sys.exit(1)
    else:
        print("\n[+] No architectural violations found. Guardrails intact.")
        sys.exit(0)

if __name__ == "__main__":
    main()
