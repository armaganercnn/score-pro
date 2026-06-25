# Handoff Report: Milestone R2 Governance-Enforced LLM Tool-Calling Loop

## 1. Observation
Aşağıdaki kod yapıları ve dosyalar doğrudan incelenmiştir:
- **`ChatToolsConfiguration.java` (Satır 375-421):** Araç yürütmelerini saran `withContext` metodunun mevcut yapısı gözlemlenmiştir. `AiExecutionTracker.get()` ile takip bağlamı kurulmakta ancak herhangi bir yetki denetimi yapılmamaktadır.
  ```java
  private <T, R> Function<T, R> withContext(String toolName, Function<T, R> original) {
      return request -> {
          var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
          // ...
          try {
              R result = original.apply(request);
              // ...
  ```
- **`GovernanceGate.java` (Satır 12-33):** Ortak yönetişim kapısı arayüzü ve karar yapıları incelenmiştir.
  ```java
  public interface GovernanceGate {
      enum GateEffect { ALLOW, DENY, APPROVAL }
      record GateDecision(GateEffect effect, String reason) { ... }
      GateDecision check(UUID agentId, String capabilityType, String targetRef, String action);
  }
  ```
- **`GovernanceDeniedException.java` (Satır 10-17):** Sınıfın `com.akilliorganizasyon.shared.governance` altında tanımlı olduğu ve `GOVERNANCE_DENIED` hata kodunu taşıdığı doğrulanmıştır.
  ```java
  public class GovernanceDeniedException extends BusinessException {
      public static final String ERROR_CODE = "GOVERNANCE_DENIED";
      // ...
  }
  ```
- **`AgentGuardService.java` (Satır 141-144):** `GovernanceGate` arayüzünü gerçekleştirdiği görülmüştür.
  ```java
  @Override
  @Transactional(readOnly = true)
  public GateDecision check(UUID agentId, String capabilityType, String targetRef, String action) {
  ```
- **`AiExecutionTracker.java` (Satır 84):** `actingAgentId` değerinin tracker context içinde taşındığı doğrulanmıştır.
  ```java
  private UUID actingAgentId;
  ```
- **Modulith Paket Yapısı:** `chatbot` modülünün `agentlifecycle` modülündeki `AgentGuardService` somut sınıfına bağımlılığı olmadığı doğrulanmıştır.

---

## 2. Logic Chain
1. **Güvenli Ajan Bağlamı:** Ajanların yürüttüğü araç çağrıları `ChatToolsConfiguration.java` içindeki `withContext` sarmalayıcısından geçer. Bu esnada `AiExecutionTracker.get()` çağrısı ile aktif `TrackerContext`'e erişilebilir.
2. **Ajan Kimliği Tespiti:** `TrackerContext.getActingAgentId()` eğer `null` değilse, araç çağrısını yapanın bir otonom ajan (agent) olduğu anlaşılır.
3. **Modulith Sınırlarına Uyum:** `chatbot` modülü, `agentlifecycle` modülüne bağımlı olamayacağı için, `GovernanceGate` arayüzünü (port) `shared` modülünden enjekte etmelidir. `AgentGuardService` çalışma zamanında (runtime) Spring IoC tarafından otomatik bağlanacaktır.
4. **Yönetişim Kararının Uygulanması:** `governanceGate.check(actingAgentId, "TOOL", toolName, "EXECUTE")` çağrısı ile ajanın bu araca yetkili olup olmadığı denetlenir. Karar `DENY` dönerse, `GovernanceDeniedException` fırlatılarak araç yürütmesi engellenir. `SHADOW` modda ise `AgentGuardService` zaten kendisi `ALLOW` döner ve arkada audit kaydı oluşturur, bu yüzden `withContext` sarmalayıcısı ek mantık gerektirmeden çalışmaya devam eder.

---

## 3. Caveats
- LLM'in `ActionType` niyetini tespit ederken Kimi K2.6 modelinin yanıt kalitesi test edilmemiştir. Prompt yapısının hassas biçimde tasarlanması ve hata durumunda fallback mantığının kurulması gerekir.
- `GovernanceGate.check` çağrısındaki `action` parametresi için `"EXECUTE"` değeri varsayılmıştır. Mevcut testlerde `"call"` ifadesi de geçmektedir. Uyum için `"EXECUTE"` veya `"call"` kullanılabilir.

---

## 4. Conclusion
Milestone R2'nin uygulanması için `ChatToolsConfiguration.java` sınıfına `GovernanceGate` enjekte edilmeli, `withContext` sarmalayıcısında `actingAgentId` kontrolü üzerinden araç yetkileri `GovernanceGate.check` ile denetlenmeli ve yetkisiz çağrılarda `GovernanceDeniedException` fırlatılmalıdır. Modulith sınırları korunmuş olup, `ChatToolsGovernanceIntegrationTest` ile davranışlar doğrulanmalıdır.

---

## 5. Verification Method
Geliştirme tamamlandıktan sonra aşağıdaki adımlarla doğrulama yapılabilir:
1. **Modulith Testi:** Mimari sınırların bozulmadığını doğrulamak için:
   ```bash
   mvn test -Dtest=ModulithVerificationTest
   ```
2. **Yeni Entegrasyon Testi (`ChatToolsGovernanceIntegrationTest`):**
   - Mock bir `GovernanceGate` bean'i oluşturun.
   - `actingAgentId` set edilip yetki `DENY` döndüğünde, araç bean çağrısının `GovernanceDeniedException` fırlattığını doğrulayın.
   - `actingAgentId` set edilip yetki `ALLOW` döndüğünde veya `actingAgentId` boş olduğunda, aracın normal çalıştığını doğrulayın.
   ```bash
   mvn test -Dtest=ChatToolsGovernanceIntegrationTest
   ```
