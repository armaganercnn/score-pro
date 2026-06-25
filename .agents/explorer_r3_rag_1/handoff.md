# Handoff Report: RAG Isolation Investigation (Milestone 4: R3)

## 1. Observation

### KnowledgeRagService.java
- **Retrieval Entry Point**: In `KnowledgeRagService.java` (lines 45-48), search results are retrieved from `KnowledgeSearchService`:
  ```java
  @Transactional(readOnly = true)
  public AskResponseDto ask(String question, Integer topK, boolean privileged, UUID userId) {
      int limit = normalizeTopK(topK);
      RetrievalResult retrieval = searchService.retrieve(question, limit, privileged, userId);
      List<ScoredEntryDto> sources = retrieval.results();
  ```
  Currently, there is no filtering applied to `sources` to check if the user or agent has authorization for the data sources associated with the retrieved entries.
- **Data Source References**: The file includes logic in `buildUserPrompt` (lines 104-160) to scan for related ontology objects. It extracts data source references from a `KnowledgeEntryDto` using:
  - **Scope**:
    ```java
    if (entry.scopeType() != null && entry.scopeId() != null) {
        String sType = entry.scopeType().toLowerCase().trim();
        if (List.of("user", "orgunit", "project", "datasource").contains(sType)) { ... }
    }
    ```
  - **Source**:
    ```java
    if (entry.sourceType() != null && entry.sourceRef() != null) {
        String sType = entry.sourceType().toLowerCase().trim();
        // ...
        UUID refUuid = UUID.fromString(entry.sourceRef());
        if (List.of("user", "orgunit", "project", "datasource").contains(sType)) { ... }
        else if ("decision".equals(sType)) { ... }
    }
    ```
  - **Metadata**: Direct keys `dataSourceId` or `datasource_id`.
  - **Provenance**: `entry.metadata().get("provenance")` -> `accessedDataSources` (either a Collection or comma-separated String).

### AgentGuardService.java
- **Null Agent Check**: In `AgentGuardService.java` (lines 153-155), `evaluateRaw` exits early when `agentId == null`:
  ```java
  private RawDecision evaluateRaw(UUID agentId, String capabilityType, String targetRef,
                                  String action, AiExecutionTracker.TrackerContext ctx) {
      if (agentId == null) {
          return UNGOVERNED;
      }
  ```
  `UNGOVERNED` is defined as `new RawDecision(Effect.ALLOW, "Açık bir kısıtlama tanımlı değil (yönetişim yok)", false);`.
- **User Authority Check**: `checkUserAuthority` (lines 222-238) checks user access:
  ```java
  private RawDecision checkUserAuthority(String capabilityType, String targetRef,
                                         AiExecutionTracker.TrackerContext ctx) {
      if (userDataAccessPort == null || ctx == null) {
          return null;
      }
      if (!DATA_SOURCE.equalsIgnoreCase(capabilityType)) {
          return null;
      }
      boolean privileged = ctx.isActingUserPrivileged();
      UUID actingUserId = ctx.getActingUserId();
      boolean canAccess = userDataAccessPort.userCanAccessDataSource(actingUserId, privileged, targetRef);
      if (!canAccess) {
          return new RawDecision(Effect.DENY,
                  "İsteği başlatan kullanıcı bu hassas kaynağa erişemez; ajana da reddedildi", true);
      }
      return null;
  }
  ```
  Because `evaluateRaw` exits early on `agentId == null`, it never reaches the calls to `checkUserAuthority` (lines 171, 195, 204), meaning that direct user-initiated requests do not evaluate user-level data source authority.

- **Mode Posture Application**: When `agentId == null` returns `UNGOVERNED` (governed=false):
  - In `GovernanceMode.ENFORCE`, `applyMode` returns a `DENY` decision because it falls back to deny-by-default for ungoverned access.
  - In `GovernanceMode.SHADOW`, it returns an `ALLOW` decision.
  In neither case does it evaluate whether the user actually has access to the data source.

---

## 2. Logic Chain

