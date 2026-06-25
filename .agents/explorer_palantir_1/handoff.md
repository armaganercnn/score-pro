# Explorer Handoff Report — Data & RAG Infrastructure

## 1. Observation
The following configurations and code segments were directly verified in the codebase:
- **pgvector Activation**: In `infra/init-db/01-init-pgvector.sql` (Line 2):
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- **Embedding Storage**: In `backend/src/main/resources/db/migration/V12__knowledge.sql` (Lines 43-49):
  ```sql
  CREATE TABLE IF NOT EXISTS knowledge_embeddings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id    UUID NOT NULL UNIQUE REFERENCES knowledge_entries(id) ON DELETE CASCADE,
      embedding   vector(1536),
      model       VARCHAR(100),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
  And the index definition on lines 54-55:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector
      ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```
- **Similarity Querying**: In `backend/src/main/java/com/akilliorganizasyon/knowledge/repository/KnowledgeEmbeddingStore.java` (Lines 89-91):
  ```java
  String sql = "SELECT entry_id, 1 - (embedding <=> CAST(? AS vector)) AS score "
          + "FROM knowledge_embeddings WHERE embedding IS NOT NULL "
          + "ORDER BY embedding <=> CAST(? AS vector) LIMIT ?";
  ```
- **RAG Generation**: In `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java` (Lines 59-61):
  ```java
  String answer = aiChatService.complete(
          promptTemplateService.resolve(PromptCatalog.KNOWLEDGE_RAG_SYSTEM),
          buildUserPrompt(question, sources));
  ```
- **Report Lineage**: In `backend/src/main/java/com/akilliorganizasyon/reporting/service/ReportExecutionService.java` (Lines 131-132):
  ```java
  List<ReportDataSource> sources = dataSourceRepository.findByReportIdOrderByCreatedAtAsc(report.getId());
  run.setSourceInfo(buildSourceInfo(report, sources));
  ```
- **Agent Data Source Tracking**: In `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/service/AgentGuardService.java` (Lines 63-68):
  ```java
  if ("DATA_SOURCE".equalsIgnoreCase(capabilityType)) {
      com.akilliorganizasyon.shared.ai.AiExecutionTracker.TrackerContext ctx = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
      if (ctx != null) {
          ctx.addAccessedDataSource(targetRef);
      }
  }
  ```

## 2. Logic Chain
1. Based on the observation in `01-init-pgvector.sql` and `V12__knowledge.sql`, we confirmed that `pgvector` is enabled on PostgreSQL startup, and vector data of size 1536 is stored in a dedicated `knowledge_embeddings` table.
2. Based on `KnowledgeEmbeddingStore.java`, cosine distance (`<=>`) is converted to cosine similarity (`1 - distance`) via native JDBC queries, resolving the limitation of Hibernate not supporting PostgreSQL vector types.
3. Based on `KnowledgeRagService.java` and `AiChatService.java`, the system resolves the `KNOWLEDGE_RAG_SYSTEM` prompt, automatically enriches it with the Turkish language directive and UUID exposure filter, truncates content, and invokes the chat model.
4. Based on `ReportExecutionService.java` and `AgentGuardService.java`, the system records data source metadata during report run executions into the `ReportRun.sourceInfo` column, and intercepts agent access queries to log them dynamically inside `AgentTaskTrace.accessedDataSources` via a thread-local execution tracker.
5. While running verification tests, we observed that `mvn test` failed at compilation stage (`testCompile`) due to a constructor arguments mismatch in `ReportExecutionServiceTest.java`. This confirms a test-compilation regression where new arguments (`JdbcTemplate` and `OrgContextPort`) were added to the target service but not mocked in the test setup.
6. Identifying these patterns allowed us to analyze the architecture and catalog the exact file paths and design mechanisms, culminating in the complete structural report saved to `analysis.md`.

## 3. Caveats
- No real vector-database performance tests were run in this read-only phase; index efficiency (like IVFFlat vs. HNSW comparison) is based on standard pgvector benchmarks and documentation rather than live profiling.
- External model API behaviors were not observed as we are in `CODE_ONLY` network mode, preventing external integration requests. We assume Spring AI behaves standardly when resolving `EmbeddingModel` and `ChatModel` beans.
- Unit tests are currently broken/non-compilable in the repository due to the constructor arguments mismatch in `ReportExecutionServiceTest.java`.

## 4. Conclusion
The Data and RAG architecture of 'Akıllı Organizasyon' is robustly structured across standard modular packages (`knowledge`, `assets`, `reporting`, `shared.ai`). Native SQL workarounds bypass Hibernate's vector limitations cleanly. Gaps exist around naive truncation of RAG context, static vs. dynamic lineage synchronization, HNSW vector indexing upgrades, tool capability bypasses, and the broken unit tests in `ReportExecutionServiceTest.java`.

## 5. Verification Method
- **Verify Test Compilation Failure**: Run `mvn clean test-compile` in the `backend/` directory; it will fail with:
  `[ERROR] ReportExecutionServiceTest.java:[52,19] constructor ReportExecutionService in class com.akilliorganizasyon.reporting.service.ReportExecutionService cannot be applied to given types;`
- **Inspect Analysis**: View `/Users/armaganercan/antigravity/intelligent-organization/.agents/explorer_palantir_1/analysis.md` directly.
- **Invalidation Condition**: If the database stack shifts away from PostgreSQL/pgvector to another vector store (e.g. pgvector is disabled, or a third-party vector DB is introduced), the JDBC queries in `KnowledgeEmbeddingStore` and the schema migrations in `V12__knowledge.sql` will be invalidated.

