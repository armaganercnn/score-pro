# Handoff Report: R1 - Typed Action Schemas & LLM Intent Detection

This report is compiled by `explorer_r1_intent_3` following the read-only exploration and analysis of the intent detection subsystem.

## 1. Observation

Direct observations from the codebase:

1. **`ActionType.java`**
   - Path: `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`
   - Content: Simple enum containing 5 action types without any fields or properties.
     ```java
     public enum ActionType {
         REPORT_REQUEST,
         ACCESS_REQUEST,
         TASK_CREATE,
         AGENT_TASK,
         NOTIFY
     }
     ```

2. **`ChatAction.java`**
   - Path: `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`
   - Content: Entity class mapping to `chat_actions` table.
     ```java
     @Column(name = "action_type", nullable = false, length = 60)
     private ActionType actionType;

     @JdbcTypeCode(SqlTypes.JSON)
     @Column(columnDefinition = "jsonb", nullable = false)
     private Map<String, Object> payload = new HashMap<>();
     ```
   - Current DB schema defines `payload` as `JSONB NOT NULL DEFAULT '{}'` (from `V13__chatbot.sql`).

3. **`ActionIntentService.java`**
   - Path: `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`
   - Content:
     - Uses a static list of keyword rules to match user messages to `ActionType` (lines 29-40).
     - Loops over rules using `contains` matching (lines 64-66):
       ```java
       for (IntentRule rule : RULES) {
           Optional<String> hit = rule.keywords().stream().filter(lower::contains).findFirst();
           if (hit.isPresent()) {
               ...
       ```
     - Extracts fields using basic string manipulation helpers like `taskTitle` and `snippet`.

4. **`TaskCreateChatActionExecutor.java`**
   - Path: `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/service/execution/TaskCreateChatActionExecutor.java`
   - Content:
     - Maps payload to `TaskActionPayload` (lines 63-79).
     - Looks up nested `task` object as well as top-level fallback keys (`taskTitle`, `title`, etc.) when creating tasks.

5. **`ChatActionServiceTest.java`**
   - Path: `/Users/armaganercan/antigravity/intelligent-organization/backend/src/test/java/com/akilliorganizasyon/chatbot/service/ChatActionServiceTest.java`
   - Content:
     - Line 165 instantiates `ActionIntentService` manually using `new ActionIntentService(repository)`. Replacing the service's dependencies will require updating this test to inject mocked instances of `AiChatService` and `ObjectMapper`.

---

## 2. Logic Chain

Based on the observations:

1. **Enhancing schemas and capabilities**:
   - `ActionType` enum constants should store static definition strings representing their JSON input parameters schema and capability requirements (e.g. `"ACTION:TASK_CREATE"`).
   - In `ChatAction.java`, `@Transient` getters (`getSchemaJson` and `getRequiredCapability`) delegating to the underlying `ActionType` allow direct query of schemas and capabilities without requiring database migration.
   - Alternatively, if dynamic overrides are needed, adding columns `schema_json` (JSONB) and `required_capability` (VARCHAR) to `chat_actions` table via a new SQL migration will store these fields per action instance.

2. **Replacing heuristics with LLM detection**:
   - Removing the static `RULES` list and the `contains` logic completely satisfies the requirement to fully remove keyword-based matching.
   - Injecting `AiChatService` and `ObjectMapper` into `ActionIntentService` allows calling the model with a structured System Prompt containing all schemas and matching instructions.
   - Parsing the LLM response is performed robustly by locating the JSON envelope `{ ... }` using `extractJson` (analogous to the verified mechanism in `AiReportDesigner.java`) and mapping it to a typed record (`IntentResult`) using Jackson `ObjectMapper`.
   - High-impact action verification (e.g., setting `requiresApproval = true` for `ActionType.ACCESS_REQUEST`) is performed statically on matching types.

3. **Writing Accuracy tests**:
   - Unit tests mock the `AiChatService` to assert proper JSON parsing and fallback behaviors (such as handling malformed JSON, AI unavailable, and non-matched messages).
   - An integration test with a real dataset of 20-30 varied expressions checks if `correctMatches / totalScenarios >= 0.95`. If the AI provider is disabled, the test should complete gracefully to avoid build failure in non-API environments.

---

## 3. Caveats

- **AI Availability**: If the API key is not set, LLM intent detection will not run and must gracefully return `Optional.empty()`. 
- **JSON Format Fragility**: LLM output formatting can be noisy (markdown tags, introductory text). The `extractJson` method mitigates this by finding the outer boundaries of the first `{` and last `}` curly braces, but extremely malformed outputs will result in classification failure.

---

## 4. Conclusion

The transition from keyword-based heuristics to Spring AI LLM-based intent detection is feasible and clean.
- `ActionType` and `ChatAction` will be enhanced with static/dynamic schemas and capability references.
- `ActionIntentService` will utilize `AiChatService` and `ObjectMapper` to dynamically evaluate intents and format typed payloads.
- An accuracy integration test suite will validate the >=95% threshold under the live environment, fallback-protected when AI is disabled.

---

## 5. Verification Method

- **Unit Testing**: 
  - `mvn test -Dtest=ActionIntentServiceTest` (to be created, checking mock inputs and parser robustness).
- **Integration Testing**:
  - `mvn test -Dtest=ActionIntentAccuracyIntegrationTest` (to be created, evaluating classification accuracy over the dataset).
- **Verify Modulith Boundaries**:
  - Run `mvn test -Dtest=ModulithVerificationTest` to ensure that chatbot changes do not violate module boundaries.