1. **Filtering Interception**: In `KnowledgeRagService.ask`, we can intercept and filter the retrieval results immediately after `List<ScoredEntryDto> sources = retrieval.results();` (line 48) and before the list is passed to `aiChatService.complete` or returned.
2. **Data Source Extraction**: We can implement a helper function `extractDataSourceIds(KnowledgeEntryDto)` inside `KnowledgeRagService` that mirrors the ontology scan in `buildUserPrompt` but filters specifically for `"datasource"` types.
3. **GovernanceGate Mocking & Bean Registration**: `GovernanceGate` (implemented by `AgentGuardService`) is registered as a Spring bean. We can inject it into `KnowledgeRagService` via setter injection (`@Autowired(required = false)`).
   - In production, it will be auto-wired.
   - In existing unit tests (`KnowledgeRagServiceTest` and `SemanticChunkerTest`), the setter is not called, so `governanceGate` is `null`. We can safely bypass filtering when `governanceGate == null`, which avoids breaking any existing tests.
4. **Context Propagation**: `AgentGuardService` checks `AiExecutionTracker.get()` to find the acting user ID and privilege status. Direct user queries through `KnowledgeRagService.ask` do not have an active `AiExecutionTracker` context.
   - If we programmatically initialize `AiExecutionTracker` inside the filtering step (if one is not already active) and populate it with the `userId` and `privileged` parameters, the `AgentGuardService` will receive the correct user details on behalf of the user.
5. **Handling Null Agent in Governance Gate**: If `agentId == null`, `AgentGuardService` currently skips user authority check. By modifying `evaluateRaw` to evaluate `checkUserAuthority` first, and returning `new RawDecision(Effect.ALLOW, "Kullanıcı yetkisi var, ajan kısıtlaması yok", true)` if the user is authorized, we ensure that:
   - Unauthorized users are correctly `DENIED` (under both modes).
   - Authorized users are correctly `ALLOWED` (under both modes, bypassing deny-by-default since `governed = true`).

---

## 3. Caveats

- **Fail-Open Policy**: If `userDataAccessPort` or the `AiExecutionTracker` context is missing, the system fails open (returns `null`/allows access) so it does not break existing flows or tests.
- **Repository-Level Aspect Bypassing**: `AgentDataAccessAspect` explicitly bypasses security when `agentId == null`. This is correct, as repository-level calls initiated directly by users should not be blocked by agent capability rule-checks. Only our RAG isolation filter at the service layer needs user authority check.

---

## 4. Conclusion & Refactoring Proposal

We conclude that filtering retrieved knowledge to authorized resources requires two main changes:
1. Update `AgentGuardService.evaluateRaw` to properly evaluate user authority on data sources when `agentId == null`.
2. Update `KnowledgeRagService` to inject `GovernanceGate`, extract data source references from retrieved knowledge entries, and filter them using `governanceGate.check`.

### Proposed Changes

#### A. `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/AgentGuardService.java`

Replace `evaluateRaw` early exit:
```java
// BEFORE
    private RawDecision evaluateRaw(UUID agentId, String capabilityType, String targetRef,
                                    String action, AiExecutionTracker.TrackerContext ctx) {
        if (agentId == null) {
            return UNGOVERNED;
        }
```

```java
// AFTER
    private RawDecision evaluateRaw(UUID agentId, String capabilityType, String targetRef,
                                    String action, AiExecutionTracker.TrackerContext ctx) {
        if (agentId == null) {
            // Evaluate user authority on data sources even if no agent is acting
            RawDecision authority = checkUserAuthority(capabilityType, targetRef, ctx);
            if (authority != null) {
                return authority;
            }
            return new RawDecision(Effect.ALLOW, "Kullanıcı yetkisi var, ajan kısıtlaması yok", true);
        }
```

#### B. `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`

Modify the service to inject `GovernanceGate` and filter sources:
```java
// Inject GovernanceGate
    private com.akilliorganizasyon.shared.governance.GovernanceGate governanceGate;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setGovernanceGate(com.akilliorganizasyon.shared.governance.GovernanceGate governanceGate) {
        this.governanceGate = governanceGate;
    }
```

Update `ask` method:
```java
    @Transactional(readOnly = true)
    public AskResponseDto ask(String question, Integer topK, boolean privileged, UUID userId) {
        int limit = normalizeTopK(topK);
        RetrievalResult retrieval = searchService.retrieve(question, limit, privileged, userId);
        List<ScoredEntryDto> sources = retrieval.results();

        // Apply RAG isolation filter based on user/agent authority
        if (governanceGate != null && !sources.isEmpty()) {
            sources = filterAuthorizedSources(sources, userId, privileged);
        }
        ...
```

