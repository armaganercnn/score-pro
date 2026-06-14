# Project: Antigravity Usage Dashboard

## Architecture
- `scanner.py`: Database scanner, session parser, writes to `usage.db`.
- `cli.py`: CLI command for scanning and rebuilding.
- `dashboard.py`: Custom local web server and dashboard UI serving static HTML/CSS/JS and SQLite query responses.
- `usage.db`: SQLite database for usage tracking.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Track | Design and implement complete opaque-box E2E test suite (Tiers 1-4) | None | IN_PROGRESS (Conv: 0ef56cce-eaf2-401e-afae-ee510282b817) |
| 2 | R1 Model Settings | Fix scanner.py regex for Model Selection decimal parsing & normalize names in dashboard.py, UI display names. | M1 | IN_PROGRESS (Conv: e88821bf-baca-4bf5-a6d0-f0a04f05b39e) |
| 3 | R2 Caching & Costs | Correct session caching tokens and update cost formulas in scanner.py, dashboard.py, cli.py. | M1 | IN_PROGRESS (Conv: e88821bf-baca-4bf5-a6d0-f0a04f05b39e) |
| 4 | R3 Date Filtering | Adjust date range logic by adding +1 day to encompass the full date range. | M1 | IN_PROGRESS (Conv: e88821bf-baca-4bf5-a6d0-f0a04f05b39e) |
| 5 | R4 Blue Theme UI | Overhaul layout, margins, chart heights, color palettes, and compact metrics. | M1 | IN_PROGRESS (Conv: e88821bf-baca-4bf5-a6d0-f0a04f05b39e) |
| 6 | E2E Integration & Verification | Pass 100% of the E2E test suite, perform Phase 2 adversarial coverage hardening. | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### scanner.py ↔ usage.db
- `scanner.py` parses logs and inserts records into `usage.db`.
- Schema must support model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens.

### dashboard.py / cli.py ↔ usage.db
- Reads session records and aggregates metrics by model.
- Estimates cost with corrected formulas.

## Code Layout
- `/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/cli.py`
- `/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/scanner.py`
- `/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/dashboard.py`
- `/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db`
