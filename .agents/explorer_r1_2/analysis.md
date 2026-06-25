# Milestone 2 — R1 (Lineage & Provenance) Analiz Raporu ve Uygulama Stratejisi

## Yönetici Özeti
Bu analiz raporu, **Akıllı Organizasyon** platformunda veri soy ağacı (Data Lineage) ve köken (Provenance) takibinin mevcut mimarisini incelemekte, sistemdeki iki kritik yapısal açığı (Nested ThreadLocal kaybı ve Provenance veri ezilmesi) tespit etmekte ve bunları çözmek üzere somut bir uygulama stratejisi sunmaktadır.

Analizde tespit edilen iki temel problem şunlardır:
1. **ThreadLocal Bağlam Karışması/Kaybı**: Ajan orkestrasyonu gibi ana bir işlem devam ederken iç tarafta rapor çalıştırma gibi alt işlemlerin tetiklenmesi, mevcut `AiExecutionTracker` bağlamının ezilmesine ve sonrasında `stop()` çağrıldığında ana bağlam verilerinin tamamen kaybedilmesine yol açmaktadır.
2. **Provenance Üzerine Yazılma Hatası**: `KnowledgeService.attachProvenanceIfActive` metodunun, orkestrasyon outcome kaydında request ile gelen detaylı provenance verisini kontrol etmeden doğrudan o anki boş/yeni tracker verisiyle ezmesi sonucu veri kaybı yaşanmaktadır.

---

## 1. Veri Soy Ağacı (`data_lineage`) Veritabanı ve Kod Yapısı

### A. Veritabanı Tablo Şeması
`data_lineage` tablosu, veri kaynaklarından (`data_sources`) downstream hedeflere (raporlar, veri setleri veya diğer varlıklar) olan bağımlılık ilişkilerini (edges) tutar.
- **Konum**: `backend/src/main/resources/db/migration/V8__assets.sql` (satır 155-162)
- **DDL Şeması**:
  ```sql
  CREATE TABLE IF NOT EXISTS data_lineage (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_source_id  UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      target_type     VARCHAR(30) NOT NULL, -- Örn: 'REPORT', 'DATASET', 'ASSET'
      target_id       UUID NOT NULL,
      transformation  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(data_source_id);
  CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_type, target_id);
  ```

### B. Entity ve Repository Sınıfları
- **Entity**: `com.akilliorganizasyon.assets.domain.DataLineage`
  - Tablo kolonlarını JPA alanlarıyla eşleştirir: `id` (UUID), `dataSourceId` (UUID), `targetType` (String), `targetId` (UUID), `transformation` (String), `createdAt` (Instant).
- **Repository**: `com.akilliorganizasyon.assets.repository.DataLineageRepository`
  - `JpaRepository<DataLineage, UUID>` arayüzünü genişletir ve şu sorgu metotlarını barındırır:
    ```java
    List<DataLineage> findByDataSourceIdOrderByCreatedAtDesc(UUID dataSourceId);
    boolean existsByDataSourceIdAndTargetTypeAndTargetId(UUID dataSourceId, String targetType, UUID targetId);
    ```

### C. Yazma Yolu (Write Path)
Veri soy ağacı kayıtları, platform genelinde `DataSourcePort` arayüzü üzerinden soyutlanarak güvenli bir şekilde kaydedilir.
- **Port Metodu**: `void addLineage(UUID dataSourceId, String targetType, UUID targetId, String transformation)`
- **Uygulama Sınıfı** (`DataSourcePortImpl.java`):
  Mükerrer veri soy ağacı kayıtlarını engellemek amacıyla `existsByDataSourceIdAndTargetTypeAndTargetId` kontrolü yapar (De-duplication) ve işlemi veritabanına yansıtır:
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

## 2. AiExecutionTracker Veri Kaynakları Takip Yapısı

`AiExecutionTracker.java` sınıfı, iş parçacığı düzeyinde (thread-local) `TrackerContext` kullanarak LLM metriklerini ve erişilen kaynakları toplar.

### A. Veri Kaynaklarının Toplanması
- **Context Depolama**: `TrackerContext` sınıfı içinde `accessedDataSources` adında thread-safe bir `CopyOnWriteArrayList<String>` listesi barındırılır.
- **Kayıt Ekleme**: `addAccessedDataSource(String dataSource)` metodu çağrılarak veri kaynağının referansı eklenir. Ekleme öncesinde listenin benzersizliği `.contains()` kontrolü ile korunur.
- **Çalışma Zamanı Yaşam Döngüsü**:
  - `AiExecutionTracker.start()`: Thread için yeni bir `TrackerContext` başlatır.
  - `AiExecutionTracker.get()`: O an aktif olan context nesnesini döner.
  - `AiExecutionTracker.stop()`: İş parçacığına bağlı context nesnesini kaldırarak bellek sızıntısını önler.

