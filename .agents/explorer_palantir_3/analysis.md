# Akıllı Organizasyon - Kod Tabanı İnceleme ve Analiz Raporu

Bu rapor, 'Akıllı Organizasyon' projesinin backend ve frontend kod tabanının incelenmesi sonucunda elde edilen bulguları, UI dashboard istatistik/metrik API'lerini, frontend bileşen mimarisini ve test yapılandırmasını ayrıntılarıyla sunar.

---

## 1. UI Dashboard Stats/Metrics APIs

Projedeki dashboard metrikleri ve istatistikleri modüler bir yapıya bölünmüştür. Tek bir merkezi istatistik servisi yerine, her modül kendi sorumluluğundaki istatistikleri ayrı servisler ve API controller sınıfları aracılığıyla sunmaktadır.

### Mevcut Uygulamalar (Current Implementations)

1. **Performans İstatistikleri (Performance Stats)**
   - **Backend Controller**: `backend/src/main/java/com/akilliorganizasyon/performance/api/PerformanceStatsController.java` (`/api/performance/stats`)
   - **Backend Servis**: `backend/src/main/java/com/akilliorganizasyon/performance/service/PerformanceStatsService.java`
   - **Veri Yapısı (DTO)**: `backend/src/main/java/com/akilliorganizasyon/performance/api/dto/PerformanceStatsDto.java`
   - **Döndürülen Metrikler**:
     - `workloadSnapshots` (Toplam iş yükü snapshot sayısı)
     - `capacityPlans` (Toplam kapasite planı sayısı)
     - `totalCapacityGap` (Tüm planlardaki toplam kapasite açığı)
     - `automationAssessments` (Toplam otomasyon değerlendirme sayısı)
     - `automateRecommendations` (Otomatikleştirilmesi önerilen süreç sayısı)
     - `totalEstTimeSavedHours` (Tahmini kazanılan toplam saat)
     - `agentMetricSamples` (Ajanlardan toplanan metrik örnek sayısı)
     - `trackedAgents` (Takip edilen tekil ajan sayısı)
   - **Frontend Entegrasyonu**: `frontend/src/modules/performance/api/performanceApi.ts` içindeki `performanceApi.stats()` fonksiyonu ile entegre edilmiştir.

2. **Denetim ve Güvenlik İstatistikleri (Audit Stats)**
   - **Backend Controller**: `backend/src/main/java/com/akilliorganizasyon/audit/api/AuditStatsController.java` (`/api/audit/stats` - Yalnızca `ADMIN` ve `MANAGER` yetkilerine açıktır)
   - **Backend Servis**: `backend/src/main/java/com/akilliorganizasyon/audit/service/AuditStatsService.java`
   - **Veri Yapısı (DTO)**: `backend/src/main/java/com/akilliorganizasyon/audit/api/dto/AuditStatsDto.java`
   - **Döndürülen Metrikler**:
     - `totalLogs` (Toplam denetim günlüğü sayısı)
     - `countsByAction` (İşlem türüne göre dağılım - `CountDto` listesi)
     - `countsByStatus` (Duruma göre dağılım, örn: `SUCCESS`, `FAILURE`)
     - `openSecurityEvents` (Açık güvenlik olaylarının sayısı)
     - `totalSecurityEvents` (Toplam güvenlik olaylarının sayısı)
   - **Frontend Entegrasyonu**: `frontend/src/modules/audit/api/auditApi.ts` içindeki `auditApi.stats()` fonksiyonu ile entegre edilmiştir.

