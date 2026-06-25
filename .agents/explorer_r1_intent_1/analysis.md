# Action Intent Detection Analysis

This document details the read-only exploration and structured design analysis for replacing the heuristic keyword-based intent detection system in the `chatbot` module with a robust LLM-based intent detection system powered by Spring AI.

---

## 1. Action Schema and Capability Enhancements (`ActionType.java` & `ChatAction.java`)

### Current State
- `ActionType` is a simple Java enum mapping to 5 high-level intent categories: `REPORT_REQUEST`, `ACCESS_REQUEST`, `TASK_CREATE`, `AGENT_TASK`, `NOTIFY`.
- `ChatAction` is an entity that stores the proposed action metadata and a dynamic JSONB payload map, but lacks direct access to the parameter schema or capability requirements of the action.

### Proposed Architecture
To support formal contracts for action execution and governance checks:
1. **Dynamic Parameter Schemas**:
   - Each `ActionType` enum constant is enhanced to define a standard JSON Schema (`parameterSchema`) indicating the required and optional parameters.
   - For example, `TASK_CREATE` specifies fields: `title`, `description`, `priority` (LOW, MEDIUM, HIGH), and `dueDate` (ISO-8601).
2. **Modulith-Compliant Capability Definitions**:
   - To check authorization via the governance gate, each `ActionType` defines its capability requirements: `requiredCapabilityType`, `requiredCapabilityTarget`, and `requiredCapabilityAction`.
   - **Crucial Modulith Constraint**: `chatbot` module cannot import `CapabilityType` from `agentlifecycle` module. Therefore, capability type is stored as a raw String (e.g., `"ACTION"`), which matches `GovernanceGate.check` interface signature (`check(UUID agentId, String capabilityType, String targetRef, String action)`).
3. **ChatAction Delegation**:
   - `ChatAction` exposes these schema and capability details using dynamic getter delegation methods (`getParameterSchema()`, etc.) referring to `actionType`. This eliminates any need for database schema migrations or additional column mapping.

---

## 2. LLM-Based Intent Detection (`ActionIntentService.java`)

### Current State
- `ActionIntentService` maps a static set of Turkish and English keyword lists (`IntentRule`) to determine if a message contains a matching word, then extracts a basic snippet.
- This is fragile, fails on compound sentences, cannot parse relative dates (e.g., "yarın sabah" -> ISO-8601), and cannot parse nested parameters accurately.

### Proposed Architecture
1. **Removal of Heuristics**:
   - The static list of keywords and manual search loops are entirely deleted.
2. **Spring AI Integration**:
   - `AiChatService` and Jackson's `ObjectMapper` are injected into `ActionIntentService`.
   - If `AiChatService.isEnabled()` is false, the service cleanly degrades by returning `Optional.empty()` (never falling back to keywords).
3. **Intent Detection Prompt**:
   - The system prompt is dynamically populated with all available `ActionType` schemas.
   - The LLM is instructed to respond strictly in a JSON structure:
     ```json
     {
       "matched": true,
       "actionType": "TASK_CREATE",
       "payload": {
         "title": "...",
         "priority": "..."
       }
     }
     ```
   - Relative dates are resolved relative to the current timestamp.
4. **Resilient Parsing**:
   - The output is sanitized (removing potential markdown code blocks like ` ```json `) and parsed into a lightweight record `IntentResult`.
   - The extracted payload is nested appropriately (e.g., putting `title` and `priority` under a nested `"task"` map for `TASK_CREATE`) to remain backward-compatible with existing downstream executors like `TaskCreateChatActionExecutor`.

---

## 3. Accuracy Validation and Test Suite (`ActionIntentServiceAccuracyTest.java`)

### Goal
- Validate intent detection accuracy of the LLM-based parser to be $\ge 95\%$.

### Proposed Test Strategy
1. **Integration Test Suite**:
   - A Spring Boot integration test `ActionIntentServiceAccuracyTest` evaluates a suite of 20 diverse user input sentences (Turkish and English, direct requests, list commands, unrelated conversational sentences).
2. **Resilience & CI Guardrails**:
   - The test uses JUnit's `Assumptions.assumeTrue(aiChatService.isEnabled())` so that the build does not fail in offline local developer environments where Kimi/OpenAI keys are not configured.
   - In environments where the LLM is configured (e.g. box environment), it runs the evaluation, calculates the accuracy ratio, and asserts $\ge 95\%$ matching.
3. **Mock Compatibility**:
   - Existing unit tests (e.g., `ChatActionServiceTest`) are updated to mock the new constructor of `ActionIntentService`, providing `AiChatService` and `ObjectMapper` and mocking successful JSON output.

---

## 4. Proposed Diffs

Please refer to the following proposed files in the working directory:
- `proposed_ActionType.java` - Enhanced enum with parameter schemas and capability strings.
- `proposed_ChatAction.java` - Enhanced entity with delegation methods.
- `proposed_ActionIntentService.java` - LLM-based intent detection replacing keyword heuristics.
- `proposed_ActionIntentServiceAccuracyTest.java` - The accuracy validation test suite.
- `intent_detection.patch` - A complete machine-applicable patch file.
