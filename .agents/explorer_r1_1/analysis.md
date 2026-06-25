# Analysis Report: Milestone 2 — R1 (Lineage & Provenance)

## Executive Summary
This analysis details the current implementation of data lineage and provenance tracking in the **Akıllı Organizasyon** system, identifies critical structural gaps, and provides a concrete implementation strategy to resolve them. 

The two primary gaps identified are:
1. **ThreadLocal Context Pollution/Loss**: Starting a new `AiExecutionTracker` context in nested operations (e.g., inside report executions called by agent orchestration) overwrites and destroys the calling context.
2. **Provenance Overwriting**: The `KnowledgeService.attachProvenanceIfActive` method blindly overwrites pre-existing rich provenance metadata passed during orchestration outcome recording with a fresh/empty tracker context, resulting in data loss.

---

## 1. Data Lineage: Table, Entity, Repository, and Port

### A. Database Table Layout
The data lineage table represents directed edges from data sources to downstream targets (reports, datasets, or synthesized assets).
- **Location**: `backend/src/main/resources/db/migration/V8__assets.sql` (lines 154-166)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS data_lineage (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_source_id  UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      target_type     VARCHAR(30) NOT NULL, -- e.g., 'REPORT', 'DATASET', 'ASSET'
      target_id       UUID NOT NULL,
      transformation  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(data_source_id);
  CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_type, target_id);
  ```

### B. Entity and Repository Classes
- **Entity**: `com.akilliorganizasyon.assets.domain.DataLineage`
  - Maps columns to Jpa-managed fields: `id` (UUID), `dataSourceId` (UUID), `targetType` (String), `targetId` (UUID), `transformation` (String), `createdAt` (Instant).
  - Annotations: `@Entity`, `@Table(name = "data_lineage")`, `@Getter`, `@Setter`.
- **Repository**: `com.akilliorganizasyon.assets.repository.DataLineageRepository`
  - Extends `JpaRepository<DataLineage, UUID>`.
  - Signatures:
    ```java
    List<DataLineage> findByDataSourceIdOrderByCreatedAtDesc(UUID dataSourceId);
    boolean existsByDataSourceIdAndTargetTypeAndTargetId(UUID dataSourceId, String targetType, UUID targetId);
    ```

### C. Write Path (DataSourcePort)
Writing data lineage is centralized via the `DataSourcePort` interface.
- **Method**: `void addLineage(UUID dataSourceId, String targetType, UUID targetId, String transformation)`
- **Implementation** (`DataSourcePortImpl.java`):
  Checks for duplicate lineage edges (preventing redundant rows) and writes to PostgreSQL:
  ```java
  @Override
  @Transactional
  public void addLineage(UUID dataSourceId, String targetType, UUID targetId, String transformation) {
      if (dataSourceId == null || targetType == null || targetId == null) {
          return;
      }
      String normalizedTarget = targetType.trim().toUpperCase();
      if (lineageRepository.existsByDataSourceIdAndTargetTypeAndTargetId(dataSourceId, normalizedTarget, targetId)) {
          return;
      }
      com.akilliorganizasyon.assets.domain.DataLineage lineage = new com.akilliorganizasyon.assets.domain.DataLineage();
      lineage.setDataSourceId(dataSourceId);
      lineage.setTargetType(normalizedTarget);
      lineage.setTargetId(targetId);
      lineage.setTransformation(transformation);
      lineageRepository.save(lineage);
  }
  ```

---

## 2. AiExecutionTracker & Data Source Tracking

### A. How Accessed Data Sources are Collected
`AiExecutionTracker.java` utilizes a `ThreadLocal<TrackerContext>` to capture generative AI metrics and accessed resources on the executing thread.
- **Tracker Context Storage**: A `CopyOnWriteArrayList<String>` called `accessedDataSources` is held inside the context.
- **Registration**: 
  - Accessed sources are added via `addAccessedDataSource(String dataSource)`.
  - Duplicates are avoided through `.contains()` checks before adding.
- **Context Lifecycles**:
  - `AiExecutionTracker.start()` allocates a new `TrackerContext`.
  - `AiExecutionTracker.get()` retrieves the thread's active context.
  - `AiExecutionTracker.stop()` removes the thread-local association.

---

## 3. Report Execution and Lineage Recording

### A. Report Runs Execution
- **Path**: `ReportExecutionService.java`
- **Method**: `execute(Report report, ReportFormat format, UUID runBy)`
- **Steps**:
  1. Starts an `AiExecutionTracker` session.
  2. Fetches report data sources (`ReportDataSource`).
  3. Registers them to the active tracker via `tracker.addAccessedDataSource(...)`.
  4. Generates a mutable snapshot map of the metrics via `buildSourceInfo(...)`.
  5. Automatically logs the lineage to the DB by calling `dataSourcePort.addLineage(...)` for all tracked sources.
  6. Attaches a `provenance` metadata block to `ReportRun.sourceInfo` utilizing tracker metrics.
  7. Persists the `ReportRun` entity to the database via `runRepository.save(run)`.

### B. ReportRun Structure (`source_info` JSONB)
The `source_info` field is a `Map<String, Object>` stored as JSONB. It contains `category`, `dataMode`, `dataStatus`, `dataSources` (list of UUIDs), `metrics`, and the generated `provenance` block.
- **JSON Structure**:
  ```json
  {
    "category": "FINANCIAL",
    "dataMode": "SIMULATED",
    "dataStatus": "SIMULATED_METADATA_DERIVED",
    "dataSources": ["10000000-0000-0000-0000-000000000001"],
    "dataSourceCount": 1,
    "metrics": {
       "totalRecords": 1250.0,
       "totalAmount": 53125.0,
       "averageValue": 42.5,
       "completionRate": 86.0
    },
    "provenance": {
       "runId": "a9a3b610-8b10-410a-83b6-981249b104ad",
       "accessedDataSources": ["10000000-0000-0000-0000-000000000001"],
       "evaluatedPolicies": [],
       "userId": "90e1abcf-2104-482a-a92c-01bc5b34da5e",
       "inputTokens": 140,
       "outputTokens": 280,
       "totalTokens": 420,
       "durationMs": 450,
       "model": "gpt-4o"
    }
  }
  ```

---

## 4. Agent Outcomes and KnowledgeEntry Provenance

### A. Recording Outcomes
- **Path**: `AgentKnowledgeWriter.java`
- **Method**: `recordOutcome(OrchestrationRun run, String result, Map<String, Object> provenanceMetadata)`
- **Steps**:
  - Validates that the result is genuine (excludes simulator placeholders).
  - Constructs `CreateKnowledgeEntryRequest` passing the `provenanceMetadata` containing the orchestration run's collected history (`agentId`, `runId`, `accessedDataSources`, `evaluatedPolicies`).
  - Invokes `knowledgePort.create(...)`.

### B. The Overwriting Deficiency in `KnowledgeService`
When `KnowledgeService.create` is invoked, it runs `attachProvenanceIfActive(entry, userId)`.
Currently, this method acts as follows:
```java
// Current Code in KnowledgeService.java
if (entry.getMetadata() == null) {
    entry.setMetadata(new java.util.HashMap<>());
}
entry.getMetadata().put("provenance", provenance); // BLIND OVERWRITE
```
Because the active `tracker` started in `OrchestrationService`'s outcome phase is fresh, it has empty `accessedDataSources` and `evaluatedPolicies` lists, and lacks the `agentId`. This blind overwrite results in the destruction of the rich provenance details collected during orchestration.

---

## 5. Concrete Implementation Strategy

To address the identified gaps, we need to apply targeted enhancements to two files.

### A. File 1: Nesting Support in `AiExecutionTracker.java`
*Path*: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`

