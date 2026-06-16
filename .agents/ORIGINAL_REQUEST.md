# Original User Request

## Follow-up — 2026-06-16T03:10:30+03:00

Flow Visualizer arayüzünde ajanların veri kaynaklarını (RAG, Tools, Screens), çağrı akışlarındaki döngüleri (Loop Detection) ve performans darboğazları ile hataları detaylı olarak analiz edip görselleştiren ekran geliştirmeleri. 

Bu geliştirme öncesinde, 5 kişilik bir Ürün Sahibi (Product Owner - PO) ekibi gibi davranarak bu planı detaylıca inceleyin, eksik gereksinimleri çıkarın, vizyon katın (örneğin; ajanlar arası canlı mesajlaşma akışlarının animasyonu, döngü analizinde bottleneck tespiti, veri kaynaklarının etki analizi vb.) ve bu vizyon doğrultusunda hem backend hem de frontend geliştirmelerini gerçekleştirin.

Working directory: `/Users/armaganercan/antigravity/intelligent-organization`
Integrity mode: development

## Requirements

### R1. PO Vizyon Hizalaması ve Eksik Analizi (PO Vision Alignment & Gap Analysis)
- Planı 5 kişilik bir PO ekibi gözüyle inceleyin. Mevcut Flow Visualizer'ın eksiklerini tespit edin ve vizyon katacak ek özellikleri (örn: veri akış animasyonları, loopların getirdiği maliyet/token analizi, dar boğazların görselleştirilmesi) planın kapsamına ekleyin.
- Çıkartılan yeni gereksinimleri ve vizyon detaylarını `.wiki/moduller/modul_aidebug_flow_visualizer_analizi.md` raporuna ve plan dokümanına ekleyin.

### R2. Veri Kaynağı Görselleştirmesi (Data Source Visualization)
- Ajan düğümlerinde, ajanın hangi veri kaynaklarından veri çektiği görsel olarak gösterilmelidir.
- Backend API'sinden gelen `AgentTaskTraceDto` içerisindeki `selectedNodeTitles` (RAG / Bilgi Tabanı), `calledTools` (Kullanılan Araçlar) ve `accessedScreens` (Erişilen Ekranlar) bilgileri kullanılarak, her ajan düğümünün (AgentNode) kartı içerisinde küçük ikonlar/badge'ler (RAG için 📚, Tools için 🛠️, Screens için 📱 ikonları ve yanlarında adet bilgisi) şeklinde kompakt gösterilmelidir.
- Ajanın sağ detay panelinde (FlowDetailDrawer) ise bu veri kaynakları detaylı isimleriyle listelenmelidir.

### R3. Backend Tabanlı Döngü Tespiti (Backend-driven Loop Detection)
- Ajanlar arası oluşan döngüsel (loop) çağrılar backend tarafında API düzeyinde analiz edilmelidir.
- `OrchestrationService` (veya ilgili orkestrasyon servisleri) çalışırken, bir run/sohbet akışında parent-child ilişkisi içinde veya genel akışta aynı uzman ajanların (aynı `agentId` veya `agentRole`) tekrarlı çağrıları (örn. ardışık 3 veya daha fazla kez) kontrol edilmeli ve döngü riski tespit edildiğinde API yanıtında (`RunDetailDto` veya `AgentTaskDto` içinde) `isLooping: true` veya `warnings: ["Loop detected for agent X"]` gibi alanlar dönülmelidir.
- Frontend, bu bilgiyi alarak grafikte döngüye giren yolları (edges) kırmızı renkle vurgulamalı ve detay panelinde "Döngü tespit edildi: Agent A -> Agent B -> Agent A" gibi net bir uyarı mesajı göstermelidir.

### R4. Gelişmiş Sorun ve Performans Analizi (Detailed Problem & Performance Analysis)
- Akışta meydana gelen hatalar (`FAILED`, `TIMEOUT`), yüksek gecikme süreleri (örneğin 10 saniyeden uzun süren tasklar) ve yüksek token tüketimleri grafikte belirgin bir görsel dille etiketlenmelidir.
- Detay panelinde bu sorunların kök neden analizi (root-cause) kolaylaştırılmalı, hata logları ve tool parametreleri ön plana çıkarılmalıdır.

## Acceptance Criteria

### PO Kriterleri
- [ ] Tasarım ve vizyon raporu (`modul_aidebug_flow_visualizer_analizi.md`) güncellenmiş ve PO ekibinin vizyon katkıları (örn. token maliyeti, canlı akış animasyonu vb.) eklenmiş olmalı.

### Backend Kriterleri
- [ ] `RunDetailDto` veya ilgili DTO'lar güncellenerek akıştaki döngü (loop) analiz sonuçlarını (`isLooping`, `warnings` listesi vb.) içermeli.
- [ ] `OrchestrationService` içinde, görevler eklenirken veya çalıştırılırken döngüsel çağrıları (aynı ajanın parent-child zincirinde veya yakın geçmişte aşırı tekrarı) tespit eden bir algoritma bulunmalı.

### Frontend Kriterleri
- [ ] `AgentNode.vue` bileşeni güncellenerek kullanılan veri kaynaklarının sayıları (RAG dökümanı, tool çağrısı, ekran erişimi) küçük badge/ikonlar halinde gösterilmeli.
- [ ] Vue Flow üzerinde `isLooping` veya döngü uyarısı alan kenarlar (edges) kırmızı/turuncu ve kesikli çizgilerle animasyonlu olarak görselleştirilmeli.
- [ ] Hatalı veya yavaş çalışan düğümler (örneğin >10s gecikme) sarı/kırmızı kenarlıklar veya animasyonlu (pulse) efektlerle gösterilmeli.
- [ ] Detay panelinde (`FlowDetailDrawer.vue` veya ilgili detay bileşenleri) "Veri Kaynakları", "Hata Analizi" ve varsa "Döngü Uyarıları" bölümleri eklenmeli.
