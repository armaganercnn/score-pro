# Scope: R4 - Provenance Write-Back & Retrieval Masking

## Architecture
- Writes to `ontology_object_types` (Ontology v44) include provenance metadata (agentId, policyId, actingUserId).
- Write operations automatically record lineage logs in `data_lineage` table.
- All RAG/data source read paths filter content through `MaskingService` to redact sensitive fields.

## Milestones
- Milestone 1: Enhance write-back operations on ontology types to attach provenance and record data lineage.
- Milestone 2: Inject `MaskingService` in RAG/knowledge retrieval flows.
- Milestone 3: Mask fields based on `DataMaskingRule` active rules.

## Interface Contracts
- Write-back payload format containing provenance.
- RAG response text has sensitive parts redacted.

## Code Layout
- Audit / Masking Service: `backend/src/main/java/com/akilliorganizasyon/audit/service/MaskingService.java`
- RAG Service: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`