3. **Sistem Sağlığı ve Telemetri (System Health)**
   - **Backend Controller**: `backend/src/main/java/com/akilliorganizasyon/platform/api/SystemHealthController.java` (`/api/platform/health` - Yalnızca `PLATFORM_ADMIN` yetkisine açıktır)
   - **Backend Servis**: `backend/src/main/java/com/akilliorganizasyon/platform/service/SystemHealthService.java`
   - **Veri Yapısı (DTO)**: `backend/src/main/java/com/akilliorganizasyon/platform/api/dto/SystemHealthDto.java`
   - **Döndürülen Metrikler**:
     - Sistem durumu (`status`, Spring Boot Actuator tabanlı)
     - Bileşen bazlı durumlar (`components` haritası)
     - JVM metrikleri (`uptimeMillis`, `heapUsedBytes`, `heapCommittedBytes`, `heapMaxBytes`, `nonHeapUsedBytes`, `availableProcessors`, `javaVersion`)
   - **Frontend Entegrasyonu**: `frontend/src/modules/platform/api/platformApi.ts` içindeki `platformApi.health()` fonksiyonu ile entegre edilmiştir.

4. **Ajan Performans Metrikleri (Agent Metrics)**
   - **Backend Controller**: `backend/src/main/java/com/akilliorganizasyon/performance/api/PerformanceMetricController.java` (`/api/performance/metrics/agents`)
   - **Backend Servis**: `backend/src/main/java/com/akilliorganizasyon/performance/service/PerformanceMetricService.java`
   - **Frontend Entegrasyonu**: `frontend/src/modules/performance/api/performanceApi.ts` içindeki `performanceApi.agentSummaries()` ve `performanceApi.agentSummary(agentId)` fonksiyonları ile entegre edilmiştir.

### Tespit Edilen Boşluklar (Potential Gaps)

1. **Dashboard'da Hardcoded Metrik Kullanımı**:
   - `frontend/src/modules/dashboard/views/DashboardView.vue` dosyasındaki "Yapay Zeka Verimliliği" KPI kartında yer alan Otomasyon Oranı (`88%`) ve kazanılan süre (`~140 SAAT`) tamamen hardcoded'dur (Bkz: `DashboardView.vue` satır 153-209). 
   - Halbuki backend'de bu bilgiyi dinamik olarak sağlayan `PerformanceStatsService` mevcuttur. Dashboard yüklenirken `performanceApi.stats()` çağrısı yapılmamakta, metrikler dinamik olarak gösterilmemektedir.
2. **Backend Test Eksikliği**:
   - `PerformanceStatsService`, `AuditStatsService` ve `PerformanceMetricService` sınıflarının backend birim/entegrasyon testleri (`backend/src/test/java/com/akilliorganizasyon/`) içinde hiçbir testi bulunmamaktadır. `stats` kelimesi veya bu sınıfların adları test dizininde hiç geçmemektedir.
3. **Merkezi Dashboard API Eksikliği**:
   - Tüm ana sayfa metriklerini tek seferde getirecek birleşik bir dashboard API'si yoktur. Frontend, KPI'ları göstermek için `identityApi.list`, `assetsApi.listProjects`, `auditApi.stats` ve `notificationsApi.unreadCount` çağrılarını ayrı ayrı (`Promise.allSettled`) yapmak zorundadır.

---

## 2. Frontend Bileşenleri (Frontend Components)

Frontend projesi Vue 3, Vite, Tailwind CSS ve TypeScript ile yapılandırılmıştır.

### Mimari ve Tasarım Kalıpları (Design Patterns)

- **Modüler Yapı**: Kod tabanı `src/modules/` altında işlevsel modüllere bölünmüştür. Her modül kendi `views/` (sayfalar), `components/` (modüle özel bileşenler), `api/` (API client) ve isteğe bağlı `stores/` (Pinia state yönetimi) alt dizinlerini içerir.
- **Tasarım Sistemi**: `src/design-system/components/` altında atomik, yeniden kullanılabilir UI bileşenleri (`AppButton`, `AppCard`, `AppStatCard`, vb.) ve grafik bileşenleri (`AppBarChart`, `AppDonutChart`, `AppLineChart`, `AppSparkline`) yer almaktadır.
- **State Yönetimi**: Pinia store'ları Composition API biçiminde tanımlanmıştır (`defineStore('name', () => { ... })`).
- **Styling**: Tailwind CSS ile birlikte, HSL/CSS değişkenleri (`var(--color-brand-500)`, `var(--color-surface)`) kullanılarak tutarlı bir koyu tema (Charcoal Gray) ve neon yeşil (Acid Green) vurgu tonları uygulanmıştır.

