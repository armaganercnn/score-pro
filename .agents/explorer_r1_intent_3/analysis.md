# Analiz Raporu: Tipli Aksiyon Şemaları ve LLM Intent Tespiti

Bu analiz raporu, **Akıllı Organizasyon (intorg)** projesinde sohbet eylemlerinin (chat actions) yönetimi ve kullanıcı niyetlerinin (intent detection) heuristik yöntemlerden LLM / Spring AI tabanlı tipli eylemlere dönüştürülmesini incelemektedir.

---

## 1. ActionType.java ve ChatAction.java Geliştirmeleri

Mevcut durumda `ActionType` basit bir java enum yapısıdır. Eylemlerin dinamik veya statik şema tanımlarına ve yetki kontrolü için gereken yetenek (capability) tanımlarına sahip olması istenmektedir. 

Bu gereksinimi karşılamak için iki farklı tasarım yaklaşımı mevcuttur:

### Yaklaşım A: Statik Enum Yapılandırması (Önerilen)
`ActionType` enum değerlerine statik olarak JSON parametre şeması (schema JSON) ve gereken yetenek (`requiredCapability`) tanımları eklenir. `ChatAction` nesnesi ise bu bilgileri doğrudan ilgili enum üzerinden çeker.

#### ActionType.java Revizyon Önerisi:
```java
package com.akilliorganizasyon.chatbot.domain;

public enum ActionType {
    REPORT_REQUEST(
        "{" +
        "  \"type\": \"object\"," +
        "  \"properties\": {" +
        "    \"reportName\": { \"type\": \"string\" }," +
        "    \"category\": { \"type\": \"string\" }," +
        "    \"parameters\": { \"type\": \"object\" }" +
        "  }," +
        "  \"required\": [\"reportName\"]" +
        "}",
        "ACTION:REPORT_REQUEST"
    ),
    ACCESS_REQUEST(
        "{" +
        "  \"type\": \"object\"," +
        "  \"properties\": {" +
        "    \"permissionCode\": { \"type\": \"string\" }," +
        "    \"scope\": { \"type\": \"string\" }," +
        "    \"justification\": { \"type\": \"string\" }" +
        "  }," +
        "  \"required\": [\"permissionCode\"]" +
        "}",
        "ACTION:ACCESS_REQUEST"
    ),
    TASK_CREATE(
        "{" +
        "  \"type\": \"object\"," +
        "  \"properties\": {" +
        "    \"task\": {" +
        "      \"type\": \"object\"," +
        "      \"properties\": {" +
        "        \"title\": { \"type\": \"string\" }," +
        "        \"description\": { \"type\": \"string\" }," +
        "        \"priority\": { \"type\": \"string\", \"enum\": [\"LOW\", \"MEDIUM\", \"HIGH\"] }," +
        "        \"assigneeId\": { \"type\": \"string\", \"format\": \"uuid\" }," +
        "        \"dueDate\": { \"type\": \"string\", \"format\": \"date-time\" }" +
        "      }," +
        "      \"required\": [\"title\"]" +
        "    }" +
        "  }," +
        "  \"required\": [\"task\"]" +
        "}",
        "ACTION:TASK_CREATE"
    ),
    AGENT_TASK(
        "{" +
        "  \"type\": \"object\"," +
        "  \"properties\": {" +
        "    \"goal\": { \"type\": \"string\" }" +
        "  }," +
        "  \"required\": [\"goal\"]" +
        "}",
        "ACTION:AGENT_TASK"
    ),
    NOTIFY(
        "{" +
        "  \"type\": \"object\"," +
        "  \"properties\": {" +
        "    \"message\": { \"type\": \"string\" }," +
        "    \"recipient\": { \"type\": \"string\" }," +
        "    \"scheduledAt\": { \"type\": \"string\", \"format\": \"date-time\" }" +
        "  }," +
        "  \"required\": [\"message\"]" +
        "}",
        "ACTION:NOTIFY"
    );

    private final String schemaJson;
    private final String requiredCapability;

    ActionType(String schemaJson, String requiredCapability) {
        this.schemaJson = schemaJson;
        this.requiredCapability = requiredCapability;
    }

    public String getSchemaJson() {
        return schemaJson;
    }

    public String getRequiredCapability() {
        return requiredCapability;
    }
}
```

#### ChatAction.java Revizyon Önerisi:
Veri tabanında ek kolon açmadan, Java entity sınıfında `@Transient` (veri tabanına yazılmayan ancak DTO veya iş mantığında kullanılan) metotlar aracılığıyla şema ve yetenek bilgileri dışarı açılır:
```java
    @Transient
    public String getSchemaJson() {
        return actionType != null ? actionType.getSchemaJson() : null;
    }

    @Transient
    public String getRequiredCapability() {
        return actionType != null ? actionType.getRequiredCapability() : null;
    }
```
*Bu yöntemin avantajı, DB şeması değişikliği (migration) gerektirmemesi ve kod seviyesinde tipli şemaları merkezi olarak yönetebilmesidir.*

