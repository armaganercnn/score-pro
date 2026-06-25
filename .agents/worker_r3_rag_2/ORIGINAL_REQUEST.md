## 2026-06-19T12:33:51Z
You are a Worker. Implement the final security hardening for Milestone 4: R3 (RAG Isolation) in the codebase.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Feedback
Both the Challenger and Reviewer noted that if a knowledge entry contains a malformed UUID reference (e.g. in its `sourceRef`, metadata `dataSourceId` / `datasource_id`, or `provenance.accessedDataSources`), the parsing throws an `IllegalArgumentException` which is caught silently, allowing the entry to bypass RAG isolation checks (fail-open posture).
We need to change this to a fail-closed posture: if any data source reference parsing fails due to an exception (like invalid UUID string), the entry must be treated as unauthorized and filtered out of the RAG context.

## Tasks
1. Modify `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java` (specifically inside `filterAuthorizedSources` and any helper method like `addDsId` or sourceRef parsing):
   - Modify the UUID parsing logic such that if an `IllegalArgumentException` is thrown (meaning a UUID reference is malformed/invalid), the entry is immediately marked as unauthorized (`allowed = false`) and filtered out.
   - For example:
     - Change `addDsId` (or similar) to return `false` on exception, or propagate the exception, so that the main loop can detect parsing failure, log it, mark `allowed = false`, and break early to filter the entry out.
     - Ensure the `sourceRef` UUID parsing (lines 358-364) also handles parsing failures by marking the entry as unauthorized instead of silently ignoring the exception.
2. In `backend/src/test/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagServiceTest.java`, verify this fail-closed posture by adding/updating a unit test:
   - Create a test case (e.g. `askFiltersSources_malformedUuid_isBlocked`) where a knowledge entry has a malformed UUID string (e.g. `"invalid-uuid-string"`) in its metadata or sourceRef.
   - Assert that the entry is filtered out of the retrieval sources.
3. Run the target test suite to verify that all tests pass:
   `mvn test -Dtest=AgentGuardServiceTest,KnowledgeRagServiceTest,SemanticChunkerTest,AiExecutionTrackerTest`
4. Commit the changes to git.
5. Write your handoff report to `.agents/worker_r3_rag_2/handoff.md`. Include the details of the modified files and test execution logs.
