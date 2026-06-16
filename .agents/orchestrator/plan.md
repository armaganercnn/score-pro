# Plan: Flow Visualizer Enhancements

This plan describes the implementation of the Flow Visualizer enhancements requested in ORIGINAL_REQUEST.md.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: PO Vision & Codebase Analysis | Run codebase analysis. Prepare PO Vision Alignment and Gap Analysis report. Update `.wiki/moduller/modul_aidebug_flow_visualizer_analizi.md` and root `PROJECT.md`. | None | PLANNED |
| 2 | R2 & R4: Frontend Components Enhancements | Implement Data Source visualization (RAG, Tools, Screens badges) in `AgentNode.vue` and details in `FlowDetailDrawer.vue`. Implement latency/error visual badges and root-cause analysis details. | M1 | PLANNED |
| 3 | R3: Backend Loop Detection & Integration | Implement backend loop detection in `OrchestrationService` & DTOs. Integrate loop warnings/edges highlighting into the frontend Vue Flow. | M1 | PLANNED |
| 4 | E2E Testing & Verification | Write tests (Challenger), verify implementation correctness, and perform Forensic Audit check. | M2, M3 | PLANNED |

## Detailed Steps

### Milestone 1: PO Vision & Codebase Analysis
- **Goal**: Understand current frontend/backend Flow Visualizer implementation, do a gap analysis, draft a PO-level vision enhancement (token cost, live messaging flows, bottleneck analysis), update the wiki doc, and update `PROJECT.md`.
- **Subagent**: `teamwork_preview_explorer` (explorer_flow_visualizer)
- **Handoff criteria**: A detailed handoff analysis report, updated `PROJECT.md`, updated wiki index and flow visualizer analysis doc.

### Milestone 2: Frontend Components (R2 & R4)
- **Goal**: Add RAG (📚), Tools (🛠️), and Screens (📱) badges in `AgentNode.vue` with counts. Add detailed sections in `FlowDetailDrawer.vue`. Display latency/error status visually (yellow/red borders, pulse effects).
- **Subagent**: `teamwork_preview_worker` (worker_frontend)
- **Handoff criteria**: Compiling frontend, passing linters/typechecks, visually validated badges and performance tags.

### Milestone 3: Backend Loop Detection (R3)
- **Goal**: Add loop detection logic (detecting repeating calls of the same agent/role in run/chat history, e.g. >= 3 occurrences in parent-child or context paths). Add `isLooping` and `warnings` fields to `RunDetailDto` / `AgentTaskDto`. Integrate in frontend store and highlight loop edges in red/dashed lines.
- **Subagent**: `teamwork_preview_worker` (worker_backend)
- **Handoff criteria**: Compiling backend, passing tests, integrated loop detection.

### Milestone 4: Verification (Challenger & Auditor)
- **Goal**: Run tests, check for compliance, run E2E scenarios, and pass Forensic Auditor checks with a CLEAN verdict.
- **Subagent**: `teamwork_preview_challenger` and `teamwork_preview_auditor`
- **Handoff criteria**: Verified test execution, green status, and CLEAN auditor report.
