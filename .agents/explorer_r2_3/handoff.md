# Handoff Report - Milestone R2: Governance-Enforced LLM Tool-Calling Loop

## 1. Observation
1. **ChatToolsConfiguration.java & `withContext` Wrapper:**
   - Dosya Yolu: `backend/src/main/java/com/akilliorganizasyon/chatbot/service/ChatToolsConfiguration.java`
   - Satır 375: `withContext` fonksiyonu şu şekilde tanımlanmıştır:
     ```java
     private <T, R> Function<T, R> withContext(String toolName, Function<T, R> original) {
         return request -> {
             var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
             if (tracker != null) {
                 tracker.addTool(toolName);
             }
             var prevAuth = SecurityContextHolder.getContext().getAuthentication();
             // ...
     ```
2. **GovernanceGate & implementation:**
   - Dosya Yolu: `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceGate.java`
   - Satır 12: `GovernanceGate` arayüzü (interface) `shared` modülünde yer alır ve `GateDecision check(UUID agentId, String capabilityType, String targetRef, String action)` metoduna sahiptir.
   - Dosya Yolu: `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/AgentGuardService.java`
   - Satır 60: `AgentGuardService` bu arayüzü implemente eder: `public class AgentGuardService implements GovernanceGate`.
3. **GovernanceDeniedException:**
   - Dosya Yolu: `backend/src/main/java/com/akilliorganizasyon/shared/governance/GovernanceDeniedException.java`
   - Satır 10: `GovernanceDeniedException` sınıfı `BusinessException`'dan türetilmiştir ve `GOVERNANCE_DENIED` hata koduna sahiptir:
     ```java
     public class GovernanceDeniedException extends BusinessException {
         public static final String ERROR_CODE = "GOVERNANCE_DENIED";
         public GovernanceDeniedException(String message) {
             super(ERROR_CODE, message);
         }
     }
     ```
4. **Modulith Verification Test:**
   - Dosya Yolu: `backend/src/test/java/com/akilliorganizasyon/ModulithVerificationTest.java`
   - `verifyModulithArchitecture()` testi çalıştırılarak Modulith bütünlüğü doğrulanmıştır ve başarıyla geçmiştir.
5. **Spring AI Tool Configuration in ChatService/AiChatService:**
   - Dosya Yolu: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiChatService.java`
   - Satır 339: `configuredFunctions()` metodu `chatFunctionsCsv` ayarındaki tüm araç isimlerini döndürür.

---

## 2. Logic Chain
1. `chatbot` modülünün Modulith bütünlük testlerinin (`ModulithVerificationTest`) yeşil kalabilmesi için, `agentlifecycle` modülündeki `AgentGuardService` somut sınıfına doğrudan bağımlı olmaması gerekmektedir (Observation 4).
2. Bu sınır, `chatbot` modülünün `shared` modülündeki `GovernanceGate` arayüzüne bağımlı olmasıyla aşılabilir (Observation 2).
3. `ChatToolsConfiguration` sınıfı içerisindeki `withContext` sarmalayıcısına `GovernanceGate` enjekte edilip, `actingAgentId` mevcut olduğunda `governanceGate.check(actingAgentId, "TOOL", toolName, "EXECUTE")` çağrısı yapılmalıdır (Observation 1).
4. Eğer gate kontrolü `DENY` dönerse (`!decision.allowed()`), işlem kesilerek `GovernanceDeniedException` fırlatılmalıdır (Observation 3).
5. Dinamik şema ve yetki eşleştirmesi için `ActionType` enum'ına JSON şeması ve yetki alanları tanımlanmalı ve `AiExecutionTracker.TrackerContext` üzerinde aktif olan eylem tipine göre araçlar filtrelenmelidir (Observation 5).

---

## 3. Caveats
- `GovernanceGate` arayüzünün bazı minimal test sınıflarında veya dilimlerinde Spring Context'te bulunmaması olasılığına karşı, constructor enjeksiyonu `@Autowired(required = false)` olarak tanımlanmalı ve kod içinde `null` kontrolü yapılmalıdır.
- LLM tabanlı intent algılama test setinin doğruluğu doğrudan Kimi API kalitesine ve modelin prompt talimatlarına uyma yeteneğine bağlıdır.

---

## 4. Conclusion
Milestone R2'nin gerçekleştirimi için:
1. `ChatToolsConfiguration` sınıfına `GovernanceGate` (required = false) enjekte edilmelidir ve testlerin kırılmaması için overloaded constructor eklenmelidir.
2. `withContext` sarmalayıcısına, `actingAgentId` mevcutsa `GovernanceGate.check` çağrısı eklenip `DENY` durumunda `GovernanceDeniedException` fırlatılması sağlanmalıdır.
3. `ActionType` enum'u girdi şeması ve yetki gereksinimleriyle zenginleştirilerek dinamik araç sunumu için temel oluşturulmalıdır.

---

## 5. Verification Method
1. **Modulith Bütünlüğü:** `mvn test -Dtest=ModulithVerificationTest` komutu ile mimari sınırların bozulmadığı doğrulanmalıdır.
2. **Yönetişim Testi:** Yeni yazılacak `ChatToolsGovernanceIntegrationTest` entegrasyon testi ile `SHADOW` ve `ENFORCE` modlarındaki engelleme davranışları ve loglama mekanizması test edilmelidir.
