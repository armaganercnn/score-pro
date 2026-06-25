# Scope: E2E Testing Track (New)

## Architecture
- Opaque-box, requirement-driven E2E/integration tests.
- Test runner and test suite verifying LLM intent detection accuracy, tool governance checking (shadow & enforce), user on-behalf-of data isolation, and masking.

## Milestones
- Milestone 1: Create Test Plan and Feature Inventory (Tier 1-4).
- Milestone 2: Implement test cases covering R1, R2, R3, R4.
- Milestone 3: Verify all test cases run and pass. Publish `TEST_READY.md`.

## Interface Contracts
- Must verify:
  - Action intent accuracy via `ActionIntentService` tests.
  - Tool execution governance shadow & enforce behaviors via `ChatToolsGovernanceIntegrationTest` (AC4).
  - Modulith architectural compliance via `ModulithVerificationTest`.
  - Data isolation blocking on RAG and data sources.
  - Sensitivity masking using `MaskingService`.

## Code Layout
- Test directory: `backend/src/test/java/com/akilliorganizasyon/`
