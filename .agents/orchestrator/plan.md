# Plan: Chatbot Integration & Orchestration Verification

This plan outlines the steps required to verify the end-to-end agent orchestration (Orchestrator, Finance, Operation, and Reporting specialists with Ayşe Yılmaz's persona settings), populate PostgreSQL test data, execute a complex chatbot task, and trace execution via agent task traces.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Codebase & Database Exploration | Map database schema, seed data structure, auth flow, chatbot APIs, and task tracing tables. | None | PLANNED |
| 2 | Test Data Preparation | Write SQL scripts to insert required organizations, projects, knowledge entries, and update Ayşe Yılmaz's persona in PostgreSQL. Apply changes to the database. | M1 | PLANNED |
| 3 | Verification Script & Execution | Write `verify_orchestration.py` to login, start conversation, poll until COMPLETED, and output/assert the synthesis format. Run verification. | M2 | PLANNED |
| 4 | Trace & Policy Verification | Verify DB entries in `agent_task_traces`, log visualizer compliance, policy evaluation rules, and execute Forensic Audit. | M3 | PLANNED |

## Detailed Steps

### Milestone 1: Codebase & Database Exploration
- **Goal**: Understand the database table structures, existing user entries, and endpoints.
- **Subagent**: `teamwork_preview_explorer` (explorer_r1_1)
- **Handoff criteria**: Verification of table structure, chatbot endpoints, and script requirements.

### Milestone 2: Test Data Preparation
- **Goal**: Insert the test data described in R1 into PostgreSQL.
- **Subagent**: `teamwork_preview_worker` (worker_r1_1)
- **Handoff criteria**: DB seed script created and executed, verified by listing database records.

### Milestone 3: Verification Script & Execution
- **Goal**: Write and run `verify_orchestration.py` to trigger the flow and confirm correct synthesis outputs.
- **Subagent**: `teamwork_preview_worker` (worker_r1_2)
- **Handoff criteria**: `verify_orchestration.py` created and successfully run with matching outputs.

### Milestone 4: Trace & Policy Verification
- **Goal**: Audit the task traces (`agent_task_traces`) and policy evaluations, then run the Forensic Auditor to verify execution.
- **Subagent**: `teamwork_preview_auditor` (auditor_r1_1)
- **Handoff criteria**: Clean Forensic Audit run, task trace entries checked.
