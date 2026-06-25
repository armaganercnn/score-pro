# Scope: E2E Testing Track

## Architecture
- Opaque-box, requirement-driven E2E/integration tests.
- Test runner and test suite verifying Lineage & Provenance, Ontology Registry, and Advanced RAG.

## Milestones
- Milestone 1: Create Test Plan and Feature Inventory (Tier 1-4).
- Milestone 2: Implement test cases covering R1, R2, R3.
- Milestone 3: Verify all test cases run and pass. Publish `TEST_READY.md`.

## Interface Contracts
- Must match endpoints:
  - `GET /api/ontology/objects`
  - `GET /api/ontology/links`
  - `GET /api/ontology/objects/datasource/instances/{id}`
- Must verify database entries in `data_lineage` and `ReportRun`/`KnowledgeEntry` JSONB.

## Code Layout
- Test directory: `backend/src/test/java/com/akilliorganizasyon/`
