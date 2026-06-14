"""
cli.py - Command-line interface for the Antigravity Multi-Model usage dashboard.
"""

import os
import sys
import sqlite3
from pathlib import Path
from datetime import datetime, date, timedelta

DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))

# Pricing catalog per 1,000,000 tokens
PRICING = {
    "Gemini 3.5 Flash (Medium)":   {"input": 0.075, "output": 0.30, "cache_read": 0.0075, "cache_write": 0.09375},
    "Gemini 3.5 Flash (High)":     {"input": 0.075, "output": 0.30, "cache_read": 0.0075, "cache_write": 0.09375},
    "Gemini 3.5 Flash (Low)":      {"input": 0.075, "output": 0.30, "cache_read": 0.0075, "cache_write": 0.09375},
    "Gemini 3.1 Pro (Low)":        {"input": 1.25,  "output": 5.00, "cache_read": 0.125,  "cache_write": 1.5625},
    "Gemini 3.1 Pro (High)":       {"input": 1.25,  "output": 5.00, "cache_read": 0.125,  "cache_write": 1.5625},
    "Claude Sonnet 4.6 (Thinking)":{"input": 3.00,  "output": 15.00, "cache_read": 0.30,   "cache_write": 3.75},
    "Claude Opus 4.6 (Thinking)":  {"input": 15.00, "output": 75.00, "cache_read": 1.50,   "cache_write": 18.75},
    "GPT-OSS 120B (Medium)":       {"input": 0.60,  "output": 0.60, "cache_read": 0.06,   "cache_write": 0.75},
}

def get_pricing(model):
    if not model:
        return PRICING["Gemini 3.5 Flash (Medium)"]
    if model in PRICING:
        return PRICING[model]
    
    # Substring matching fallback
    m = model.lower()
    if "opus" in m:
        return PRICING["Claude Opus 4.6 (Thinking)"]
    if "sonnet" in m:
        return PRICING["Claude Sonnet 4.6 (Thinking)"]
    if "pro" in m:
        return PRICING["Gemini 3.1 Pro (Low)"]
    if "oss" in m or "gpt" in m:
        return PRICING["GPT-OSS 120B (Medium)"]
    
    return PRICING["Gemini 3.5 Flash (Medium)"]

def calc_cost(model, inp, out, cache_read=0, cache_write=0):
    p = get_pricing(model)
    cr_rate = p.get("cache_read", p["input"] * 0.1)
    cw_rate = p.get("cache_write", p["input"] * 1.25)
    normal_input = max(0, inp - cache_write)
    return (
        (cache_write * cw_rate) +
        (cache_read * cr_rate) +
        (normal_input * p["input"]) +
        (out * p["output"])
    ) / 1_000_000

def fmt(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)

def fmt_cost(c):
    return f"${c:.4f}"

def hr(char="-", width=65):
    print(char * width)

def require_db():
    if not DB_PATH.exists():
        print("Database not found. Please run: python cli.py scan")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_scan():
    from scanner import scan
    scan()

def cmd_today():
    conn = require_db()
    today = date.today().isoformat()

    rows = conn.execute("""
        SELECT
            COALESCE(model, 'unknown') as model_name,
            SUM(input_tokens)          as inp,
            SUM(output_tokens)         as out,
            SUM(cache_read_tokens)     as cread,
            SUM(cache_creation_tokens) as cwrite,
            COUNT(*)                   as turns
        FROM turns
        WHERE substr(timestamp, 1, 10) = ?
        GROUP BY model_name
        ORDER BY inp + out DESC
    """, (today,)).fetchall()

    session_row = conn.execute("""
        SELECT COUNT(DISTINCT session_id) as count
        FROM turns
        WHERE substr(timestamp, 1, 10) = ?
    """, (today,)).fetchone()

    print(f"\nToday's Usage Summary ({today}):")
    hr("=")
    print(f"Active Sessions: {session_row['count']}")
    hr("-")
    
    if not rows:
        print("No usage recorded today.")
        conn.close()
        return

    total_inp = 0
    total_out = 0
    total_turns = 0
    total_cost = 0.0

    print(f"{'Model':<30} | {'Turns':<6} | {'Input':<8} | {'Output':<8} | {'Cost':<8}")
    hr("-")
    for r in rows:
        cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])
        print(f"{r['model_name']:<30} | {r['turns']:<6} | {fmt(r['inp']):<8} | {fmt(r['out']):<8} | {fmt_cost(cost):<8}")
        total_inp += r["inp"]
        total_out += r["out"]
        total_turns += r["turns"]
        total_cost += cost

    hr("=")
    print(f"{'TOTAL':<30} | {total_turns:<6} | {fmt(total_inp):<8} | {fmt(total_out):<8} | {fmt_cost(total_cost):<8}\n")
    conn.close()

