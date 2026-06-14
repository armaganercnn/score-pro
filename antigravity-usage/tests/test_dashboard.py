import os
import sys
import time
import socket
import subprocess
import urllib.request
import urllib.error
import json
import pytest
from pathlib import Path
from datetime import date

PROJECT_ROOT = Path(__file__).resolve().parent.parent

@pytest.fixture
def test_env(tmp_path):
    """
    Sets up a temporary test environment:
    - Creates a temporary brain directory and copies mock session.
    - Updates dates in the mock transcript.jsonl to today's date.
    - Creates a temporary DB path.
    - Returns a dict containing paths and env overrides.
    """
    temp_brain_dir = tmp_path / "brain"
    temp_brain_dir.mkdir()
    
    # Destination session path
    dest_session_dir = temp_brain_dir / "mock_session"
    dest_logs_dir = dest_session_dir / ".system_generated" / "logs"
    dest_logs_dir.mkdir(parents=True)
    
    # Read original mock transcript from fixtures
    fixture_transcript = PROJECT_ROOT / "tests" / "fixtures" / "mock_session" / ".system_generated" / "logs" / "transcript.jsonl"
    
    today_str = date.today().isoformat()
    
    lines = []
    with open(fixture_transcript, "r", encoding="utf-8") as f:
        for line in f:
            # Replace placeholder date with today's date
            updated_line = line.replace("2026-06-14", today_str)
            lines.append(updated_line)
            
    # Write updated transcript to temp brain directory
    dest_transcript = dest_logs_dir / "transcript.jsonl"
    with open(dest_transcript, "w", encoding="utf-8") as f:
        f.writelines(lines)
        
    temp_db_path = tmp_path / "usage.db"
    
    # Build environment dictionary
    env = os.environ.copy()
    env["ANTIGRAVITY_BRAIN_DIR"] = str(temp_brain_dir)
    env["ANTIGRAVITY_DB_PATH"] = str(temp_db_path)
    env["BROWSER"] = "true"
    
    return {
        "brain_dir": temp_brain_dir,
        "db_path": temp_db_path,
        "env": env
    }

def get_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

@pytest.fixture
def dashboard_server(test_env):
    env = test_env["env"]
    
    # Run scan first to populate database
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "scan"],
        env=env,
        capture_output=True
    )
    
    port = get_free_port()
    
    # Start the dashboard server in a subprocess
    cmd = [
        sys.executable,
        "-c",
        f"import sys; sys.path.insert(0, '{PROJECT_ROOT}'); import dashboard; dashboard.run_server({port})"
    ]
    
    proc = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for the server to be up
    base_url = f"http://localhost:{port}"
    start_time = time.time()
    up = False
    while time.time() - start_time < 10.0:
        try:
            with urllib.request.urlopen(base_url, timeout=1.0) as response:
                if response.status == 200:
                    up = True
                    break
        except Exception:
            pass
        time.sleep(0.1)
        
    if not up:
        proc.terminate()
        proc.wait()
        stdout, stderr = proc.communicate()
        raise RuntimeError(
            f"Dashboard server failed to start on port {port} within 10 seconds.\n"
            f"stdout: {stdout.decode()}\n"
            f"stderr: {stderr.decode()}"
        )
        
    yield base_url
    
    # Teardown: terminate process
    proc.terminate()
    try:
        proc.wait(timeout=2.0)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()

def test_dashboard_home(dashboard_server):
    url = f"{dashboard_server}/"
    with urllib.request.urlopen(url) as response:
        assert response.status == 200
        html = response.read().decode("utf-8")
        assert "Google Antigravity 2.0" in html
        assert 'data-range="1d"' in html

def test_dashboard_api_data(dashboard_server):
    url = f"{dashboard_server}/api/data"
    with urllib.request.urlopen(url) as response:
        assert response.status == 200
        data = json.loads(response.read().decode("utf-8"))
        assert "all_models" in data
        assert "daily" in data
        assert "projects" in data
        assert "sessions" in data
        assert isinstance(data["all_models"], list)
        assert isinstance(data["daily"], list)
        assert isinstance(data["projects"], list)
        assert isinstance(data["sessions"], list)

def test_dashboard_api_scan(dashboard_server):
    url = f"{dashboard_server}/api/scan"
    with urllib.request.urlopen(url) as response:
        assert response.status == 200
        data = json.loads(response.read().decode("utf-8"))
        assert data.get("success") is True

def test_dashboard_404(dashboard_server):
    url = f"{dashboard_server}/non_existent_path"
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(url)
    assert exc_info.value.code == 404
