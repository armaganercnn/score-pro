# Milestone R2 Analiz ve Uygulama Stratejisi Raporu

Bu analiz raporu, **Milestone R2: Governance-Enforced LLM Tool-Calling Loop** kapsamında backend tarafında yapılması gereken mimari ve kod değişikliklerini detaylandırmaktadır. 

---

## 1. Mimari Tasarım ve Spring Modulith Sınırları

Projedeki Spring Modulith mimarisine göre modüller arası bağımlılık kuralları şu şekildedir:
- `chatbot` -> `shared` (İzin veriliyor)
- `agentlifecycle` -> `shared` (İzin veriliyor)
- `shared` -> `chatbot` (YASAK - döngüsel/bağımlılık ihlali)
- `chatbot` -> `agentlifecycle` (YASAK - akran modül doğrudan bağımlılığı)

### Çözüm Yolu:
1. **Yönetişim Kontrolü:** `chatbot` modülü, `agentlifecycle` içerisindeki somut `AgentGuardService` sınıfına doğrudan bağımlı olamaz. Bunun yerine, `shared/governance` paketi altında yer alan `GovernanceGate` arayüzü `ChatToolsConfiguration` sınıfına enjekte edilecektir. Çalışma zamanında Spring, `AgentGuardService` bean'ini bu arayüze otomatik olarak bağlayacaktır.
2. **Dinamik Araç Yönetimi:** `shared` modülündeki `AiChatService`, `chatbot` modülündeki `ActionType` veya `ChatToolsConfiguration` sınıflarına bağımlı olamaz. Bu nedenle, aktif `ActionType` tespit edildikten sonra izin verilen Spring AI Function bean isimleri `chatbot` modülü tarafından (`ChatService` veya `ChatToolsConfiguration`) çözülecek ve `shared.ai.AiCompletionOptions` sınıfına genişletilerek `Set<String> functions` parametresi olarak aktarılacaktır.

---

## 2. Dynamic Schemas per Action Type (R1.1 & R2.1)

### ActionType Enum Güncellemesi
`ActionType.java` enum yapısı, her bir eylem tipi için girdi parametre şemasını (schema JSON) ve gereksinim duydukları yeteneği (`requiredCapability`) içerecek şekilde genişletilir:

```java
package com.akilliorganizasyon.chatbot.domain;

public enum ActionType {
    REPORT_REQUEST("{\"type\":\"object\",\"properties\":{\"reportId\":{\"type\":\"string\"}}}", "REPORT"),
    ACCESS_REQUEST("{\"type\":\"object\",\"properties\":{\"resourceId\":{\"type\":\"string\"},\"role\":{\"type\":\"string\"}}}", "ACCESS"),
    TASK_CREATE("{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"},\"description\":{\"type\":\"string\"},\"assigneeId\":{\"type\":\"string\"},\"priority\":{\"type\":\"string\"},\"dueDate\":{\"type\":\"string\"}}}", "TASK"),
    AGENT_TASK("{\"type\":\"object\",\"properties\":{\"goal\":{\"type\":\"string\"}}}", "AGENT"),
    NOTIFY("{\"type\":\"object\",\"properties\":{\"message\":{\"type\":\"string\"},\"recipientId\":{\"type\":\"string\"}}}", "NOTIFY");

    private final String inputSchema;
    private final String requiredCapability;

    ActionType(String inputSchema, String requiredCapability) {
        this.inputSchema = inputSchema;
        this.requiredCapability = requiredCapability;
    }

    public String getInputSchema() { return inputSchema; }
    public String getRequiredCapability() { return requiredCapability; }
}
```

### ChatAction Entity & DB Güncellemesi
`ChatAction.java` entity'sine `inputSchema` ve `requiredCapability` alanları eklenmelidir.

```java
    @Column(name = "input_schema", columnDefinition = "text")
    private String inputSchema;

    @Column(name = "required_capability", length = 100)
    private String requiredCapability;
```

Bunun için aşağıdaki gibi Flyway migrasyonu (`V47__add_chat_action_governance_fields.sql`) hazırlanmalıdır:

```sql
ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS input_schema TEXT;
ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS required_capability VARCHAR(100);
```

### Dynamic Tool Presentation ve Registry (ChatToolsConfiguration)
`ChatToolsConfiguration` içerisinde `ActionType` ile eşleşen Spring AI Function bean isimlerini dönen bir eşleştirici metot tanımlanır:

```java
    public Set<String> getFunctionsForActionType(ActionType actionType) {
        if (actionType == null) {
            return Collections.emptySet();
        }
        return switch (actionType) {
            case REPORT_REQUEST -> Set.of("listProjects", "listDataSources");
            case ACCESS_REQUEST -> Set.of("listDigitalAssets", "listOrgUnits", "listDataSources");
            case TASK_CREATE -> Set.of("createTask", "listUsers", "listMyTasks");
            case AGENT_TASK -> Set.of("delegateToOrchestrator", "listMySubordinates");
            case NOTIFY -> Set.of("listUsers");
        };
    }
```

Spring AI, bu bean isimlerini aldığında yansıma (reflection) yoluyla JSON şemalarını otomatik çıkaracak ve LLM'e gönderecektir.

---

## 3. LLM-Based Intent Detection (R1.2)

`ActionIntentService.java` içindeki statik keyword eşleştirme mantığı kaldırılarak yerine LLM destekli tipli intent tespiti getirilir.

```java
package com.akilliorganizasyon.chatbot.service;

import com.akilliorganizasyon.chatbot.domain.ActionStatus;
import com.akilliorganizasyon.chatbot.domain.ActionType;
import com.akilliorganizasyon.chatbot.domain.ChatAction;
import com.akilliorganizasyon.chatbot.repository.ChatActionRepository;
import com.akilliorganizasyon.shared.ai.AiChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActionIntentService {

    private final ChatActionRepository chatActionRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    public record LlmIntentResult(ActionType actionType, Map<String, Object> payload) {}

    public Optional<LlmIntentResult> detectIntent(String userContent) {
        if (userContent == null || userContent.isBlank() || !aiChatService.isEnabled()) {
            return Optional.empty();
        }

        String systemPrompt = """
                Sen bir eylem/niyet tespit asistanısın. Kullanıcının verdiği mesajı analiz et ve aşağıdaki eylem türlerinden en uygun olanını seç:
                - REPORT_REQUEST: Kullanıcı bir rapor, analiz, özet veya gösterge tablosu (dashboard) istediğinde.
                - ACCESS_REQUEST: Kullanıcı bir sisteme, veri kaynağına, dosyaya veya role erişim/yetki talep ettiğinde.
                - TASK_CREATE: Kullanıcı yeni bir görev oluşturulmasını veya yapılmasını istediğinde.
                - AGENT_TASK: Kullanıcı otonom uzman ajanların çalıştırılmasını veya karmaşık araştırma delege edilmesini istediğinde.
                - NOTIFY: Kullanıcı birine bildirim gönderilmesini veya hatırlatma kurulmasını istediğinde.
                
                Eğer kullanıcının mesajı yukarıdakilerden hiçbirine uymuyorsa eylem türünü null bırak.
                Yanıtı yalnızca şu JSON formatında döndür, başka hiçbir şey yazma:
                {
                  "actionType": "Eylem türü (yukarıdaki enum değerlerinden biri veya null)",
                  "payload": {
                    // Eyleme özel parametreler (örneğin görev için başlık/açıklama, rapor için raporId)
                  }
                }
                """;

        try {
            String answer = aiChatService.complete(systemPrompt, userContent);
            String json = extractJson(answer);
            if (json == null) return Optional.empty();

            LlmIntentResult result = objectMapper.readValue(json, LlmIntentResult.class);
            if (result.actionType() == null) {
                return Optional.empty();
            }
            return Optional.of(result);
        } catch (Exception e) {
            log.warn("Failed to detect intent via LLM: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public ChatAction proposeAction(UUID conversationId, UUID messageId, LlmIntentResult intentResult) {
        ChatAction action = new ChatAction();
        action.setConversationId(conversationId);
        action.setMessageId(messageId);
        action.setActionType(intentResult.actionType());
        action.setStatus(ActionStatus.PROPOSED);
        action.setRequiresApproval(intentResult.actionType() == ActionType.ACCESS_REQUEST);
        action.setPayload(intentResult.payload());
        action.setInputSchema(intentResult.actionType().getInputSchema());
        action.setRequiredCapability(intentResult.actionType().getRequiredCapability());

        return chatActionRepository.save(action);
    }

    private String extractJson(String text) {
        if (text == null) return null;
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) return null;
        return text.substring(start, end + 1);
    }
}
```

---

## 4. Governance-Enforced LLM Tool-Calling (R2.2 & R2.3)

### ChatToolsConfiguration.java Değişiklikleri
`GovernanceGate` enjekte edilmeli ve `withContext` sarmalayıcısı güncellenmelidir:

```java
    private final GovernanceGate governanceGate;

    public ChatToolsConfiguration(IdentityPort identityPort, ProjectPort projectPort, NotificationsPort notificationsPort,
                                  OrgUnitPort orgUnitPort, DigitalAssetPort digitalAssetPort, DataSourcePort dataSourcePort,
                                  ObjectMapper objectMapper, AgentsPort agentsPort, GovernanceGate governanceGate) {
        this.identityPort = identityPort;
        this.projectPort = projectPort;
        this.notificationsPort = notificationsPort;
        this.orgUnitPort = orgUnitPort;
        this.digitalAssetPort = digitalAssetPort;
        this.dataSourcePort = dataSourcePort;
        this.objectMapper = objectMapper;
        this.agentsPort = agentsPort;
        this.governanceGate = governanceGate;
    }
```

Sarmalayıcı (`withContext`) içinde, `actingAgentId` mevcutsa `governanceGate.check` çağrılmalıdır:

```java
    private <T, R> Function<T, R> withContext(String toolName, Function<T, R> original) {
        return request -> {
            var tracker = com.akilliorganizasyon.shared.ai.AiExecutionTracker.get();
            if (tracker != null) {
                tracker.addTool(toolName);
            }
            
            // Yönetişim Kontrolü
            UUID agentId = tracker != null ? tracker.getActingAgentId() : null;
            if (agentId != null && governanceGate != null) {
                var decision = governanceGate.check(agentId, "TOOL", toolName, "EXECUTE");
                if (!decision.allowed()) {
                    log.info("Governance DENY for agent {} calling tool {}: {}", agentId, toolName, decision.reason());
                    throw new com.akilliorganizasyon.shared.governance.GovernanceDeniedException(decision.reason());
                }
            }

            var prevAuth = SecurityContextHolder.getContext().getAuthentication();
            var ctx = ChatRequestContextHolder.getContext();
            if (ctx != null && ctx.auth() != null) {
                SecurityContextHolder.getContext().setAuthentication(ctx.auth());
            }

            long start = System.currentTimeMillis();
            String inputArgs = null;
            try {
                inputArgs = objectMapper.writeValueAsString(request);
            } catch (Exception e) {
                inputArgs = request != null ? request.toString() : null;
            }

            String outputResult = null;
            String status = "SUCCESS";
            String errorMsg = null;
            try {
                R result = original.apply(request);
                try {
                    outputResult = objectMapper.writeValueAsString(result);
                } catch (Exception e) {
                    outputResult = result != null ? result.toString() : null;
                }
                return result;
            } catch (Throwable t) {
                status = "FAILED";
                errorMsg = t.getMessage();
                throw t;
            } finally {
                long duration = System.currentTimeMillis() - start;
                SecurityContextHolder.getContext().setAuthentication(prevAuth);
                if (tracker != null) {
                    tracker.recordToolCall(toolName, inputArgs, outputResult, duration, status, errorMsg);
                }
            }
        };
    }
```

---

## 5. Integration & Flow Updates (ChatService)

`ChatService` akışında, LLM çağrılmadan önce intent LLM ile tespit edilir. Bu sayede hem hangi araçların LLM'e sunulacağı dinamik olarak belirlenir hem de eylem çıktısı asistan mesajıyla beraber veri tabanına yazılır.

```java
    // ChatService.java sendMessage metodu içindeki turn hazırlama ve tamamlama akışı:
    PreparedTurn turn = prepareTurn(conversationId, content, privileged, userId);
    
    // 1. Intent tespiti
    Optional<ActionIntentService.LlmIntentResult> intentOpt = actionIntentService.detectIntent(content);
    Set<String> dynamicTools = Set.of();
    if (intentOpt.isPresent()) {
        dynamicTools = chatToolsConfiguration.getFunctionsForActionType(intentOpt.get().actionType());
    }

    // 2. LLM completion parametreleri ile çağrı
    String assistantText;
    if (aiChatService.isEnabled()) {
        try {
            ChatRequestContextHolder.setContext(authentication);
            AiCompletionOptions options = AiCompletionOptions.of(null, null, dynamicTools);
            assistantText = aiChatService.complete(turn.systemPrompt(), turn.userPrompt(), options);
        } ...
    }

    // 3. Mesajı ve ilişkili aksiyonu kaydetme
    ChatMessage assistant = persistAssistant(assistantMessageId, conversationId, turn.userMessageId(), content, assistantText);
    if (intentOpt.isPresent()) {
        ChatAction action = actionIntentService.proposeAction(conversationId, assistant.getId(), intentOpt.get());
        assistant.setActionRef(action.getId().toString());
        chatMessageRepository.save(assistant);
    }
```