Introduce a link to a parent context in `TrackerContext` and modify `start()` and `stop()` to act like a stack:

```java
// Proposed modification to TrackerContext nested class:
public static class TrackerContext {
    private final TrackerContext parent; // Add pointer to parent context
    
    public TrackerContext() {
        this.parent = null;
    }
    
    public TrackerContext(TrackerContext parent) {
        this.parent = parent;
    }
    
    public TrackerContext getParent() {
        return parent;
    }
    // ... existing fields ...
}

// Proposed modification to AiExecutionTracker class:
public static void start() {
    TrackerContext parent = TRACKER.get();
    TRACKER.set(new TrackerContext(parent));
}

public static void stop() {
    TrackerContext current = TRACKER.get();
    if (current != null && current.getParent() != null) {
        TRACKER.set(current.getParent());
    } else {
        TRACKER.remove();
    }
}
```

### B. File 2: Provenance Merge Logic in `KnowledgeService.java`
*Path*: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeService.java`

Update `attachProvenanceIfActive` to merge the tracker's provenance properties into the pre-existing provenance metadata instead of overwriting it:

```java
// Proposed modification to attachProvenanceIfActive in KnowledgeService.java:
private void attachProvenanceIfActive(KnowledgeEntry entry, UUID userId) {
    var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
    if (tracker != null) {
        java.util.Map<String, Object> provenance = new java.util.HashMap<>();
        if (tracker.getRunId() != null) provenance.put("runId", tracker.getRunId().toString());
        if (tracker.getActingAgentId() != null) provenance.put("agentId", tracker.getActingAgentId().toString());
        if (tracker.getTaskId() != null) provenance.put("taskId", tracker.getTaskId().toString());
        provenance.put("accessedDataSources", tracker.getAccessedDataSources());
        provenance.put("evaluatedPolicies", tracker.getEvaluatedPolicies());
        provenance.put("userId", userId != null ? userId.toString() : null);

        // Add token/model stats to provenance
        provenance.put("inputTokens", tracker.getInputTokens());
        provenance.put("outputTokens", tracker.getOutputTokens());
        provenance.put("totalTokens", tracker.getTotalTokens());
        provenance.put("durationMs", tracker.getDurationMs());
        if (tracker.getModelName() != null) {
            provenance.put("model", tracker.getModelName());
        }

        if (entry.getMetadata() == null) {
            entry.setMetadata(new java.util.HashMap<>());
        }
        if (!(entry.getMetadata() instanceof java.util.HashMap)) {
            entry.setMetadata(new java.util.HashMap<>(entry.getMetadata()));
        }

        Object existingProvenanceObj = entry.getMetadata().get("provenance");
        if (existingProvenanceObj instanceof java.util.Map) {
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> existingProvenance = (java.util.Map<String, Object>) existingProvenanceObj;
            // Merge tracker's provenance into the existing one, preserving rich non-empty details
            provenance.forEach((key, value) -> {
                if (value != null) {
                    if (value instanceof java.util.Collection && ((java.util.Collection<?>) value).isEmpty()) {
                        // Do not overwrite existing non-empty lists with empty ones
                        if (!existingProvenance.containsKey(key)) {
                            existingProvenance.put(key, value);
                        }
                    } else {
                        existingProvenance.put(key, value);
                    }
                }
            });
        } else {
            entry.getMetadata().put("provenance", provenance);
        }
    }
}
```

---

## 6. Verification Plan

### A. Unit Testing Stack Support (Create `AiExecutionTrackerTest.java`)
Create a new test file `backend/src/test/java/com/akilliorganizasyon/shared/ai/AiExecutionTrackerTest.java` containing:
- **Test Context Nesting**:
  1. Calls `AiExecutionTracker.start()`, sets `runId` to `A`.
  2. Nested calls `AiExecutionTracker.start()`, sets `runId` to `B`.
  3. Asserts current runId is `B`.
  4. Calls `AiExecutionTracker.stop()`.
  5. Asserts current runId has reverted back to `A`.
  6. Calls `AiExecutionTracker.stop()`.
  7. Asserts current tracker is null.

### B. Unit Testing Provenance Merge (Create `KnowledgeServiceTest.java`)
Create a new test file `backend/src/test/java/com/akilliorganizasyon/knowledge/service/KnowledgeServiceTest.java` containing:
- **Test Provenance Merge**:
  1. Initializes a `KnowledgeEntry` with an existing `provenance` block containing `"agentId" = "agent-123"`, `"accessedDataSources" = ["ds-456"]`.
  2. Starts a fresh `AiExecutionTracker` (so the current tracker context contains empty collections).
  3. Calls `attachProvenanceIfActive` on the entry.
  4. Asserts that the final provenance block contains the existing `"agentId"` and `"accessedDataSources"`, while also including the tracker's metrics (`inputTokens`, `outputTokens`, `durationMs`, etc.).

### C. Running Suite Commands
Execute the test commands to verify all lineage, provenance, and registry behaviors:
```bash
mvn test -Dtest=ReportExecutionServiceTest,KnowledgeRagServiceTest,OntologyRegistryTest,AiExecutionTrackerTest,KnowledgeServiceTest
```