### B. Tetiklenme Kanalları
1. **Rapor Çalıştırma (`ReportExecutionService.java`):**
   Rapor çalıştırılırken rapora bağlı tüm veri kaynakları listesi (`ReportDataSource`) doğrudan tracker'a eklenir:
   ```java
   tracker.addAccessedDataSource(source.getDataSourceId().toString());
   ```
2. **Ajan Yetenek Kontrolü (`AgentGuardService.java`):**
   Ajanlar bir veri kaynağına yetki talebinde bulunduğunda tetiklenen `evaluate` metodu üzerinden:
   ```java
   if (DATA_SOURCE.equalsIgnoreCase(capabilityType) && ctx != null) {
       ctx.addAccessedDataSource(targetRef);
   }
   ```

---

## 3. Rapor Çalıştırma ve Lineage Entegrasyonu (`ReportExecutionService.java`)

Rapor çalıştırma işlemi `execute(Report report, ReportFormat format, UUID runBy)` metodu üzerinden yönetilir.

### A. Rapor Çalıştırma Akış Adımları
1. **ReportRun Oluşturma**: `status = ReportRunStatus.RUNNING` olan yeni bir `ReportRun` kaydı oluşturulur ve kaydedilir.
2. **Tracker Başlatma**: `AiExecutionTracker.start()` ile thread-local context başlatılır, `runId` ve `actingUserId` bilgileri tracker'a işlenir.
3. **Veri Kaynaklarının Çekilmesi**: `ReportDataSourceRepository` üzerinden rapora bağlı veri kaynakları alınır ve `tracker.addAccessedDataSource(id)` metoduyla tracker bağlamına eklenir.
4. **Metriklerin Oluşturulması**: `buildSourceInfo` metoduyla rapor metrikleri (simüle veya gerçek veritabanı sorgusuyla) hesaplanır, `ReportRun.sourceInfo` alanı doldurulur.
5. **Otomatik Lineage Kaydı**: Tracker bağlamındaki tüm veri kaynakları için `dataSourcePort.addLineage` metodu çağrılarak otomatik veri soy ağacı kayıtları veritabanına yazılır:
   ```java
   dataSourcePort.addLineage(dsUuid, "REPORT", report.getId(), "Queried via report run " + run.getId());
   ```
6. **Provenance Haritasının Eklenmesi**: Tracker bağlamında toplanan tüm LLM token metrikleri, erişilen kaynaklar, süre ve model detayları `ReportRun.sourceInfo` haritasına `provenance` anahtarıyla eklenir.
7. **Sonlandırma**: Hatalı veya başarılı bitiş fark etmeksizin `finally` bloğunda `AiExecutionTracker.stop()` çağrılarak thread-local bağlamı durdurulur.

---

## 4. Kurumsal Hafızaya Kayıt ve Provenance Entegrasyonu

Ajan veya orkestrasyon sonucunun kurumsal hafızaya (`KnowledgeEntry`) kaydedilmesi aşamasında veri kaynağı izlenebilirliği (provenance) korunur.

### A. Orkestrasyon Akışı (`OrchestrationService.java`)
Orchestration tamamlandığında, orkestrasyon akışında yer alan ajanların tüm `AgentTaskTrace` kayıtları taranarak erişilen veri kaynakları (`accessedDataSourcesList`) ve değerlendirilen politikalar (`evaluatedPoliciesList`) toplanır. Sonrasında şu provenance yapısı oluşturulur:
```json
{
  "provenance": {
    "agentId": "<agent-uuid>",
    "runId": "<orchestration-run-uuid>",
    "accessedDataSources": ["<ds-uuid1>", "<ds-uuid2>"],
    "evaluatedPolicies": ["<policy-id1>"]
  }
}
```
Bu harita `AgentKnowledgeWriter.recordOutcome(run, result, provenanceMetadata)` metoduna aktarılır.

### B. Bilgi Girişi Metadata Kaydı (`AgentKnowledgeWriter.java` & `KnowledgeEntry.java`)
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

## 6. Mimari Geliştirme Noktaları ve Çözüm Planı