---

### Yaklaşım B: Dinamik / Veritabanı Destekli Yapılandırma
Eylemlerin şemalarının zamanla değişebileceği veya veritabanından dinamik olarak yüklenmesi gerektiği durumlarda `chat_actions` tablosuna kolon eklenmesi tercih edilir.

#### SQL Migration (`V46__chat_actions_schema_and_capability.sql`):
```sql
ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS schema_json JSONB;
ALTER TABLE chat_actions ADD COLUMN IF NOT EXISTS required_capability VARCHAR(100);
```

#### ChatAction.java Entity Değişiklikleri:
```java
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_json", columnDefinition = "jsonb")
    private Map<String, Object> schemaJson;

    @Column(name = "required_capability", length = 100)
    private String requiredCapability;
```
*Bu yöntemin avantajı, şemaların ve yetenek limitlerinin veritabanı veya bir admin ekranı üzerinden dinamik olarak güncellenebilmesidir.*

---

## 2. ActionIntentService.java Değişiklikleri

Mevcut `ActionIntentService.java` içerisindeki statik `RULES` keyword-based filtreleme mantığı tamamen kaldırılarak LLM / Spring AI tabanlı bir akış kurgulanacaktır.

### Yeni Bağımlılıklar:
- `AiChatService`: Spring AI `ChatModel` entegrasyonu sağlayan mevcut platform servisidir. Dil denetimleri ve loglama gibi özellikleri içerir.
- `ObjectMapper`: LLM'den dönen JSON yanıtını parse etmek için kullanılır.

### LLM Prompt Tasarımı:
LLM'e verilecek sistem yönergesi (system prompt), kullanıcının girdisini analiz ederek sadece tanımlı `ActionType` şemalarından birini tespit etmeli ve bu şemaya uygun bir JSON üretmelidir. Eğer herhangi bir eşleşme sağlanamıyorsa, JSON içerisinde `matched: false` dönmelidir.

#### Önerilen System Prompt Yapısı:
```
You are an expert natural language understanding system. Your task is to detect the user's intent from their message and classify it into one of the following ActionTypes:
1. REPORT_REQUEST: User wants to request, analyze, or view a report/dashboard.
2. ACCESS_REQUEST: User wants to request access permissions, roles, or authorization.
3. TASK_CREATE: User wants to create a task, todo list item, or action item.
4. AGENT_TASK: User wants to start/run an autonomous agent or background task.
5. NOTIFY: User wants to send notifications, reminders, or alerts.

If an intent matches, extract parameters precisely and structure them according to these JSON schemas:
- REPORT_REQUEST: { "reportName": "string", "category": "string", "parameters": {} }
- ACCESS_REQUEST: { "permissionCode": "string", "scope": "string", "justification": "string" }
- TASK_CREATE: { "task": { "title": "string", "description": "string", "priority": "LOW/MEDIUM/HIGH", "assigneeId": "UUID", "dueDate": "ISO-8601 string" } }
- AGENT_TASK: { "goal": "string" }
- NOTIFY: { "message": "string", "recipient": "string", "scheduledAt": "ISO-8601 string" }

Respond ONLY with a valid JSON block containing:
{
  "matched": true/false,
  "actionType": "ENUM_VALUE",
  "payload": { ... }
}
Do not write any other explanation or wrap it in markdown block.
```

