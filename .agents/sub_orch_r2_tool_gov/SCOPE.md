# Scope: R2 - Governance-Enforced LLM Tool-Calling Loop

## Architecture
- Tools are presented to LLM dynamically based on the active `ActionType`.
- Enforce tool checking in the `withContext` wrapper in `ChatToolsConfiguration`.
- Depend on `GovernanceGate` instead of `AgentGuardService` to satisfy Spring Modulith boundaries.
- Block execution and throw `GovernanceDeniedException` if `check` returns `DENY` (in `ENFORCE` mode). Save audit reports in `SHADOW` mode.

## Milestones
- Milestone 1: Refactor `ChatToolsConfiguration.java` to inject `GovernanceGate` instead of direct `AgentGuardService` dependency.
- Milestone 2: Update `withContext` wrapper to evaluate `GovernanceGate.check` and throw `GovernanceDeniedException` if denied under `ENFORCE` mode.
- Milestone 3: Support dynamic schemas per action type.

## Interface Contracts
- `GovernanceGate.check` is called on all tool executions.
- `GovernanceDeniedException` carries code `GOVERNANCE_DENIED`.

## Code Layout
- Service: `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`
- Governance Gate: `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceGate.java`
