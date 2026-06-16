# Project: Birim Üyelikleri & Akış İzleyici (Flow Visualizer) Yenilikleri

Bu proje, "Birim Üyelikleri" yapısının genişletilmesini ve "Akış İzleyici (Flow Visualizer)" arayüzü için R2, R3, R4 geliştirmeleri ile PO Vizyon Hizalamasını (maliyet gösterimi, döngü tespiti, darboğaz vurgulama) içerir.

## Architecture
- **Backend (Spring Boot)**: 
  - `com.akilliorganizasyon.assets` modülü altında OrgUnit disassociation patch API desteği.
  - `com.akilliorganizasyon.agents` modülü altında dynamic loop tespiti, `AgentTaskStatus.LOOP_DETECTED` tanımı.
  - `AiExecutionTracker.TrackerContext` ve `AgentTaskTrace` üzerinde veri kaynağı (DataSource) izleme altyapısı.
- **Frontend (Vue 3)**: 
  - `frontend/src/modules/organization` altında organizasyon birim varlık sekmeleri.
  - `frontend/src/modules/aidebug` altında Vue Flow tabanlı görselleştirme, animasyonlar, darboğaz analizi kartları, maliyet hesaplama ve detay paneli.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Test Suite | E2E test planı ve altyapısının hazırlanması, `TEST_READY.md` yayını | none | IN_PROGRESS |
| 2 | Backend API (OrgUnit) | Product, Integration, DataSource için PATCH disassociation API desteği | none | IN_PROGRESS |
| 3 | Frontend Tabs (OrgUnit) | Arayüze organizasyon sekmelerinin eklenmesi ve API entegrasyonu | M2 | IN_PROGRESS |
| 4 | Flow Visualizer Backend (R2, R3) | Veri kaynağı izleme ve dynamic loop tespiti altyapısının backend'e eklenmesi, `AgentTaskTrace` db migrasyonu | none | PLANNED |
| 5 | Flow Visualizer Frontend (R2, R3, R4) | Vue Flow canvas'ında döngülerin kırmızı renkle vurgulanması, darboğaz parlamaları, veri kaynaklarının gösterimi | M4 | PLANNED |
| 6 | PO Vision & Costs | Düğüm bazlı token maliyeti hesaplama ve detaylı Kök Neden Analiz widget'ının arayüze entegrasyonu | M5 | PLANNED |
| 7 | Final Verification | E2E testlerin tamamının koşulması ve Forensic Audit kontrolü | M1, M3, M6 | PLANNED |

## Interface Contracts
### Assets ↔ Organization
*(Existing PATCH API contracts remain unchanged)*

### Agents ↔ Flow Visualizer
#### Run Detail GET API (Updated)
- Path: `/api/agents/runs/{id}`
- Method: `GET`
- Response Payload: `RunDetailDto` containing tasks list.
- **Task Trace details in RunDetailDto (`AgentTaskTraceDto`)**:
  - Adds `accessedDataSources` field: `List<String>` list of data source keys accessed during execution (e.g. `["knowledge_base", "erp"]`).

#### Agent Task Statuses (Updated)
- Added status `"LOOP_DETECTED"` to `AgentTaskStatus` enum.

## Code Layout
- Backend controllers: `backend/src/main/java/com/akilliorganizasyon/assets/api/`
- Backend services: `backend/src/main/java/com/akilliorganizasyon/assets/service/`
- Backend agents domain & tracing: `backend/src/main/java/com/akilliorganizasyon/agents/domain/` & `service/`
- Frontend views: `frontend/src/modules/organization/views/`
- Frontend components: `frontend/src/modules/organization/components/` & `frontend/src/modules/aidebug/components/`
- Frontend stores: `frontend/src/modules/aidebug/store/flowVisualizer.ts`
- Frontend API client: `frontend/src/modules/assets/api/assetsApi.ts` & `frontend/src/modules/agents/api/agentsApi.ts`
