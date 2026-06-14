# E2E Test Infra: Antigravity Usage Dashboard

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Model Settings Parsing & Normalization | R1 | 5 | 5 | ✓ |
| 2 | Cache Creation and Read Logic | R2 | 5 | 5 | ✓ |
| 3 | Cost Calculation Formulas | R2 | 5 | 5 | ✓ |
| 4 | Date Range Filters (+1 day offset) | R3 | 5 | 5 | ✓ |
| 5 | UI Theme, Spacing, and Card Grid | R4 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: `pytest` based runner using subprocesses to invoke `cli.py` or start/query `dashboard.py`.
- Environment overrides: `ANTIGRAVITY_BRAIN_DIR` and `ANTIGRAVITY_DB_PATH` to isolate tests from real user data.
- Mock transcripts directory: `tests/fixtures/` containing mock `transcript.jsonl` files for different test scenarios.
- Directory layout:
  ```
  tests/
  ├── run_tests.py
  ├── test_cli.py
  ├── test_dashboard.py
  ├── fixtures/
  │   ├── basic_session/
  │   ├── model_override/
  │   ├── cache_heavy/
  │   └── malformed/
  └── tmp/
  ```

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Scan and All-Time Report | F1, F2, F3, F5 | Low |
| 2 | Incremental Update (Delta Scan) | F2, F3, F5 | Medium |
| 3 | Multi-Model and Transition Session | F1, F3, F5 | Medium |
| 4 | Cache-Intense Long Session | F2, F3, F5 | High |
| 5 | Multi-Project Session Analysis | F1, F3, F5 | High |
| 6 | Interactive Dashboard Session | F1, F2, F3, F4, F5 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total 25)
- Tier 2: ≥5 per feature (Total 25)
- Tier 3: pairwise coverage of major feature interactions (Total >=5)
- Tier 4: ≥6 realistic application scenarios
