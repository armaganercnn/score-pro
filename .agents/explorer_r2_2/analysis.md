# Milestone R2: Governance-Enforced LLM Tool-Calling Loop - Analiz Raporu

## 1. ChatToolsConfiguration.java ve `withContext` Sarmalayıcısı İncelemesi
`ChatToolsConfiguration.java` (`chatbot` modülü altında) Spring AI Function bean'lerini tanımlar. Bu araçlar `withContext` sarmalayıcısı (wrapper) ile sarılmaktadır. 

Mevcut `withContext` yapısı (Satır 375-421):
- Ajan çalıştığında `AiExecutionTracker` üzerinden çağrı takibi yapar.
- `SecurityContextHolder` üzerinde kimlik doğrulama context'ini (`ChatRequestContextHolder` yardımıyla) yönetir.
- Araç çağrısının girdilerini/çıktılarını JSON'a serileştirip `AiExecutionTracker.TrackerContext`'e kaydeder.

**Öneri:**
GovernanceGate entegrasyonu için `withContext` sarmalayıcısına şu eklemeler yapılmalıdır:
1. Sınıfa `com.akilliorganizasyon.shared.governance.GovernanceGate` enjekte edilmelidir.
2. `withContext` içerisinde `AiExecutionTracker.get()` ile aktif `TrackerContext` alınmalı ve `actingAgentId` değeri kontrol edilmelidir.
3. Eğer `actingAgentId != null` ise, `governanceGate.check(actingAgentId, "TOOL", toolName, "EXECUTE")` çağrılmalıdır.
4. Karar `DENY` dönerse (`!decision.allowed()`), `GovernanceDeniedException` fırlatılmalıdır.

```java
// proposed change inside withContext:
var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
if (tracker != null && tracker.getActingAgentId() != null) {
    var decision = governanceGate.check(tracker.getActingAgentId(), "TOOL", toolName, "EXECUTE");
    if (!decision.allowed()) {
        throw new com.akilliorganizasyon.shared.governance.GovernanceDeniedException(decision.reason());
    }
}
```

---

## 2. GovernanceGate.java İncelemesi
`GovernanceGate.java` (`com.akilliorganizasyon.shared.governance` altında), modüller arası doğrudan bağımlılıkları engellemek için tasarlanmış bir **port** arayüzüdür.
- `agentlifecycle` modülündeki `AgentGuardService` bu arayüzü gerçekleştirir (`implements`).
- Arayüzün `check` metodu şu imzaya sahiptir:
  `GateDecision check(UUID agentId, String capabilityType, String targetRef, String action);`
- Dönüş tipi olan `GateDecision`, `effect` (`ALLOW`, `DENY`, `APPROVAL`) ve `reason` (açıklama) alanlarını barındıran bir record'dur. `allowed()` yardımcı metodu, kararın `DENY` olup olmadığını döner.

---

## 3. GovernanceDeniedException.java Durumu
`GovernanceDeniedException.java` sınıfı halihazırda `com.akilliorganizasyon.shared.governance` paketi altında mevcuttur.
- Sınıf `BusinessException`'dan türetilmiştir.
- Sabit hata kodu olarak `GOVERNANCE_DENIED` taşır (`public static final String ERROR_CODE = "GOVERNANCE_DENIED"`).
- `ChatToolsConfiguration` içinde `withContext` sarmalayıcısında yetki kontrolü reddedildiğinde doğrudan bu hata fırlatılacaktır.

---

## 4. Modulith Kısıtları ve chatbot - agentlifecycle/shared İlişkileri
Spring Modulith mimarisine göre:
- `com.akilliorganizasyon.chatbot` modülü, `com.akilliorganizasyon.agentlifecycle` modülünün dahili sınıflarına (örneğin `AgentGuardService` somut sınıfına) doğrudan bağımlı **olamaz**. Bu kural ihlal edilirse `ModulithVerificationTest` başarısız olur.
- Bunun yerine, ortak/paylaşılan arayüzler `shared` modülü altında konumlandırılır. `shared.governance` paketi bir `@org.springframework.modulith.NamedInterface("governance")` olarak dışa açılmıştır (exposed).
- `chatbot` modülü `shared.governance` bağımlılığı üzerinden `GovernanceGate` port arayüzünü kullanabilir. Çalışma zamanında Spring IoC Container, `agentlifecycle` modülündeki `AgentGuardService` bean'ini bu arayüze enjekte eder (Dependency Inversion).

---

## 5. Dinamik Şemalar ve Araçların LLM'e Sunulması (ChatToolsConfiguration)
Spring AI, `@Bean` olarak tanımlanan `Function` arayüzlerini ve üzerlerindeki `@Description` açıklamalarını otomatik olarak OpenAI-compatible LLM'lere (Kimi K2.6) sunar.

Mevcut durumda `AiChatService.java` araçları `app.ai.chat-functions` altındaki statik bir CSV listesinden okur ve her prompt'a bağlar.

**Öneri (Dinamik Şemalar ve Niyet Tespiti):**
1. **ChatAction Parametre Şemaları (R1.1):** `ActionType.java` enum'ı içine her eylem türünün parametre şeması (JSON Schema) ve gereksinim duyduğu yetenek (capability) tanımları eklenmeli. `ChatAction` sınıfında bu tanımlara erişim sağlanmalı.
2. **LLM Tabanlı Niyet Tespiti (R1.2):** `ActionIntentService.detectAndPropose` metodu, keyword tabanlı heuristic kontroller yerine `AiChatService` üzerinden LLM çağrısı yaparak niyet (ActionType) ve parametre (payload) çıkarımı yapacak şekilde güncellenmeli.
3. **Dinamik Araç Bağlama (R2.1 & Milestone 3):**
   - Tespit edilen eylem türüne (ActionType) göre LLM'e sunulacak araçların listesi filtrelenmelidir.
   - `ChatRequestContextHolder` veya thread-local bir yapı üzerinden aktif `ActionType` bilgisi `AiChatService`'e ulaştırılmalı.
   - `AiChatService.buildPrompt` metodunda, statik liste yerine aktif `ActionType`'a karşılık gelen araç adları (`functions` kümesi) dinamik olarak set edilmelidir.
