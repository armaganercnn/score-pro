# Milestone 2: R1 (Lineage & Provenance) Analiz Raporu ve Uygulama Stratejisi

Bu rapor, projenin **Faz B / Milestone 2: R1 (Lineage & Provenance)** modülü kapsamında mevcut kod tabanındaki veritabanı şeması, servis entegrasyonları, takip mekanizmaları, provenance yapıları ve testlerin analizini içerir.

---

## 1. Veri Soy Ağacı (`data_lineage`) Veritabanı Tablosu ve Entity Katmanı

### Veritabanı Şeması (`V8__assets.sql`)
`data_lineage` tablosu, bir veri kaynağından (`data_sources`) türeyen bağımlılıkları (edges) saklar. Şema tanımı şu şekildedir:
```sql
CREATE TABLE IF NOT EXISTS data_lineage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id  UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    target_type     VARCHAR(30) NOT NULL, -- REPORT / DATASET / ASSET
    target_id       UUID NOT NULL,
    transformation  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_type, target_id);
```

### Entity Sınıfı (`DataLineage.java`)
`com.akilliorganizasyon.assets.domain.DataLineage` sınıfı standart bir JPA entity'sidir:
- **Paket:** `com.akilliorganizasyon.assets.domain`
- **Alanlar:**
  - `id`: UUID (JPA `@Id` ve `@GeneratedValue(strategy = GenerationType.UUID)`)
  - `dataSourceId`: UUID
  - `targetType`: String (Uzunluk: 30)
  - `targetId`: UUID
  - `transformation`: String (`columnDefinition = "text"`)
  - `createdAt`: Instant (PrePersist ile otomatik atanır)

### Repository Arayüzü (`DataLineageRepository.java`)
`com.akilliorganizasyon.assets.repository.DataLineageRepository` üzerinden aşağıdaki sorgular desteklenir:
- `List<DataLineage> findByDataSourceIdOrderByCreatedAtDesc(UUID dataSourceId)`
- `boolean existsByDataSourceIdAndTargetTypeAndTargetId(UUID dataSourceId, String targetType, UUID targetId)` (Mükerrer lineage kayıtlarını engellemek/tekilleştirmek için kullanılır, TC-T1-03).

### Servis ve Dışa Açık Port (`DataSourcePort`)
Diğer modüllerin (Modulith kurallarına uygun olarak) lineage eklemesini sağlayan yapı `DataSourcePort` arayüzüdür:
- **Metot:** `void addLineage(UUID dataSourceId, String targetType, UUID targetId, String transformation)`
- **Uygulama (`DataSourcePortImpl.java`):**
  - Gelen `targetType` parametresini normalize eder (trim & toUpperCase).
  - `existsByDataSourceIdAndTargetTypeAndTargetId` ile veritabanında aynı kaydın olup olmadığını kontrol eder (de-duplication).
  - Eğer kayıt yoksa yeni bir `DataLineage` nesnesi oluşturarak veritabanına kaydeder.

---

## 2. AI Takip Mekanizması (`AiExecutionTracker`)

`com.akilliorganizasyon.shared.ai.AiExecutionTracker`, thread-local bazlı bir çalışma zamanı takip mekanizmasıdır. Chatbot istekleri veya ajan görevleri sırasında token kullanımı, süre, çağrılan araçlar ve erişilen veri kaynaklarını otomatik toplar.

### Veri Kaynaklarının Toplanması
`AiExecutionTracker.TrackerContext` içinde veri kaynakları için thread-safe bir liste tutulur:
```java
private final List<String> accessedDataSources = new java.util.concurrent.CopyOnWriteArrayList<>();
```
- **Kayıt Ekleme:** `addAccessedDataSource(String dataSource)` ile listeye veri kaynağı eklenir (mükerrer kayıt kontrolü liste düzeyinde de yapılır).
- **Sorgulama:** `getAccessedDataSources()` ile listenin kopyası alınır.

### Tetiklenme Noktaları
1. **Ajan / Orkestrasyon Görevleri (`AgentGuardService.java`):**
   Ajanlar bir kaynağa erişmeye çalıştığında yetki kontrolü yapan `evaluate` metodu tetiklenir. Eğer yetki talep edilen yetenek (`capabilityType`) bir `"DATA_SOURCE"` ise, thread-local context'e veri kaynağının referansı (`targetRef`) eklenir:
   ```java
   if (DATA_SOURCE.equalsIgnoreCase(capabilityType) && ctx != null) {
       ctx.addAccessedDataSource(targetRef);
   }
   ```
2. **Rapor Çalıştırma (`ReportExecutionService.java`):**
   Rapor çalıştırılırken rapora bağlı veri kaynakları (`ReportDataSource` listesi) doğrudan tracker'a eklenir:
   ```java
   tracker.addAccessedDataSource(source.getDataSourceId().toString());
   ```

---

## 3. Rapor Çalıştırma ve Lineage Takibi (`ReportExecutionService.java`)

Raporların çalıştırılması `run` metodu üzerinden `execute` metodunu çağırarak gerçekleşir.

### Rapor Çalıştırma Adımları (`execute` metodu)
1. **ReportRun Başlatma:** Yeni bir `ReportRun` kaydı `ReportRunStatus.RUNNING` durumuyla veritabanına kaydedilir.
2. **Tracker Başlatma:** `AiExecutionTracker.start()` ile thread-local context oluşturulur. `runId` ve `actingUserId` bilgileri tracker'a set edilir.
3. **Veri Kaynaklarının Belirlenmesi:** Rapor tanımındaki tüm `ReportDataSource` nesneleri çekilir ve `tracker.addAccessedDataSource` ile tracker'a eklenir.
4. **Source Info ve Rapor Sonucu Oluşturma:** `buildSourceInfo` metodu ile rapor metrikleri (simüle veya gerçek veritabanı sorgusuyla) derlenir, `ReportRun.sourceInfo` alanı doldurulur.
5. **Otomatik Lineage Yazımı:** Tracker'da biriken tüm veri kaynakları için `dataSourcePort.addLineage` çağrılır:
   ```java
   dataSourcePort.addLineage(dsUuid, "REPORT", report.getId(), "Queried via report run " + run.getId());
   ```
