# Analiz Raporu: Milestone R2 - Governance-Enforced LLM Tool-Calling Loop

## 1. Giriş ve Amaç
Bu analiz raporu, "Akıllı Organizasyon" (intorg) projesinde **Milestone R2: Governance-Enforced LLM Tool-Calling Loop** kapsamında yapılması gereken geliştirmeleri, Spring Modulith mimari sınırlarını göz önünde bulundurarak incelemekte ve somut bir gerçekleme stratejisi önermektedir.

---

## 2. Kod İnceleme Bulguları

### 2.1 ChatToolsConfiguration.java & `withContext` Sarmalayıcısı
- **Mevcut Yapı:** `ChatToolsConfiguration`, Spring AI araçlarını (`listUsers`, `listProjects`, `listMyTasks`, `createTask`, `listMySubordinates`, `listDigitalAssets`, `listDataSources`, `listOrgUnits`, `delegateToOrchestrator`) `@Bean` olarak tanımlar. Her araç, `withContext` yardımcı fonksiyonu ile sarmalanmıştır.
- **withContext Rolü:** Bu sarmalayıcı, araç çağrıldığında `AiExecutionTracker`'a ilgili aracı kaydeder, `SecurityContext` ve `ChatRequestContext`'i günceller ve aracı çalıştırıp süreyi/sonuçları loglar.
- **Öneri:** `withContext` sarmalayıcısı içerisine, `AiExecutionTracker.TrackerContext`'te aktif bir ajan kimliği (`actingAgentId != null`) mevcutsa, `GovernanceGate.check` metodunu çağıran bir kontrol mekanizması eklenmelidir.

### 2.2 GovernanceGate.java & AgentGuardService.java
- **GovernanceGate:** `shared/governance` paketi altında yer alan ve `GateDecision check(UUID agentId, String capabilityType, String targetRef, String action)` imzasını taşıyan bir arayüzdür (Interface).
- **AgentGuardService:** `agentlifecycle` modülünde yer alır ve `GovernanceGate` arayüzünü implemente eder. `check` çağrıldığında; ajanın yetenek kurallarını (capabilities), aktif politikaları (policies) ve "on-behalf-of" kullanıcı yetkilerini değerlendirip `DENY`, `ALLOW` veya `APPROVAL` sonucunu döner.

### 2.3 GovernanceDeniedException.java
- `shared/governance` paketi altındadır.
- `BusinessException` sınıfından türetilmiştir ve `GOVERNANCE_DENIED` hata koduna (error code) sahiptir.
- `GovernanceGate.check` çağrısı `DENY` döndüğünde bu istisna (exception) fırlatılmalıdır.

### 2.4 Modulith Sınırları ve İlişkiler (Modulith Constraints)
- **Problem:** `chatbot` modülü, `agentlifecycle` modülündeki somut `AgentGuardService` sınıfına doğrudan bağımlı olamaz (Modulith kuralları gereği döngüsel bağımlılık ve sıkı kuplajı önlemek amacıyla).
- **Çözüm:** `chatbot` modülü (`ChatToolsConfiguration`), `shared` modülündeki `GovernanceGate` arayüzünü (port) enjekte etmelidir. `GovernanceGate`'in somut implementasyonu olan `AgentGuardService` (adapter) çalışma zamanında (runtime) Spring tarafından enjekte edilecektir. Bu sayede Modulith sınırları korunmuş olur.

### 2.5 Dinamik Şema (Dynamic Schema) Kaydı ve LLM'e Sunulması
- **Mevcut Durum:** `AiChatService`, `app.ai.chat-functions` ayarından gelen tüm fonksiyonları statik olarak LLM'e sunar.
- **Öneri:** `ActionType` enum'una varsayılan JSON şemaları (schema JSON) ve yetki (capability) gereksinimleri eklenmelidir. `AiExecutionTracker.TrackerContext` üzerinde aktif olan `ActionType`'a göre sadece ilgili araçlar (Spring AI Functions) dinamik olarak filtrelenip LLM'e `withFunctions` aracılığıyla sunulmalıdır.

---

## 3. Somut Geliştirme Önerileri ve Değişiklik Planı

### Değişiklik 1: `ActionType.java` Güncellemesi
```java
public enum ActionType {
    REPORT_REQUEST("{\"type\":\"object\",\"properties\":{\"reportId\":{\"type\":\"string\"}}}", "REPORT_READ"),
    ACCESS_REQUEST("{\"type\":\"object\",\"properties\":{\"resourceId\":{\"type\":\"string\"}}}", "ACCESS_MANAGE"),
    TASK_CREATE("{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"}}}", "TASK_WRITE"),
    AGENT_TASK("{\"type\":\"object\",\"properties\":{\"goal\":{\"type\":\"string\"}}}", "AGENT_EXECUTE"),
    NOTIFY("{\"type\":\"object\",\"properties\":{\"message\":{\"type\":\"string\"}}}", "NOTIFICATION_WRITE");

    private final String defaultSchema;
    private final String requiredCapability;

    ActionType(String defaultSchema, String requiredCapability) {
        this.defaultSchema = defaultSchema;
        this.requiredCapability = requiredCapability;
    }

    public String getDefaultSchema() { return defaultSchema; }
    public String getRequiredCapability() { return requiredCapability; }
}
```

### Değişiklik 2: `ChatAction.java` Güncellemesi
`ChatAction` JPA entity sınıfına `inputSchema` ve `requiredCapability` alanları eklenmelidir (ve ilgili DB migration dosyası `V47__chat_action_governance.sql` oluşturulmalıdır):
```java
    @Column(name = "input_schema", columnDefinition = "text")
    private String inputSchema;

    @Column(name = "required_capability", length = 100)
    private String requiredCapability;
```

### Değişiklik 3: `ChatToolsConfiguration.java` Entegrasyonu
`GovernanceGate` constructor üzerinden `@Autowired(required = false)` olarak enjekte edilmeli ve geriye dönük test uyumluluğu için overloaded constructor tanımlanmalıdır. `withContext` sarmalayıcısına denetim eklenmelidir:
```java
    private final GovernanceGate governanceGate;

    public ChatToolsConfiguration(..., @Autowired(required = false) GovernanceGate governanceGate) {
        ...
        this.governanceGate = governanceGate;
    }

    // Overloaded constructor for tests
    public ChatToolsConfiguration(...) {
        this(..., null);
    }
```
`withContext` içinde:
```java
            UUID actingAgentId = tracker != null ? tracker.getActingAgentId() : null;
            if (actingAgentId != null && governanceGate != null) {
                var decision = governanceGate.check(actingAgentId, "TOOL", toolName, "EXECUTE");
                if (!decision.allowed()) {
                    log.warn("Governance DENY for agent {} calling tool {}: {}", actingAgentId, toolName, decision.reason());
                    throw new GovernanceDeniedException(decision.reason());
                }
            }
```

### Değişiklik 4: `ChatToolsGovernanceIntegrationTest.java` Eklenmesi
`SHADOW` ve `ENFORCE` modlarında araç çağrılarının davranışını ve `GovernanceDeniedException` fırlatılmasını doğrulayan entegrasyon testleri yazılmalıdır.
