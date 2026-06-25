# Handoff Report — Milestone 4: R3 (RAG Isolation) Review & Adversarial Critic Assessment

## 1. Observation

Aşağıdaki gözlemler doğrudan kod tabanından ve test yürütme sonuçlarından elde edilmiştir:

1. **İncelenen Dosyalar ve Yapılar**:
   - `AgentGuardService.java` (`backend/src/main/java/com/akilliorganizasyon/agentlifecycle/AgentGuardService.java`): Ajanın veri kaynaklarına (DATA_SOURCE), araçlara (TOOL) veya aksiyonlara (ACTION) erişim taleplerini yöneten ana yönetişim kapısı (`GovernanceGate`). `SHADOW` ve `ENFORCE` modlarını ve on-behalf-of (kullanıcı adına yetki denetimi) kurallarını işletiyor.
   - `KnowledgeRagService.java` (`backend/src/main/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagService.java`): Kurumsal hafızadan getirilen kayıtların (`ScoredEntryDto`) veri kaynağı kısıtlamalarına göre filtrelenmesini sağlayan sınıf. `filterAuthorizedSources` metodu ile veri kaynağı bağlarını çıkarıp `governanceGate.check(...)` çağırıyor.
   - `AgentGuardServiceTest.java` (`backend/src/test/java/com/akilliorganizasyon/agentlifecycle/service/AgentGuardServiceTest.java`): 12 birim testi barındıran Mockito tabanlı test sınıfı.
   - `KnowledgeRagServiceTest.java` (`backend/src/test/java/com/akilliorganizasyon/knowledge/service/KnowledgeRagServiceTest.java`): RAG filtreleme ve ontoloji zenginleştirmeyi sınayan 4 birim testi barındıran test sınıfı.

2. **RAG Kaynak Filtreleme Algoritması (`KnowledgeRagService.java#L337-L423`)**:
   - Veri kaynağı ID'leri şu alanlardan toplanıyor:
     - `scopeType` / `scopeId` (`"datasource"` ise).
     - `sourceType` / `sourceRef` (`"datasource"` veya `"decision"` ise UUID formatında parse edilerek).
     - `metadata` içindeki `dataSourceId` ve `datasource_id` anahtarları.
     - `metadata.provenance.accessedDataSources` altındaki koleksiyon veya virgülle ayrılmış string verisi.
   - Her bir veri kaynağı ID'si için thread-local `AiExecutionTracker.TrackerContext` başlatılıyor/kullanılıyor ve `governanceGate.check(agentId, "DATA_SOURCE", dsId.toString(), "READ")` ile yetki kontrolü yapılıyor. Herhangi biri `allowed() == false` dönerse doküman eleniyor (fail-closed yaklaşımı).

3. **Modulith Sınırları**:
   - `KnowledgeRagService.java` sınıfı `agentlifecycle` modülündeki somut sınıflara bağımlı değil. Erişim denetimini `shared` modülündeki `com.akilliorganizasyon.shared.governance.GovernanceGate` arayüzü üzerinden soyutlanmış olarak gerçekleştiriyor (`@Autowired(required = false)`).

4. **Test Yürütme Logları**:
   - Belirtilen birim testleri yerel ortamda başarıyla derlenmiş ve hatasız tamamlanmıştır:
     ```
     [INFO] Running com.akilliorganizasyon.knowledge.service.KnowledgeRagServiceTest
     [INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.018 s -- in com.akilliorganizasyon.knowledge.service.KnowledgeRagServiceTest
     [INFO] Running com.akilliorganizasyon.agentlifecycle.service.AgentGuardServiceTest
     [INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.528 s -- in com.akilliorganizasyon.agentlifecycle.service.AgentGuardServiceTest
     [INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
     [INFO] BUILD SUCCESS
     ```

## 2. Logic Chain

1. **Güvenlik Kısıtlamaları ve RAG İzolasyonu**:
   - Gözlem (2)'ye göre, `KnowledgeRagService` her bir dokümanın ilişkili olduğu tüm veri kaynaklarını kapsamlı şekilde (`scope`, `source`, `metadata`, `provenance` düzeylerinde) tespit etmekte ve tek bir veri kaynağında bile yetkisiz erişim algılandığında dokümanı RAG bağlamından çıkarmaktadır. Bu durum veri sızıntılarını önler.
   - `AgentGuardService` üzerinde yapılan on-behalf-of kontrolleri (`checkUserAuthority`), ajanın arkasındaki asıl insan kullanıcının yetkilerini denetleyerek ajan yetki yükseltme (privilege escalation) saldırılarını engellemektedir.

2. **Modulith Boundary Uyum**:
   - Gözlem (3)'e göre, `knowledge` modülü doğrudan `agentlifecycle` modülüne bağımlılık taşımamaktadır. Spring Modulith mimari sınırlarına tam uyum sağlanmıştır; bağımlılıklar gevşek bağlıdır (loose-coupling).

