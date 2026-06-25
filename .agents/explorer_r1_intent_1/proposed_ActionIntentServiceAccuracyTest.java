package com.akilliorganizasyon.chatbot.service;

import com.akilliorganizasyon.chatbot.domain.ActionType;
import com.akilliorganizasyon.chatbot.domain.ChatAction;
import com.akilliorganizasyon.shared.ai.AiChatService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("box")
class ActionIntentServiceAccuracyTest {

    @Autowired
    private ActionIntentService actionIntentService;

    @Autowired
    private AiChatService aiChatService;

    @Test
    void testIntentDetectionAccuracy() {
        Assumptions.assumeTrue(aiChatService.isEnabled(), "AI service is not configured/enabled; skipping accuracy test.");

        List<TestCase> testCases = List.of(
                // TASK_CREATE
                new TestCase("Lütfen yeni bir görev oluştur: tedarikçi risk listesini güncelle", ActionType.TASK_CREATE, true),
                new TestCase("Task create: Prepare financial reports", ActionType.TASK_CREATE, true),
                new TestCase("Yapılacaklar listesine ekle: Sunum slaytlarını tamamla", ActionType.TASK_CREATE, true),
                new TestCase("Açık görevleri listeler misin?", null, false), // List command, not create

                // ACCESS_REQUEST
                new TestCase("Bana veri tabanına erişim izni ver", ActionType.ACCESS_REQUEST, true),
                new TestCase("Rol talep ediyorum: Admin yetkisi ver", ActionType.ACCESS_REQUEST, true),
                new TestCase("Yetki iste: Finans paneline erişim", ActionType.ACCESS_REQUEST, true),

                // REPORT_REQUEST
                new TestCase("Satış analiz raporu çıkar", ActionType.REPORT_REQUEST, true),
                new TestCase("Rapor üret: Son çeyrek performans özeti", ActionType.REPORT_REQUEST, true),
                new TestCase("Dashboard'u aç ve analiz göster", ActionType.REPORT_REQUEST, true),

                // AGENT_TASK
                new TestCase("Ajanı çalıştır: Arka planda pazar araştırması yapsın", ActionType.AGENT_TASK, true),
                new TestCase("Otonom ajan ekibine delege et", ActionType.AGENT_TASK, true),

                // NOTIFY
                new TestCase("Yarın sabah toplantıyı hatırlat", ActionType.NOTIFY, true),
                new TestCase("Bana bildirim gönder: Günlük yedekleme tamamlandı", ActionType.NOTIFY, true),

                // No Match / Conversational
                new TestCase("Merhaba, nasılsın bugün?", null, false),
                new TestCase("Sistemde kaç tane aktif kullanıcı var?", null, false),
                new TestCase("Bugünkü hava durumu nasıl?", null, false),
                new TestCase("Teşekkürler, iyi çalışmalar", null, false),
                new TestCase("Proje listesini bana gösterebilir misin?", null, false),
                new TestCase("Departman departman çalışan sayıları nedir?", null, false)
        );

        int passed = 0;
        for (TestCase tc : testCases) {
            Optional<ChatAction> actionOpt = actionIntentService.detectAndPropose(
                    UUID.randomUUID(), UUID.randomUUID(), tc.input()
            );

            if (tc.expectedMatched()) {
                if (actionOpt.isPresent() && actionOpt.get().getActionType() == tc.expectedType()) {
                    passed++;
                } else {
                    System.out.println("FAILED TestCase: \"" + tc.input() + "\" | Expected: " + tc.expectedType() + " | Got: " + (actionOpt.isPresent() ? actionOpt.get().getActionType() : "None"));
                }
            } else {
                if (actionOpt.isEmpty()) {
                    passed++;
                } else {
                    System.out.println("FAILED TestCase: \"" + tc.input() + "\" | Expected no match | Got: " + actionOpt.get().getActionType());
                }
            }
        }

        double accuracy = (double) passed / testCases.size();
        System.out.println("Intent Detection Accuracy: " + (accuracy * 100) + "% (" + passed + "/" + testCases.size() + ")");
        assertThat(accuracy).isGreaterThanOrEqualTo(0.95);
    }

    private record TestCase(String input, ActionType expectedType, boolean expectedMatched) {}
}