### Monolitik Bileşenler (Monolithic Files)

Bazı frontend bileşenleri çok fazla sorumluluk üstlenmiş olup refaktör edilmeye uygundur:

1. **`OrchestrationFlowView.vue`**
   - **Dosya Yolu**: `frontend/src/modules/aidebug/views/OrchestrationFlowView.vue`
   - **Boyut**: 1,036 satır (~47.8 KB)
   - **Açıklama**: Vue Flow kütüphanesini kullanarak ajanların çalışma akışlarını görselleştirir. URL senkronizasyonu, polling mekanizması, tab kontrolleri, timeline çizimi ve detay çekmecesi yönetimi gibi tüm karmaşık mantığı tek dosyada barındırır.
   - **Öneri**: Vue Flow konfigürasyonu, polling mekanizmaları ve timeline bileşenleri (`OrchestrationTimeline.vue` daha da ayrıştırılarak) bağımsız helper fonksiyonlara veya alt bileşenlere bölünmelidir.

2. **`OrgBoard.vue`**
   - **Dosya Yolu**: `frontend/src/modules/organization/components/OrgBoard.vue`
   - **Boyut**: 875 satır (~30.2 KB)
   - **Açıklama**: Organizasyon ağacını yönetir. Dagre kütüphanesi ile hiyerarşik yerleşim hesaplamaları, G6 Graph entegrasyonu, birim ekleme/düzenleme modalleri ve detay çekmecesindeki entegrasyon/proje/veri kaynağı sekmelerinin kontrolünü tek bir bileşende toplar.
   - **Öneri**: Dagre layout mantığı bir composable (`useDagreLayout.ts`) içine taşınabilir; veri yükleme ve CRUD işlemleri alt bileşenlere dağıtılabilir.

3. **`AssistantWizardModal.vue`**
   - **Dosya Yolu**: `frontend/src/modules/chatbot/components/AssistantWizardModal.vue`
   - **Boyut**: 602 satır (~19.4 KB)
   - **Açıklama**: Yapay zeka asistanının kurulum sihirbazını yönetir. Tüm adımlardaki sorular, ikonlar, stil sınıfları ve doğrulama mantığı bu tek dosyada tanımlıdır.
   - **Öneri**: Her bir sihirbaz adımı (`WizardStep1.vue`, `WizardStep2.vue`, vb.) ayrı bileşenler haline getirilerek ana modal basitleştirilmelidir.

4. **`DashboardView.vue`**
   - **Dosya Yolu**: `frontend/src/modules/dashboard/views/DashboardView.vue`
   - **Boyut**: 484 satır (~18.4 KB)
   - **Açıklama**: Ana dashboard görünümüdür. Modüllerin ikon ve Türkçe açıklamalarının haritalanması, KPI yükleme mantığı ve HTML şablonu bir aradadır.

### Tespit Edilen Boşluklar (Potential Gaps)

- **Frontend Rota Bazlı Rol Kontrolü Eksikliği (No Route-Level Role Guards)**:
  - `frontend/src/layouts/navigation.ts` içinde menülerin hangi rollere gösterileceği tanımlanmıştır (`roles?: string[]`). Ancak bu kontrol sadece menü linklerini UI'da gizlemek için kullanılmaktadır.
  - `frontend/src/router/index.ts` ve `frontend/src/modules/auth/guards/authGuard.ts` incelendiğinde, rota seviyesinde bir rol doğrulamasının yapılmadığı görülmektedir. Yetkisiz bir kullanıcı doğrudan URL yazarak (örn: `/platform`) sayfaya erişebilir (Sayfadaki backend API istekleri 403 alsa bile arayüz yüklenmektedir). Rota `meta` etiketlerine rol tanımları eklenmeli ve `authGuard` içinde kontrol edilmelidir.

---

## 3. Frontend Test Yapılandırması (Frontend Testing Setup)

