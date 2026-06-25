# Data & RAG Infrastructure Exploration Report

This report analyzes the Data, vector/RAG, and Data Lineage infrastructure of the **Akıllı Organizasyon (intorg)** platform.

---

## 1. Database & pgvector Infrastructure

The database layer leverages PostgreSQL 16 with the `pgvector` extension. Since Hibernate cannot natively map vector types, a hybrid approach combining JPA/Hibernate and Spring JDBC/JdbcTemplate is used.

### Exact File Paths
- **Database Initialization**: `infra/init-db/01-init-pgvector.sql`
- **Compose Stack**: `docker-compose.yml` (and `infra/docker-compose.yml`)
- **Database Migrations**: 
  - `backend/src/main/resources/db/migration/V12__knowledge.sql` (knowledge base & embeddings tables)
  - `backend/src/main/resources/db/migration/V8__assets.sql` (data sources & lineage tables)
- **Embedding Store Layer**: `backend/src/main/java/com/akilliorganizasyon/knowledge/repository/KnowledgeEmbeddingStore.java`

### Implementation Details
- **Container Setup**: The `postgres` service in `docker-compose.yml` runs the `pgvector/pgvector:pg16` image. It mounts `./infra/init-db` to `/docker-entrypoint-initdb.d` to automatically execute `01-init-pgvector.sql` on startup, which runs:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- **Tables & Schema**:
  - `knowledge_entries`: Stores document metadata (ID, title, content, scope, source, status, version).
  - `knowledge_embeddings`: Relates 1:1 with `knowledge_entries` (foreign key `entry_id` ON DELETE CASCADE). Stored fields are `embedding vector(1536)` (suitable for standard models like OpenAI's `text-embedding-3-small`), `model VARCHAR(100)`, and `created_at`.
  - **Index**: An Approximate Nearest Neighbor (ANN) index is created for cosine distance similarity search:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector
        ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    ```
- **Native JDBC Access (`KnowledgeEmbeddingStore`)**:
  - Since Hibernate cannot map PostgreSQL `vector`, JDBC native queries are used to query/insert embeddings.
  - **Upsert**: 
    ```sql
    INSERT INTO knowledge_embeddings (entry_id, embedding, model) 
    VALUES (?, CAST(? AS vector), ?) 
    ON CONFLICT (entry_id) DO UPDATE SET 
    embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()
    ```
  - **Cosine Distance query**: Uses the `<=>` operator (cosine distance). The similarity score is calculated as `1 - distance`:
    ```sql
    SELECT entry_id, 1 - (embedding <=> CAST(? AS vector)) AS score 
    FROM knowledge_embeddings WHERE embedding IS NOT NULL 
    ORDER BY embedding <=> CAST(? AS vector) LIMIT ?
    ```

---

## 2. Knowledge Base & RAG Pipeline

The RAG pipeline retrieves relevant corporate knowledge records, enriches prompts with this context, and sends it to the chat model with language/safety directives.

### Exact File Paths
- **RAG Engine**: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`
- **Hybrid Search**: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeSearchService.java`
- **Embedding Sync/Bridge**: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeEmbeddingService.java`
- **Prompt Catalog**: `backend/src/main/java/com/akilliorganizasyon/shared/ai/PromptCatalog.java`
- **Prompt Templates**: `backend/src/main/java/com/akilliorganizasyon/shared/ai/PromptTemplateService.java`
- **AI Chat Service Gateway**: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiChatService.java`

### Implementation Details
- **Grounded Prompt Construction**: In `KnowledgeRagService.ask(...)`, the user's question is combined with retrieved context blocks in `buildUserPrompt(...)`:
  - Each source entry gets formatted with its title, category, and truncated content (up to 1500 chars).
  - The final user prompt appends: *"Yalnızca yukarıdaki bağlama dayanarak soruyu yanıtla."*
- **Search Retrieval & Fallbacks**: `KnowledgeSearchService.retrieve(...)` attempts semantic search first:
  1. Calls `KnowledgeEmbeddingService` to embed the query into a float vector.
  2. Queries the vector store.
  3. If AI or embeddings are unavailable, it falls back to a SQL keyword search on `knowledge_entries` (title/content matching).
- **Graceful Degradation**: If `AiEmbeddingService` or the AI chat model is not configured (e.g. no API key in `application.yml`), operations degrade gracefully. A clean response is returned listing retrieved documents with the notification: *"Üretken yanıt şu anda kullanılamıyor (AI sağlayıcısı yapılandırılmamış)..."*
- **System Prompts & Suffix Enrichment**:
  - `PromptCatalog` acts as a central repository for all default prompts (e.g., `KNOWLEDGE_RAG_SYSTEM`, `LANGUAGE_DIRECTIVE`).
  - `PromptTemplateService` resolves effective prompts by looking up database overrides in table `ai_prompt_templates` (allowing runtime updates from a debug console) or falling back to defaults.
  - **Turkish Directive Enforcement**: The global `LANGUAGE_DIRECTIVE` enforces that the model responds strictly in Turkish and never outputs database UUIDs/primary keys (*"ID KISITLAMA KURALI"*).
  - `AiChatService.complete(...)` automatically enriches all outgoing system prompts with this Turkish directive using `promptTemplateService.withTurkish(systemPrompt)`.

---

## 3. Data Lineage Tracking

Data lineage in the platform operates at three distinct levels: static/declared lineage, execution/audit lineage, and dynamic agent runtime lineage.

### Exact File Paths
- **Declared Lineage Schema**: `backend/src/main/resources/db/migration/V8__assets.sql`
- **Declared Lineage Model**: `backend/src/main/java/com/akilliorganizasyon/assets/domain/DataLineage.java`
- **Declared Lineage Service**: `backend/src/main/java/com/akilliorganizasyon/assets/service/DataSourceService.java`
- **Report Run Lineage**: `backend/src/main/java/com/akilliorganizasyon/reporting/service/ReportExecutionService.java`
- **Report Run Audit Entity**: `backend/src/main/java/com/akilliorganizasyon/reporting/domain/ReportRun.java`
- **Agent Task Lineage Tracker**: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`
- **Agent Governance Evaluator**: `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/service/AgentGuardService.java`

### Implementation Details
- **1. Declared (Static) Lineage**: 
  - Maintained in the `data_lineage` table under `assets`.
  - Maps a `data_source_id` to downstream targets (`target_type`: REPORT / DATASET / ASSET, `target_id`: UUID) and logs a descriptive `transformation` text.
  - Exposed via `DataSourceService.impact(UUID id)` to run impact analysis (lists all targets affected by changes to a data source).
- **2. Execution Lineage (Report Audits)**:
  - During a report execution, `ReportExecutionService.buildSourceInfo(...)` compiles a JSONB snapshot of all linked data sources (`ReportDataSource`).
  - It records metadata (quality scores, sensitivity), metrics, calculations, and the layout designed by the AI (`aiReport`).
  - This is saved in `report_runs.source_info`, creating an immutable lineage audit for every specific report run.
- **3. Dynamic Agent Lineage**:
  - Monitors which data sources an AI agent actually accesses during execution.
  - Uses a thread-local context `AiExecutionTracker.TrackerContext`.
  - When an agent runs, accesses to resources are verified using `AgentGuardService.evaluate(agentId, capabilityType, targetRef, action)`.
  - If `capabilityType` is `"DATA_SOURCE"`, `AgentGuardService` intercepts it and appends the source reference to the tracker:
    ```java
    ctx.addAccessedDataSource(targetRef);
    ```
  - Upon completion of the agent task, `OrchestrationService` extracts these records and persists them to the `agent_task_traces` table in the `accessed_data_sources` JSONB column.

---

## 4. Potential Gaps & Improvements

### A. Naive Context Truncation
- **Gap**: `KnowledgeRagService` naively truncates entry contents using `content.substring(0, 1500)`.
- **Impact**: This cuts sentences in half, splits words, and can drop critical context at the end of a long entry.
- **Improvement**: Implement semantic chunking (e.g. paragraph-based splitting or sliding window token chunking) to feed clean, complete context segments to the LLM.

### B. Rigid RAG Prompt Rendering
- **Gap**: The RAG service uses `promptTemplateService.resolve(PromptCatalog.KNOWLEDGE_RAG_SYSTEM)` which only loads the static system prompt text.
- **Impact**: It cannot support dynamic template variables (e.g. user details, permissions scope, or category constraints) resolved at render time.
- **Improvement**: Switch from `resolve(...)` to `render(key, variables)` to allow flexible prompt template variables in RAG.

### C. Declared vs. Execution Lineage Divergence
- **Gap**: When a report runs, it logs data source snapshots in `report_runs.source_info` (execution lineage), but does not automatically synchronize or validate these against the declared `data_lineage` table.
- **Impact**: Discrepancies can occur where a report is declared to use Source A, but actually executes using Source B, making static impact analysis unreliable.
- **Improvement**: Automatically populate/validate `data_lineage` edges when a report is successfully run.

### D. Suboptimal pgvector Indexing (IVFFlat vs. HNSW)
- **Gap**: `V12__knowledge.sql` uses an `IVFFlat` index on the embeddings table:
  ```sql
  CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```
- **Impact**: IVFFlat requires a representative set of data to build clusters effectively (otherwise recall suffers) and must be rebuilt as the dataset grows.
- **Improvement**: Upgrade the index to `HNSW` (Hierarchical Navigable Small World), which is the pgvector standard for high recall and dynamic updates without manual rebuilding:
  ```sql
  CREATE INDEX ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
  ```

### E. Agent Data Lineage Bypass
- **Gap**: Data source access by agents is tracked exclusively when they invoke the `AgentGuardService.evaluate(...)` capability check.
- **Impact**: If a custom tool or service queries a data source directly without invoking `AgentGuardService`, the access is invisible to `AiExecutionTracker`, creating a security and audit blindspot.
- **Improvement**: Enforce aspect-oriented programming (AOP) intercepts or repository wrappers to ensure all data source queries register accesses automatically with the active `AiExecutionTracker`.

### F. Broken Test Suite / Test Compilation Error
- **Gap**: The unit test file `ReportExecutionServiceTest.java` is failing to compile during standard builds.
- **Reason**: The constructor of `ReportExecutionService` has been extended in the main codebase to include 10 arguments (adding `JdbcTemplate` and `OrgContextPort` to support database-level query execution and scope checking). However, the instantiation in `ReportExecutionServiceTest.java:52` was not updated and still passes only 8 arguments.
- **Impact**: The maven build command (`mvn test`) fails at compile-time on `testCompile`, blocking automatic CI/CD validation.
- **Improvement**: Update `ReportExecutionServiceTest.java` to mock `JdbcTemplate` and `OrgContextPort` and pass them to the `ReportExecutionService` constructor in the `@BeforeEach setUp` method.

