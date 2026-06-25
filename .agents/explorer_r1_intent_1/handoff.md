# Handoff Report — Intent Detection Refactoring Analysis

## 1. Observation
- **ActionType.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`): A simple enum lacking fields.
- **ChatAction.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`):
  ```java
  public class ChatAction extends BaseEntity {
      // ...
      private ActionType actionType;
      private Map<String, Object> payload = new HashMap<>();
      // ...
  }
  ```
- **ActionIntentService.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`):
  Uses static keyword matching:
  ```java
  private static final List<IntentRule> RULES = List.of(
          new IntentRule(ActionType.ACCESS_REQUEST,
                  List.of("yetki", "erişim", "erisim", "izin iste", "rol talep", "access", "permission", "grant access")),
          // ...
  );
  ```
- **CapabilityType.java** (`backend/src/main/java/com/akilliorganizasyon/agentlifecycle/domain/CapabilityType.java`): Located in `agentlifecycle` module.
- **Modulith Sınır Testi** (`backend/src/test/java/com/akilliorganizasyon/ModulithVerificationTest.java`):
  Verifies that packages within the modular monolith do not violate boundary constraints.
- **ChatActionServiceTest.java** (`backend/src/test/java/com/akilliorganizasyon/chatbot/service/ChatActionServiceTest.java`):
  Directly constructs `ActionIntentService` on line 165:
  ```java
  ActionIntentService service = new ActionIntentService(repository);
  ```
- **AiChatService.java** (`backend/src/main/java/com/akilliorganizasyon/shared/ai/AiChatService.java`): Provides a public `isEnabled()` method to verify key config and `complete(systemPrompt, userPrompt)` to complete text.

---

## 2. Logic Chain
1. **Adding Schema/Capability to ActionType**:
   - `ActionType` enum constants must expose parameter schemas and required capabilities. We can achieve this by adding fields (`parameterSchema`, `requiredCapabilityType`, `requiredCapabilityTarget`, `requiredCapabilityAction`) and a constructor to the enum.
2. **Spring Modulith Compliant Governance**:
   - Since `CapabilityType` is inside the `agentlifecycle` package and the `chatbot` module must not depend on it (verified by `ModulithVerificationTest`), storing the capability type as a `String` (e.g., `"ACTION"`) instead of the enum type prevents circular or illegal module dependencies.
3. **ChatAction Delegation**:
   - By introducing delegation methods in `ChatAction` that delegate to `actionType.getParameterSchema()`, etc., we satisfy the requirement without making any changes to the database structure or Hibernating entities, keeping the ORM mapping light and robust.
4. **LLM-Based Intent Detection**:
   - Removing keyword matching rules and using `AiChatService` allows us to request structured JSON responses from the LLM. Using Jackson's `ObjectMapper` allows us to map the output into a typed record `IntentResult`.
5. **Handling Test Failure / Dependency Update**:
   - Modifying the constructor of `ActionIntentService` to accept `AiChatService` and `ObjectMapper` will break compilation of `ChatActionServiceTest.java` unless we mock `AiChatService` and `ObjectMapper` in that unit test. The patch is updated to address this issue.

---

## 3. Caveats
- Relative date extraction (e.g. "tomorrow") is guided by providing the current datetime in the system prompt. Real-world accuracy depends on the underlying LLM's capability to correctly parse dates relative to the context.
- In offline environments where `AiChatService` is disabled, intent detection will bypass calls and return `Optional.empty()`. Heuristics are completely removed as required.

---

## 4. Conclusion
The proposed changes enhance `ActionType.java` and `ChatAction.java` with structured schemas and capability specifications while respecting Spring Modulith boundaries. They replace heuristic keyword matching in `ActionIntentService.java` with a Spring AI-based LLM parsing mechanism, and provide an integration test suite validating intent detection accuracy with safety guards for local/offline builds.

---

## 5. Verification Method
1. **Compilation Check**:
   Run `mvn compile` to verify that all modules compile.
2. **Architecture Check**:
   Run `mvn test -Dtest=ModulithVerificationTest` to verify that no Spring Modulith boundary rules are violated.
3. **Accuracy Check**:
   Ensure Kimi API key is set, and run the new test suite:
   ```bash
   mvn test -Dtest=ActionIntentServiceAccuracyTest
   ```
4. **Existing Tests Check**:
   Run the existing chatbot tests to ensure no regressions:
   ```bash
   mvn test -Dtest=ChatActionServiceTest
   ```
