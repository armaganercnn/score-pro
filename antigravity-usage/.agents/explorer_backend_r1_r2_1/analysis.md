# Read-Only Exploration Report: R1 & R2

## Executive Summary
This report presents the findings of a read-only investigation into two main issues:
- **R1**: Model Settings Parsing & Normalization in `scanner.py` and `dashboard.py`.
- **R2**: Caching & Cost Calculation formulas in `scanner.py`, `dashboard.py`, and `cli.py`.

A concrete fix strategy is detailed below to resolve the model name truncation and harmonize the cost calculation logic across the dashboard and CLI.

---

## Findings

### R1: Model Settings Parsing & Normalization

#### 1. Regex Issue in `scanner.py`
- **File**: `scanner.py`
- **Line Number**: 92
- **Code Snippet**:
  ```python
  match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n\.]+)", text_to_search)
  ```
- **Observation**:
  The character class `([^`\n\.]+)` explicitly excludes dots/periods (`.`). Thus, any model selection value containing a dot/decimal (e.g., `Gemini 3.5 Flash`, `Claude Sonnet 4.6`, or `Gemini 3.1 Pro`) will be truncated immediately before the dot.
  For example, `Gemini 3.5 Flash (Medium)` is parsed as `Gemini 3`.

#### 2. Normalization Fallback in `dashboard.py`
- **File**: `dashboard.py`
- **Line Numbers**: 51-71 (`normalize_model_name`)
- **Observation**:
  Due to the regex truncation in `scanner.py`, a setting change to `Gemini 3.5 Flash (High)` is parsed as `Gemini 3`.
  Inside `normalize_model_name(model)`:
  ```python
  if "flash" in m:
      # ...
  ```
  Since `"flash"` is not in `"gemini 3"`, the function falls through and returns the default `"Gemini 3.5 Flash (Medium)"`. This means granularity is lost and all flash variations default to `Medium`.

#### 3. Display Names in `dashboard.py` (JS Frontend)
- **File**: `dashboard.py`
- **Line Numbers**: 769-784 (`cleanModelName` in Javascript)
- **Observation**:
  The JS frontend uses substring matching (`m.includes('flash')`, etc.) to clean model names for display badges. When database names are normalized incorrectly, the frontend display matches the incorrect/default models.

---

### R2: Caching & Cost Calculation Formulas

#### 1. Cache Token Estimation in `scanner.py`
- **File**: `scanner.py`
- **Line Numbers**: 226-233
- **Observation**:
  ```python
  if len(turns) == 0:
      cache_read = 0
      cache_creation = input_tokens
  else:
      cache_read = cumulative_tokens
      cache_creation = input_tokens
  ```
  The logic behaves as follows:
  - Turn 1: 0 cache read, new input tokens are written (`cache_creation`).
  - Turn 2+: Previous history (sum of all prior input and output tokens, tracked in `cumulative_tokens`) is read from cache (`cache_read`), and new input tokens are written (`cache_creation`).
  This correctly models prompt caching.

#### 2. Cost Calculation in `dashboard.py`
- **File**: `dashboard.py`
- **Line Numbers**: 45-49 (`calc_cost`)
- **Observation**:
  ```python
  def calc_cost(model, inp, out, cache_read=0, cache_write=0):
      p = get_pricing(model)
      cr_rate = p.get("cache_read", p["input"] * 0.1)
      cw_rate = p.get("cache_write", p["input"] * 1.25)
      return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
  ```
  This formula estimates cost using cache read, cache write, and output tokens. The `inp` parameter is ignored since input tokens are billed as cache writes.

#### 3. Discrepancy in `cli.py`
- **File**: `cli.py`
- **Line Numbers**: 14-23 (`PRICING`), 44-46 (`calc_cost`), 80-89 (`cmd_today`), 130-141 (`cmd_week`), 186-195 (`cmd_stats`)
- **Observation**:
  `cli.py` ignores prompt caching entirely.
  - The `PRICING` catalog in `cli.py` lacks `cache_read` and `cache_write` pricing.
  - `calc_cost` in `cli.py` is defined as:
    ```python
    def calc_cost(model, inp, out):
        p = get_pricing(model)
        return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)
    ```
  - The SQLite queries for `today`, `week`, and `stats` in `cli.py` do not select `cache_read_tokens` or `cache_creation_tokens`.
  This results in cost calculation discrepancies between the CLI and the web dashboard.

---

## Concrete Fix Strategy

### 1. Fix R1: Model Name Truncation
In `scanner.py`, modify line 92 to remove the period `\.` from the character exclusion class:
```python
# Before
match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n\.]+)", text_to_search)

# After
match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n]+)", text_to_search)
```
This allows the parser to extract version numbers with decimal points. The subsequent splitting logic on line 96 (`re.split(r"\.\s+[A-Z]", val)`) will still correctly handle sentence boundaries.

### 2. Fix R2: Harmonize Cost Calculations in CLI
To ensure CLI matches the Dashboard cost estimates:

1. **Update `PRICING` in `cli.py`** to define `cache_read` and `cache_write` keys (matching `dashboard.py` pricing catalog).
2. **Update `calc_cost` in `cli.py`** to calculate cost with caching rates:
   ```python
   def calc_cost(model, inp, out, cache_read=0, cache_write=0):
       p = get_pricing(model)
       cr_rate = p.get("cache_read", p["input"] * 0.1)
       cw_rate = p.get("cache_write", p["input"] * 1.25)
       return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
   ```
3. **Update Database Queries in `cli.py`**:
   In `cmd_today()`, `cmd_week()`, and `cmd_stats()`, retrieve the caching token sums (`cache_read_tokens` and `cache_creation_tokens`):
   ```sql
   SELECT
       COALESCE(model, 'unknown') as model_name,
       SUM(input_tokens)          as inp,
       SUM(output_tokens)         as out,
       SUM(cache_read_tokens)     as cread,
       SUM(cache_creation_tokens) as cwrite,
       COUNT(*)                   as turns
   ...
   ```
   And invoke the updated cost function:
   ```python
   cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])
   ```
