# Handoff Report - Milestone R2: Governance-Enforced LLM Tool-Calling Loop

## 1. Observation

Direct code observations from the codebase investigation:
- **ChatToolsConfiguration.java**:
  - Located at `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`.
  - The tool execution sarmalayıcısı `withContext` (satır 375-421) Spring Security context ayarlarını yapmakta ve `AiExecutionTracker` üzerinden araç çağrılarını takip etmektedir.
  - Sınıf yapısı ve kurucusu (satır 53-64) `GovernanceGate` enjeksiyonuna sahip değildir.
- **GovernanceGate.java**:
  - Arayüz `com.akilliorganizasyon.shared.governance.GovernanceGate` (satır 12-33) paketi altında yer almaktadır. `check` metodu (satır 32): `GateDecision check(UUID agentId, String capabilityType, String targetRef, String action);` imzasını taşımaktadır.
- **AgentGuardService.java**:
  - `GovernanceGate` arayüzünü implemente eden somut sınıf `com.akilliorganizasyon.agentlifecycle.AgentGuardService` (satır 60) modülüdür.
  - `check` metodu (satır 140-144) `evaluate` (satır 114-132) metodunu çağırır. `evaluate` ise `applyMode` (satır 241-258) metodunu çağırarak organizasyonun aktif yönetişim moduna göre kararları (`SHADOW` veya `ENFORCE`) filtreler ve `record` (satır 273-285) ile shadow/enforce loglarını veritabanına yazar.
- **GovernanceDeniedException.java**:
  - `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceDeniedException.java` konumundadır.
  - Hata kodu olarak `public static final String ERROR_CODE = "GOVERNANCE_DENIED";` taşır.
- **Modulith Sınırları**:
  - `chatbot/package-info.java` ve `chatbot/service/package-info.java` incelendiğinde chatbot modülünün kapalı (encapsulated) bir modül olduğu görülmüştür. `chatbot` -> `shared` bağımlılığı geçerlidir fakat `shared` -> `chatbot` ve `chatbot` -> `agentlifecycle` doğrudan bağımlılıkları Spring Modulith sınırlarına aykırıdır.
- **ActionType.java ve ChatAction.java**:
  - `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java` (satır 8-14) statik enum'dur ve girdi şeması veya capability eşleşmeleri bulunmamaktadır.
  - `/Users/armaganercan/antigravity/intelligent-organization/backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java` tablosu `chat_actions` (V13__chatbot.sql satır 47-57) şemasını yansıtır ve parametrik şema ya da capability alanlarını barındırmaz.

---

## 2. Logic Chain

1. **Spring Modulith Uyumlu Yönetişim Kontrolü:** `chatbot` modülünün `agentlifecycle` modülündeki `AgentGuardService` sınıfına doğrudan bağımlılığı Spring Modulith mimarisini bozacağından (`ModulithVerificationTest` başarısız olur), `ChatToolsConfiguration` sınıfı doğrudan `AgentGuardService` yerine `shared/governance` altındaki `GovernanceGate` arayüzünü enjekte etmelidir.
2. **Yönetişim Engelleme Mantığı:** `ChatToolsConfiguration.withContext` içinde aktif ajan kimliği (`tracker.getActingAgentId()`) kontrol edildikten sonra `governanceGate.check(agentId, "TOOL", toolName, "EXECUTE")` çağrılmalıdır. Eğer dönen karar `allowed() == false` ise `GovernanceDeniedException` fırlatılmalıdır.
3. **Shadow ve Enforce Modlarının Yönetimi:** `AgentGuardService.check` metodu arka planda `resolveMode` çağrısı yaparak veritabanından aktif modu okuduğu ve `record(...)` ile audit raporlarını yazdığı için, `withContext` sarmalayıcısının shadow loglamayı manuel yapmasına gerek yoktur. Yalnızca `decision.allowed() == false` durumunda engelleme ve hata fırlatma yapması yeterlidir.
4. **Modulith Uyumlu Dinamik Araç Dağıtımı:** `shared` modülündeki `AiChatService` sınıfının `chatbot`'a bağımlı olmasını önlemek amacıyla, `ChatService` (chatbot modülünde) intent tespiti sonrasında ilgili araçları `ChatToolsConfiguration.getFunctionsForActionType(ActionType)` aracılığıyla çözmeli ve bu fonksiyon isimlerini `AiCompletionOptions` (shared modülünde) aracılığıyla `AiChatService.complete` / `stream` çağrılarına geçmelidir.
5. **LLM Niyet Tespiti:** `ActionIntentService` içindeki statik keyword taraması yerine tekil bir LLM completion çağrısı yapılarak kullanıcının mesajı sınıflandırılmalı ve parametreleri (payload) tipli JSON formatında çıkartılıp Jackson ObjectMapper ile çözümlenmelidir.

---

## 3. Caveats

- **Ajan Context Eksikliği:** Eğer `AiExecutionTracker.get().getActingAgentId()` boş/null ise, ilgili çağrı kullanıcı tarafından tetiklenen doğrudan bir chat çağrısı olarak değerlendirilecek ve yönetişim kontrolü bypass edilecektir. Ajan orkestrasyonu tetiklendiğinde `actingAgentId` değerinin context'e doğru bir şekilde set edilmiş olduğundan emin olunmalıdır.
- **LLM Intent Gecikmesi:** LLM tabanlı niyet tespiti, her ana sohbet mesajı gönderildiğinde ek bir LLM çağrısı (istek sınıflandırma adımı) gerektireceğinden dolayı asistan yanıt süresinde milisaniye mertebesinde bir gecikmeye sebep olacaktır.

---

## 4. Conclusion

Milestone R2 için önerilen uygulama stratejisi:
- `GovernanceGate` arayüzünün `ChatToolsConfiguration` kurucusuna enjekte edilmesi ve `withContext` sarmalayıcısında `governanceGate.check(agentId, "TOOL", toolName, "EXECUTE")` kontrolünün entegrasyonu.
- `ActionType` ve `ChatAction` modellerine `inputSchema` ve `requiredCapability` alanlarının eklenmesi ve bunun için bir SQL migrasyon dosyası oluşturulması.
- `ActionIntentService` içindeki heuristic tespitten LLM tabanlı tipli intent tespitine geçilmesi.
- `AiCompletionOptions` sınıfına `Set<String> functions` eklenerek `ChatService` üzerinden dinamik araç setlerinin Modulith sınırlarını ihlal etmeden `AiChatService`'e ulaştırılması.

---

## 5. Verification Method

### Automated Tests
1. `ChatToolsGovernanceIntegrationTest.java` isimli yeni bir entegrasyon testi `src/test/java/com/akilliorganizasyon/chatbot/service/` dizinine eklenerek `GovernanceGate` mock'u ile `SHADOW` (izin verilen) ve `ENFORCE` (reddedilen) durumları test edilmelidir.
2. Spring Modulith mimari sınırlarını doğrulamak için `mvn test -Dtest=ModulithVerificationTest` komutu koşturulmalıdır.
3. ChatTools modül testlerini doğrulamak için `mvn test -Dtest=ChatToolsConfigurationTest,ChatToolsGovernanceIntegrationTest` çalıştırılmalıdır.

### Manual Verification
- Veritabanı üzerinde `governance_mode` `ENFORCE` olarak ayarlandığında, yetkisi olmayan bir ajan üzerinden tetiklenen araç çağrılarında API'nin `GOVERNANCE_DENIED` hata koduyla başarısız olduğu, `SHADOW` modda ise çağrıların engellenmeyip `governance_shadow_report` tablosuna shadow logu yazıldığı doğrulanmalıdır.
