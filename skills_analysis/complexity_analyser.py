#!/usr/bin/env python3
import os
import ast
import sys
import argparse

class ComplexityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.functions = []

    def visit_FunctionDef(self, node):
        self._analyze_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        self._analyze_function(node)
        self.generic_visit(node)

    def _analyze_function(self, node):
        complexity = 1
        # Traverse node's children to count decision points
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.ExceptHandler, ast.With, ast.Assert)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.IfExp):
                complexity += 1
            elif isinstance(child, ast.comprehension):
                complexity += 1

        # Calculate line length
        start_line = node.lineno
        end_line = getattr(node, "end_lineno", start_line)
        length = end_line - start_line + 1

        self.functions.append({
            "name": node.name,
            "line": start_line,
            "complexity": complexity,
            "length": length
        })

def analyze_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            tree = ast.parse(content, filename=file_path)
    except Exception as e:
        return None, f"Error parsing: {e}"

    visitor = ComplexityVisitor()
    visitor.visit(tree)
    return visitor.functions, None

def main():
    parser = argparse.ArgumentParser(description="Clean Code & Complexity Analyser")
    parser.add_argument("--path", default=".", help="Directory or file to scan")
    parser.add_argument("--max-complexity", type=int, default=10, help="Maximum allowed cyclomatic complexity")
    parser.add_argument("--max-length", type=int, default=40, help="Maximum allowed lines per function")
    args = parser.parse_args()

    target = os.path.abspath(args.path)
    print("Running Clean Code & Complexity Analyser...")
    print(f"Limits: max-complexity={args.max_complexity}, max-length={args.max_length}")
    print(f"Scanning target: {target}")

    python_files = []
    if os.path.isfile(target):
        if target.endswith(".py"):
            python_files.append(target)
    else:
        for root, _, files in os.walk(target):
            if any(part.startswith('.') and part not in ['.', '..'] for part in root.split(os.sep)):
                continue
            for f in files:
                if f.endswith(".py"):
                    python_files.append(os.path.join(root, f))

    violations = []
    for file_path in python_files:
        funcs, err = analyze_file(file_path)
        if err:
            print(f"[!] {file_path}: {err}")
            continue
        
        for fn in funcs:
            has_violation = False
            reasons = []
            if fn["complexity"] > args.max_complexity:
                has_violation = True
                reasons.append(f"complexity {fn['complexity']} > {args.max_complexity}")
            if fn["length"] > args.max_length:
                has_violation = True
                reasons.append(f"length {fn['length']} lines > {args.max_length}")
            
            if has_violation:
                violations.append({
                    "file": file_path,
                    "name": fn["name"],
                    "line": fn["line"],
                    "reasons": ", ".join(reasons)
                })

    if violations:
        print("\n[!] Complexity Violations Found:")
        for v in violations:
            rel_path = os.path.relpath(v["file"])
            print(f"  {rel_path}:{v['line']} - Function '{v['name']}' violates rules: {v['reasons']}")
        sys.exit(1)
    else:
        print("\n[+] Clean code checks passed. All functions within complexity and size limits.")
        sys.exit(0)

if __name__ == "__main__":
    main()