Add Helper Methods for extraction & filtering:
```java
    private List<ScoredEntryDto> filterAuthorizedSources(List<ScoredEntryDto> sources, UUID userId, boolean privileged) {
        UUID agentId = null;
        var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
        if (tracker != null) {
            agentId = tracker.getActingAgentId();
        }

        boolean createdTracker = false;
        if (com.akilliorganizasyon.shared.ai.AiExecutionTracker.get() == null) {
            com.akilliorganizasyon.shared.ai.AiExecutionTracker.start();
            var newCtx = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
            newCtx.setActingUserId(userId);
            newCtx.setActingUserPrivileged(privileged);
            createdTracker = true;
        }

        try {
            List<ScoredEntryDto> filtered = new ArrayList<>();
            for (ScoredEntryDto source : sources) {
                List<UUID> dataSourceIds = extractDataSourceIds(source.entry());
                boolean allowed = true;
                for (UUID dsId : dataSourceIds) {
                    var decision = governanceGate.check(agentId, "DATA_SOURCE", dsId.toString(), "READ");
                    if (!decision.allowed()) {
                        allowed = false;
                        log.info("RAG Isolation: filtered out entry '{}' (ID: {}) because user/agent is not authorized for data source '{}'",
                                source.entry().title(), source.entry().id(), dsId);
                        break;
                    }
                }
                if (allowed) {
                    filtered.add(source);
                }
            }
            return filtered;
        } finally {
            if (createdTracker) {
                com.akilliorganizasyon.shared.ai.AiExecutionTracker.stop();
            }
        }
    }

    private List<UUID> extractDataSourceIds(KnowledgeEntryDto entry) {
        List<UUID> ids = new ArrayList<>();
        
        // Scope
        if (entry.scopeType() != null && entry.scopeId() != null) {
            if ("datasource".equalsIgnoreCase(entry.scopeType().trim())) {
                ids.add(entry.scopeId());
            }
        }

        // Source
        if (entry.sourceType() != null && entry.sourceRef() != null) {
            String sType = entry.sourceType().toLowerCase().trim();
            if ("datasource".equals(sType) || "decision".equals(sType)) {
                try {
                    UUID uuid = UUID.fromString(entry.sourceRef().trim());
                    if (!ids.contains(uuid)) {
                        ids.add(uuid);
                    }
                } catch (IllegalArgumentException ignored) {}
            }
        }

        // Metadata & Provenance
        if (entry.metadata() != null) {
            addUuidToList(ids, entry.metadata().get("dataSourceId"));
            addUuidToList(ids, entry.metadata().get("datasource_id"));

            if (entry.metadata().containsKey("provenance")) {
                Object provObj = entry.metadata().get("provenance");
                if (provObj instanceof java.util.Map) {
                    java.util.Map<?, ?> provenance = (java.util.Map<?, ?>) provObj;
                    Object accessed = provenance.get("accessedDataSources");
                    if (accessed instanceof java.util.Collection) {
                        for (Object item : (java.util.Collection<?>) accessed) {
                            addUuidToList(ids, item);
                        }
                    } else if (accessed instanceof String) {
                        String[] parts = ((String) accessed).split(",");
                        for (String part : parts) {
                            addUuidToList(ids, part.trim());
                        }
                    }
                }
            }
        }
        return ids;
    }

    private void addUuidToList(List<UUID> list, Object val) {
        if (val == null) return;
        try {
            UUID uuid;
            if (val instanceof UUID) {
                uuid = (UUID) val;
            } else {
                uuid = UUID.fromString(val.toString().trim());
            }
            if (!list.contains(uuid)) {
                list.add(uuid);
            }
        } catch (IllegalArgumentException ignored) {}
    }
```

---

## 5. Verification Method

### Test Cases

1. **`AgentGuardServiceTest.java`**:
   - `nullAgent_userCannotAccessDataSource_isDenied`: Verify that when `agentId == null`, a query to a data source the user is not authorized to access is `DENIED`.
   - `nullAgent_userCanAccessDataSource_isAllowed`: Verify that when `agentId == null`, a query to a data source the user is authorized to access is `ALLOWED`.
2. **`KnowledgeRagServiceTest.java`**:
   - `askFiltersOutUnauthorizedDataSources`: Wire a mock `GovernanceGate` returning a `DENY` decision for a specific data source ID, pass an entry containing that data source ID, and assert that it is filtered out of `sources` (resulting in no results, or only allowing other results).

### Execution Command
Run Maven tests to verify logic:
```bash
mvn test -Dtest=AgentGuardServiceTest,KnowledgeRagServiceTest,SemanticChunkerTest
```
All tests must compile and pass cleanly.
