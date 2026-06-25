# Changes Report — LLM Intent Detection & Accuracy Test

## Modified Files
1. **ActionType.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ActionType.java`):
   - Enum sabitlerine JSON parametre şemaları ve gereken yetenek (capability) tanımları eklendi.
   - Şema ve yetenek bilgilerine erişim sağlayan getter metodları eklendi.
2. **ChatAction.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/domain/ChatAction.java`):
   - `ActionType` üzerinden şema ve yetenek bilgilerini delegasyonla dönen getter metodları eklendi.
3. **ActionIntentService.java** (`backend/src/main/java/com/akilliorganizasyon/chatbot/service/ActionIntentService.java`):
   - Eski keyword tabanlı statik kurallar (`RULES`) tamamen kaldırıldı.
   - `AiChatService` ve `ObjectMapper` kullanılarak LLM tabanlı dinamik intent tespiti implemente edildi.
   - LLM cevabı `IntentResult` tipine map edilerek `ChatAction` oluşturulup veri tabanına kaydedildi.
4. **ChatActionServiceTest.java** (`backend/src/test/java/com/akilliorganizasyon/chatbot/service/ChatActionServiceTest.java`):
   - `ActionIntentService` constructor değişikliğine uyum sağlamak için mock `AiChatService` ve `ObjectMapper` eklendi.

## New Files
1. **ActionIntentServiceAccuracyTest.java** (`backend/src/test/java/com/akilliorganizasyon/chatbot/service/ActionIntentServiceAccuracyTest.java`):
   - LLM tabanlı intent algılama doğruluğunu test eden senaryolar eklendi.
   - `Assumptions.assumeTrue(aiChatService.isEnabled())` ile AI servisinin kapalı olduğu durumlarda testin hata vermeden atlanması (skip) sağlandı.

## Build Status
- **Main Compilation**: `mvn compile` -> `BUILD SUCCESS`
- **Test Compilation**: `mvn test-compile` -> `BUILD SUCCESS`
- **Tests Execution**:
  - `mvn test -Dtest=ModulithVerificationTest` -> `BUILD SUCCESS` (1 test passed)
  - `mvn test -Dtest=ChatActionServiceTest` -> `BUILD SUCCESS` (4 tests passed)
  - `mvn test -Dtest=ActionIntentServiceAccuracyTest -Duser.language=en` -> `BUILD SUCCESS` (1 test skipped due to Assumption check)
