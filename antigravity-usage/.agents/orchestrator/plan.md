# Execution Plan

## Milestones & Tasks

### Milestone 1: E2E Testing Track
- Spawn E2E Testing Orchestrator (or do it via subagent/self) to design `TEST_INFRA.md` and implement the 4-tier E2E testing.
- Target: At least 11 * N + max(5, N/2) tests, covering features, boundary/corner cases, cross-feature combinations, and real-world scenarios.
- Generate tests and publish `TEST_READY.md`.

### Milestone 2: R1 Model Settings Parsing
- Update `scanner.py` regex `changed setting\s+\`Model Selection\`\s+from\s+.*?\s+to\s+([^`\n\.]+)` to not truncate decimal values.
- Ensure correct mapping to "Gemini 3.5 Flash (High)".
- Update UI labels from `'gemini-3.5-flash'` to `'gemini-3.5-flash-medium'` or `'flash-medium'`.

### Milestone 3: R2 Caching & Cost Calculations
- Modify session caching in `scanner.py`: `cache_creation_tokens` should only be set on the first turn of a session, and be `0` for subsequent turns.
- In `dashboard.py` and `cli.py`, implement full cost calculations:
  - Cache write tokens: `cache_write * cw_rate` (1.25x base)
  - Cache read tokens: `cache_read * cr_rate` (0.1x base)
  - Normal input tokens: `normal_input = max(0, total_input - cache_write)` at base rate
  - Output tokens: `out * output_rate`
  - Total = Sum of these four components.

### Milestone 4: R3 Date Range Adjustments
- Add +1 day to duration or subtract `days + 1` from cutoff date in dashboard data retrieval/filters to capture full date range.

### Milestone 5: R4 Premium Compact UI & Blue Theme
- Change CSS variables / color palette: `#0b0f19` (background), `#151b2c` (card), `#38bdf8` (cyan/blue accent).
- Royal blue for inputs, Violet for outputs, Teal for cache read, Cyan for cache write.
- Update layout to use a single 7-column grid on desktop.
- Reduce margins/paddings, reduce chart heights (290px/240px).

### Milestone 6: E2E Integration, Review & Hardening
- Rebuild database with `python cli.py scan`.
- Run E2E tests and fix any failing test cases.
- Run Reviewers, Challengers, and Forensic Auditor for validation.
- Success and handoff.
