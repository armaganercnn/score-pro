# Codebase Exploration & Analysis Report (Faz B Sürümü)

Bu rapor, "Akıllı Organizasyon" (intorg) projesindeki yönetişim, RAG, ontoloji, veri kökeni (lineage) ve Spring Modulith doğrulama mekanizmalarını inceleyerek son gereksinimler (2026-06-19T15:15:58+03:00) çerçevesindeki durum tespitlerini içerir.

---

## 1. Kritik Sınıflar ve Dosya İncelemeleri

### ActionIntentService.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`
- **Mevcut Durum:** Statik anahtar kelime eşleştirmesi (`IntentRule` ve `lower.contains` mantığı) kullanılmaktadır. `lower::contains` mantığı `detectAndPropose` fonksiyonunda heuristic olarak çalışmaktadır.
- **Geliştirilmesi Gereken (R1.2):** LLM / Spring AI tabanlı tipli intent tespiti eklenecek, heuristic anahtar kelime kontrolü kaldırılacaktır.

### ChatToolsConfiguration.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`
- **Mevcut Durum:** Sistemdeki kullanıcıları, projeleri, görevleri, dijital varlıkları, veri kaynaklarını ve organizasyon birimlerini listeleyen/oluşturan Spring AI fonksiyon bean'lerini tanımlar. `withContext` sarmalayıcısı ile izleme (tracing) ve güvenlik kimlik doğrulama ayarlarını yapar.
- **Geliştirilmesi Gereken (R2.2):** `withContext` güncellenerek araç çağrılarında yönetişim denetimleri tetiklenecektir. Modulith mimari sınırından dolayı somut `AgentGuardService` yerine `GovernanceGate` portu enjekte edilerek kullanılmalıdır.

### GovernanceGate.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceGate.java`
- **Mevcut Durum:** `shared/governance` paketindedir. `check(UUID agentId, String capabilityType, String targetRef, String action)` metodunu sunar. `agentlifecycle` modülüne bağımlılık olmaksızın yönetişim kontrollerinin çağrılabilmesini sağlayan bir arayüzdür (port).

### AgentGuardService.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/AgentGuardService.java`
- **Mevcut Durum:** `GovernanceGate` arayüzünü implement eder. Ajan politikalarını (`AgentPolicy`), yeteneklerini (`AgentCapability`) ve kullanıcı yetki durumunu (`UserDataAccessPort`) kontrol ederek `ALLOW`/`DENY`/`APPROVAL` kararı verir.
- **Geliştirilmesi Gereken (R2.3 & R3.2):** `governance.mode=ENFORCE` iken yetkisiz ajan eylemlerini engelleyip `GovernanceDeniedException` fırlatır.

### GovernanceDeniedException.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceDeniedException.java`
- **Mevcut Durum:** `BusinessException` sınıfından türetilmiştir ve `GOVERNANCE_DENIED` sabit hata kodunu taşır. `GlobalExceptionHandler.java` tarafından yakalanıp 403 Forbidden cevabına dönüştürülür.

### MaskingService.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/audit/service/MaskingService.java`
- **Mevcut Durum:** `FULL`, `PARTIAL` ve `HASH` stratejilerine göre veriyi maskeleyen CRUD kurallarını ve yardımcı maskeleme metotlarını içerir.
- **Geliştirilmesi Gereken (R4.2):** Ajanların bilgi tabanı (RAG) veya veri kaynaklarından okuma yaptığı yerlerde `MaskingService` kullanımı zorunlu hale getirilecektir.

### KnowledgeRagService.java
- **Yol:** `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`
- **Mevcut Durum:** Kurumsal hafıza üzerinde Retrieval-Augmented Generation gerçekleştirir. `getRelevantChunks` fonksiyonu içinde kayan pencereli (sliding window) semantik chunking uygular ve prompt oluştururken `OntologyRegistry` ile ilişkili nesneleri dinamik olarak sorgulayıp ekler.
- **Geliştirilmesi Gereken (R3.1 & R3.2):** RAG aramaları sırasında kullanıcının/ajanın yetkili olduğu veri kaynaklarına göre filtreleme yapılmalıdır.

