## 2026-06-19T12:25:05Z

You are a worker agent (teamwork_preview_worker).
Your identity is: worker_r2
Your working directory is: /Users/armaganercan/antigravity/intelligent-organization/.agents/worker_r2

Your task is to implement the code changes for Milestone R2: Governance-Enforced LLM Tool-Calling Loop.
Read:
- Scope: /Users/armaganercan/antigravity/intelligent-organization/.agents/sub_orch_r2_tool_gov/SCOPE.md
- User Request: /Users/armaganercan/antigravity/intelligent-organization/.agents/ORIGINAL_REQUEST.md (specifically R2 under follow-up 2026-06-19T15:15:58+03:00)
- Explorer Handoff: /Users/armaganercan/antigravity/intelligent-organization/.agents/explorer_r2_1/handoff.md

Instructions:
1. Database Migration:
   Create a Flyway migration file `V47__add_chat_action_governance_fields.sql` in `backend/src/main/resources/db/migration/` containing:
   ```sql
   ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS input_schema TEXT;
   ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS required_capability VARCHAR(100);
   ```

2. Domain Model Updates:
   - In `ActionType.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`), add `inputSchema` (String) and `requiredCapability` (String) fields, initialize them in the enum constructor, and add public getter methods for them.
   - In `ChatAction.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`), map these two new database columns:
     - `inputSchema` mapped to `input_schema` column as TEXT.
     - `requiredCapability` mapped to `required_capability` column as VARCHAR(100).

3. Extensibility for Options:
   - In `AiCompletionOptions.java` (`backend/src/main/java/com/akilliorganizasyon/shared/ai/AiCompletionOptions.java`), add a third field `Set<String> functions` to the record:
     `public record AiCompletionOptions(String model, Double temperature, java.util.Set<String> functions)`
     Overload the constructors and factory methods to preserve backward compatibility (e.g. `of(String, Double)` should delegate to three-arg constructor with null `functions`, and define `of(String, Double, Set<String>)`). Update `NONE` instance. Update `isEmpty()`.
   - In `AiChatService.java` (`backend/src/main/java/com/akilliorganizasyon/shared/ai/AiChatService.java`), update the `buildPrompt` method: if the model supports tools, and `options.functions()` is not null, use `options.functions()` as the active functions set; otherwise fallback to the default `configuredFunctions()`.
   - In `AiChatService.java`, overload the `stream` method:
     `public Flux<String> stream(String systemPrompt, String userPrompt, AiCompletionOptions options)`
     Make the existing `stream(String, String)` delegate to this new method passing `AiCompletionOptions.NONE`.

4. Tool Governance Enforcement:
   - In `ChatToolsConfiguration.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`), inject `GovernanceGate` (type `com.akilliorganizasyon.shared.governance.GovernanceGate`) into the constructor. Ensure you check for null to prevent potential NullPointerExceptions in tests.
   - In `withContext` wrapper method, check if `AiExecutionTracker.get()` is not null and if `tracker.getActingAgentId()` is not null.
   - If `actingAgentId` is present, call `governanceGate.check(actingAgentId, "TOOL", toolName, "EXECUTE")`.
   - If the check effect is `GateEffect.DENY` (i.e. `!decision.allowed()`), log the deny action and throw a `new com.akilliorganizasyon.shared.governance.GovernanceDeniedException(decision.reason())`.
   - Add a method to map `ActionType` to their allowed tool names (beans) to support dynamic function schemas:
     ```java
     public Set<String> getFunctionsForActionType(ActionType actionType) {
         if (actionType == null) {
             return Collections.emptySet();
         }
         return switch (actionType) {
             case REPORT_REQUEST -> Set.of("listProjects", "listDataSources");
             case ACCESS_REQUEST -> Set.of("listDigitalAssets", "listOrgUnits", "listDataSources");
             case TASK_CREATE -> Set.of("createTask", "listUsers", "listMyTasks");
             case AGENT_TASK -> Set.of("delegateToOrchestrator", "listMySubordinates");
             case NOTIFY -> Set.of("listUsers");
         };
     }
     ```

5. Refactor Intent Detection & Dynamic Tools Presentation:
   - In `ActionIntentService.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`), remove the static keyword-based matching.
   - Implement LLM-based intent detection using `aiChatService.complete`. Write a system prompt that outputs JSON format containing `actionType` and `payload` (parameters for the action type).
   - Define a helper class/record to read this JSON (e.g. `LlmIntentResult` with `ActionType actionType` and `Map<String, Object> payload`). Parse it with Jackson `ObjectMapper`.
   - Provide a method to propose and persist the proposed action:
     ```java
     public ChatAction proposeAction(UUID conversationId, UUID messageId, ActionType type, Map<String, Object> payload) {
         ChatAction action = new ChatAction();
         action.setConversationId(conversationId);
         action.setMessageId(messageId);
         action.setActionType(type);
         action.setStatus(ActionStatus.PROPOSED);
         action.setRequiresApproval(type == ActionType.ACCESS_REQUEST);
         action.setPayload(payload != null ? payload : new HashMap<>());
         action.setInputSchema(type.getInputSchema());
         action.setRequiredCapability(type.getRequiredCapability());
         return chatActionRepository.save(action);
     }
     ```
   - In `ChatService.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatService.java`), update `sendMessage` and `stream` / `runStream`:
     - Run `ActionIntentService.detectIntent` BEFORE calling `aiChatService.complete` / `stream`.
     - Resolve the dynamic tools using `chatToolsConfiguration.getFunctionsForActionType(actionType)`.
     - Pass the resolved tools to `AiCompletionOptions.of(null, null, tools)` in the complete/stream call.
     - Save/propose the action and link it to the assistant message.

6. Compilation & Verification:
   - Run compilation command: `mvn -q -B compile`
   - Run existing unit/integration tests to ensure no regressions: `mvn -q -B test -Dtest=ModulithVerificationTest`
   - Write a new integration test `ChatToolsGovernanceIntegrationTest.java` in `src/test/java/com/akilliorganizasyon/chatbot/service/` checking:
     - When `actingAgentId` is set and `GovernanceGate.check` returns `DENY`, the tool firlatir `GovernanceDeniedException`.
     - When `actingAgentId` is set and `GovernanceGate.check` returns `ALLOW`, or when `actingAgentId` is null, the tool runs successfully.
   - Run tests: `mvn -q -B test` (or specific tests).
   - Confirm all tests pass.
