# Scope: Implementation Track

## Architecture
- `scanner.py`: Extracts model selections, calculates session cache usage, and inserts parsed records into the database.
- `cli.py`: Command line tool for invoking the scanner and rebuilding the database.
- `dashboard.py`: Serves the web-based UI, implements cost calculation logic, and handles range filtering.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Backend Logic (R1 & R2) | Correct model parsing in scanner.py, caching token calculation in scanner.py, and cost formula update in cli.py and dashboard.py. | None | PLANNED |
| 2 | Frontend & Date Range (R3 & R4) | Date filter adjustments (+1 day) and premium compact blue theme styling in dashboard.py. | M1 | PLANNED |
| 3 | E2E Integration (Phase 1 & 2) | Pass 100% of E2E tests (Tier 1-4) and perform Tier 5 Adversarial Coverage Hardening once TEST_READY.md is published. | M1, M2 | PLANNED |

## Interface Contracts
### scanner.py ↔ usage.db
- `scanner.py` parses logs and inserts records into `usage.db`.
- `cache_creation_tokens` must only be set for the first turn of a session, and subsequent turns must be 0 with correct cache_read_tokens.

### dashboard.py / cli.py ↔ usage.db
- Database queries must correctly extract model name (including decimals e.g. "Gemini 3.5 Flash (High)").
- Cost calculation formula must correctly sum normal input tokens, cache read tokens, cache write tokens, and output tokens using their respective pricing coefficients.