### ESLint & Prettier
- **ESLint Yapılandırması**: `frontend/.eslintrc.cjs` dosyasındadır. `plugin:vue/vue3-recommended`, `@typescript-eslint/recommended` ve `prettier/recommended` kurallarını genişletir. `vue/multi-word-component-names` ve `vue/no-v-html` kuralları kapatılmıştır.
- **Prettier Yapılandırması**: `frontend/.prettierrc` dosyasındadır. Noktalı virgül kullanılmaz (`semi: false`), tek tırnak kullanılır (`singleQuote: true`), girinti 2 karakterdir ve satır genişliği 100 olarak ayarlanmıştır.
- **Linter & Formatter Çalıştırma**: `package.json` üzerinden `npm run lint` (`eslint . --ext .vue,.js,.ts --fix`) ve `npm run format` (`prettier --write .`) komutları ile çalıştırılabilir.

### Unit Tests (Birim Testleri)
- **Durum**: **Mevcut değildir.**
- **Tespit Edilen Boşluklar**: 
  - Projede `Vitest` veya `Jest` kütüphaneleri kurulu değildir.
  - `frontend/package.json` içinde birim test çalıştırmak için hiçbir script (`npm run test` veya `npm run test:unit`) bulunmamaktadır.
  - `src/` altında hiçbir `*.test.ts`, `*.test.js` veya `*.spec.ts` (E2E hariç) dosyası bulunmamaktadır.

### E2E Tests (Uçtan Uca Testler)
- **Durum**: Playwright kütüphanesi (`@playwright/test`) kuruludur.
- **Yapılandırma**: `frontend/playwright.config.ts` dosyasında tanımlıdır. `tests/e2e` dizinindeki testleri paralel olarak `http://localhost:3080` baseURL'ine karşı çalıştıracak şekilde yapılandırılmıştır.
- **Test Kapsamı**: Testler 4 aşamaya (Tier) bölünmüştür:
  - **Tier 1 (`frontend/tests/e2e/tier1.spec.ts`)**: Sidebar, Dashboard, Org grafiği ve Chatbot ekranlarındaki emoji temizliği kontrolleri, renk şeması doğrulamaları (Charcoal Gray arka plan ve Acid Green vurguları), mikro-etkileşimler (hover animasyonları), G6 grafiği canvas elemanları ve Sihirbaz modali görsel kontrolleri.
  - **Tier 2 (`frontend/tests/e2e/tier2.spec.ts`)**: Form girdilerindeki emoji kontrolleri, renk kontrastı doğrulamaları, modal Escape tuşu kontrolü ve Sihirbaz API entegrasyon doğrulamaları.
  - **Tier 3 (`frontend/tests/e2e/tier3.spec.ts`)**: Çok adımlı kullanıcı senaryoları (organizasyon birimi düzenleme, sihirbazda adımlar arası geçiş, grafik düğümü seçildiğinde yan çekmecenin açılması).
  - **Tier 4 (`frontend/tests/e2e/tier4.spec.ts`)**: Uçtan uca görsel tema denetimi, departman yönetim akışı, tema kalıcılığı ve çoklu sayfa geçiş performansı senaryoları.

### Tespit Edilen Boşluklar (Potential Gaps)

1. **Playwright Script Eksikliği**:
   - `frontend/package.json` dosyasında Playwright testlerini tetikleyecek herhangi bir npm script'i tanımlanmamıştır. Kullanıcıların testleri doğrudan `npx playwright test` yazarak çalıştırması gerekmektedir.
2. **CI/CD Entegrasyon Eksikliği**:
   - `.github/workflows/ci.yml` CI iş akışında sadece backend testleri (`./mvnw clean verify`) ve frontend derleme işlemi (`npm run build`) yer almaktadır. 
   - Frontend için ne ESLint kontrolü (`npm run lint`) ne de Playwright E2E testleri (`npx playwright test`) CI sürecine dahil edilmiştir. Bu durum hatalı kodların veya görsel regresyonların fark edilmeden ana dallara birleşmesine yol açabilir.