6. **Provenance Ekleme:** Tracker'dan alınan tüm LLM metrikleri (token sayıları, model, süre vb.) ve erişilen kaynaklar derlenerek `ReportRun.sourceInfo` içerisine `provenance` anahtarı altında eklenir.
7. **Kapatma:** `finally` bloğunda `AiExecutionTracker.stop()` ile thread-local temizlenir.
8. **Kaydetme:** Başarılı/başarısız durumu güncellenen `ReportRun` veritabanına kaydedilir.

---

## 4. Kurumsal Hafızaya Kayıt ve Provenance Yapısı (`AgentKnowledgeWriter.java`)

Ajan veya orkestrasyon sonucunun kurumsal hafızaya (`KnowledgeEntry`) kaydedilmesi aşamasında veri kaynağı izlenebilirliği (provenance) korunur.

### Orkestrasyon Akışı (`OrchestrationService.java`)
Orkestrasyon tamamlandığında, çalıştırılan ajanların oluşturduğu tüm `AgentTaskTrace` kayıtları taranarak erişilen tüm veri kaynakları (`accessedDataSourcesList`) ve değerlendirilen politikalar (`evaluatedPoliciesList`) derlenir.

### Provenance Yapısı
`OrchestrationService` şu yapıda bir provenance haritası hazırlar:
```json
{
  "provenance": {
    "agentId": "<root-agent-uuid>",
    "runId": "<orchestration-run-uuid>",
    "accessedDataSources": ["<ds-uuid1>", "<ds-uuid2>"],
    "evaluatedPolicies": ["<policy-id1>"]
  }
}
```
Bu harita `AgentKnowledgeWriter.recordOutcome(run, result, provenanceMetadata)` metoduna aktarılır.

### Bilgi Girişi Metadata Kaydı (`AgentKnowledgeWriter.java` & `KnowledgeEntry.java`)
- `AgentKnowledgeWriter` metodu `CreateKnowledgeEntryRequest` nesnesi oluşturur ve gelen provenance haritasını doğrudan `metadata` alanına yazar.
- `KnowledgeEntry` sınıfındaki `@JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") Map<String, Object> metadata` alanı sayesinde bu veri veritabanında JSONB olarak saklanır.
- Kayıt başarılı olduktan sonra, orkestrasyon akışı her bir veri kaynağı için lineage tablosuna kayıt atar:
  ```java
  dataSourcePort.addLineage(dsUuid, "ASSET", knowledgeEntryId, "Synthesized via agent orchestration run " + runId);
  ```

---

## 5. Rapor Çalıştırma Provenance Yapısı (`ReportRun.source_info`)

`ReportRun` sınıfındaki `sourceInfo` alanı JSONB olarak saklanır. Rapor başarıyla tamamlandığında `provenance` bloğu şu formatta bu alana eklenir:

```json
{
  "provenance": {
    "runId": "<report-run-uuid>",
    "agentId": "<agent-uuid-if-executed-by-agent>",
    "accessedDataSources": ["<ds-uuid1>", "<ds-uuid2>"],
    "evaluatedPolicies": ["<policy-id1>"],
    "userId": "<user-uuid-who-triggered>",
    "inputTokens": 1050,
    "outputTokens": 250,
    "totalTokens": 1300,
    "durationMs": 4200,
    "model": "gpt-4"
  }
}
```

Bu yapı sayesinde rapor çıktılarının hangi veri tabanlarından, hangi kullanıcı/ajan yetkisiyle ve hangi LLM maliyetleriyle üretildiği geriye dönük sorgulanabilir.

---

## 6. Doğrulama ve Test Planı (Verification Plan)

Lineage ve Provenance yeteneklerinin doğru çalıştığını doğrulamak için tasarlanmış Mockito tabanlı unit testler mevcuttur.

### Mevcut Test Dosyaları
1. **`ReportExecutionServiceTest.java`**:
   - `marksRunsAsSimulatedAndDerivesMetricsFromLinkedSourceMetadata`: Rapor çalıştırıldığında veri kaynaklarının `data_lineage` tablosuna doğru şekilde kaydedildiğini (targetType="REPORT", targetId=reportId) `verify(dataSourcePort).addLineage(...)` üzerinden doğrular.
2. **`AgentKnowledgeWriterTest.java`**:
   - `recordOutcomeAttachesProvenanceMetadataCorrectly`: Orkestrasyon sonucu kurumsal hafızaya yazılırken `provenance` bloğunun (agentId, runId) oluşturulan `KnowledgeEntry` nesnesinin metadata'sına doğru şekilde aktarıldığını doğrular.

### Test Çalıştırma Komutları
Sadece ilgili birim testlerini izole olarak çalıştırmak için:
```bash
mvn test -Dtest=ReportExecutionServiceTest,AgentKnowledgeWriterTest
```

Tüm testleri çalıştırmak için (Derleme ve Genel Test Süreci):
```bash
mvn clean test
```
*(Not: Lokal veritabanı bağlantısı gerektiren entegrasyon testlerinin hata vermemesi için "test" profilinin veri tabanı bağlantı ayarlarının yapılmış olması gerekir.)*
