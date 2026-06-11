## 2026-06-10T20:24:15Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Akıllı Organizasyon (intorg) platformunun arayüzünü modern, premium ve yapay zeka ruhuna uygun bir görsel kimliğe kavuşturmak amacıyla emoji temizliği, renk paleti değişimi, mikro animasyon entegrasyonu, G6 grafiğinin özelleştirilmesi ve asistan sihirbazı uyumunun sağlanması.

Working directory: /Users/armaganercan/antigravity/intelligent-organization/frontend
Integrity mode: development

## Requirements

### R1. Emoji Temizliği ve İkon Entegrasyonu
Tüm işletim sistemi emojilerini temizleyerek yerlerine tutarlı ve modern `lucide-vue-next` SVG ikonlarının yerleştirilmesi. Emojiler bileşen kodlarından tamamen arındırılmalıdır.

### R2. Renk Paleti ve Tema Revizyonu
Sıradan mavi/turkuaz tonları yerine Acid Green (Neon Yeşili, örn. #9FEF00) vurgu rengi ve Koyu Kömür Grisi ana yüzey rengine sahip koyu mod odaklı yeni bir renk şemasının ve CSS token sisteminin (`tokens.css`, `tailwind.config.js`) uygulanması.

### R3. Mikro Etkileşimler ve Hareket (Motion & Micro-interactions)
Buton ve kartlar için yay fiziğine (spring physics) sahip hover efektlerinin ve öğelerin ekranda kademeli olarak belirmesini (staggered entrance) sağlayan animasyonların entegrasyonu. Hafif bir animasyon kütüphanesi (örn. `motion` veya `gsap`) kurulabilir ve kullanılabilir.

### R4. G6 Organizasyon Grafiğinin Özelleştirilmesi
`G6Graph.vue` bileşeninin ilkel dikdörtgen düğümleri yerine; ikon, departman kodu ve üye sayılarını barındıran custom node kartlarının ve kavisli çizgilerin (edge) tasarlanması. Düğümler arası bağlantı çizgileri düz yerine kavisli (`cubic-horizontal` veya `bezier`) olmalıdır.

### R5. Sihirbaz Modalı Uyumlaştırma
`AssistantWizardModal.vue` bileşeninin görsel kimliğinin ve tasarım dilinin (kenarlıklar, gölgeler, vurgu renkleri) yeni marka renkleri ve token sistemi ile tam uyumlu hale getirilmesi.

## Verification Resources
Geliştirici ekibi değişikliklerin doğruluğunu ve kalitesini aşağıdaki kriterlere göre doğrulayacaktır.

## Acceptance Criteria

### Görsel Zanaat ve Tutarlılık
- [ ] `frontend/src` altındaki `.vue`, `.ts`, `.js` bileşen kodlarında hiçbir ham emoji karakteri (örn. 💼, ⚖️, 📚, 🤖) kalmamış olmalı, hepsi Lucide ikonları ile değiştirilmiş olmalıdır.
- [ ] `tokens.css` ve `tailwind.config.js` dosyaları güncellenerek Acid Green ana vurgu rengi haline getirilmeli ve koyu modda arka planlar koyu kömür grisi tonlarında olmalıdır.
- [ ] `AppCard.vue` ve `AppButton.vue` hover yapıldığında yay fiziğiyle yumuşakça büyümeli (`scale`) ve dikeyde hafifçe kaymalıdır (`translate`).
- [ ] Sayfalar veya listeler açıldığında kartlar aniden belirmek yerine sıralı/gecikmeli (staggered) bir süzülme efekti ile gelmelidir.

### Fonksiyonel Görselleştirme
- [ ] `G6Graph.vue` şemasındaki düğümler (`rect` yerine) özel HTML veya SVG şablonlu düğümlerle çizilmeli; üzerinde üye sayısı rozetleri ve departman türünü belirten Lucide ikonları bulunmalıdır.
- [ ] Organizasyon şemasındaki bağlantı çizgileri kavisli olmalıdır.
- [ ] `AssistantWizardModal.vue` modalında üstteki sert `teal-to-emerald` gradyanı kaldırılmalı, yeni Acid Green vurgu rengi ve Kömür Grisi koyu mod stili entegre edilmelidir.

## 2026-06-11T02:12:38Z
Lütfen çalışmaya devam edin ve R4 (G6 Graph özelleştirmeleri) ile test doğrulamalarını tamamlayarak projeyi bitirin.