def cmd_week():
    conn = require_db()
    start_date = (date.today() - timedelta(days=6)).isoformat()

    rows = conn.execute("""
        SELECT
            substr(timestamp, 1, 10)   as day,
            COALESCE(model, 'unknown') as model_name,
            SUM(input_tokens)          as inp,
            SUM(output_tokens)         as out,
            SUM(cache_read_tokens)     as cread,
            SUM(cache_creation_tokens) as cwrite,
            COUNT(*)                   as turns
        FROM turns
        WHERE substr(timestamp, 1, 10) >= ?
        GROUP BY day, model_name
        ORDER BY day DESC, inp + out DESC
    """, (start_date,)).fetchall()

    print(f"\nLast 7 Days Usage Summary (from {start_date}):")
    hr("=")
    
    if not rows:
        print("No usage recorded in the last 7 days.")
        conn.close()
        return

    current_day = None
    day_inp = 0
    day_out = 0
    day_cost = 0.0

    print(f"{'Date & Model':<35} | {'Turns':<6} | {'Input':<8} | {'Output':<8} | {'Cost':<8}")
    for r in rows:
        if r["day"] != current_day:
            if current_day is not None:
                hr("-")
                print(f"{'  Subtotal':<35} | {'':<6} | {fmt(day_inp):<8} | {fmt(day_out):<8} | {fmt_cost(day_cost):<8}")
                hr("=")
            current_day = r["day"]
            print(f"\n{current_day}:")
            hr("-")
            day_inp = 0
            day_out = 0
            day_cost = 0.0

        cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])
        print(f"  {r['model_name']:<33} | {r['turns']:<6} | {fmt(r['inp']):<8} | {fmt(r['out']):<8} | {fmt_cost(cost):<8}")
        day_inp += r["inp"]
        day_out += r["out"]
        day_cost += cost

    if current_day is not None:
        hr("-")
        print(f"{'  Subtotal':<35} | {'':<6} | {fmt(day_inp):<8} | {fmt(day_out):<8} | {fmt_cost(day_cost):<8}")
        hr("=")
    print()
    conn.close()

def cmd_stats():
    conn = require_db()

    rows = conn.execute("""
        SELECT
            COALESCE(model, 'unknown') as model_name,
            SUM(input_tokens)          as inp,
            SUM(output_tokens)         as out,
            SUM(cache_read_tokens)     as cread,
            SUM(cache_creation_tokens) as cwrite,
            COUNT(*)                   as turns
        FROM turns
        GROUP BY model_name
        ORDER BY inp + out DESC
    """).fetchall()

    sessions = conn.execute("SELECT COUNT(*) as count FROM sessions").fetchone()

    print("\nAll-time Antigravity Usage Statistics:")
    hr("=")
    print(f"Total Unique Sessions: {sessions['count']}")
    hr("-")

    if not rows:
        print("No usage history found.")
        conn.close()
        return

    total_inp = 0
    total_out = 0
    total_turns = 0
    total_cost = 0.0

    print(f"{'Model':<30} | {'Turns':<6} | {'Input':<8} | {'Output':<8} | {'Cost':<8}")
    hr("-")
    for r in rows:
        cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])
        print(f"{r['model_name']:<30} | {r['turns']:<6} | {fmt(r['inp']):<8} | {fmt(r['out']):<8} | {fmt_cost(cost):<8}")
        total_inp += r["inp"]
        total_out += r["out"]
        total_turns += r["turns"]
        total_cost += cost

    hr("=")
    print(f"{'TOTAL ALL-TIME':<30} | {total_turns:<6} | {fmt(total_inp):<8} | {fmt(total_out):<8} | {fmt_cost(total_cost):<8}\n")
    conn.close()

def cmd_dashboard():
    # Make sure database is populated
    from scanner import scan
    scan()
    
    # Run server
    from dashboard import run_server
    run_server()

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python cli.py [scan | today | week | stats | dashboard]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "scan":
        cmd_scan()
    elif cmd == "today":
        cmd_today()
    elif cmd == "week":
        cmd_week()
    elif cmd == "stats":
        cmd_stats()
    elif cmd == "dashboard":
        cmd_dashboard()
    else:
        print(f"Unknown command: {cmd}")
        print("Valid commands: scan, today, week, stats, dashboard")
        sys.exit(1)

if __name__ == "__main__":
    main()
