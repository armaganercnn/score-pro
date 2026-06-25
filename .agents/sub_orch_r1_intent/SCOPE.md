# Scope: R1 - Typed Action Schemas & LLM Intent Detection

## Architecture
- Define schemas and capabilities on `ActionType` and `ChatAction`.
- Extract action type and payload dynamically using LLM / Spring AI in `ActionIntentService`.
- Heuristic keyword-based matching is fully removed.

## Milestones
- Milestone 1: Enhance `ActionType.java` and `ChatAction.java` to support schema JSON payloads and capability requirements.
- Milestone 2: Replace `ActionIntentService.java` heuristics with LLM/Spring AI intent detection.
- Milestone 3: Write tests validating intent detection accuracy (>=95%).

## Interface Contracts
- `ActionType` enum has parameter schemas and capabilities.
- `ActionIntentService.detectAndPropose` parses inputs into typed fields.

## Code Layout
- Enum and Entities: `backend/src/main/java/com/akilliorganizasyon/chatbot/domain/`
- Service: `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`