Platformda veri soy ağacı ve provenance kalitesini artırmak için şu iki kritik iyileştirmenin yapılması gerekmektedir:

### Geliştirme A: İçiçe (Nested) Tracker Bağlamı Desteği
*Dosya*: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`

Mevcut durumda, `AiExecutionTracker.start()` çağrısı var olan thread-local context'i ezer ve `stop()` çağrıldığında o anki context tamamen yok olur. Eğer rapor çalıştırma işlemi bir ajan görevinin içinden çağrılırsa, rapor bittiğinde ajanın context verisi kaybolur.

**Çözüm Metodolojisi**:
`TrackerContext` nesnesine bir `parent` referansı eklenerek stack (yığın) mantığı kurulmalıdır.
```java
// TrackerContext sınıfına eklenecek alan ve yapıcı metot:
public static class TrackerContext {
    private final TrackerContext parent;
    
    public TrackerContext() {
        this.parent = null;
    }
    
    public TrackerContext(TrackerContext parent) {
        this.parent = parent;
    }
    
    public TrackerContext getParent() {
        return parent;
    }
    // ... mevcut alanlar ...
}

// AiExecutionTracker start ve stop metotlarının stack mantığına güncellenmesi:
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

### Geliştirme B: Akıllı Provenance Birleştirme (Merge) Yapısı
*Dosya*: `backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeService.java`

`KnowledgeService.attachProvenanceIfActive` metodu, request ile gelen zengin provenance bilgisini (erişilen tüm veri kaynakları ve değerlendirilen politikaları barındıran) o anki aktif tracker bağlamı boş olduğu için ezmektedir.

**Çözüm Metodolojisi**:
Gelen metadata içindeki mevcut provenance verisi korunmalı, yeni tracker verileriyle akıllı bir şekilde birleştirilmelidir (merge).
```java
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

        // LLM metriklerini provenance haritasına ekleme
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
            // Tracker'dan gelen alanları mevcut provenance'a akıllıca entegre etme
            provenance.forEach((key, value) -> {
                if (value != null) {
                    if (value instanceof java.util.Collection && ((java.util.Collection<?>) value).isEmpty()) {
                        // Eğer tracker'daki liste boşsa, mevcut zengin veriyi koru
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

## 7. Doğrulama ve Test Planı

Değişikliklerin doğruluğunu test etmek amacıyla yazılacak unit test stratejileri aşağıdadır.

### A. Test 1: Tracker İçiçe Bağlam Testi (`AiExecutionTrackerTest.java` oluşturulması)
- **Konum**: `backend/src/test/java/com/akilliorganizasyon/shared/ai/AiExecutionTrackerTest.java`
- **Senaryo**:
  1. Ana bağlam başlatılır (`AiExecutionTracker.start()`) ve `runId = UUID_A` set edilir.
  2. Alt bağlam başlatılır (`AiExecutionTracker.start()`) ve `runId = UUID_B` set edilir.
  3. Aktif bağlamın `runId` değerinin `UUID_B` olduğu doğrulanır.
  4. Alt bağlam sonlandırılır (`AiExecutionTracker.stop()`).
  5. Aktif bağlamın tekrar `UUID_A` olduğu doğrulanır.
  6. Ana bağlam sonlandırılır (`AiExecutionTracker.stop()`).
  7. Aktif bağlamın null olduğu doğrulanır.

### B. Test 2: Akıllı Provenance Merge Testi (`KnowledgeServiceTest.java` oluşturulması)
- **Konum**: `backend/src/test/java/com/akilliorganizasyon/knowledge/service/KnowledgeServiceTest.java`
- **Senaryo**:
  1. Bir `KnowledgeEntry` nesnesi önceden doldurulmuş `"agentId" = "agent-xyz"` ve `"accessedDataSources" = ["ds-123"]` provenance bilgisine sahip olacak şekilde hazırlanır.
  2. Boş bir `AiExecutionTracker` başlatılır.
  3. `attachProvenanceIfActive` çağrılır.
  4. Sonuçta oluşan provenance bloğunda `"agentId"` ve `"accessedDataSources"` alanlarının ezilmediği (korunduğu) doğrulanır.

### C. Doğrulama Komutları
Tüm R1 lineage ve provenance test paketini izole olarak koşturmak için:
```bash
mvn test -Dtest=ReportExecutionServiceTest,AgentKnowledgeWriterTest,AiExecutionTrackerTest,KnowledgeServiceTest
```
Proje genelinde hiçbir şeyin kırılmadığını garanti etmek için:
```bash
mvn clean test
```
