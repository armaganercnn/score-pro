# Handoff Report: Milestone 2 — R1 (Lineage & Provenance)

## 1. Observation
- Database schema for `data_lineage` exists in `backend/src/main/resources/db/migration/V8__assets.sql` (lines 154-166):
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
- Automated lineage insertion logic is present in `ReportExecutionService.java` (lines 157-172):
  ```java
  // Write automatic lineage to data_lineage database for all data sources in tracker
  if (tracker != null) {
      for (String dsStr : tracker.getAccessedDataSources()) {
          try {
              UUID dsUuid = UUID.fromString(dsStr);
              dataSourcePort.addLineage(
                      dsUuid,
                      "REPORT",
                      report.getId(),
                      "Queried via report run " + run.getId()
              );
          } catch (IllegalArgumentException iae) {
              log.debug("Skipping lineage logging for non-uuid data source: {}", dsStr);
          }
      }
  }
  ```
- `AiExecutionTracker.java` uses `ThreadLocal<TrackerContext>` with simple `start()` and `stop()` methods which overwrite and remove the context:
  ```java
  public static void start() {
      TRACKER.set(new TrackerContext());
  }
  public static void stop() {
      TRACKER.remove();
  }
  ```
- `KnowledgeService.java` at lines 168-174 overwrites the `"provenance"` key inside a `KnowledgeEntry`'s metadata blindly:
  ```java
  if (entry.getMetadata() == null) {
      entry.setMetadata(new java.util.HashMap<>());
  }
  if (!(entry.getMetadata() instanceof java.util.HashMap)) {
      entry.setMetadata(new java.util.HashMap<>(entry.getMetadata()));
  }
  entry.getMetadata().put("provenance", provenance);
  ```

---

## 2. Logic Chain
1. *Observation 3* shows that `AiExecutionTracker.start()` sets a new `TrackerContext`, discarding any existing tracker instance. In nested execution scenarios, such as when an agent orchestration run triggers a report execution, the agent's outer tracker context is completely lost when the inner report tracker calls `start()`. It is then permanently deleted when the inner tracker calls `stop()`.
2. *Observation 4* shows that `KnowledgeService.attachProvenanceIfActive` assigns its own built `provenance` map directly to the `"provenance"` key of the entry's metadata. During outcome recording, `OrchestrationService` provides a rich pre-compiled provenance block (`agentId`, `accessedDataSources`, `evaluatedPolicies`). Because the tracker initialized during recording is fresh and empty, the rich orchestration provenance is completely destroyed and overwritten.
3. Therefore, both `AiExecutionTracker` and `KnowledgeService` require improvements (nested tracker stack and map merging) to ensure correct end-to-end lineage and provenance.

---

## 3. Caveats
- This investigation is read-only; no code modifications were made.
- Assumes that `ReportRun.sourceInfo` is always mutable, which has been verified by checking that `buildSourceInfo` returns a mutable `LinkedHashMap` and `ReportRun` initializes `sourceInfo` as a mutable `HashMap`.

---

## 4. Conclusion
The database schema and primary logic for lineage/provenance are already in place, but two critical design gaps exist: context pollution in `AiExecutionTracker` and provenance overwriting in `KnowledgeService`. Implementing the stack-based nesting in `AiExecutionTracker` and a selective merge strategy in `KnowledgeService` will fully satisfy the Milestone 2: R1 requirements.

---

## 5. Verification Method
1. Run the existing tests:
   ```bash
   mvn test -Dtest=ReportExecutionServiceTest
   ```
2. Verify the database tables exist inside the local/docker PostgreSQL container.
3. Create new unit tests (`AiExecutionTrackerTest.java` and `KnowledgeServiceTest.java`) to verify the nesting and merging strategies.
