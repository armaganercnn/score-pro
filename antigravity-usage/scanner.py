"""
scanner.py - Parses Antigravity transcripts and stores session/turn data in SQLite.
"""

import json
import os
import re
import sqlite3
from pathlib import Path
from datetime import datetime

BRAIN_DIR = Path(os.environ.get("ANTIGRAVITY_BRAIN_DIR", "/Users/armaganercan/.gemini/antigravity/brain"))
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))

# Default model if none detected
DEFAULT_MODEL = "Gemini 3.5 Flash (Medium)"

def init_db(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id      TEXT PRIMARY KEY,
            project_name    TEXT,
            first_timestamp TEXT,
            last_timestamp  TEXT,
            git_branch      TEXT,
            total_input_tokens      INTEGER DEFAULT 0,
            total_output_tokens     INTEGER DEFAULT 0,
            total_cache_read        INTEGER DEFAULT 0,
            total_cache_creation    INTEGER DEFAULT 0,
            model           TEXT,
            turn_count      INTEGER DEFAULT 0,
            session_title   TEXT
        );

        CREATE TABLE IF NOT EXISTS turns (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id              TEXT,
            timestamp               TEXT,
            model                   TEXT,
            input_tokens            INTEGER DEFAULT 0,
            output_tokens           INTEGER DEFAULT 0,
            cache_read_tokens       INTEGER DEFAULT 0,
            cache_creation_tokens   INTEGER DEFAULT 0,
            tool_name               TEXT,
            cwd                     TEXT,
            message_id              TEXT
        );

        CREATE TABLE IF NOT EXISTS processed_files (
            path    TEXT PRIMARY KEY,
            mtime   REAL,
            lines   INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
        CREATE INDEX IF NOT EXISTS idx_turns_timestamp ON turns(timestamp);
        CREATE INDEX IF NOT EXISTS idx_sessions_first ON sessions(first_timestamp);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_turns_message_id
        ON turns(message_id) WHERE message_id IS NOT NULL AND message_id != '';
    """)
    # Add session_title column if upgrading from older schema
    try:
        conn.execute("SELECT session_title FROM sessions LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE sessions ADD COLUMN session_title TEXT")
    conn.commit()

def project_name_from_cwd(cwd):
    if not cwd:
        return "Genel Sohbet"
    cwd_clean = cwd.strip('"\' ').replace("\\", "/")
    parts = [p for p in cwd_clean.split("/") if p]
    if not parts or "brain" in parts or ".system_generated" in parts or (".gemini" in parts and "scratch" not in parts):
        return "Genel Sohbet"

    # 1. Check sub-projects under scratch
    if "scratch" in parts:
        idx = parts.index("scratch")
        if idx + 1 < len(parts) and parts[idx + 1] not in (".agents", "worktrees"):
            return parts[idx + 1]

    # 2. Check git repositories
    try:
        curr = Path(cwd_clean)
        while curr and curr != curr.parent and curr != Path.home():
            if curr.name != "scratch" and (curr / ".git").exists():
                return curr.name
            curr = curr.parent
    except Exception:
        pass

    # 3. Fallback
    ignore = {
        "Users", "armaganercan", ".gemini", "antigravity", "scratch", "Projects", 
        "Desktop", "Downloads", "Library", "bin", "config", "projects", "plugins", 
        "globalStorage", "rules", "scripts", ".cagent", ".zshenv", ".github", "User", 
        "caveman", ".", "backend", "frontend-dev", "skills", "skills-disabled"
    }
    for p in reversed(parts):
        if p not in ignore and p not in (".agents", "worktrees", "src", "components", "pages", "assets", "backend", "frontend", "utils", "lib"):
            return p
    return "Genel Sohbet"

def migrate_existing_sessions(conn):
    """Clean up existing project names to follow the new naming format."""
    conn.execute("UPDATE turns SET cwd = REPLACE(cwd, '\"', '') WHERE cwd LIKE '%\"%'")
    conn.execute("UPDATE sessions SET project_name = REPLACE(project_name, '\"', '') WHERE project_name LIKE '%\"%'")
    conn.commit()

    cursor = conn.execute("SELECT DISTINCT session_id, project_name FROM sessions")
    sessions_to_update = []
    for row in cursor.fetchall():
        sid = row[0]
        pname = row[1]
        
        if pname in ("antigravity-scratch", "unknown") or "/" in pname or pname.startswith("brain"):
            turn_cursor = conn.execute("SELECT cwd FROM turns WHERE session_id = ? AND cwd IS NOT NULL AND cwd != '' LIMIT 1", (sid,))
            turn_row = turn_cursor.fetchone()
            new_pname = project_name_from_cwd(turn_row[0]) if turn_row else "Genel Sohbet"
            
            if new_pname != pname:
                sessions_to_update.append((new_pname, sid))
                
    if sessions_to_update:
        conn.executemany("UPDATE sessions SET project_name = ? WHERE session_id = ?", sessions_to_update)
        conn.commit()
        print(f"Migrated {len(sessions_to_update)} sessions to clean project names.")

def estimate_tokens(text):
    if not text:
        return 0
    # ~4 characters per token heuristic
    return max(1, len(text) // 4)

def parse_settings_change(content):
    """Detect model changes from setting change texts."""
    if not content:
        return None
    
    # Extract <USER_SETTINGS_CHANGE> block
    match_block = re.search(r"<USER_SETTINGS_CHANGE>(.*?)</USER_SETTINGS_CHANGE>", content, re.DOTALL)
    text_to_search = match_block.group(1) if match_block else content
    
    # Look for: changed setting `Model Selection` from X to Y
    match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n]+)", text_to_search)
    if match:
        val = match.group(1).strip()
        # Clean up any remaining trailing stuff
        val = re.split(r"\.\s+[A-Z]", val)[0]
        if val.endswith("."):
            val = val[:-1]
        val = val.strip()
        if len(val) < 4 or val.lower() in ("x", "y", "none") or "changed setting" in val.lower():
            return None
        return val
    return None

def extract_paths_from_args(args):
    """Check tool arguments for path-like strings to infer Cwd."""
    if not args:
        return None
    for key in ["Cwd", "SearchPath", "DirectoryPath", "TargetFile", "AbsolutePath"]:
        if key in args and isinstance(args[key], str):
            path_str = args[key]
            while isinstance(path_str, str) and any(path_str.startswith(c) or path_str.endswith(c) for c in ['"', "'", ' ']):
                path_str = path_str.strip('"\' ')
            if not isinstance(path_str, str) or not path_str:
                continue
            # If it's a file path, get parent directory
            p = Path(path_str)
            if p.suffix:
                return str(p.parent).strip('"\' ')
            return str(p).strip('"\' ')
    return None

def extract_session_title(content):
    if not content:
        return "New Conversation"
    # Extract <USER_REQUEST>...</USER_REQUEST>
    match = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", content, re.DOTALL)
    if match:
        text = match.group(1).strip()
    else:
        text = content.strip()
    
    # Take the first line
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return "New Conversation"
    title = lines[0]
    
    # Clean markdown headers, bold, formatting
    title = re.sub(r"^#+\s+", "", title)
    title = re.sub(r"[*`_]", "", title)
    
    if len(title) > 60:
        title = title[:57] + "..."
    return title

def _load_transcript_steps(filepath):
    if not os.path.exists(filepath):
        return []
    steps = []
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    steps.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return steps

def estimate_step_tokens(step):
    content = str(step.get("content") or "")
    thinking = str(step.get("thinking") or "")
    tool_calls = step.get("tool_calls") or []
    tc_str = json.dumps(tool_calls) if tool_calls else ""
    step_text = content
    if thinking:
        step_text += "\n" + thinking
    if tc_str:
        step_text += "\n" + tc_str
    return estimate_tokens(step_text)

def _calc_turn_tokens(idx, last_response_idx, step_tokens):
    SYSTEM_PROMPT_ESTIMATE = 4000
    if last_response_idx == -1:
        t_in = sum(step_tokens[:idx]) + SYSTEM_PROMPT_ESTIMATE
        t_cr = t_in
        t_rd = 0
    else:
        t_rd = sum(step_tokens[:last_response_idx + 1]) + SYSTEM_PROMPT_ESTIMATE
        t_in = sum(step_tokens[last_response_idx + 1:idx])
        t_cr = 0
    return t_in, t_cr, t_rd

def _update_session_cwd_and_model(record, current_cwd, current_model, session_meta):
    content = record.get("content", "")
    detected_model = parse_settings_change(content)
    if detected_model:
        current_model = detected_model
        session_meta["model"] = current_model

    tool_calls = record.get("tool_calls", [])
    for tc in tool_calls:
        inferred = extract_paths_from_args(tc.get("args"))
        if inferred:
            current_cwd = inferred
            det = project_name_from_cwd(current_cwd)
            if det != "Genel Sohbet":
                session_meta["project_name"] = det
    return current_cwd, current_model

def scan_transcript_file(filepath, session_id):
    steps = _load_transcript_steps(filepath)
    if not steps:
        return None, []
    session_meta = {"session_id": session_id, "project_name": "Genel Sohbet", "session_title": "New Conversation", "git_branch": "main", "model": DEFAULT_MODEL, "total_input_tokens": 0, "total_output_tokens": 0, "total_cache_read": 0, "total_cache_creation": 0, "turn_count": 0}
    step_tokens = [estimate_step_tokens(s) for s in steps]
    current_model, current_cwd, first_title, first_ts, last_ts, last_response_idx, turns = DEFAULT_MODEL, str(Path.home()), None, None, None, -1, []
    for idx, rec in enumerate(steps):
        ts = rec.get("created_at")
        first_ts, last_ts = first_ts or ts, ts or last_ts
        current_cwd, current_model = _update_session_cwd_and_model(rec, current_cwd, current_model, session_meta)
        rtype, source, content = rec.get("type"), rec.get("source"), rec.get("content") or ""
        if (rtype == "USER_INPUT" or source == "USER_EXPLICIT") and content.strip():
            first_title = first_title or content
        if rtype in ("PLANNER_RESPONSE", "ASK_QUESTION"):
            t_in, t_cr, t_rd = _calc_turn_tokens(idx, last_response_idx, step_tokens)
            t_out = step_tokens[idx]
            tc = rec.get("tool_calls") or []
            turns.append({
                "session_id": session_id, "timestamp": ts or datetime.utcnow().isoformat() + "Z",
                "model": current_model, "input_tokens": t_in, "output_tokens": t_out,
                "cache_read_tokens": t_rd, "cache_creation_tokens": t_cr,
                "tool_name": tc[0].get("name", "") if tc else "", "cwd": current_cwd,
                "message_id": f"{session_id}_step_{rec.get('step_index', idx)}"
            })
            for k, v in [("total_input_tokens", t_in), ("total_output_tokens", t_out), ("total_cache_read", t_rd), ("total_cache_creation", t_cr)]:
                session_meta[k] += v
            session_meta["turn_count"] += 1
            last_response_idx = idx
    session_meta.update({"first_timestamp": first_ts or datetime.utcnow().isoformat() + "Z", "last_timestamp": last_ts or datetime.utcnow().isoformat() + "Z", "session_title": extract_session_title(first_title)})
    return session_meta, turns


def scan(projects_dir=None):
    """Main scan function called by CLI."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    migrate_existing_sessions(conn)
    print("Scanning Antigravity logs...")

    # Traverse all folders under brain directory
    if not BRAIN_DIR.exists():
        print(f"Error: Antigravity brain directory not found at {BRAIN_DIR}")
        conn.close()
        return

    # Processed files tracking
    processed = {}
    cursor = conn.execute("SELECT path, mtime, lines FROM processed_files")
    for r in cursor.fetchall():
        processed[r[0]] = (r[1], r[2])

    for session_path in BRAIN_DIR.iterdir():
        if not session_path.is_dir() or session_path.name.startswith("."):
            continue

        session_id = session_path.name
        transcript_file = session_path / ".system_generated" / "logs" / "transcript.jsonl"
        if not transcript_file.exists():
            continue

        filepath_str = str(transcript_file)
        mtime = os.path.getmtime(filepath_str)

        # Check if already processed and unmodified
        if filepath_str in processed:
            saved_mtime, saved_lines = processed[filepath_str]
            if saved_mtime == mtime:
                continue

        print(f"Parsing session: {session_id[:8]}...")
        session_meta, turns = scan_transcript_file(transcript_file, session_id)
        if not session_meta:
            continue

        # Save to DB
        # 1. Save Session
        conn.execute("""
            INSERT OR REPLACE INTO sessions (
                session_id, project_name, first_timestamp, last_timestamp, git_branch,
                total_input_tokens, total_output_tokens, total_cache_read, total_cache_creation,
                model, turn_count, session_title
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_meta["session_id"], session_meta["project_name"],
            session_meta["first_timestamp"], session_meta["last_timestamp"],
            session_meta["git_branch"], session_meta["total_input_tokens"],
            session_meta["total_output_tokens"], session_meta["total_cache_read"],
            session_meta["total_cache_creation"], session_meta["model"],
            session_meta["turn_count"], session_meta["session_title"]
        ))

        # 2. Save Turns
        for turn in turns:
            conn.execute("""
                INSERT OR REPLACE INTO turns (
                    session_id, timestamp, model, input_tokens, output_tokens,
                    cache_read_tokens, cache_creation_tokens,
                    tool_name, cwd, message_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                turn["session_id"], turn["timestamp"], turn["model"],
                turn["input_tokens"], turn["output_tokens"],
                turn["cache_read_tokens"], turn["cache_creation_tokens"],
                turn["tool_name"], turn["cwd"], turn["message_id"]
            ))

        # 3. Mark file as processed
        line_count = len(turns)
        conn.execute("INSERT OR REPLACE INTO processed_files (path, mtime, lines) VALUES (?, ?, ?)",
                     (filepath_str, mtime, line_count))

    conn.commit()
    conn.close()
    print("Scan complete.")

if __name__ == "__main__":
    scan()
