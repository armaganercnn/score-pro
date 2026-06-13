#!/usr/bin/env python3
import os
import ast
import subprocess
import sys
import argparse

class AssertionVisitor(ast.NodeVisitor):
    def __init__(self):
        self.assertion_count = 0

    def visit_Assert(self, node):
        self.assertion_count += 1
        self.generic_visit(node)

    def visit_Call(self, node):
        # Check for self.assert* calls commonly used in unittest
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "self":
                if node.func.attr.startswith("assert"):
                    self.assertion_count += 1
        self.generic_visit(node)

def count_assertions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=file_path)
        visitor = AssertionVisitor()
        visitor.visit(tree)
        return visitor.assertion_count
    except Exception as e:
        print(f"Error parsing test file {file_path}: {e}")
        return 0

def run_tests(command):
    print(f"Executing test suite using: {command}")
    try:
        res = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print("--- Test Runner Output ---")
        print(res.stdout)
        if res.stderr:
            print("--- Test Runner Errors ---")
            print(res.stderr)
        return res.returncode == 0
    except Exception as e:
        print(f"Failed to execute test command '{command}': {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="TDD Enforcer & Test Auditor")
    parser.add_argument("--path", default=".", help="Root directory of the codebase")
    parser.add_argument("--run", action="store_true", help="Execute the test command (e.g. pytest)")
    parser.add_argument("--cmd", default="pytest", help="Test command to run")
    args = parser.parse_args()

    root_dir = os.path.abspath(args.path)
    print("Running TDD Enforcer...")
    print(f"Target directory: {root_dir}")

    # Gather python files and tests
    src_files = []
    test_files = []
    for root, _, files in os.walk(root_dir):
        # Ignore virtualenvs, hidden files, agents folders
        if any((part.startswith('.') and part not in ['.', '..']) or part in ["venv", "env", "node_modules", ".agents"] for part in root.split(os.sep)):
            continue
        for f in files:
            if f.endswith(".py"):
                full_path = os.path.join(root, f)
                if f.startswith("test_") or f.endswith("_test.py"):
                    test_files.append(full_path)
                else:
                    src_files.append(full_path)

    print(f"Found {len(src_files)} source files and {len(test_files)} test files.")

    # 1. Check if test files contain assertions
    empty_tests = []
    for test_file in test_files:
        assertions = count_assertions(test_file)
        if assertions == 0:
            empty_tests.append(test_file)

    # 2. Check if source files have corresponding test files
    untested_src = []
    for src in src_files:
        src_name = os.path.basename(src)
        expected_test_name1 = "test_" + src_name
        expected_test_name2 = src_name.replace(".py", "_test.py")
        
        has_test = False
        for test in test_files:
            test_name = os.path.basename(test)
            if test_name == expected_test_name1 or test_name == expected_test_name2:
                has_test = True
                break
        
        if not has_test:
            untested_src.append(src)

    # Report results
    failed = False
    if empty_tests:
        print("\n[!] Warning: Test files with zero assertions detected (potential dummy tests):")
        for et in empty_tests:
            print(f"  - {os.path.relpath(et, root_dir)}")
        failed = True

    if untested_src:
        print("\n[!] Warning: Source files missing corresponding test file (e.g. test_foo.py for foo.py):")
        for us in untested_src:
            print(f"  - {os.path.relpath(us, root_dir)}")
        # Note: missing tests doesn't necessarily fail the build, but let's highlight it

    if args.run:
        test_success = run_tests(args.cmd)
        if not test_success:
            print("\n[!] Test suite execution failed.")
            failed = True
        else:
            print("\n[+] Test suite execution succeeded.")

    if failed:
        sys.exit(1)
    else:
        print("\n[+] TDD Enforcer checks passed successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