---

## 2. Test Altyapısı ve Mevcut Testler

Aşağıdaki test sınıfları backend modüllerinde yukarıdaki bileşenleri doğrulamaktadır:

| Test Sınıfı | Yol | Doğruladığı Konular |
|---|---|---|
| `AgentGuardServiceTest` | `agentlifecycle/service/AgentGuardServiceTest.java` | Politika ve yetenek tabanlı engellemeler, on-behalf-of kontrolleri, shadow/enforce modları. |
| `AgentDataAccessAspectTest` | `shared/governance/AgentDataAccessAspectTest.java` | Aspect'in veritabanı erişimlerinde `GovernanceGate.check` denetimlerini tetiklemesi ve `GovernanceDeniedException` fırlatması. |
| `KnowledgeRagServiceTest` | `knowledge/service/KnowledgeRagServiceTest.java` | RAG retrieval akışı ve ontology entegrasyonu. |
| `SemanticChunkerTest` | `knowledge/service/SemanticChunkerTest.java` | Kayan pencereli semantik parçalama (`getRelevantChunks`) doğrulaması. |
| `ChatToolsConfigurationTest` | `chatbot/service/ChatToolsConfigurationTest.java` | Tanımlanan araçların (Beans) ve subordinate hiyerarşisinin doğrulanması. |
| `GovernanceModeServiceTest` | `shared/governance/GovernanceModeServiceTest.java` | Platform ve organizasyon bazlı yönetişim modunun çözümlenmesi. |
| `GovernanceShadowServiceTest`| `shared/governance/GovernanceShadowServiceTest.java` | Shadow modundaki loglama ve raporlama mekanizmaları. |
| `OntologyRegistryTest` | `shared/ontology/OntologyRegistryTest.java` | Ontoloji nesne ve link tiplerinin kayıt ve çözümleme testleri. |

### Test Koşum Komutu
Tüm testleri veya belirli testleri çalıştırmak için şu komut kullanılır:
`mvn test -Dtest=AgentGuardServiceTest,AgentDataAccessAspectTest,KnowledgeRagServiceTest,SemanticChunkerTest,ChatToolsConfigurationTest,ModulithVerificationTest`

---

## 3. Spring Modulith Doğrulama Testi (ModulithVerificationTest)

- **Yol:** `backend/src/test/java/com/akilliorganizasyon/ModulithVerificationTest.java`
- **Çalışma Prensibi:** `ApplicationModules.of(AkilliOrganizasyonApplication.class).verify()` çağrısı yapılarak projenin paket yapısı taranır ve modüller arası bağımlılık kuralları denetlenir.
- **Modulith Kuralları:**
  - `com.akilliorganizasyon` altındaki her birinci seviye alt paket (ör. `chatbot`, `agentlifecycle`, `knowledge`, `shared`) ayrı birer uygulama modülü olarak kabul edilir.
  - Modüller varsayılan olarak kendi içlerindeki alt paketleri (`service`, `repository`, `domain` vb.) dış dünyaya kapatır.
  - Modüllerin API niteliğindeki alt paketleri dış dünyaya açması için `package-info.java` dosyalarında `@org.springframework.modulith.NamedInterface("...")` tanımı veya doğrudan root paket seviyesinde public sınıflar kullanması gerekir.
  - Örneğin `shared/governance` paketi `@org.springframework.modulith.NamedInterface("governance")` ile işaretlenmiştir. Bu sayede `chatbot` modülü, `shared/governance` paketindeki `GovernanceGate` arayüzünü kullanabilir. Ancak `agentlifecycle` modülündeki somut `AgentGuardService` sınıfına doğrudan bağımlılık kurulursa Modulith doğrulama testi **HATA** verir.
  - Bu sayede döngüsel bağımlılıklar (circular dependency) engellenmiş ve modüler tasarım korunmuş olur.

