# Handoff Report - Milestone R2: Governance-Enforced LLM Tool-Calling Loop

## 1. Observation

- **Database Migration**:
  - Flyway migration file `V47__add_chat_action_governance_fields.sql` was created in `backend/src/main/resources/db/migration/` containing the exact SQL schema additions:
    ```sql
    ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS input_schema TEXT;
    ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS required_capability VARCHAR(100);
    ```
- **Domain Model updates**:
  - `ActionType.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`): Added fields `inputSchema` (String) and `requiredCapability` (String), initialized them in the enum constructor, and added getter methods:
    ```java
    public String getInputSchema() { return inputSchema; }
    public String getRequiredCapability() { return requiredCapability; }
    ```
  - `ChatAction.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`): Mapped `inputSchema` and `requiredCapability` properties using `@Column`:
    ```java
    @Column(name = "input_schema", columnDefinition = "text")
    private String inputSchema;
    @Column(name = "required_capability", length = 100)
    private String requiredCapability;
    ```
- **AiCompletionOptions record updates**:
  - `AiCompletionOptions.java` (`backend/src/main/java/com/akilliorganizasyon/shared/ai/AiCompletionOptions.java`): record upgraded to three-field version:
    ```java
    public record AiCompletionOptions(String model, Double temperature, java.util.Set<String> functions)
    ```
  - Factory methods `of(String, Double)` and `of(String, Double, Set<String>)` were overloaded, and `NONE` instance and `isEmpty()` were updated to maintain backward compatibility.
- **AiChatService updates**:
  - `AiChatService.java` (`backend/src/main/java/com/akilliorganizasyon/shared/ai/AiChatService.java`): updated `buildPrompt` to use custom dynamic functions if `options.functions()` is not null:
    ```java
    Set<String> functions = Set.of();
    if (supportsTools(resolvedModel)) {
        if (options != null && options.functions() != null) {
            functions = options.functions();
        } else {
            functions = configuredFunctions();
        }
    }
    ```
  - Overloaded `stream` method signature:
    ```java
    public Flux<String> stream(String systemPrompt, String userPrompt, AiCompletionOptions options)
    ```
- **Tool Governance updates**:
  - `ChatToolsConfiguration.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`): Injected `GovernanceGate` and implemented checks in `withContext` wrapper when `actingAgentId` is set in `AiExecutionTracker`:
    ```java
    if (tracker.getActingAgentId() != null && governanceGate != null) {
        var decision = governanceGate.check(tracker.getActingAgentId(), "TOOL", toolName, "EXECUTE");
        if (decision != null && !decision.allowed()) {
            throw new com.akilliorganizasyon.shared.governance.GovernanceDeniedException(decision.reason());
        }
    }
    ```
  - Added mapper method `getFunctionsForActionType(ActionType)`.
- **Intent Detection and presentation refactoring**:
  - `ActionIntentService.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`): Added helper record `LlmIntentResult` annotated with `@JsonIgnoreProperties(ignoreUnknown = true)`. Implemented `detectIntent` and `proposeAction` and updated `detectAndPropose` to preserve backward compatibility.
  - `ChatService.java` (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatService.java`): Updated `sendMessage` and `stream`/`runStream` to call `actionIntentService.detectIntent` before generation calls, resolved dynamic tool configurations, passed them using `options`, and linked the proposed action with the assistant message.

---

## 2. Logic Chain

1. **Integration and Modulith Verification**: Directly referencing `GovernanceGate` in `ChatToolsConfiguration` allows checking agent authority on tools without introducing forbidden module dependencies on `agentlifecycle` (`AgentGuardService`), satisfying Modulith rules verified by `ModulithVerificationTest`.
2. **Dynamic Tool presentation**: Moving intent detection before completion allows selecting a subsets of tool beans dynamically to present to Kimi/OpenAI models using `options.functions()`.
3. **Robust Jackson Deserialization**: Annotating `LlmIntentResult` with `@JsonIgnoreProperties(ignoreUnknown = true)` prevents Jackson from throwing exceptions when parsing different formats of JSON (e.g. legacy `"matched"` field).

---

## 3. Caveats

- **External container locking target files**: When building from the host machine using Maven, the running backend container locks mapped directories (e.g., target classes), causing intermittent mapstruct incremental compiler NullPointerExceptions or clean failures. Stopping the backend container (`docker compose -p intorg stop backend`) during target rebuilds bypasses this lock completely.

---

## 4. Conclusion

- All Milestone R2 requirements have been fully implemented in clean, decoupled, and Modulith-compliant Java code.
- Verification tests confirm that R2 functionality (dynamic intent detection, options propagation, and governance check enforcement) functions exactly as requested.

---

## 5. Verification Method

### Automated Verification
- Run the dedicated integration test:
  ```bash
  mvn test -Dtest=ChatToolsGovernanceIntegrationTest
  ```
  Result: `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0` (succeeded).
- Run Modulith boundaries verification:
  ```bash
  mvn test -Dtest=ModulithVerificationTest
  ```
  Result: `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0` (succeeded).
