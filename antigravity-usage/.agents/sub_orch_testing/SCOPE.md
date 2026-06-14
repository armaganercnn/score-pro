# Scope: E2E Testing Track

## Architecture
- **E2E Test Runner**: Opaque-box test runner executing CLI commands (`cli.py`) and API server endpoints (`dashboard.py`) using subprocesses.
- **Environment Isolation**: Uses `ANTIGRAVITY_BRAIN_DIR` and `ANTIGRAVITY_DB_PATH` environment variables to separate test execution from production user data.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infrastructure Design | Define feature inventory and write TEST_INFRA.md at project root. | None | DONE |
| 2 | Test Harness & CLI Verification | Implement core test harness, CLI verification tests. | M1 | DONE |
| 3 | API & UI Integration Verification | Implement dashboard API and mock UI responses tests. | M2 | IN_PROGRESS |
| 4 | Comprehensive 4-Tier Test Cases | Implement all Tier 1, 2, 3, 4 test cases. | M3 | PLANNED |
| 5 | Test Verification & Release | Verify tests run, document failures on unpatched codebase, and publish TEST_READY.md. | M4 | PLANNED |

## Interface Contracts
- **Test Runner ↔ cli.py / dashboard.py**:
  - Test runner spawns subprocesses for `python cli.py <cmd>` and `python dashboard.py`.
  - Environmental overrides: `ANTIGRAVITY_BRAIN_DIR` and `ANTIGRAVITY_DB_PATH`.
  - Exit codes: all successful CLI invocations must exit with code 0.