---

## 4. Veritabanı Şemaları (Ontology, Data Lineage, Policies)

Veritabanı migration dosyaları incelenerek ilgili tablolar ve kolonlar doğrulanmıştır:

### A. Ontology Şeması (`V44__ontology_metadata.sql`)
1. **`ontology_object_types`**: Ontoloji nesne tiplerini tutar.
   - `id` (UUID PRIMARY KEY)
   - `key` (VARCHAR(100) UNIQUE NOT NULL)
   - `display_name` (VARCHAR(255) NOT NULL)
   - `description` (TEXT)
   - `entity_class` (VARCHAR(255))
   - `sensitive` (BOOLEAN NOT NULL DEFAULT FALSE)
2. **`ontology_link_types`**: Ontoloji nesneleri arasındaki ilişkileri tanımlar.
   - `id` (UUID PRIMARY KEY)
   - `key` (VARCHAR(100) UNIQUE NOT NULL)
   - `source_object_key` (VARCHAR(100) REFERENCES ontology_object_types(key))
   - `target_object_key` (VARCHAR(100) REFERENCES ontology_object_types(key))
   - `cardinality` (VARCHAR(30) NOT NULL DEFAULT 'MANY_TO_MANY')

### B. Data Lineage Şeması (`V8__assets.sql`)
- **`data_lineage`**: Veri kaynaklarından aşağı yöndeki raporlara/varlıklara olan akışı takip eder.
  - `id` (UUID PRIMARY KEY)
  - `data_source_id` (UUID REFERENCES data_sources(id))
  - `target_type` (VARCHAR(30) NOT NULL) -- REPORT / DATASET / ASSET
  - `target_id` (UUID NOT NULL)
  - `transformation` (TEXT)
  - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())

### C. Policies & Capabilities Şeması (`V10__agent_lifecycle.sql`)
1. **`agent_capabilities`**: Ajanların veri kaynakları, araçlar veya aksiyonlar üzerindeki yetki sınırlarını belirler.
   - `id` (UUID PRIMARY KEY)
   - `agent_id` (UUID REFERENCES agents(id))
   - `capability_type` (VARCHAR(30) NOT NULL) -- DATA_SOURCE / TOOL / ACTION
   - `target_ref` (VARCHAR(255) NOT NULL)
   - `allowed` (BOOLEAN NOT NULL DEFAULT TRUE)
   - `requires_approval` (BOOLEAN NOT NULL DEFAULT FALSE)
2. **`agent_policies`**: Ajanlara bağlı kurallar/politikalar (YAML veya JSON biçimli dokümanlar).
   - `id` (UUID PRIMARY KEY)
   - `agent_id` (UUID REFERENCES agents(id))
   - `name` (VARCHAR(255) NOT NULL)
   - `format` (VARCHAR(10) NOT NULL DEFAULT 'JSON') -- YAML / JSON
   - `content` (TEXT NOT NULL)
   - `active` (BOOLEAN NOT NULL DEFAULT TRUE)

### D. Governance Mode & Masking Rules (`V43__governance_mode.sql`, `V14__audit_security.sql`)
1. **`platform_settings`** (`governance.mode`):
   - JSON biçimli değer saklar: `{"default": "shadow", "orgModes": {}}`
   - `V46` migration dosyası ile VL-IT organizasyonu için bu değer `enforce` olarak set edilmektedir.
2. **`data_masking_rules`**: Maskeleme kurallarını saklar.
   - `id` (UUID PRIMARY KEY)
   - `resource_type` (VARCHAR(100) NOT NULL)
   - `field_name` (VARCHAR(100) NOT NULL)
   - `strategy` (VARCHAR(30) NOT NULL) -- FULL / PARTIAL / HASH
   - `min_role` (VARCHAR(50) NOT NULL DEFAULT 'ADMIN')
   - `active` (BOOLEAN NOT NULL DEFAULT TRUE)
