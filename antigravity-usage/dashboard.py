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

DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Pricing catalog per 1,000,000 tokens
PRICING = {
    "Gemini 3.5 Flash (Medium)":   {"input": 0.075, "output": 0.30},
    "Gemini 3.5 Flash (High)":     {"input": 0.075, "output": 0.30},
    "Gemini 3.5 Flash (Low)":      {"input": 0.075, "output": 0.30},
    "Gemini 3.1 Pro (Low)":        {"input": 1.25,  "output": 5.00},
    "Gemini 3.1 Pro (High)":       {"input": 1.25,  "output": 5.00},
    "Claude Sonnet 4.6 (Thinking)":{"input": 3.00,  "output": 15.00},
    "Claude Opus 4.6 (Thinking)":  {"input": 15.00, "output": 75.00},
    "GPT-OSS 120B (Medium)":       {"input": 0.60,  "output": 0.60},
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

def calc_cost(model, inp, out):
    p = get_pricing(model)
    return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)

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
            COUNT(*) as turns
        FROM turns
        GROUP BY day, model_name
        ORDER BY day ASC
    """).fetchall()

    daily_data = []
    for r in daily_rows:
        model_name = normalize_model_name(r["model_name"])
        cost = calc_cost(model_name, r["inp"], r["out"])
        daily_data.append({
            "day": r["day"],
            "model": model_name,
            "input": r["inp"],
            "output": r["out"],
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
            COUNT(*) as session_count
        FROM sessions
        GROUP BY proj, model_name
    """).fetchall()

    project_data = []
    for r in project_rows:
        model_name = normalize_model_name(r["model_name"])
        cost = calc_cost(model_name, r["inp"], r["out"])
        project_data.append({
            "project": r["proj"],
            "model": model_name,
            "input": r["inp"],
            "output": r["out"],
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
            model,
            turn_count,
            COALESCE(session_title, 'Yeni Konuşma') as session_title
        FROM sessions
        ORDER BY last_timestamp DESC
    """).fetchall()

    sessions_data = []
    for r in session_rows:
        model_name = normalize_model_name(r["model"])
        cost = calc_cost(model_name, r["total_input_tokens"], r["total_output_tokens"])
        
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

HTML_PAGE = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity Multi-Model Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0c10;
            --card-bg: #1f2833;
            --card-border: #2e3c4f;
            --text-main: #c5c6c7;
            --text-bright: #ffffff;
            --text-muted: #66fcf1;
            --accent: #45f3ff;
            --accent-hover: #1f2833;
            --blue: #0080ff;
            --green: #2ecc71;
            --red: #e74c3c;
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
            padding-bottom: 50px;
        }

        header {
            background-color: var(--card-bg);
            border-bottom: 2px solid var(--card-border);
            padding: 20px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        header h1 {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-bright);
            letter-spacing: 0.5px;
        }

        header .right-meta {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .btn {
            background-color: var(--bg);
            color: var(--accent);
            border: 1px solid var(--accent);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn:hover {
            background-color: var(--accent);
            color: var(--bg);
            box-shadow: 0 0 10px rgba(69, 243, 255, 0.4);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        #filter-bar {
            background-color: var(--card-bg);
            border-bottom: 1px solid var(--card-border);
            padding: 15px 40px;
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .filter-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .filter-label {
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 600;
            color: var(--text-main);
        }

        .chip-container {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .chip {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--card-border);
            color: var(--text-main);
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        }

        .chip.active {
            background: var(--accent);
            border-color: var(--accent);
            color: var(--bg);
            font-weight: 600;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-card .label {
            font-size: 12px;
            color: var(--text-main);
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        .stat-card .value {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-bright);
        }

        .stat-card .subtext {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        @media (max-width: 992px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
        }

        .chart-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            min-height: 380px;
        }

        .chart-card h2 {
            font-size: 15px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-bright);
            margin-bottom: 20px;
            letter-spacing: 0.5px;
        }

        .table-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow-x: auto;
        }

        .table-card h2 {
            font-size: 15px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-bright);
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-main);
            padding: 12px;
            border-bottom: 2px solid var(--card-border);
            font-weight: 600;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid var(--card-border);
            font-size: 13px;
        }

        tr:hover td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .model-badge {
            background: rgba(69, 243, 255, 0.1);
            color: var(--accent);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .cost-text {
            color: var(--green);
            font-weight: 600;
            font-family: monospace;
        }

        .mono {
            font-family: monospace;
        }
    </style>
</head>
<body>

<header>
    <h1>Antigravity Usage</h1>
    <div class="right-meta">
        <span id="gen-time" style="font-size:12px; opacity:0.8;"></span>
        <button id="rescan" class="btn" onclick="rescan()">Rescan</button>
    </div>
</header>

<div id="filter-bar">
    <div class="filter-section">
        <div class="filter-label">Modeller:</div>
        <div id="model-chips" class="chip-container"></div>
    </div>
</div>

<div class="container">
    <!-- Stats Row -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Toplam Maliyet</div>
            <div class="value cost-text" id="stat-cost">$0.00</div>
            <div class="subtext">Tahmini API harcaması</div>
        </div>
        <div class="stat-card">
            <div class="label">Toplam Turn</div>
            <div class="value" id="stat-turns">0</div>
            <div class="subtext">Soru-Cevap etkileşimi</div>
        </div>
        <div class="stat-card">
            <div class="label">Input Token</div>
            <div class="value mono" id="stat-input">0</div>
            <div class="subtext">Sistem & Kullanıcı verisi</div>
        </div>
        <div class="stat-card">
            <div class="label">Output Token</div>
            <div class="value mono" id="stat-output">0</div>
            <div class="subtext">Model cevap üretimi</div>
        </div>
        <div class="stat-card">
            <div class="label">Toplam Oturum</div>
            <div class="value" id="stat-sessions">0</div>
            <div class="subtext">Çalıştırılan sohbetler</div>
        </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-grid">
        <div class="chart-card">
            <h2>Günlük Harcama & Token Dağılımı</h2>
            <div style="position: relative; height: 320px;">
                <canvas id="chart-daily"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h2>Modellere Göre Dağılım (Maliyet)</h2>
            <div style="position: relative; height: 320px;">
                <canvas id="chart-pie"></canvas>
            </div>
        </div>
    </div>

    <!-- Sessions Table -->
    <div class="table-card">
        <h2>Son Oturumlar (Sessions)</h2>
        <table>
            <thead>
                <tr>
                    <th>Konuşma / ID</th>
                    <th>Proje</th>
                    <th>Model</th>
                    <th>Dönüş sayısı</th>
                    <th>İnput</th>
                    <th>Output</th>
                    <th>Süre</th>
                    <th>Tarih</th>
                    <th>Maliyet</th>
                </tr>
            </thead>
            <tbody id="sessions-table-body">
                <!-- Data populated dynamically -->
            </tbody>
        </table>
    </div>
</div>

<script>
    let rawData = null;
    let selectedModel = "Toplam"; // default selection is "Toplam"
    let chartDaily = null;
    let chartPie = null;

    async function loadData() {
        try {
            const res = await fetch('/api/data');
            rawData = await res.json();
            
            if (rawData.error) {
                alert(rawData.error);
                return;
            }

            document.getElementById('gen-time').innerText = "Son güncelleme: " + rawData.generated_at;

            renderModelFilters();
            updateDashboard();
        } catch (e) {
            console.error(e);
        }
    }

    function renderModelFilters() {
        const container = document.getElementById('model-chips');
        container.innerHTML = '';
        
        // 1. Add "Toplam" chip first
        const totalChip = document.createElement('div');
        totalChip.className = 'chip' + (selectedModel === 'Toplam' ? ' active' : '');
        totalChip.innerText = 'Toplam';
        totalChip.onclick = () => {
            selectedModel = 'Toplam';
            renderModelFilters();
            updateDashboard();
        };
        container.appendChild(totalChip);

        // 2. Add standard model chips
        rawData.all_models.forEach(model => {
            const chip = document.createElement('div');
            chip.className = 'chip' + (selectedModel === model ? ' active' : '');
            chip.innerText = model;
            chip.onclick = () => {
                selectedModel = model;
                renderModelFilters();
                updateDashboard();
            };
            container.appendChild(chip);
        });
    }

    function updateDashboard() {
        // Filter session logs based on selectedModel
        const filteredSessions = rawData.sessions.filter(s => {
            if (selectedModel === "Toplam") return true;
            return s.model === selectedModel;
        });
        
        let totalCost = 0;
        let totalTurns = 0;
        let totalInput = 0;
        let totalOutput = 0;

        filteredSessions.forEach(s => {
            totalCost += s.cost;
            totalTurns += s.turns;
            totalInput += s.input;
            totalOutput += s.output;
        });

        // Set top widgets
        document.getElementById('stat-cost').innerText = "$" + totalCost.toFixed(4);
        document.getElementById('stat-turns').innerText = totalTurns.toLocaleString();
        document.getElementById('stat-input').innerText = totalInput.toLocaleString();
        document.getElementById('stat-output').innerText = totalOutput.toLocaleString();
        document.getElementById('stat-sessions').innerText = filteredSessions.length.toLocaleString();

        // Render sessions table
        const tbody = document.getElementById('sessions-table-body');
        tbody.innerHTML = '';
        filteredSessions.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-bright);">${s.title}</div>
                    <div style="font-size: 11px; opacity: 0.6;" class="mono">${s.session_id}</div>
                </td>
                <td>${s.project}</td>
                <td><span class="model-badge">${s.model}</span></td>
                <td>${s.turns}</td>
                <td class="mono">${s.input.toLocaleString()}</td>
                <td class="mono">${s.output.toLocaleString()}</td>
                <td>${s.duration_min} dk</td>
                <td>${s.last_active}</td>
                <td class="cost-text">$${s.cost.toFixed(4)}</td>
            `;
            tbody.appendChild(tr);
        });

        renderCharts();
    }

    function renderCharts() {
        // Daily Chart Data
        const dailyAgg = {};
        rawData.daily.forEach(d => {
            if (selectedModel !== "Toplam" && d.model !== selectedModel) return;
            if (!dailyAgg[d.day]) {
                dailyAgg[d.day] = { input: 0, output: 0, cost: 0 };
            }
            dailyAgg[d.day].input += d.input;
            dailyAgg[d.day].output += d.output;
            dailyAgg[d.day].cost += d.cost;
        });

        const dailyLabels = Object.keys(dailyAgg).sort();
        const dailyCostData = dailyLabels.map(l => dailyAgg[l].cost);
        const dailyTokenData = dailyLabels.map(l => dailyAgg[l].input + dailyAgg[l].output);

        if (chartDaily) chartDaily.destroy();
        chartDaily = new Chart(document.getElementById('chart-daily'), {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [
                    {
                        label: 'Tahmini Maliyet ($)',
                        data: dailyCostData,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y-cost',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Toplam Token',
                        data: dailyTokenData,
                        borderColor: '#0080ff',
                        backgroundColor: 'rgba(0, 128, 255, 0.05)',
                        borderWidth: 2,
                        yAxisID: 'y-tokens',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#c5c6c7' } },
                    'y-cost': { position: 'left', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#2ecc71' } },
                    'y-tokens': { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#0080ff' } }
                },
                plugins: {
                    legend: { labels: { color: '#c5c6c7' } }
                }
            }
        });

        // Model Distribution Doughnut Chart (shows full overview, unaffected by single model selection)
        const modelAgg = {};
        rawData.sessions.forEach(s => {
            modelAgg[s.model] = (modelAgg[s.model] || 0) + s.cost;
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
                        '#45f3ff', '#0080ff', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e'
                    ],
                    borderWidth: 1,
                    borderColor: '#1f2833'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#c5c6c7', boxWidth: 12 } }
                }
            }
        });
    }

    async function rescan() {
        const btn = document.getElementById('rescan');
        btn.innerText = 'Scanning...';
        btn.disabled = true;
        try {
            await fetch('/api/scan');
            await loadData();
        } catch(e) {
            console.error(e);
        } finally {
            btn.innerText = 'Rescan';
            btn.disabled = false;
        }
    }

    // Load data initially
    loadData();
</script>
</body>
</html>
"""

class DashboardHTTPRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence HTTP request logs in the console
        return

    def do_GET(self):
        url = self.path
        if url == "/" or url == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif url == "/api/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            data = get_dashboard_data()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        elif url == "/api/scan":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
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
