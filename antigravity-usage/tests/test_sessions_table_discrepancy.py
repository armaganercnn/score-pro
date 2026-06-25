import os
import sys
import time
import socket
import sqlite3
import subprocess
import urllib.request
import json
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scanner import init_db

def get_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

@pytest.fixture
def custom_test_env(tmp_path):
    temp_db_path = tmp_path / "usage.db"
    
    # Initialize the db schema
    conn = sqlite3.connect(temp_db_path)
    init_db(conn)
    
    # Insert custom sessions with a parent-child hierarchy where parent is older
    # Parent (older than 3 days: 2026-06-15)
    conn.execute("""
        INSERT INTO sessions (
            session_id, project_name, first_timestamp, last_timestamp, git_branch,
            total_input_tokens, total_output_tokens, total_cache_read, total_cache_creation,
            model, turn_count, session_title, parent_session_id
        ) VALUES ('parent-session-long-id-1', 'test-project', '2026-06-15T12:00:00Z', '2026-06-15T12:05:00Z', 'main',
                  1000, 500, 0, 0, 'Gemini 3.5 Flash (Medium)', 2, 'Parent Session', NULL)
    """)
    
    # Child (recent: 2026-06-25)
    conn.execute("""
        INSERT INTO sessions (
            session_id, project_name, first_timestamp, last_timestamp, git_branch,
            total_input_tokens, total_output_tokens, total_cache_read, total_cache_creation,
            model, turn_count, session_title, parent_session_id
        ) VALUES ('child-session-long-id-1', 'test-project', '2026-06-25T15:00:00Z', '2026-06-25T15:10:00Z', 'main',
                  2000, 800, 0, 0, 'Gemini 3.5 Flash (Medium)', 3, 'Child Session', 'parent-session-long-id-1')
    """)
    
    conn.commit()
    conn.close()
    
    env = os.environ.copy()
    env["ANTIGRAVITY_DB_PATH"] = str(temp_db_path)
    env["BROWSER"] = "true"
    
    return {
        "db_path": temp_db_path,
        "env": env
    }

@pytest.fixture
def custom_dashboard_server(custom_test_env):
    env = custom_test_env["env"]
    port = get_free_port()
    
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
        raise RuntimeError(f"Server start failed.\nstdout: {stdout.decode()}\nstderr: {stderr.decode()}")
        
    yield base_url
    
    proc.terminate()
    try:
        proc.wait(timeout=2.0)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()

def test_sessions_table_filtering_discrepancy(custom_dashboard_server):
    url = f"{custom_dashboard_server}/api/data"
    with urllib.request.urlopen(url) as response:
        assert response.status == 200
        data = json.loads(response.read().decode("utf-8"))
        
    sessions = data["sessions"]
    assert len(sessions) == 2
    
    # Replicate the frontend JS filtering logic:
    # Today is mock today (assume maxDate from the session logs is 2026-06-25)
    max_date_str = max(s["last_active_raw"].split(" ")[0] for s in sessions)
    assert max_date_str == "2026-06-25"
    
    # Range is 3 days. CutoffDate: maxDate - (days + 1)
    from datetime import datetime, timedelta
    max_date = datetime.strptime(max_date_str, "%Y-%m-%d")
    cutoff_date = max_date - timedelta(days=3 + 1)
    
    # Filter sessions by model and cutoffDate
    selected_models = {"Gemini 3.5 Flash (Medium)"}
    
    filtered_sessions = []
    for s in sessions:
        if s["model"] not in selected_models:
            continue
        date_part = s["last_active_raw"].split(" ")[0]
        s_date = datetime.strptime(date_part, "%Y-%m-%d")
        if s_date >= cutoff_date:
            filtered_sessions.append(s)
            
    # The child is recent, so it should be in filtered_sessions
    # The parent is old (2026-06-15 < 2026-06-21), so it should not be in filtered_sessions
    assert len(filtered_sessions) == 1
    assert filtered_sessions[0]["session_id_full"] == "child-session-long-id-1"
    
    # Group and link child sessions to parents
    session_map = {}
    for s in sessions:
        s["children"] = []
        session_map[s["session_id_full"]] = s
        
    for s in sessions:
        if s["parent_session_id"] and s["parent_session_id"] in session_map:
            session_map[s["parent_session_id"]]["children"].append(s)
            
    # JS: rootSessions = filteredSessions.filter(s => !s.parent_session_id || !sessionMap[s.parent_session_id])
    root_sessions = []
    for s in filtered_sessions:
        parent_id = s["parent_session_id"]
        if not parent_id or parent_id not in session_map:
            root_sessions.append(s)
            
    # In the bug state, because parent-session-long-id-1 IS in session_map,
    # child-session-long-id-1 is filtered out of root_sessions!
    # Let's assert that the bug occurs:
    assert len(root_sessions) == 0, "Wait, the bug did not occur? It should be 0 because the parent exists in the session map."
    print("Test passed: Sessions Table discrepancy successfully proven!")
