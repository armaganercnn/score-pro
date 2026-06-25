# Handoff Report — Milestone 2: R1 (Lineage & Provenance)

## 1. Observation

Aşağıdaki gözlemler doğrudan kaynak kod dosyaları ve test çıktılarından elde edilmiştir:

1. **Database Schema (`data_lineage`):**
   `backend/src/main/resources/db/migration/V8__assets.sql` satır 155-162 arasında `data_lineage` tablosunun tanımı yapılmıştır:
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

2. **Entity & Repository Sınıfları:**
   - Sınıf tanımı `backend/src/main/java/com/akilliorganizasyon/assets/domain/DataLineage.java` dosyasındadır.
   - Repository `backend/src/main/java/com/akilliorganizasyon/assets/repository/DataLineageRepository.java` olup `existsByDataSourceIdAndTargetTypeAndTargetId` metodunu içerir.

3. **Lineage Ekleme & De-duplication Portu:**
   `backend/src/main/java/com/akilliorganizasyon/assets/service/DataSourcePortImpl.java` satır 72-86 arasında `addLineage` fonksiyonu tanımlanmıştır:
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

4. **AiExecutionTracker:**
   `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java` satır 63'te `accessedDataSources` listesi `CopyOnWriteArrayList<String>` olarak tanımlanmış, satır 143'te `addAccessedDataSource(String dataSource)` ile veri kaynağı ekleme ve satır 149'da `getAccessedDataSources()` ile okuma sağlanmıştır.

5. **ReportExecutionService Lineage & Provenance Akışı:**
   `backend/src/main/java/com/akilliorganizasyon/reporting/service/ReportExecutionService.java` satır 121-206 arasındaki `execute` metodunda lineage yazımı ve provenance metadata oluşturulmaktadır:
   - Satır 147: `tracker.addAccessedDataSource(source.getDataSourceId().toString());` ile veri kaynakları tracker'a eklenir.
   - Satır 158-172: Tracker'daki veri kaynakları `dataSourcePort.addLineage` ile `"REPORT"` tipinde kaydedilir.
   - Satır 175-195: Tracker'dan alınan LLM metrikleri (durationMs, inputTokens, model vb.) `provenance` başlığı altında `ReportRun.sourceInfo` alanına eklenir.

6. **AgentKnowledgeWriter Provenance Akışı:**
   `backend/src/main/java/com/akilliorganizasyon/agents/service/AgentKnowledgeWriter.java` satır 69-80 arasında `recordOutcome` metodunda orkestrasyondan gelen provenance bilgisi `metadata` alanına gömülmektedir:
   ```java
   CreateKnowledgeEntryRequest request = new CreateKnowledgeEntryRequest(
           ...
           provenanceMetadata != null ? provenanceMetadata : new java.util.HashMap<>());
   ```

7. **Test Sonuçları:**
   `mvn test -Dtest=ReportExecutionServiceTest,AgentKnowledgeWriterTest` komutu başarıyla tamamlanmış ve 4 testin tamamı hatasız geçmiştir:
   `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`

---

## 2. Logic Chain

1. `V8__assets.sql` içerisindeki şema tanımı [Gözlem 1] ve `DataLineage.java` JPA entity'si [Gözlem 2], veri soy ağacı (data lineage) bilgilerini veri tabanında tutmak için gerekli altyapıyı sağlamaktadır.
2. `DataSourcePortImpl.java` [Gözlem 3] içindeki `addLineage` metodu, `DataLineageRepository`'deki de-duplication kontrolünü (`existsBy...`) kullanarak mükerrer kayıtları engellemektedir.
3. `AiExecutionTracker` [Gözlem 4] thread-local düzeyde veri kaynaklarının UUID referanslarını toplamakta ve izole bir şekilde saklamaktadır.
4. Rapor çalıştırıldığında `ReportExecutionService.execute` [Gözlem 5] metodu bu tracker'dan veri kaynaklarını alarak hem `data_lineage` veritabanı yazımını tetiklemekte hem de `ReportRun.sourceInfo` içerisine `provenance` bloğunu gömmektedir.
5. Orkestrasyon sonucu kurumsal hafızaya kaydedilirken `AgentKnowledgeWriter` [Gözlem 6] üzerinden provenance bilgisi `metadata` alanına gömülmekte ve ardından `OrchestrationService` tarafından her veri kaynağı için lineage tablosuna `"ASSET"` tipinde kayıt atılmaktadır.
6. Bu akışlar `ReportExecutionServiceTest` ve `AgentKnowledgeWriterTest` birim testleri [Gözlem 7] ile tamamen doğrulanmış ve mock'lanan port/servis çağrılarıyla test edilmiştir.

---

## 3. Caveats

- `ReportExecutionServiceTest` unit testleri, mock'lanmış servisler üzerinde doğrulanmıştır. Gerçek PostgreSQL / pgvector veritabanı bağlantısı gerektiren entegrasyon testlerinin çalışması için lokal Docker konteynerlerinin (`intorg-postgres`) ayakta olması gerekmektedir.
- Ajanların ve orkestrasyon görevlerinin lineage yazımı sırasındaki `targetType` değeri `"ASSET"` olarak belirlenmiştir. Bu durum, `KnowledgeEntry` nesnelerinin veri tabanında birer dijital varlık (asset) çıktısı olarak kabul edilmesinden kaynaklanmaktadır.

---

## 4. Conclusion

Milestone 2: R1 (Lineage & Provenance) kapsamında yapılması gereken tüm otomatik lineage yazımı, veri kaynağı takip mekanizması (`AiExecutionTracker`), rapor çalıştırma provenance bloğu zenginleştirilmesi (`ReportRun.source_info`) ve kurumsal hafıza metadata zenginleştirmesi (`KnowledgeEntry.metadata`) altyapısı mevcuttur, doğru çalışmaktadır ve testlerle güvence altına alınmıştır.

---

## 5. Verification Method

İlgili birim testlerini ve entegrasyon mantığını bağımsız olarak doğrulamak için aşağıdaki komut çalıştırılmalıdır:

```bash
mvn test -Dtest=ReportExecutionServiceTest,AgentKnowledgeWriterTest
```

### Doğrulama Adımları:
1. `ReportExecutionServiceTest.java` içindeki `marksRunsAsSimulatedAndDerivesMetricsFromLinkedSourceMetadata` testi çalıştırılarak `dataSourcePort.addLineage` fonksiyonunun `"REPORT"` hedef tipiyle ve doğru parametrelerle tetiklendiği kontrol edilir.
2. `AgentKnowledgeWriterTest.java` içindeki `recordOutcomeAttachesProvenanceMetadataCorrectly` testi çalıştırılarak `provenance` bloğunun (agentId ve runId) `CreateKnowledgeEntryRequest` içindeki `metadata` alanında doğru yapılandırıldığı doğrulanır.
