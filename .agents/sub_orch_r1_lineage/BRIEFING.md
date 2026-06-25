# BRIEFING — 2026-06-19T12:18:00Z

## Mission
Implement automatic lineage tracking (data_lineage table, AiExecutionTracker) and provenance enrichment for ReportRun and KnowledgeEntry.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/armaganercan/antigravity/intelligent-organization/.agents/sub_orch_r1_lineage
- Original parent: main agent
- Original parent conversation ID: 9a27ccc8-2989-44d1-b576-7fa2efc37afe

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: /Users/armaganercan/antigravity/intelligent-organization/.agents/sub_orch_r1_lineage/SCOPE.md
1. **Decompose**: Decompose Milestone 2: R1 (Lineage & Provenance) into granular tasks matching code boundaries.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor cycle.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns.
- **Work items**:
  1. Initialize files and check current codebase [in-progress]
  2. Implement Automatic Lineage tracking in ReportExecutionService and agent tasks [pending]
  3. Implement Provenance block for ReportRun.source_info and KnowledgeEntry.metadata [pending]
  4. Verify with unit/integration tests [pending]
- **Current phase**: 1
- **Current focus**: Initialize files and check current codebase

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- Audit is a BINARY VETO — violation means failure, no exceptions.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 9a27ccc8-2989-44d1-b576-7fa2efc37afe
- Updated: not yet

## Key Decisions Made
- Initializing files and setting up the tracking framework.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Explorer 1 | teamwork_preview_explorer | Explore lineage and provenance setup | pending | abe5a63d-ab1a-4348-b5d6-84e0e45f9bc1 |
| Explorer 2 | teamwork_preview_explorer | Explore lineage and provenance setup | pending | 98354be7-b816-4aab-954a-be9628f6ec6a |
| Explorer 3 | teamwork_preview_explorer | Explore lineage and provenance setup | pending | c2361ba6-5108-43d0-a5a1-512bb85e92f5 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: abe5a63d-ab1a-4348-b5d6-84e0e45f9bc1, 98354be7-b816-4aab-954a-be9628f6ec6a, c2361ba6-5108-43d0-a5a1-512bb85e92f5
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 43394733-8163-4e72-bf29-124db104a7ad/task-17
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- /Users/armaganercan/antigravity/intelligent-organization/.agents/sub_orch_r1_lineage/progress.md — progress tracking
- /Users/armaganercan/antigravity/intelligent-organization/.agents/sub_orch_r1_lineage/BRIEFING.md — persistent memory
