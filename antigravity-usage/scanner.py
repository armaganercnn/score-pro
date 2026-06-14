"""
scanner.py - Parses Antigravity transcripts and stores session/turn data in SQLite.
"""

import json
import os
import re
import sqlite3
from pathlib import Path
from datetime import datetime

BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")
DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

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
            turn_count      INTEGER DEFAULT 0
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
    conn.commit()

def project_name_from_cwd(cwd):
    if not cwd:
        return "unknown"
    parts = cwd.replace("\\", "/").rstrip("/").split("/")
    if len(parts) >= 2:
        return "/".join(parts[-2:])
    return parts[-1] if parts else "unknown"

def estimate_tokens(text):
    if not text:
        return 0
    # ~4 characters per token heuristic
    return max(1, len(text) // 4)

def parse_settings_change(content):
    """Detect model changes from setting change texts."""
    if not content:
        return None
    # Look for: changed setting `Model Selection` from X to Y
    match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`.\n]+)", content)
    if match:
        return match.group(1).strip()
    return None

def extract_paths_from_args(args):
    """Check tool arguments for path-like strings to infer Cwd."""
    if not args:
        return None
    for key in ["Cwd", "SearchPath", "DirectoryPath", "TargetFile", "AbsolutePath"]:
        if key in args and isinstance(args[key], str):
            path_str = args[key]
            # If it's a file path, get parent directory
            p = Path(path_str)
            if p.suffix:
                return str(p.parent)
            return str(p)
    return None

def scan_transcript_file(filepath, session_id):
    """Parses an Antigravity transcript.jsonl file."""
    turns = []
    session_meta = {
        "session_id": session_id,
        "project_name": "antigravity-scratch",
        "first_timestamp": None,
        "last_timestamp": None,
        "git_branch": "main",
        "model": DEFAULT_MODEL,
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "turn_count": 0
    }

    current_model = DEFAULT_MODEL
    current_cwd = str(Path.home())
    last_user_input = ""
    first_ts = None
    last_ts = None

    if not os.path.exists(filepath):
        return None, []

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    line_count = 0
    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue

        line_count += 1
        ts = record.get("created_at")
        if ts:
            if not first_ts:
                first_ts = ts
            last_ts = ts

        # Parse model updates from settings changes
        content = record.get("content", "")
        detected_model = parse_settings_change(content)
        if detected_model:
            current_model = detected_model
            session_meta["model"] = current_model

        # Extract Cwd / project name from tool calls/arguments
        tool_calls = record.get("tool_calls", [])
        if tool_calls:
            for tc in tool_calls:
                args = tc.get("args")
                inferred_path = extract_paths_from_args(args)
                if inferred_path:
                    current_cwd = inferred_path
                    session_meta["project_name"] = project_name_from_cwd(current_cwd)

        # Handle turns
        rtype = record.get("type")
        source = record.get("source")

        if rtype == "USER_INPUT" or source == "USER_EXPLICIT":
            last_user_input += "\n" + content
        elif rtype == "PLANNER_RESPONSE" or source == "MODEL":
            # This is a model response. Create a turn.
            thinking = record.get("thinking", "")
            tc_str = json.dumps(tool_calls) if tool_calls else ""
            response_content = content + "\n" + thinking + "\n" + tc_str

            input_tokens = estimate_tokens(last_user_input)
            output_tokens = estimate_tokens(response_content)

            # Determine primary tool called
            tool_name = ""
            if tool_calls:
                tool_name = tool_calls[0].get("name", "")

            message_id = f"{session_id}_step_{record.get('step_index', idx)}"

            turns.append({
                "session_id": session_id,
                "timestamp": ts or datetime.utcnow().isoformat() + "Z",
                "model": current_model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "tool_name": tool_name,
                "cwd": current_cwd,
                "message_id": message_id
            })

            # Add up tokens
            session_meta["total_input_tokens"] += input_tokens
            session_meta["total_output_tokens"] += output_tokens
            session_meta["turn_count"] += 1

            # Reset user input buffer for the next turn
            last_user_input = ""

    session_meta["first_timestamp"] = first_ts or datetime.utcnow().isoformat() + "Z"
    session_meta["last_timestamp"] = last_ts or datetime.utcnow().isoformat() + "Z"

    return session_meta, turns

def scan(projects_dir=None):
    """Main scan function called by CLI."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

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
                total_input_tokens, total_output_tokens, model, turn_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_meta["session_id"], session_meta["project_name"],
            session_meta["first_timestamp"], session_meta["last_timestamp"],
            session_meta["git_branch"], session_meta["total_input_tokens"],
            session_meta["total_output_tokens"], session_meta["model"],
            session_meta["turn_count"]
        ))

        # 2. Save Turns
        for turn in turns:
            conn.execute("""
                INSERT OR REPLACE INTO turns (
                    session_id, timestamp, model, input_tokens, output_tokens,
                    tool_name, cwd, message_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                turn["session_id"], turn["timestamp"], turn["model"],
                turn["input_tokens"], turn["output_tokens"], turn["tool_name"],
                turn["cwd"], turn["message_id"]
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