### ActionIntentService.java Taslak Gerçekleşimi:
```java
package com.akilliorganizasyon.chatbot.service;

import com.akilliorganizasyon.chatbot.domain.ActionStatus;
import com.akilliorganizasyon.chatbot.domain.ActionType;
import com.akilliorganizasyon.chatbot.domain.ChatAction;
import com.akilliorganizasyon.chatbot.repository.ChatActionRepository;
import com.akilliorganizasyon.shared.ai.AiChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class ActionIntentService {

    private final ChatActionRepository chatActionRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    public ActionIntentService(ChatActionRepository chatActionRepository,
                               AiChatService aiChatService,
                               ObjectMapper objectMapper) {
        this.chatActionRepository = chatActionRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    public Optional<ChatAction> detectAndPropose(UUID conversationId, UUID messageId, String userContent) {
        if (userContent == null || userContent.isBlank()) {
            return Optional.empty();
        }

        if (!aiChatService.isEnabled()) {
            log.warn("AI service is not enabled. Skipping intent detection.");
            return Optional.empty();
        }

        try {
            String systemPrompt = buildSystemPrompt();
            String response = aiChatService.complete(systemPrompt, userContent);
            String json = extractJson(response);

            if (json == null) {
                log.warn("Could not extract JSON from LLM response: {}", response);
                return Optional.empty();
            }

            IntentResult result = objectMapper.readValue(json, IntentResult.class);
            if (result == null || !result.matched() || result.actionType() == null) {
                return Optional.empty();
            }

            ChatAction action = new ChatAction();
            action.setConversationId(conversationId);
            action.setMessageId(messageId);
            action.setActionType(result.actionType());
            action.setStatus(ActionStatus.PROPOSED);
            
            // ACCESS_REQUEST is high-impact, requires approval
            boolean requiresApproval = result.actionType() == ActionType.ACCESS_REQUEST;
            action.setRequiresApproval(requiresApproval);

            action.setPayload(result.payload() != null ? result.payload() : new HashMap<>());

            return Optional.of(chatActionRepository.save(action));

        } catch (Exception e) {
            log.error("Error during LLM intent detection: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    private String buildSystemPrompt() {
        return "You are an intent detection system. Analyze the user's message and determine if it matches an ActionType.\n" +
                "ActionTypes and their payloads:\n" +
                "- REPORT_REQUEST: Requesting a report. payload fields: reportName (string), category (string), parameters (object).\n" +
                "- ACCESS_REQUEST: Requesting access. payload fields: permissionCode (string), scope (string), justification (string).\n" +
                "- TASK_CREATE: Creating a task. payload structure: { \"task\": { \"title\": \"string\", \"description\": \"string\", \"priority\": \"LOW/MEDIUM/HIGH\", \"assigneeId\": \"string\", \"dueDate\": \"string\" } }.\n" +
                "- AGENT_TASK: Launching an autonomous agent. payload fields: goal (string).\n" +
                "- NOTIFY: Sending a notification. payload fields: message (string), recipient (string), scheduledAt (string).\n\n" +
                "Respond ONLY with a JSON matching this schema:\n" +
                "{\n" +
                "  \"matched\": boolean,\n" +
                "  \"actionType\": \"REPORT_REQUEST\"|\"ACCESS_REQUEST\"|\"TASK_CREATE\"|\"AGENT_TASK\"|\"NOTIFY\",\n" +
                "  \"payload\": object\n" +
                "}\n" +
                "If no intent is matched, set matched to false and omit actionType and payload.";
    }

    private String extractJson(String text) {
        if (text == null) {
            return null;
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        return text.substring(start, end + 1);
    }

    private record IntentResult(
            boolean matched,
            ActionType actionType,
            java.util.Map<String, Object> payload
    ) {}
}
```

---

## 3. Test Stratejisi (Accuracy >= 95%)

### A. Unit Testleri (Mock LLM)
`ActionIntentServiceTest.java` oluşturularak mock `AiChatService` üzerinden LLM'in farklı formatlarda (düzgün JSON, hatalı JSON, markdown kod bloğu içinde JSON) döndüğü durumlar için kodun dayanıklılığı ve hata durumlarındaki davranışı test edilir.

### B. Entegrasyon / Doğruluk Testi (Live Evaluation)
Niyet tespit doğruluğunu (`>=95%`) ölçmek amacıyla `ActionIntentAccuracyIntegrationTest.java` entegrasyon testi tasarlanacaktır.

Bu test sınıfında:
1. Türkçe ve İngilizce ifadelerden oluşan **en az 20-30 test senaryosu** barındıran bir veri kümesi (dataset) tanımlanır.
2. Bu veri kümesindeki her bir ifade için `detectAndPropose` metodu çağrılır.
3. Çıkan sonuçlar (beklenen `ActionType` ve doldurulan parametreler) doğrulanır.
4. Başarılı sınıflandırma oranı (`correct / total`) hesaplanır ve `%95`'in üzerinde olduğu (`assertThat(accuracy).isGreaterThanOrEqualTo(0.95)`) doğrulanır.
5. Eğer test ortamında AI API anahtarı ayarlanmamışsa (`aiChatService.isEnabled() == false`), entegrasyon testi hata fırlatmak yerine uyararak testi başarılı sonlandırır (graceful degradation).

#### Test Senaryoları Örneği:
| Girdi İfadesi | Beklenen ActionType | Önemli Parametreler |
|---|---|---|
| "Bana geçen ayın yakıt tüketim raporunu çıkartır mısın?" | `REPORT_REQUEST` | `reportName` = "yakıt tüketim raporu" |
| "Finansal özet dashboard'unu göster" | `REPORT_REQUEST` | `reportName` = "Finansal özet dashboard" |
| "Maaş verilerini görmek için yetki istiyorum" | `ACCESS_REQUEST` | `permissionCode` veya `justification` |
| "IK modülü için erişim izni talep et" | `ACCESS_REQUEST` | |
| "Yeni bir görev aç: Tedarikçi risk listesini güncelle" | `TASK_CREATE` | `task.title` = "Tedarikçi risk listesini güncelle" |
| "Todo oluştur: Docker compose ayarlarını kontrol et" | `TASK_CREATE` | `task.title` = "Docker compose ayarlarını kontrol et" |
| "Otonom ajanı başlat: log dosyalarındaki hataları tarasın" | `AGENT_TASK` | `goal` = "log dosyalarındaki hataları tarasın" |
| "Ekibe toplantı hatırlatıcısı gönder" | `NOTIFY` | `message` = "toplantı hatırlatıcısı" |
| "Bugün hava çok güzel, ne yapıyorsun?" | *None (matched: false)* | |
