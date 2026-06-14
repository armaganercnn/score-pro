# Handoff Report: R1 & R2 Read-Only Exploration

## 1. Observation
I directly observed the following code components and files:

- **`scanner.py` Line 92** contains the regex pattern for parsing setting changes:
  ```python
  match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n\.]+)", text_to_search)
  ```
- **`scanner.py` Lines 226–233** contains the prompt cache estimation:
  ```python
  if len(turns) == 0:
      cache_read = 0
      cache_creation = input_tokens
  else:
      cache_read = cumulative_tokens
      cache_creation = input_tokens
  ```
- **`dashboard.py` Lines 51–71** contains model name normalization:
  ```python
  def normalize_model_name(model):
      if not model:
          return "Gemini 3.5 Flash (Medium)"
      m = model.lower()
      if "opus" in m:
          return "Claude Opus 4.6 (Thinking)"
      ...
  ```
- **`dashboard.py` Lines 45–49** contains the server-side cost calculation formula:
  ```python
  def calc_cost(model, inp, out, cache_read=0, cache_write=0):
      p = get_pricing(model)
      cr_rate = p.get("cache_read", p["input"] * 0.1)
      cw_rate = p.get("cache_write", p["input"] * 1.25)
      return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
  ```
- **`cli.py` Lines 44–46** contains the CLI-side cost calculation formula:
  ```python
  def calc_cost(model, inp, out):
      p = get_pricing(model)
      return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)
  ```
- **`cli.py` Lines 14–23** defines the `PRICING` dictionary:
  ```python
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
  ```

---

## 2. Logic Chain
1. From the regex pattern `([^`\n\.]+)` in `scanner.py` (Line 92), the character class excludes the dot/period (`.`).
2. Therefore, if a model has a decimal point (e.g. `3.5`, `3.1`, `4.6`), any match terminates at the dot, leaving only the prefix (e.g., `Gemini 3`).
3. Since `"flash"` or `"pro"` does not match `"gemini 3"` in `normalize_model_name` (dashboard.py Line 51), the normalized model falls back to the default `"Gemini 3.5 Flash (Medium)"`. This breaks granularity.
4. On the caching side, `scanner.py` correctly calculates `cache_read_tokens` and `cache_creation_tokens` based on turn history.
5. In `dashboard.py`, the cost formula utilizes `cache_read` and `cache_write` (using standard rates multiplied by 0.1 and 1.25 respectively).
6. In `cli.py`, `calc_cost` and the SQL queries ignore the cache tables and rates entirely. This creates a discrepancy between the CLI output and the dashboard data.

---

## 3. Caveats
No caveats. All files in scope (`scanner.py`, `dashboard.py`, `cli.py`) were fully analyzed.

---

## 4. Conclusion
The model name regex in `scanner.py` is incorrect, causing loss of version granularity.
The CLI cost calculation does not support caching, resulting in cost discrepancy.
The recommended strategy is to fix the model regex pattern by removing the dot from the character exclusion class, and updating `cli.py` to match the dashboard's cost and pricing logic.

---

## 5. Verification Method
1. Inspect `scanner.py` line 92: Verify that `\.` is removed from `[^`\n\.]`.
2. Inspect `cli.py`: Verify that `PRICING` has cache pricing keys, `calc_cost` matches `dashboard.py` signature and logic, and SQL queries retrieve caching tokens.
3. Once the implementer applies the changes, run `python cli.py scan` followed by `python cli.py stats` to confirm CLI output matches dashboard values.
