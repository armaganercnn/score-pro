# Handoff Report: Tipli Aksiyon Şemaları ve LLM Tabanlı Niyet Tespiti

## 1. Observation
Kod tabanında yapılan incelemede aşağıdaki bulgular tespit edilmiştir:
- **ActionType.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`, Satır 8-14) basit bir enum olup parametre şeması veya capability barındırmamaktadır:
  ```java
  public enum ActionType {
      REPORT_REQUEST,
      ACCESS_REQUEST,
      TASK_CREATE,
      AGENT_TASK,
      NOTIFY
  }
  ```
- **ChatAction.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`, Satır 39-41) üzerinde sadece ham JSON payload alanı tanımlıdır, eyleme ait şema veya yetenek tanımları bulunmamaktadır:
  ```java
      @JdbcTypeCode(SqlTypes.JSON)
      @Column(columnDefinition = "jsonb", nullable = false)
      private Map<String, Object> payload = new HashMap<>();
  ```
- **ActionIntentService.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`, Satır 29-40) üzerinde keyword tabanlı heuristik kurallar (`IntentRule`) kullanılarak niyet tespiti yapılmaktadır:
  ```java
      private static final List<IntentRule> RULES = List.of(
              new IntentRule(ActionType.ACCESS_REQUEST,
                      List.of("yetki", "erişim", "erisim", "izin iste", "rol talep", "access", "permission", "grant access")),
              ...
      );
  ```
- **V13__chatbot.sql** (`backend/src/main/resources/db/migration/V13__chatbot.sql`, Satır 47-57) tablosunda `chat_actions` şeması şöyledir:
  ```sql
  CREATE TABLE IF NOT EXISTS chat_actions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      message_id        UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
      action_type       VARCHAR(60) NOT NULL,
      payload           JSONB NOT NULL DEFAULT '{}',
      status            VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
      requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
      ...
  );
  ```
- **ChatService.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatService.java`, Satır 278) içerisinde niyet tespiti `actionIntentService.detectAndPropose(conversationId, assistant.getId(), userContent)` çağrısıyla tetiklenmektedir.

---

## 2. Logic Chain
Gözlemlerimiz doğrultusunda çıkarılan mantıksal çözüm adımları şunlardır:
1. **Veri Modeli Güçlendirme (R1.1)**: `ActionType.java` (Obs 1) Java sınıfı, enum sabitleri üzerinden `parameterSchema` (JSON) ve `requiredCapabilities` (Set) içerecek şekilde zenginleştirilmelidir. `ChatAction.java` (Obs 2) ve Flyway şeması (Obs 4), bu statik bilgileri aksiyon önerildiği anda kalıcılaştırmak için `parameter_schema` (JSONB) ve `required_capabilities` (JSONB) kolonlarıyla güncellenmelidir.
2. **Heuristik Kodların Kaldırılması (R1.2)**: `ActionIntentService.java` içerisindeki statik keyword kuralları (Obs 3) tamamen silinerek yerine LLM tabanlı yapılandırılmış niyet tespiti getirilmelidir. LLM sistem promptuna bu eylem şemaları ve yetenekleri dinamik olarak beslenecek, LLM çıktısı doğrudan Jackson ile Java record'larına parse edilerek tipli girdi alanları elde edilecektir.
3. **Doğruluk Doğrulaması (AC1)**: LLM'in performansı (`>=95%` doğruluk) statik mock testler yerine gerçekçi bir entegrasyon testi ile ölçülmelidir. Bunun için hem Türkçe hem de İngilizce girdiler içeren, 40+ farklı test vakasından oluşan bir veri seti JUnit testinde koşturulmalı ve niyet tespit başarı oranı dinamik olarak hesaplanmalıdır.

---

## 3. Caveats
- **LLM Kesintileri ve CI/CD Hataları**: LLM tabanlı entegrasyon testlerinin API anahtarı eksikliğinde CI/CD boru hattını (pipeline) kırmaması için, test metodu başında `Assumptions.assumeTrue(aiChatService.isEnabled())` ile kontrol yapılması zorunludur.
- **Markdown Format Temizliği**: LLM bazen çıktıları ```json ... ``` etiketleri arasına alabilmektedir. Parsing hatası alınmaması için string temizliği (`regex` veya `startsWith` yardımıyla) uygulanmalıdır.
- **Tetikleme Gecikmesi**: LLM çağrıları, heuristik kontrole göre ek gecikme (latency) getirecektir. Bu durum, niyet tespitinin asenkron olarak arka planda çalıştırılması seçeneğini gündeme getirebilir (mevcut tasarımda ChatService içinde senkron çağrılmaktadır).

---

## 4. Conclusion
Geliştirme kapsamında `ActionType` ve `ChatAction` yapıları tipli şema ve yetenek parametreleriyle donatılacaktır. `ActionIntentService` içindeki heuristik keyword tabanlı tüm mantık silinip, Spring AI / LLM aracılığıyla yapılandırılmış JSON çıktısı üreten yeni bir tasarıma geçirilecektir. Son olarak, `%95` üzerinde doğruluk oranını ölçecek ve garanti edecek olan `ActionIntentServiceAccuracyTest` entegrasyon testi projeye dahil edilecektir.

---

## 5. Verification Method
1. **Birim/Entegrasyon Testi Çalıştırma**:
   - Maven üzerinden sadece niyet doğruluk testini çalıştırmak için:
     `mvn test -Dtest=ActionIntentServiceAccuracyTest`
   - Tüm chatbot testlerini çalıştırmak için:
     `mvn test -Dtest=ChatActionServiceTest,ChatToolsConfigurationTest,ActionIntentServiceAccuracyTest`
2. **Kod İncelemesi**:
   - `ActionType.java` enum'unda şema tanımlarının bulunup bulunmadığı kontrol edilmelidir.
   - `ActionIntentService.java` dosyasında `RULES` ve keyword araması yapan döngülerin tamamen kaldırıldığı doğrulanmalıdır.
3. **Veritabanı Tablosu**:
   - Uygulama ayağa kalktıktan sonra `chat_actions` tablosunda `parameter_schema` ve `required_capabilities` kolonlarının oluştuğu doğrulanmalıdır.
