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
