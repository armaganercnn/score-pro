## 2026-06-14T05:25:40Z
You are Worker for Milestone 1 (Test Infrastructure Design).
Your working directory is /Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/.agents/worker_m1_design/.
Your task is to create the file /Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/TEST_INFRA.md based on the Explorer recommendations.

The file content must strictly match the following template:

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

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write this file, verify it exists, and report back with your handoff.md.