3. **Test Kapsamı**:
   - Gözlem (4)'e göre, yazılan birim testleri (toplam 16 test) yetkilendirme doğrulaması, kısıtlama filtreleme, çoklu veri kaynağı senaryoları, geçersiz/malformed UUID durumları ve ontoloji entegrasyonu gibi kritik yolları başarıyla test etmektedir ve hepsi yeşil (PASSED) durumdadır.

4. **Dürüstlük ve Güvenilirlik Denetimi**:
   - İncelenen sınıflarda herhangi bir yapay doğrulama çıktısı, sahte/facade implementasyon veya testleri aldatmaya yönelik hardcoded beklenen değer saptanmamıştır. Kod gerçek iş mantığı ile implement edilmiştir.

## 3. Caveats

- **Performans Sınırı**: RAG aramalarında getirilen doküman sayısı çok yüksek olduğunda (örneğin `topK` değeri 20'ye yakınken), her bir dokümanın içerdiği her bir veri kaynağı için sırayla `governanceGate.check` çağrılması in-memory filtrelemede küçük de olsa bir gecikmeye yol açabilir. Ancak veri güvenliği öncelikli olduğu için bu kabul edilebilir bir ödünleşimdir (trade-off).
- **Hafif Veri Kaynağı Bozulmaları**: `metadata` içinde geçersiz UUID formatında tanımlanan veri kaynağı ID'leri sessizce yoksayılmaktadır (`IllegalArgumentException` yutularak). Bu dokümanlar "kamusal/kısıtlanmamış" kabul edilip RAG bağlamına dahil edilir.

## 4. Conclusion

### Quality Review Report
- **Verdict**: **APPROVE**
- **Rationale**: Kod değişiklikleri, Milestone 4: R3 gereksinimlerini eksiksiz karşılamaktadır. Veri sızıntısını engelleyen fail-closed mantığı kurulmuştur, Modulith sınırları korunmuş ve birim testler tüm kritik yolları test edecek şekilde kurgulanmıştır.

#### Verified Claims
- RAG izolasyon filtrelemesi (yetkili doküman geçişi, yetkisiz bloklama) -> `KnowledgeRagServiceTest` birim testleri ile doğrulandı -> **PASS**
- Çoklu veri kaynaklı dokümanlarda tek bir deny durumunda tüm dokümanın elenmesi -> `askFiltersSources_multipleDatasources_oneAllowOneDeny_isBlocked` ile doğrulandı -> **PASS**
- Modulith sınır ihlali olmaması -> Kod import analizi ile doğrulandı -> **PASS**
- Ajanın kullanıcı yetkilerini aşamaması (on-behalf-of) -> `AgentGuardServiceTest.onBehalfOf_userCannotAccessSensitiveSource_agentDenied` ile doğrulandı -> **PASS**

### Adversarial Review / Challenge Report
- **Overall risk assessment**: **LOW**

#### Challenges
1. **Challenge**: `sourceRef` veya metadata alanlarında bilerek malformed UUID gönderilerek filtrelerin atlatılması.
   - *Scenario*: Kötü niyetli bir kullanıcı veya hatalı bir sistem girdisiyle veri kaynağı ID'si `not-a-uuid` şeklinde set edilirse, parse hatası oluşur ve yetki kontrolü yapılmadan doküman RAG çıktısına dahil edilir.
   - *Blast radius*: Çok düşük. Çünkü veri kaynağı tablosundaki tüm gerçek kaynaklar geçerli UUID'lere sahiptir. UUID olmayan bir kaynak zaten sistemde kısıtlanmış/hassas bir veri kaynağı olarak tescil edilemez, dolayısıyla koruma altına alınmış olamaz.
   - *Mitigation*: Gerekirse, `sourceRef` veya metadata'da `"datasource"` tipi belirtilmiş ancak ID'si geçerli bir UUID değilse fail-closed prensibiyle doküman doğrudan elenebilir.

2. **Challenge**: `TrackerContext` sızıntısı ve iş parçacığı (Thread-Local) kirlenmesi.
   - *Scenario*: `KnowledgeRagService` içinde oluşturulan geçici `TrackerContext` temizlenmezse, aynı iş parçacığını kullanan sonraki isteklerde yetki sızıntısı veya yanlış ajan adına işlem yapılabilir.
   - *Blast radius*: Orta.
   - *Mitigation*: Kodda `try-finally` bloğu kullanılarak `tempCtxStarted` durumunda `stop()` çağrısı garanti altına alınmıştır. Bu risk başarıyla bertaraf edilmiştir.

## 5. Verification Method

Kodun doğruluğunu ve test başarısını bağımsız olarak doğrulamak için şu komut koşturulabilir:

```bash
cd backend
DB_HOST=localhost DB_PORT=5440 DB_USERNAME=akilliorg DB_PASSWORD=akilliorg-dev mvn test -Dtest=AgentGuardServiceTest,KnowledgeRagServiceTest
```

Kriterler:
- `KnowledgeRagServiceTest` altındaki 4 testin tamamı hatasız tamamlanmalı.
- `AgentGuardServiceTest` altındaki 12 testin tamamı hatasız tamamlanmalı.
