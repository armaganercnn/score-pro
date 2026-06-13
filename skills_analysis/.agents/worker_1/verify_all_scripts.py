#!/usr/bin/env python3
import os
import subprocess
import shutil
import tempfile
import sys

def test_guardrail_auditor():
    print("Testing guardrail_auditor.py...")
    script_path = os.path.abspath("guardrail_auditor.py")
    # Create temp dir
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a presentation layer file that imports database
        presentation_dir = os.path.join(tmpdir, "presentation")
        os.makedirs(presentation_dir)
        bad_file = os.path.join(presentation_dir, "views.py")
        with open(bad_file, "w") as f:
            f.write("import sqlalchemy\nimport db\n")
        
        # Run auditor
        res = subprocess.run([sys.executable, script_path, "--path", "."], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 1, f"Expected non-zero exit, got {res.returncode}. Stderr: {res.stderr}. Stdout: {res.stdout}"
        assert "is importing 'sqlalchemy'" in res.stdout, "Expected sqlalchemy violation"
        assert "is importing 'db'" in res.stdout, "Expected db violation"
    print("[+] guardrail_auditor.py passed tests.")

def test_handoff_generator():
    print("Testing handoff_generator.py...")
    script_path = os.path.abspath("handoff_generator.py")
    with tempfile.TemporaryDirectory() as tmpdir:
        res = subprocess.run([sys.executable, script_path, "--dir", ".", "--output", "draft.md"], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 0, f"Expected success exit, got {res.returncode}. Stderr: {res.stderr}"
        assert os.path.exists(os.path.join(tmpdir, "draft.md")), "Expected draft.md to be created"
        with open(os.path.join(tmpdir, "draft.md"), "r") as f:
            content = f.read()
            assert "# Handoff Report" in content
            assert "## 1. Observation" in content
            assert "## 2. Logic Chain" in content
    print("[+] handoff_generator.py passed tests.")

def test_complexity_analyser():
    print("Testing complexity_analyser.py...")
    script_path = os.path.abspath("complexity_analyser.py")
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a function that is too long and complex
        file_path = os.path.join(tmpdir, "complex.py")
        with open(file_path, "w") as f:
            f.write("def complex_fn(x):\n")
            # Create high complexity with many ifs
            for i in range(12):
                f.write(f"    if x == {i}:\n        print(x)\n")
        
        # Run analyser
        res = subprocess.run([sys.executable, script_path, "--path", ".", "--max-complexity", "5"], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 1, f"Expected non-zero exit, got {res.returncode}. Stderr: {res.stderr}"
        assert "complexity 13 > 5" in res.stdout or "complexity" in res.stdout, "Expected complexity violation"
    print("[+] complexity_analyser.py passed tests.")

def test_test_runner_checker():
    print("Testing test_runner_checker.py...")
    script_path = os.path.abspath("test_runner_checker.py")
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create source file and a test file without assertion
        with open(os.path.join(tmpdir, "app.py"), "w") as f:
            f.write("def hello():\n    return 42\n")
        with open(os.path.join(tmpdir, "test_app.py"), "w") as f:
            f.write("def test_hello():\n    x = 42\n")
        
        res = subprocess.run([sys.executable, script_path, "--path", "."], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 1, f"Expected non-zero exit due to empty test file, got {res.returncode}. Stderr: {res.stderr}"
        assert "Test files with zero assertions detected" in res.stdout, "Expected empty test warning"
    print("[+] test_runner_checker.py passed tests.")

def test_security_scanner():
    print("Testing security_scanner.py...")
    script_path = os.path.abspath("security_scanner.py")
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create file with secret and eval
        with open(os.path.join(tmpdir, "unsafe.py"), "w") as f:
            f.write("super_secret_token = \"xoxb-123456789012-123456789012-123456789012-abcdef1234567890abcdef1234567890\"\n")
            f.write("eval('print(1)')\n")
            f.write("import subprocess\nsubprocess.run('ls', shell=True)\n")
        
        res = subprocess.run([sys.executable, script_path, "--path", "."], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 1, f"Expected non-zero exit, got {res.returncode}. Stderr: {res.stderr}"
        assert "Potential Slack Token" in res.stdout, "Expected slack token finding"
        assert "Use of eval() is dangerous" in res.stdout, "Expected eval finding"
        assert "subprocess call with shell=True" in res.stdout, "Expected subprocess finding"

        # Test requirements check
        with open(os.path.join(tmpdir, "requirements.txt"), "w") as f:
            f.write("flask==2.1.0\n")
        res = subprocess.run([sys.executable, script_path, "--path", "."], cwd=tmpdir, capture_output=True, text=True)
        assert res.returncode == 1, f"Expected non-zero exit, got {res.returncode}. Stderr: {res.stderr}"
        assert "vulnerable dependency 'flask==2.1.0'" in res.stdout, "Expected Flask vulnerability finding"
    print("[+] security_scanner.py passed tests.")

if __name__ == "__main__":
    print("Starting verification of all helper scripts...")
    test_guardrail_auditor()
    test_handoff_generator()
    test_complexity_analyser()
    test_test_runner_checker()
    test_security_scanner()
    print("[+] All helper scripts verified successfully!")
