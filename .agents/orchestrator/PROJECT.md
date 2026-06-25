# Project: Ajan Yönetişimi, Tipli Eylem Şemaları ve LLM Araç Çağrısı Güvenliği

Bu proje, chatbot/ajan akışlarında tipli eylemler (Typed Actions), LLM intent tespiti, `GovernanceGate` entegrasyonu, veri izolasyonu ve veri maskeleme (MaskingService) geliştirmelerini içerir.

## Architecture
- **Typed Action Schemas & Intent Detection (R1)**:
  - `ActionType` enum'u girdi şeması ve yetki/capability gereksinimleri ile genişletilir.
  - `ActionIntentService` statik regex/contains kontrolünden kurtarılıp LLM / Spring AI tabanlı tipli intent çıkarımına geçirilir.
- **Governance-Enforced Tool-Calling (R2)**:
  - `ChatToolsConfiguration` içinde Spring AI araçları `GovernanceGate` ile sarmalanır.
  - `chatbot` modülünün Spring Modulith sınırlarına uymak için `AgentGuardService` yerine `GovernanceGate` interface'i enjekte edilir.
  - Ajan aktifken `DENY` alan araç çağrılarında `GovernanceDeniedException` fırlatılır, `SHADOW` modda ise loglama yapılır.
- **Data Isolation & RAG Scope (R3)**:
  - `KnowledgeRagService` aramalarında, ajanın/kullanıcının erişim yetkisi olmayan `DATA_SOURCE` verileri filtrelenir ve kullanıcı adına `GovernanceGate` kontrolünden geçirilir.
- **Provenance Write-Back & Masking (R4)**:
  - Varlık yazımlarında (write-back) `agentId`, `policyId`, `actingUserId` provenance bilgileri ontology metadata'sına eklenir ve `data_lineage` tablosuna kaydedilir.
  - RAG ve veri kaynağı okuma yollarında `MaskingService` aracılığıyla hassas veriler `DataMaskingRule` kurallarına göre maskelenir.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Test Suite | E2E test planı, test senaryoları ve `TEST_READY.md` yayını | none | IN_PROGRESS (Conv: f3343bdf-655d-4097-bf01-f000cd0b62d8) |
| 2 | Intent Detection & Schemas (R1) | `ActionType` şema entegrasyonu ve LLM intent tespiti | none | IN_PROGRESS (Conv: bdcfa8ef-38a6-4db6-aec0-8cdbc4cc1a1f) |
| 3 | Tool-Calling Governance (R2) | `ChatToolsConfiguration` sarmalama, Modulith sınırı ve `GovernanceDeniedException` | none | IN_PROGRESS (Conv: 04320b57-fe9a-420d-b805-70bed7c72c9b) |
| 4 | Data Isolation & RAG (R3) | `KnowledgeRagService` yetki filtreleme ve `GovernanceGate` kullanıcı kontrolleri | M3 | IN_PROGRESS (Conv: 54a1a04b-d171-4098-badd-9524859776ab) |
| 5 | Provenance & Masking (R4) | Ajan provenance ontology yazımı ve `MaskingService` maskeleme entegrasyonu | M4 | PLANNED |
| 6 | Final Verification & Audit | Entegrasyon testleri, `ChatToolsGovernanceIntegrationTest`, Modulith testi ve Forensic Audit | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Governance Gate check
- `GovernanceGate.check(UUID agentId, String capabilityType, String targetRef, String action)` -> returns `GateDecision`

### Masking Service mask
- `MaskingService.mask(String value, MaskingStrategy strategy)` -> returns masked string

## Code Layout
- Intent & Actions: `backend/src/main/java/com/akilliorganizasyon/chatbot/domain/` & `service/`
- Tool Configuration: `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`
- Governance interfaces: `backend/src/main/java/com/akilliorganizasyon/shared/governance/`
- RAG & Knowledge: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/`
- Masking: `backend/src/main/java/com/akilliorganizasyon/audit/service/MaskingService.java`
