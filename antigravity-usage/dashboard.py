"""
dashboard.py - Local web server and dashboard UI for Antigravity Usage.
"""

import json
import os
import sqlite3
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from datetime import datetime

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

def normalize_model_name(model):
    if not model:
        return "Gemini 3.5 Flash (Medium)"
    m = model.lower()
    if "opus" in m:
        return "Claude Opus 4.6 (Thinking)"
    if "sonnet" in m:
        return "Claude Sonnet 4.6 (Thinking)"
    if "pro" in m:
        if "high" in m:
            return "Gemini 3.1 Pro (High)"
        return "Gemini 3.1 Pro (Low)"
    if "oss" in m or "gpt" in m:
        return "GPT-OSS 120B (Medium)"
    if "flash" in m:
        if "high" in m:
            return "Gemini 3.5 Flash (High)"
        if "low" in m:
            return "Gemini 3.5 Flash (Low)"
        return "Gemini 3.5 Flash (Medium)"
    return "Gemini 3.5 Flash (Medium)"

def get_dashboard_data():
    if not DB_PATH.exists():
        return {"error": "Database not found. Please run a scan first."}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # 1. Fetch all unique models - hardcode standard list to display all
    all_models = [
        "Gemini 3.5 Flash (Medium)",
        "Gemini 3.5 Flash (High)",
        "Gemini 3.5 Flash (Low)",
        "Gemini 3.1 Pro (Low)",
        "Gemini 3.1 Pro (High)",
        "Claude Sonnet 4.6 (Thinking)",
        "Claude Opus 4.6 (Thinking)",
        "GPT-OSS 120B (Medium)"
    ]

    # 2. Daily usage stats
    daily_rows = conn.execute("""
        SELECT 
            substr(timestamp, 1, 10) as day,
            COALESCE(model, 'unknown') as model_name,
            SUM(input_tokens) as inp,
            SUM(output_tokens) as out,
            SUM(cache_read_tokens) as cread,
            SUM(cache_creation_tokens) as cwrite,
            COUNT(*) as turns
        FROM turns
        GROUP BY day, model_name
        ORDER BY day ASC
    """).fetchall()

    daily_data = []
    for r in daily_rows:
        model_name = normalize_model_name(r["model_name"])
        cost = calc_cost(model_name, r["inp"], r["out"], r["cread"], r["cwrite"])
        daily_data.append({
            "day": r["day"],
            "model": model_name,
            "input": r["inp"],
            "output": r["out"],
            "cache_read": r["cread"],
            "cache_creation": r["cwrite"],
            "turns": r["turns"],
            "cost": cost
        })

    # 3. Project-wise usage stats
    project_rows = conn.execute("""
        SELECT 
            COALESCE(project_name, 'unknown') as proj,
            COALESCE(model, 'unknown') as model_name,
            SUM(total_input_tokens) as inp,
            SUM(total_output_tokens) as out,
            SUM(total_cache_read) as cread,
            SUM(total_cache_creation) as cwrite,
            COUNT(*) as session_count
        FROM sessions
        GROUP BY proj, model_name
    """).fetchall()

    project_data = []
    for r in project_rows:
        model_name = normalize_model_name(r["model_name"])
        cost = calc_cost(model_name, r["inp"], r["out"], r["cread"], r["cwrite"])
        project_data.append({
            "project": r["proj"],
            "model": model_name,
            "input": r["inp"],
            "output": r["out"],
            "cache_read": r["cread"],
            "cache_creation": r["cwrite"],
            "sessions": r["session_count"],
            "cost": cost
        })

    # 4. Detailed sessions list
    session_rows = conn.execute("""
        SELECT 
            session_id,
            COALESCE(project_name, 'unknown') as project_name,
            first_timestamp,
            last_timestamp,
            git_branch,
            total_input_tokens,
            total_output_tokens,
            total_cache_read,
            total_cache_creation,
            model,
            turn_count,
            COALESCE(session_title, 'Yeni Konuşma') as session_title
        FROM sessions
        ORDER BY last_timestamp DESC
    """).fetchall()

    sessions_data = []
    for r in session_rows:
        model_name = normalize_model_name(r["model"])
        cost = calc_cost(model_name, r["total_input_tokens"], r["total_output_tokens"], r["total_cache_read"], r["total_cache_creation"])
        
        # Calculate session duration
        duration_min = 0
        try:
            t1 = datetime.fromisoformat(r["first_timestamp"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(r["last_timestamp"].replace("Z", "+00:00"))
            duration_min = round((t2 - t1).total_seconds() / 60, 1)
        except Exception:
            pass

        sessions_data.append({
            "session_id": r["session_id"][:8],
            "project": r["project_name"],
            "title": r["session_title"],
            "branch": r["git_branch"],
            "last_active": r["last_timestamp"][:16].replace("T", " "),
            "duration_min": duration_min,
            "model": model_name,
            "turns": r["turn_count"],
            "input": r["total_input_tokens"],
            "output": r["total_output_tokens"],
            "cache_read": r["total_cache_read"],
            "cache_creation": r["total_cache_creation"],
            "cost": cost
        })

    conn.close()

    return {
        "all_models": all_models,
        "daily": daily_data,
        "projects": project_data,
        "sessions": sessions_data,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
HTML_PAGE = r"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Antigravity 2.0</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --card-bg: #151b2c;
            --card-border: #1f293d;
            --text-main: #9aa0b8;
            --text-bright: #ffffff;
            --text-muted: #5d627a;
            --blue-primary: #38bdf8;
            --blue-active: #3b82f6;
            --blue-bg-muted: rgba(56, 189, 248, 0.05);
            --blue-border: rgba(56, 189, 248, 0.3);
            
            /* Chart colors */
            --color-input: #3b82f6;
            --color-output: #8b5cf6;
            --color-cache-read: #10b981;
            --color-cache-creation: #06b6d4;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg);
            color: var(--text-main);
            font-family: 'Outfit', -apple-system, sans-serif;
            padding-bottom: 30px;
            letter-spacing: 0.2px;
        }

        header {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px 30px 10px 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        header h1 {
            font-size: 22px;
            font-weight: 600;
            color: var(--blue-primary);
            letter-spacing: 0.5px;
        }

        header .right-meta {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 13px;
            color: var(--text-muted);
        }

        .btn-rescan {
            background-color: transparent;
            color: var(--blue-primary);
            border: 1px solid var(--blue-border);
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-rescan:hover {
            background-color: var(--blue-primary);
            color: var(--bg);
            border-color: var(--blue-primary);
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
        }

        .btn-rescan:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        #filter-bar {
            max-width: 1400px;
            margin: 0 auto 15px auto;
            padding: 0 30px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .filter-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .filter-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--text-muted);
            width: 70px;
            letter-spacing: 0.8px;
        }

        .chip-container {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
        }

        .chip {
            background: transparent;
            border: 1px solid var(--card-border);
            color: var(--text-main);
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;
        }

        .chip:hover {
            border-color: var(--text-muted);
            color: var(--text-bright);
        }

        /* Model active state: outline blue, blue text */
        .chip.model-chip.active {
            border-color: var(--blue-primary);
            color: var(--blue-primary);
            background: var(--blue-bg-muted);
        }

        /* Special buttons like All/None and Range active states */
        .chip.btn-all.active {
            background: var(--blue-primary);
            border-color: var(--blue-primary);
            color: var(--bg);
            font-weight: 600;
        }

        .chip.btn-none.active {
            background: var(--text-muted);
            border-color: var(--text-muted);
            color: var(--bg);
            font-weight: 600;
        }

        .chip.range-chip.active {
            background: var(--blue-active);
            border-color: var(--blue-active);
            color: var(--bg);
            font-weight: 600;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px 20px 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }
        @media (max-width: 1200px) {
            .stats-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }

        .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            border-color: var(--text-muted);
        }

        .stat-card .label {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 12px;
            font-weight: 700;
            letter-spacing: 0.8px;
        }

        .stat-card .value {
            font-size: 32px;
            font-weight: 700;
            color: var(--text-bright);
            line-height: 1.1;
        }

        .stat-card .subtext {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 8px;
            font-weight: 500;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: 1.7fr 1.3fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        @media (max-width: 992px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
        }

        .chart-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
        }

        .chart-card.full-width {
            grid-column: 1 / -1;
            margin-bottom: 20px;
        }

        .chart-card h2 {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-main);
            margin-bottom: 16px;
            letter-spacing: 0.8px;
        }

        .chart-container-large {
            position: relative;
            height: 290px;
            width: 100%;
        }

        .chart-container-medium {
            position: relative;
            height: 240px;
            width: 100%;
        }

        .table-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            overflow-x: auto;
        }

        .table-card h2 {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-main);
            margin-bottom: 20px;
            letter-spacing: 0.8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--text-muted);
            padding: 8px 12px;
            border-bottom: 1px solid var(--card-border);
            font-weight: 700;
            letter-spacing: 0.8px;
        }

        td {
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.02);
            font-size: 13px;
            color: var(--text-main);
            vertical-align: middle;
        }

        tr:hover td {
            background-color: rgba(255, 255, 255, 0.01);
            color: var(--text-bright);
        }

        /* Model Badge styling exactly matching screenshot */
        .model-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            border: 1px solid transparent;
        }

        .model-badge-opus {
            background: rgba(255, 122, 89, 0.1);
            border-color: rgba(255, 122, 89, 0.3);
            color: #ff7a59;
        }

        .model-badge-sonnet {
            background: rgba(79, 126, 247, 0.1);
            border-color: rgba(79, 126, 247, 0.3);
            color: #4f7ef7;
        }

        .model-badge-haiku {
            background: rgba(54, 179, 126, 0.1);
            border-color: rgba(54, 179, 126, 0.3);
            color: #36b37e;
        }

        .model-badge-gemini-flash {
            background: rgba(54, 179, 126, 0.1);
            border-color: rgba(54, 179, 126, 0.2);
            color: #36b37e;
        }

        .model-badge-gemini-pro {
            background: rgba(255, 171, 0, 0.1);
            border-color: rgba(255, 171, 0, 0.2);
            color: #ffab00;
        }

        .model-badge-other {
            background: rgba(154, 160, 184, 0.1);
            border-color: rgba(154, 160, 184, 0.2);
            color: #9aa0b8;
        }

        .cost-text {
            color: #36b37e; /* Green cost text */
            font-weight: 500;
            font-family: 'Outfit', -apple-system, sans-serif;
        }

        .mono {
            font-family: 'Outfit', -apple-system, sans-serif;
            font-variant-numeric: tabular-nums;
        }
        
        .session-id {
            font-family: monospace;
            font-size: 12px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>

<header>
    <h1>Google Antigravity 2.0</h1>
    <div class="right-meta">
        <span id="gen-time">Son güncelleme: -</span>
        <span>·</span>
        <span id="countdown">Otomatik yenileme: 30sn</span>
        <button id="rescan" class="btn-rescan" onclick="rescan()">Yeniden Tara</button>
    </div>
</header>

<div id="filter-bar">
    <div class="filter-row">
        <div class="filter-label">Modeller:</div>
        <div class="chip-container" id="model-chips">
            <!-- Dynamic model chips + All/None -->
        </div>
    </div>
    <div class="filter-row">
        <div class="filter-label">Aralık:</div>
        <div class="chip-container" id="range-chips">
            <div class="chip range-chip" data-range="1d">1g</div>
            <div class="chip range-chip" data-range="7d">7g</div>
            <div class="chip range-chip active" data-range="30d">30g</div>
            <div class="chip range-chip" data-range="90d">90g</div>
            <div class="chip range-chip" data-range="All">Hepsi</div>
        </div>
    </div>
</div>

<div class="container">
    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Oturumlar</div>
            <div class="value" id="stat-sessions">0</div>
            <div class="subtext range-subtext">son 30 gün</div>
        </div>
        <div class="stat-card">
            <div class="label">Dönüşler</div>
            <div class="value" id="stat-turns">0</div>
            <div class="subtext range-subtext">son 30 gün</div>
        </div>
        <div class="stat-card">
            <div class="label">Giriş Tokenleri</div>
            <div class="value mono" id="stat-input">0</div>
            <div class="subtext range-subtext">son 30 gün</div>
        </div>
        <div class="stat-card">
            <div class="label">Çıkış Tokenleri</div>
            <div class="value mono" id="stat-output">0</div>
            <div class="subtext range-subtext">son 30 gün</div>
        </div>
        <div class="stat-card">
            <div class="label">Önbellek Okuma</div>
            <div class="value mono" id="stat-cache-read">0</div>
            <div class="subtext">istek önbelleğinden</div>
        </div>
        <div class="stat-card">
            <div class="label">Önbellek Yazma</div>
            <div class="value mono" id="stat-cache-creation">0</div>
            <div class="subtext">istek önbelleğine yazma</div>
        </div>
        <div class="stat-card">
            <div class="label">Tahmini Maliyet</div>
            <div class="value cost-text" id="stat-cost">$0.00</div>
            <div class="subtext">API fiyatlandırması</div>
        </div>
    </div>

    <!-- Daily Usage Chart (Full Width) -->
    <div class="chart-card full-width">
        <h2 id="daily-chart-title">Günlük Token Kullanımı — Son 30 Gün</h2>
        <div class="chart-container-large">
            <canvas id="chart-daily"></canvas>
        </div>
    </div>

    <!-- Bottom Charts Row (Doughnut + Horizontal Bar) -->
    <div class="charts-grid">
        <div class="chart-card">
            <h2>Modellere Göre Dağılım</h2>
            <div class="chart-container-medium">
                <canvas id="chart-pie"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h2>Token Kullanımına Göre En İyi Projeler</h2>
            <div class="chart-container-medium">
                <canvas id="chart-projects"></canvas>
            </div>
        </div>
    </div>

    <!-- Sessions Table -->
    <div class="table-card">
        <h2>Son Oturumlar (Sessions)</h2>
        <table>
            <thead>
                <tr>
                    <th>Oturum</th>
                    <th>Proje</th>
                    <th>Son Aktif</th>
                    <th>Süre</th>
                    <th>Model</th>
                    <th>Dönüş</th>
                    <th>Giriş</th>
                    <th>Çıkış</th>
                    <th>Tahmini Maliyet</th>
                </tr>
            </thead>
            <tbody id="sessions-table-body">
                <!-- Dynamic rows -->
            </tbody>
        </table>
    </div>
</div>

<script>
    let rawData = null;
    let selectedModels = new Set();
    let selectedRange = "30d";
    let chartDaily = null;
    let chartPie = null;
    let chartProjects = null;
    let refreshTimer = null;
    let secondsLeft = 30;

    // Helper to format large numbers to K, M, B
    function formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toLocaleString();
    }

    // Helper to format cost beautifully
    function formatCost(cost) {
        if (cost === 0) return '$0.0000';
        if (cost < 1) return '$' + cost.toFixed(4);
        return '$' + cost.toFixed(2);
    }

    // Get model CSS badge class
    function getModelBadgeClass(model) {
        const m = model.toLowerCase();
        if (m.includes('opus')) return 'model-badge-opus';
        if (m.includes('sonnet')) return 'model-badge-sonnet';
        if (m.includes('haiku')) return 'model-badge-haiku';
        if (m.includes('flash')) return 'model-badge-gemini-flash';
        if (m.includes('pro')) return 'model-badge-gemini-pro';
        return 'model-badge-other';
    }

    // Clean model name for display
    function cleanModelName(model) {
        const m = model.toLowerCase();
        if (m.includes('opus')) return 'claude-opus-4-6';
        if (m.includes('sonnet')) return 'claude-sonnet-4-6';
        if (m.includes('haiku')) return 'claude-haiku-4-5';
        if (m.includes('flash')) {
            if (m.includes('high')) return 'gemini-3.5-flash-high';
            if (m.includes('low')) return 'gemini-3.5-flash-low';
            return 'gemini-3.5-flash-medium';
        }
        if (m.includes('pro')) {
            if (m.includes('high')) return 'gemini-3.1-pro-high';
            return 'gemini-3.1-pro-low';
        }
        return model;
    }

    // Timer setup
    function resetTimer() {
        secondsLeft = 30;
        document.getElementById('countdown').innerText = `Otomatik yenileme: ${secondsLeft}sn`;
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                document.getElementById('countdown').innerText = "Yenileniyor...";
                loadData();
            } else {
                document.getElementById('countdown').innerText = `Otomatik yenileme: ${secondsLeft}sn`;
            }
        }, 1000);
    }

    const chartDailyTotalPlugin = {
        id: 'chartDailyTotal',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const datasets = chart.data.datasets;
            const labels = chart.data.labels;
            if (!labels || labels.length === 0) return;

            const totals = new Array(labels.length).fill(0);
            let anyVisible = false;
            datasets.forEach((dataset, datasetIndex) => {
                if (chart.isDatasetVisible(datasetIndex)) {
                    anyVisible = true;
                    dataset.data.forEach((val, i) => {
                        totals[i] += val || 0;
                    });
                }
            });

            if (!anyVisible) return;

            ctx.save();
            ctx.font = '600 10px Outfit';
            ctx.fillStyle = '#9aa0b8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            for (let i = 0; i < labels.length; i++) {
                const total = totals[i];
                if (total === 0) continue;

                let minY = Infinity;
                let barX = null;

                datasets.forEach((dataset, datasetIndex) => {
                    if (chart.isDatasetVisible(datasetIndex)) {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        const element = meta.data[i];
                        if (element && element.y !== undefined) {
                            if (element.y < minY) {
                                minY = element.y;
                            }
                            if (barX === null) {
                                barX = element.x;
                            }
                        }
                    }
                });

                if (minY !== Infinity && barX !== null) {
                    ctx.fillText(formatNumber(total), barX, minY - 4);
                }
            }
            ctx.restore();
        }
    };

    const chartProjectsTotalPlugin = {
        id: 'chartProjectsTotal',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const datasets = chart.data.datasets;
            const labels = chart.data.labels;
            if (!labels || labels.length === 0) return;

            const totals = new Array(labels.length).fill(0);
            let anyVisible = false;
            datasets.forEach((dataset, datasetIndex) => {
                if (chart.isDatasetVisible(datasetIndex)) {
                    anyVisible = true;
                    dataset.data.forEach((val, i) => {
                        totals[i] += val || 0;
                    });
                }
            });

            if (!anyVisible) return;

            ctx.save();
            ctx.font = '600 10px Outfit';
            ctx.fillStyle = '#9aa0b8';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let i = 0; i < labels.length; i++) {
                const total = totals[i];
                if (total === 0) continue;

                let maxX = -Infinity;
                let barY = null;

                datasets.forEach((dataset, datasetIndex) => {
                    if (chart.isDatasetVisible(datasetIndex)) {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        const element = meta.data[i];
                        if (element && element.x !== undefined) {
                            if (element.x > maxX) {
                                maxX = element.x;
                            }
                            if (barY === null) {
                                barY = element.y;
                            }
                        }
                    }
                });

                if (maxX !== -Infinity && barY !== null) {
                    ctx.fillText(formatNumber(total), maxX + 5, barY);
                }
            }
            ctx.restore();
        }
    };

    async function loadData() {
        try {
            const res = await fetch('/api/data');
            rawData = await res.json();
            
            if (rawData.error) {
                alert(rawData.error);
                return;
            }

            document.getElementById('gen-time').innerText = "Son güncelleme: " + rawData.generated_at;

            // Initialize selected models if not set
            if (selectedModels.size === 0) {
                rawData.all_models.forEach(model => selectedModels.add(model));
            }

            renderFilters();
            updateDashboard();
            resetTimer();
        } catch (e) {
            console.error(e);
        }
    }

    function renderFilters() {
        // Render Model Chips
        const modelContainer = document.getElementById('model-chips');
        modelContainer.innerHTML = '';
        
        // Add All & None chips first
        const allChip = document.createElement('div');
        allChip.className = 'chip btn-all' + (selectedModels.size === rawData.all_models.length ? ' active' : '');
        allChip.innerText = 'All';
        allChip.onclick = () => {
            rawData.all_models.forEach(m => selectedModels.add(m));
            renderFilters();
            updateDashboard();
        };
        modelContainer.appendChild(allChip);

        const noneChip = document.createElement('div');
        noneChip.className = 'chip btn-none' + (selectedModels.size === 0 ? ' active' : '');
        noneChip.innerText = 'None';
        noneChip.onclick = () => {
            selectedModels.clear();
            renderFilters();
            updateDashboard();
        };
        modelContainer.appendChild(noneChip);

        // Add standard model chips
        rawData.all_models.forEach(model => {
            const chip = document.createElement('div');
            const cleanName = cleanModelName(model);
            chip.className = 'chip model-chip' + (selectedModels.has(model) ? ' active' : '');
            chip.innerText = cleanName;
            chip.onclick = () => {
                if (selectedModels.has(model)) {
                    selectedModels.delete(model);
                } else {
                    selectedModels.add(model);
                }
                renderFilters();
                updateDashboard();
            };
            modelContainer.appendChild(chip);
        });

        // Setup Range Chip handlers once
        const rangeChips = document.querySelectorAll('.range-chip');
        rangeChips.forEach(chip => {
            chip.onclick = function() {
                rangeChips.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                selectedRange = this.getAttribute('data-range');
                updateDashboard();
            };
        });
    }

    function updateDashboard() {
        // Calculate range cutoff based on the maximum date in the logs
        const maxDateStr = rawData.daily.reduce((max, d) => d.day > max ? d.day : max, '1970-01-01');
        let cutoffDate = null;
        if (selectedRange !== 'All') {
            const maxDate = new Date(maxDateStr + 'T00:00:00');
            const days = parseInt(selectedRange);
            cutoffDate = new Date(maxDate);
            cutoffDate.setDate(maxDate.getDate() - days);
        }

        // Update subtexts
        const rangeText = selectedRange === 'All' ? 'tüm zamanlar' : `son ${parseInt(selectedRange)} gün`;
        document.querySelectorAll('.range-subtext').forEach(el => {
            el.innerText = rangeText;
        });

        // Update Daily Chart title
        const dailyChartTitle = selectedRange === 'All' 
            ? 'Günlük Token Kullanımı — Tüm Zamanlar' 
            : `Günlük Token Kullanımı — Son ${parseInt(selectedRange)} Gün`;
        document.getElementById('daily-chart-title').innerText = dailyChartTitle;

        // Filter sessions by selected models and date range
        const filteredSessions = rawData.sessions.filter(s => {
            // Model filter
            if (!selectedModels.has(s.model)) return false;
            // Date filter
            if (cutoffDate) {
                const sDate = new Date(s.last_active.substring(0, 10) + 'T00:00:00');
                if (sDate < cutoffDate) return false;
            }
            return true;
        });

        // Calculate card metrics from filtered sessions
        let totalCost = 0;
        let totalTurns = 0;
        let totalInput = 0;
        let totalOutput = 0;
        let totalCacheRead = 0;
        let totalCacheCreation = 0;

        filteredSessions.forEach(s => {
            totalCost += s.cost;
            totalTurns += s.turns;
            totalInput += s.input;
            totalOutput += s.output;
            totalCacheRead += s.cache_read;
            totalCacheCreation += s.cache_creation;
        });

        // Set top widgets
        document.getElementById('stat-sessions').innerText = filteredSessions.length.toLocaleString();
        document.getElementById('stat-turns').innerText = formatNumber(totalTurns);
        document.getElementById('stat-input').innerText = formatNumber(totalInput);
        document.getElementById('stat-output').innerText = formatNumber(totalOutput);
        document.getElementById('stat-cache-read').innerText = formatNumber(totalCacheRead);
        document.getElementById('stat-cache-creation').innerText = formatNumber(totalCacheCreation);
        document.getElementById('stat-cost').innerText = formatCost(totalCost);

        // Render sessions table
        const tbody = document.getElementById('sessions-table-body');
        tbody.innerHTML = '';
        filteredSessions.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-bright); margin-bottom: 2px;">${s.title}</div>
                    <div class="session-id">${s.session_id}</div>
                </td>
                <td style="font-weight: 500;">${s.project}</td>
                <td class="mono">${s.last_active}</td>
                <td>${s.duration_min} dk</td>
                <td><span class="model-badge ${getModelBadgeClass(s.model)}">${cleanModelName(s.model)}</span></td>
                <td>${s.turns}</td>
                <td class="mono">${formatNumber(s.input)}</td>
                <td class="mono">${formatNumber(s.output)}</td>
                <td class="cost-text">${formatCost(s.cost)}</td>
            `;
            tbody.appendChild(tr);
        });

        renderCharts(cutoffDate);
    }

    function renderCharts(cutoffDate) {
        // 1. Filter and Aggregate Daily Usage
        const dailyAgg = {};
        rawData.daily.forEach(d => {
            if (!selectedModels.has(d.model)) return;
            if (cutoffDate) {
                const dDate = new Date(d.day + 'T00:00:00');
                if (dDate < cutoffDate) return;
            }
            if (!dailyAgg[d.day]) {
                dailyAgg[d.day] = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
            }
            dailyAgg[d.day].input += d.input;
            dailyAgg[d.day].output += d.output;
            dailyAgg[d.day].cache_read += d.cache_read;
            dailyAgg[d.day].cache_creation += d.cache_creation;
        });

        const maxDateStr = rawData.daily.reduce((max, d) => d.day > max ? d.day : max, '1970-01-01');
        const dailyLabels = [];
        let start = cutoffDate;
        if (!start) {
            const minDateStr = rawData.daily.reduce((min, d) => d.day < min ? d.day : min, '9999-12-31');
            start = new Date(minDateStr + 'T00:00:00');
        }
        const end = new Date(maxDateStr + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dayStr = `${yyyy}-${mm}-${dd}`;
            dailyLabels.push(dayStr);
            if (!dailyAgg[dayStr]) {
                dailyAgg[dayStr] = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
            }
        }
        const dailyInputData = dailyLabels.map(l => dailyAgg[l].input);
        const dailyOutputData = dailyLabels.map(l => dailyAgg[l].output);
        const dailyCacheReadData = dailyLabels.map(l => dailyAgg[l].cache_read);
        const dailyCacheCreationData = dailyLabels.map(l => dailyAgg[l].cache_creation);

        if (chartDaily) chartDaily.destroy();
        chartDaily = new Chart(document.getElementById('chart-daily'), {
            type: 'bar',
            data: {
                labels: dailyLabels,
                datasets: [
                    {
                        label: 'Giriş (Input)',
                        data: dailyInputData,
                        backgroundColor: '#3b82f6',
                        borderWidth: 0,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Çıkış (Output)',
                        data: dailyOutputData,
                        backgroundColor: '#8b5cf6',
                        borderWidth: 0,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Önbellek Okuma',
                        data: dailyCacheReadData,
                        backgroundColor: '#10b981',
                        borderWidth: 0,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Önbellek Yazma',
                        data: dailyCacheCreationData,
                        backgroundColor: '#06b6d4',
                        borderWidth: 0,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: { color: '#9aa0b8', font: { family: 'Outfit', size: 11 } }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: {
                            color: '#9aa0b8',
                            font: { family: 'Outfit', size: 11 },
                            callback: value => formatNumber(value)
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#9aa0b8',
                            font: { family: 'Outfit', size: 12 },
                            boxWidth: 10,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            footer: (tooltipItems) => {
                                let sum = 0;
                                tooltipItems.forEach(function(tooltipItem) {
                                    sum += tooltipItem.raw;
                                });
                                return 'Toplam: ' + formatNumber(sum);
                            }
                        }
                    }
                }
            },
            plugins: [chartDailyTotalPlugin]
        });

        // 2. Aggregate Model Cost Distribution for Doughnut Chart (Only range filtered, not model filtered)
        const modelAgg = {};
        rawData.sessions.forEach(s => {
            if (cutoffDate) {
                const sDate = new Date(s.last_active.substring(0, 10) + 'T00:00:00');
                if (sDate < cutoffDate) return;
            }
            const cleanName = cleanModelName(s.model);
            modelAgg[cleanName] = (modelAgg[cleanName] || 0) + s.cost;
        });

        const pieLabels = Object.keys(modelAgg);
        const pieData = pieLabels.map(l => modelAgg[l]);

        if (chartPie) chartPie.destroy();
        chartPie = new Chart(document.getElementById('chart-pie'), {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: [
                        '#38bdf8', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899', '#6366f1', '#475569'
                    ],
                    borderWidth: 2,
                    borderColor: '#151b2c'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#9aa0b8',
                            font: { family: 'Outfit', size: 11 },
                            boxWidth: 10,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${formatCost(context.raw)}`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });

        // 3. Aggregate Top Projects for Horizontal Stacked Bar Chart (Range and Model filtered)
        const projectAgg = {};
        rawData.sessions.forEach(s => {
            if (!selectedModels.has(s.model)) return;
            if (cutoffDate) {
                const sDate = new Date(s.last_active.substring(0, 10) + 'T00:00:00');
                if (sDate < cutoffDate) return;
            }
            const projName = s.project || 'unknown';
            if (!projectAgg[projName]) {
                projectAgg[projName] = { input: 0, output: 0, total: 0 };
            }
            projectAgg[projName].input += s.input;
            projectAgg[projName].output += s.output;
            projectAgg[projName].total += s.input + s.output;
        });

        // Sort by total tokens descending and select top 10 projects
        const sortedProjects = Object.entries(projectAgg)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const projectLabels = sortedProjects.map(p => p.name);
        const projectInputData = sortedProjects.map(p => p.input);
        const projectOutputData = sortedProjects.map(p => p.output);

        if (chartProjects) chartProjects.destroy();
        chartProjects = new Chart(document.getElementById('chart-projects'), {
            type: 'bar',
            data: {
                labels: projectLabels,
                datasets: [
                    {
                        label: 'Giriş (Input)',
                        data: projectInputData,
                        backgroundColor: '#3b82f6',
                        borderWidth: 0
                    },
                    {
                        label: 'Çıkış (Output)',
                        data: projectOutputData,
                        backgroundColor: '#8b5cf6',
                        borderWidth: 0
                    }
                ]
            },
            options: {
                indexAxis: 'y', // Makes the chart horizontal
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: {
                            color: '#9aa0b8',
                            font: { family: 'Outfit', size: 10 },
                            callback: value => formatNumber(value)
                        }
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#9aa0b8', font: { family: 'Outfit', size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#9aa0b8',
                            font: { family: 'Outfit', size: 11 },
                            boxWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            footer: (tooltipItems) => {
                                let sum = 0;
                                tooltipItems.forEach(function(tooltipItem) {
                                    sum += tooltipItem.raw;
                                });
                                return 'Toplam: ' + formatNumber(sum);
                            }
                        }
                    }
                }
            },
            plugins: [chartProjectsTotalPlugin]
        });
    }

    async function rescan() {
        const btn = document.getElementById('rescan');
        btn.innerText = 'Taranıyor...';
        btn.disabled = true;
        try {
            await fetch('/api/scan');
            await loadData();
        } catch(e) {
            console.error(e);
        } finally {
            btn.innerText = 'Yeniden Tara';
            btn.disabled = false;
        }
    }

    // Load data initially
    loadData();
</script>
</body>
</html>"""

class DashboardHTTPRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence HTTP request logs in the console
        return

    def do_GET(self):
        url = self.path
        if url == "/" or url == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif url == "/api/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.end_headers()
            try:
                from scanner import scan
                scan()
            except Exception as e:
                print(f"Auto-scan failed: {e}")
            data = get_dashboard_data()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        elif url == "/api/scan":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.end_headers()
            try:
                from scanner import scan
                scan()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8080):
    server_address = ("", port)
    httpd = ThreadingHTTPServer(server_address, DashboardHTTPRequestHandler)
    print(f"Antigravity Dashboard starting on http://localhost:{port}")
    # Open browser automatically
    webbrowser.open(f"http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down dashboard server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
