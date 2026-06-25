import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from scanner import extract_paths_from_args, project_name_from_cwd, _calc_turn_tokens

def test_extract_paths_from_args_quote_stripping():
    args1 = {"Cwd": '"/Users/armaganercan/antigravity/diagram-studio"'}
    assert extract_paths_from_args(args1) == "/Users/armaganercan/antigravity/diagram-studio"

    args2 = {"DirectoryPath": " '/Users/armaganercan/foo' "}
    assert extract_paths_from_args(args2) == "/Users/armaganercan/foo"

    args3 = {"AbsolutePath": '"/Users/armaganercan/foo/bar.py"'}
    assert extract_paths_from_args(args3) == "/Users/armaganercan/foo"

def test_project_name_from_cwd_scratch_projects():
    path1 = "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/.agents/explorer"
    assert project_name_from_cwd(path1) == "antigravity-usage"

    path2 = "/Users/armaganercan/.gemini/antigravity/scratch/diagram-studio"
    assert project_name_from_cwd(path2) == "diagram-studio"

    path3 = "/Users/armaganercan/antigravity/diagram-studio/.agents/sentinel"
    assert project_name_from_cwd(path3) == "diagram-studio"

def test_project_name_from_cwd_fallbacks():
    path1 = "/Users/armaganercan/.gemini/antigravity/brain/5a79a77f-3401-4ca9"
    assert project_name_from_cwd(path1) == "Genel Sohbet"

    path2 = "/Users/armaganercan/.gemini/antigravity"
    assert project_name_from_cwd(path2) == "Genel Sohbet"

    path3 = "/Users/armaganercan"
    assert project_name_from_cwd(path3) == "Genel Sohbet"

def test_calc_turn_tokens_first_vs_subsequent():
    step_tokens = [10, 20, 30, 40, 50]
    
    t_in, t_cr, t_rd = _calc_turn_tokens(3, -1, step_tokens)
    assert t_in == (10 + 20 + 30) + 4000
    assert t_cr == t_in
    assert t_rd == 0

    t_in, t_cr, t_rd = _calc_turn_tokens(4, 3, step_tokens)
    assert t_rd == (10 + 20 + 30 + 40) + 4000
    assert t_in == 0
    assert t_cr == 0

def test_propagate_project_names():
    import sqlite3
    from scanner import propagate_project_names
    
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE sessions (
            session_id TEXT PRIMARY KEY,
            parent_session_id TEXT,
            project_name TEXT
        )
    """)
    # Setup hierarchy:
    # root1 -> child1 -> grandchild1
    # root2 (Genel Sohbet) -> child2
    conn.execute("INSERT INTO sessions VALUES ('root1', NULL, 'diagram-studio')")
    conn.execute("INSERT INTO sessions VALUES ('child1', 'root1', 'wiki-optimizer')")
    conn.execute("INSERT INTO sessions VALUES ('grandchild1', 'child1', 'sentinel')")
    
    conn.execute("INSERT INTO sessions VALUES ('root2', NULL, 'Genel Sohbet')")
    conn.execute("INSERT INTO sessions VALUES ('child2', 'root2', 'wiki-optimizer')")
    
    conn.commit()
    
    propagate_project_names(conn)
    
    # Assert root1 line propagated
    assert conn.execute("SELECT project_name FROM sessions WHERE session_id='child1'").fetchone()[0] == "diagram-studio"
    assert conn.execute("SELECT project_name FROM sessions WHERE session_id='grandchild1'").fetchone()[0] == "diagram-studio"
    
    # Assert root2 line did not overwrite with Genel Sohbet if we wanted to avoid it, 
    # but based on our logic, it returns Genel Sohbet if root is Genel Sohbet
    assert conn.execute("SELECT project_name FROM sessions WHERE session_id='child2'").fetchone()[0] == "Genel Sohbet"
    
    conn.close()
