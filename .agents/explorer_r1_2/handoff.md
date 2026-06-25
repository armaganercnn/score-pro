# Handoff Report: Milestone 2 — R1 (Lineage & Provenance) Exploration

## 1. Observation

Direct observations made in the codebase:
- **Data Lineage Table**: Defined in `backend/src/main/resources/db/migration/V8__assets.sql` at lines 155-162:
  ```sql
  CREATE TABLE IF NOT EXISTS data_lineage (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_source_id  UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      target_type     VARCHAR(30) NOT NULL, -- REPORT / DATASET / ASSET
      target_id       UUID NOT NULL,
      transformation  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Entity**: `com.akilliorganizasyon.assets.domain.DataLineage` mapped as a standard JPA entity class.
- **Repository**: `com.akilliorganizasyon.assets.repository.DataLineageRepository` containing the methods:
  ```java
  List<DataLineage> findByDataSourceIdOrderByCreatedAtDesc(UUID dataSourceId);
  boolean existsByDataSourceIdAndTargetTypeAndTargetId(UUID dataSourceId, String targetType, UUID targetId);
  ```
- **DataSourcePort Write Path**: `DataSourcePortImpl.java` implements `DataSourcePort` with the method `addLineage` (lines 72-86) which performs duplication checks.
- **AiExecutionTracker**: Declared in `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`. Uses `ThreadLocal<TrackerContext>` where `accessedDataSources` is stored as:
  ```java
  private final List<String> accessedDataSources = new java.util.concurrent.CopyOnWriteArrayList<>();
  ```
- **Report Run Execution**: In `ReportExecutionService.java`, report execution happens in:
  ```java
  private ReportRun execute(Report report, ReportFormat format, UUID runBy)
  ```
  Which initializes the tracker context, records report data sources using `tracker.addAccessedDataSource(...)`, runs the report logic, and records lineage via:
  ```java
  dataSourcePort.addLineage(dsUuid, "REPORT", report.getId(), "Queried via report run " + run.getId());
  ```
  And injects the provenance block to `ReportRun.sourceInfo` map.
- **Agent Knowledge Recording**: In `AgentKnowledgeWriter.java`, `recordOutcome` writes outcome with the parameter `java.util.Map<String, Object> provenanceMetadata` to `CreateKnowledgeEntryRequest`.
- **Knowledge Entry Entity**: `com.akilliorganizasyon.knowledge.domain.KnowledgeEntry` contains a metadata map:
  ```java
  private java.util.Map<String, Object> metadata = new java.util.HashMap<>();
  ```
- **Knowledge Entry Service Overwriting**: In `KnowledgeService.java:148-176`, `attachProvenanceIfActive` is called during entry creation/update:
  ```java
  private void attachProvenanceIfActive(KnowledgeEntry entry, UUID userId) {
      var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
      if (tracker != null) {
          java.util.Map<String, Object> provenance = new java.util.HashMap<>();
          ...
          entry.getMetadata().put("provenance", provenance);
      }
  }
  ```
  This blindly puts `"provenance"` in the metadata map, overwriting any pre-existing provenance metadata.

---

## 2. Logic Chain

1. Starting from `AiExecutionTracker.java` (Observation), we see that `ThreadLocal<TrackerContext>` is currently used to manage execution metrics.
2. In `ReportExecutionService.java` (Observation), a new `AiExecutionTracker` context is created on start and cleared on stop.
3. If a report run is executed nestedly within an active agent task orchestration run (which also starts/uses `AiExecutionTracker`), starting a new context in `ReportExecutionService` will overwrite the existing `ThreadLocal` context. Stopping it will clear the thread-local entirely, losing the parent agent execution details.
4. Hence, `AiExecutionTracker` needs to support nesting using a parent-child pointer chain (a stack implementation).
5. In `OrchestrationService.java`, the orchestration run builds a rich provenance metadata structure containing the agent ID, run ID, accessed data sources, and evaluated policies.
6. This structure is sent to `AgentKnowledgeWriter.recordOutcome` (Observation) which forwards it as part of `CreateKnowledgeEntryRequest.metadata`.
7. However, `KnowledgeService.java` (Observation) invokes `attachProvenanceIfActive`, which checks if `AiExecutionTracker.get()` is active.
8. Since `OrchestrationService` starts a fresh tracker context before saving the outcome, the active tracker on the thread has empty lists for accessed resources/policies and lacks the agent details.
9. `attachProvenanceIfActive` then blindly overwrites `entry.getMetadata().put("provenance", provenance)` with this empty tracker data, destroying the rich provenance information collected during the orchestration run.
10. Therefore, `attachProvenanceIfActive` must implement an intelligent merge strategy to combine the pre-existing provenance block with the active tracker context instead of blindly overwriting it.

---

## 3. Caveats

- We assumed that `data_lineage` target types are limited to `"REPORT"`, `"DATASET"`, and `"ASSET"` as defined by `TARGET_TYPES` in `DataSourceService.java`. If other types are introduced, `TARGET_TYPES` and database length constraints should be updated.
- We did not investigate how the frontend displays the lineage and provenance data; we focused entirely on the backend collection, persistence, and tracking mechanisms.

---

## 4. Conclusion

The current backend structures for Data Lineage and Provenance are mostly correct, but two critical design deficiencies lead to data loss during nested tracker executions and knowledge outcome writes:
1. **Context Pollution**: Overwriting the active thread context during nested executions.
2. **Metadata Overwriting**: Overwriting rich provenance metadata in `KnowledgeService.attachProvenanceIfActive`.

Both deficiencies can be solved by modifying:
- `AiExecutionTracker.java` to support nested parent contexts in `TrackerContext`.
- `KnowledgeService.java` to use a merge-based strategy in `attachProvenanceIfActive`.

---

## 5. Verification Method

- **Commands to verify**:
  ```bash
  mvn test -Dtest=ReportExecutionServiceTest,AgentKnowledgeWriterTest,AiExecutionTrackerTest,KnowledgeServiceTest
  ```
- **Files to inspect**:
  - `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`
  - `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeService.java`
  - `backend/src/test/java/com/akilliorganizasyon/shared/ai/AiExecutionTrackerTest.java` (needs to be created)
  - `backend/src/test/java/com/akilliorganizasyon/knowledge/service/KnowledgeServiceTest.java` (needs to be created)
- **Invalidation Conditions**: If nested tracker contexts fail to restore their parent contexts on `stop()`, or if saving a knowledge entry deletes the pre-existing `agentId` and `accessedDataSources` from its metadata, the verification fails.
