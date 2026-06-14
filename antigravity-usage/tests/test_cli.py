import os
import sys
import subprocess
import pytest
from pathlib import Path
from datetime import date

# Find project root (where cli.py is located)
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
    
    return {
        "brain_dir": temp_brain_dir,
        "db_path": temp_db_path,
        "env": env
    }

def test_scan_creates_database(test_env):
    db_path = test_env["db_path"]
    env = test_env["env"]
    
    # Verify DB does not exist yet
    assert not db_path.exists()
    
    # Run scan
    res = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "scan"],
        env=env,
        capture_output=True,
        text=True
    )
    
    # Verify exit code and output
    assert res.returncode == 0
    assert "Parsing session" in res.stdout
    
    # Verify DB path was created
    assert db_path.exists()

def test_today_output(test_env):
    db_path = test_env["db_path"]
    env = test_env["env"]
    
    # Run scan first to populate database
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "scan"],
        env=env,
        capture_output=True
    )
    
    # Run today
    res = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "today"],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert res.returncode == 0
    assert "Today's Usage Summary" in res.stdout
    assert "Active Sessions:" in res.stdout
    assert "Model" in res.stdout
    assert "TOTAL" in res.stdout

def test_week_output(test_env):
    env = test_env["env"]
    
    # Run scan first to populate database
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "scan"],
        env=env,
        capture_output=True
    )
    
    # Run week
    res = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "week"],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert res.returncode == 0
    assert "Last 7 Days Usage Summary" in res.stdout
    assert "Date & Model" in res.stdout
    assert "Subtotal" in res.stdout

def test_stats_output(test_env):
    env = test_env["env"]
    
    # Run scan first to populate database
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "scan"],
        env=env,
        capture_output=True
    )
    
    # Run stats
    res = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "stats"],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert res.returncode == 0
    assert "All-time Antigravity Usage Statistics" in res.stdout
    assert "Total Unique Sessions:" in res.stdout
    assert "TOTAL ALL-TIME" in res.stdout

def test_missing_database_error(test_env):
    db_path = test_env["db_path"]
    env = test_env["env"]
    
    # Make sure database does not exist
    if db_path.exists():
        db_path.unlink()
        
    # Run today (should fail since DB doesn't exist)
    res = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "cli.py"), "today"],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert res.returncode == 1
    assert "Database not found" in res.stdout or "Database not found" in res.stderr
    assert "Please run: python cli.py scan" in res.stdout or "Please run: python cli.py scan" in res.stderr
