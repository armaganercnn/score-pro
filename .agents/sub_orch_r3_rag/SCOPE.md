# Scope: R3 - Data Isolation & Agent RAG Scope

## Architecture
- Limit retrieved knowledge in `KnowledgeRagService` to resources authorized for the user/agent.
- Evaluate user authority on data sources using `GovernanceGate` on behalf of the user.

## Milestones
- Milestone 1: Refactor `KnowledgeRagService.java` retrieval path to apply isolation checks.
- Milestone 2: Wrap DATA_SOURCE accesses with `GovernanceGate` check using user context.
- Milestone 3: Write tests verifying unauthorized requests are blocked.

## Interface Contracts
- Non-privileged requests cannot query metadata referencing unauthorized data sources.

## Code Layout
- Service: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`
- Governance Gate: `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceGate.java`
