You are worker_backend_r1_r2.
Your working directory is /Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/.agents/worker_backend_r1_r2/.

Your task is to implement the backend changes for R1 and R2 in scanner.py, cli.py, and dashboard.py.

### R1. Correct Model Settings Parsing & Normalization
1. In `scanner.py`, update the regex on line 92:
   - Match the model name without cutting off decimals. Change `([^`\n\.]+)` to `([^`\n]+)`.
   - Ensure the regex captures the full name (including version numbers like "Gemini 3.5").

### R2. Correct Caching & Cost Calculation Formulas
1. In `scanner.py`, update the caching token logic (around lines 226-232):
   - Set `cache_creation_tokens` to `input_tokens` for the first turn (`len(turns) == 0`).
   - Set `cache_creation_tokens` to `0` for subsequent turns in a session.
   - Keep `cache_read_tokens` as `cumulative_tokens` for subsequent turns (and `0` for the first turn).
2. In both `dashboard.py` and `cli.py`, update the `calc_cost` function:
   ```python
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
   ```
3. In `cli.py`, synchronize the `PRICING` dictionary to match `dashboard.py` exactly (defining `cache_read` and `cache_write` keys for all models).
4. In `cli.py`, update the SQLite queries in `cmd_today()`, `cmd_week()`, and `cmd_stats()` to query `SUM(cache_read_tokens) as cread` and `SUM(cache_creation_tokens) as cwrite`.
5. Update the calls to `calc_cost` in `cli.py` to pass these caching parameters:
   `cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])`

After implementation:
- Run the scanner database rebuild using `python cli.py scan` (or whatever the command is) to rebuild `usage.db`.
- Report build and verification details in handoff.md.
