## 2026-06-19T12:24:43Z

You are a Worker. Implement Milestone 4: R3 (RAG Isolation) in the workspace.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. Modify `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/AgentGuardService.java` to evaluate user authority even when `agentId == null`:
```java
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

2. Modify `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java` to:
   - Inject `GovernanceGate` using `@org.springframework.beans.factory.annotation.Autowired(required = false)`:
     ```java
     private com.akilliorganizasyon.shared.governance.GovernanceGate governanceGate;

     @org.springframework.beans.factory.annotation.Autowired(required = false)
     public void setGovernanceGate(com.akilliorganizasyon.shared.governance.GovernanceGate governanceGate) {
         this.governanceGate = governanceGate;
     }
     ```
   - In `ask`, if `governanceGate` is not null, filter retrieved knowledge `sources` using a helper method `filterAuthorizedSources`.
   - In the filtering helper, extract all datasource IDs from a `KnowledgeEntryDto` (checking `scopeType` / `scopeId` if scope type is `"datasource"`, checking `sourceType` / `sourceRef` if source type is `"datasource"` or `"decision"`, and checking metadata / provenance fields).
   - If there is no active `AiExecutionTracker` context, start a temporary tracker context, populate it with the query's `userId` and `privileged` flag, evaluate using `governanceGate.check(agentId, "DATA_SOURCE", dsId.toString(), "READ")`, and stop the temporary context at the end.
   - If any data source reference check fails (`!decision.allowed()`), exclude the entry from the returned sources.

3. Write / update unit and integration tests:
   - Update `AgentGuardServiceTest.java` to test user authority when `agentId == null` (specifically that `evaluate` returns `DENY` when the user lacks authority, and `ALLOW` when the user has authority).
   - Update `KnowledgeRagServiceTest.java` to test that RAG isolation successfully filters out knowledge entries referencing unauthorized data sources when a mock/spy `GovernanceGate` is present.

4. Build the backend and run the tests to verify correctness:
   `mvn test -Dtest=AgentGuardServiceTest,KnowledgeRagServiceTest,SemanticChunkerTest`
   Ensure all tests compile and pass. Show the commands and output in your handoff report.

5. Commit changes to git and write your handoff report to `.agents/worker_r3_rag_1/handoff.md`. Include details on modified files and verification output.
