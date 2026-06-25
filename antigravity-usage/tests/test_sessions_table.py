import os
import sqlite3
import pytest
from pathlib import Path
from scanner import scan, init_db, propagate_project_names, parse_settings_change
from dashboard import get_pricing, calc_cost, get_dashboard_data, normalize_model_name

PROJECT_ROOT = Path(__file__).resolve().parent.parent

@pytest.fixture
def mock_db(tmp_path):
    db_path = tmp_path / "test_usage.db"
    conn = sqlite3.connect(db_path)
    init_db(conn)
    conn.close()
    return db_path

def test_cost_calculation_details():
    # Gemini 3.5 Flash pricing: input: 0.075, output: 0.30, cache_read: 0.0075, cache_write: 0.09375
    # Normal input is max(0, inp - cache_write)
    # Let's test standard call
    cost = calc_cost("Gemini 3.5 Flash (Medium)", inp=1000000, out=1000000, cache_read=0, cache_write=0)
    # Expected: (0.075 + 0.30) = $0.375
    assert abs(cost - 0.375) < 1e-6

    # Test with cache creation
    cost_cw = calc_cost("Gemini 3.5 Flash (Medium)", inp=1000000, out=1000000, cache_read=0, cache_write=1000000)
    # Expected: cw_rate * 1M + output * 1M = 0.09375 + 0.30 = $0.39375
    assert abs(cost_cw - 0.39375) < 1e-6

    # Test with cache read
    cost_cr = calc_cost("Gemini 3.5 Flash (Medium)", inp=0, out=1000000, cache_read=1000000, cache_write=0)
    # Expected: cr_rate * 1M + output * 1M = 0.0075 + 0.30 = $0.3075
    assert abs(cost_cr - 0.3075) < 1e-6

def test_model_normalization_and_pricing():
    assert normalize_model_name("gpt-4o-oss") == "GPT-OSS 120B (Medium)"
    assert normalize_model_name("claude-3-5-sonnet") == "Claude Sonnet 4.6 (Thinking)"
    assert normalize_model_name("gemini-1.5-pro") == "Gemini 3.1 Pro (Low)"
    assert normalize_model_name("gemini-1.5-flash-high") == "Gemini 3.5 Flash (High)"
    
    # Confirm they map to PRICING keys correctly
    p_oss = get_pricing(normalize_model_name("gpt-4o-oss"))
    assert p_oss["input"] == 0.60
    assert p_oss["output"] == 0.60

def test_propagate_project_names_hierarchy(mock_db):
    conn = sqlite3.connect(mock_db)
    
    # Insert a nested subagent hierarchy where root has a project but children are Genel Sohbet or empty
    conn.execute("INSERT INTO sessions (session_id, project_name, parent_session_id) VALUES ('root_session', 'my-cool-project', NULL)")
    conn.execute("INSERT INTO sessions (session_id, project_name, parent_session_id) VALUES ('child_session', 'Genel Sohbet', 'root_session')")
    conn.execute("INSERT INTO sessions (session_id, project_name, parent_session_id) VALUES ('grandchild_session', 'Genel Sohbet', 'child_session')")
    conn.commit()
    
    propagate_project_names(conn)
    
    # Check if project name propagated down
    r1 = conn.execute("SELECT project_name FROM sessions WHERE session_id='child_session'").fetchone()
    r2 = conn.execute("SELECT project_name FROM sessions WHERE session_id='grandchild_session'").fetchone()
    
    assert r1[0] == "my-cool-project"
    assert r2[0] == "my-cool-project"
    
    conn.close()
