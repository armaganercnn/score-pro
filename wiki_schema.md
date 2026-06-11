# Enterprise LLM-Wiki Schema & Constitution

Bu belge, **30 geliştiricili ve 2 yıllık** legacy kod tabanındaki tüm iş kurallarını, servis etkileşimlerini ve satış kanalı bağımlılıklarını Obsidian üzerinde sıfır halüsinasyon riskiyle haritalandırmak için yapay zeka ajanının (ve analistin) uyacağı kurallar bütününü (Anayasayı) tanımlar.

---

## 1. Dizin Yapısı (Directory Structure)

Wiki, Obsidian içinde aşağıdaki klasör yapısına göre organize edilecektir:

```text
/.wiki/
  ├── index.md                      # Ana dizin ve giriş kapısı (Content Catalog)
  ├── log.md                        # Kronolojik işlem günlüğü (Audit Trail)
  ├── wiki_schema.md                # Bu anayasa belgesi
  ├── /business-rules/              # İş kuralları (Atomic Business Rules)
  │     └── BR_XXX_rule_name.md     # Her iş kuralı için tekil dosya
  ├── /services/                    # Sistem ve servis modülleri
  │     └── SVC_service_name.md     # Servis etkileşimleri ve API kontratları
  ├── /sales-channels/              # Satış kanalları kırılımları
  │     └── CHN_channel_name.md     # Mobil, Web, Bayi vb. kanallara özel kurallar
  └── /data-models/                 # Veritabanı tabloları ve şemaları
        └── DB_table_name.md        # Kritik tablo ve kolon tanımları
```

---

## 2. Sayfa Şablonları (Page Templates)

Yapay zeka veya analist yeni bir sayfa oluştururken aşağıdaki şablonları **birebir** uygulamak zorundadır.

### A. İş Kuralı Şablonu (`/business-rules/BR_XXX_rule_name.md`)

```markdown
---
id: BR_XXX
title: "Kural Başlığı"
status: "active" # active | draft | stale | contradicted
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
verified_by: "agent_name / human_name"
---

# BR_XXX: Kural Başlığı

## 1. İş Açıklaması (Business Description)
[Bu iş kuralının iş birimi gözünden ne anlama geldiğini net ve sade bir dille açıklayın.]

## 2. Kanıtlar ve Kod Referansları (Code Traceability)
> [!IMPORTANT]
> Kanıt gösterilmeyen kural geçersizdir.
- **Kod Sınıfı/Metodu:** `[ClassName.java](file:///absolute/path/to/project/src/.../ClassName.java#L120-L135)` -> `methodName()`
- **Veritabanı Tablosu:** `[[data-models/DB_table_name]]` -> `column_name`
- **İlgili Servis:** `[[services/SVC_service_name]]`

## 3. Kanallara Göre Durum (Sales Channels)
- **Web (Desktop/Mobile):** `[[sales-channels/CHN_web]]` -> [Kural geçerli mi, farklılaşan durum var mı?]
- **Mobile App (iOS/Android):** `[[sales-channels/CHN_mobile]]` -> [Örn: Mobile sürüm v2.4 öncesi desteklemiyor]

## 4. Değişiklik Geçmişi (Change Log)
- **YYYY-MM-DD (PR #1234):** Bu kuralı etkileyen geliştirme yapıldı.
```

### B. Servis Şablonu (`/services/SVC_service_name.md`)

```markdown
---
id: SVC_service_name
title: "Servis Adı"
status: "active"
---

# SVC_service_name: Servis Adı

## 1. Servisin Amacı
[Servisin sistemdeki ana görevini yazın.]

## 2. API / Event Kontratları
- **Endpoint:** `POST /api/v1/payment/charge`
  - **Payload:** `[[data-models/DB_table_name]]`
- **Fırlatılan Event'ler:** `PaymentCompletedEvent` -> Dinleyen: `[[services/SVC_notification_service]]`

## 3. Bağımlı Olduğu İş Kuralları (Dependencies)
- `[[business-rules/BR_042_installment_limits]]`
- `[[business-rules/BR_089_card_validation]]`
```

---

## 3. Çift Yönlü Linkleme ve Bağlantı Kuralları (Linking Rules)

Obsidian **Graph View (Ağ Görünümü)** özelliğinin doğru çalışması ve bağımlılık haritasının otomatik çıkması için şu kurallara uyulmalıdır:

1.  **Tablo Bağlantıları:** Her iş kuralında veya serviste geçen veritabanı tabloları mutlaka `[[data-models/DB_table_name]]` formatında linklenmelidir.
2.  **Etki Alanı Haritası:** Bir serviste yapılan değişikliğin hangi kanalları etkilediğini görmek için servis dosyalarında ilgili satış kanalı dosyaları (`[[sales-channels/CHN_channel_name]]`) linklenmelidir.
3.  **Kural Çelişkileri:** Eğer bir kural başka bir kuralı eziyorsa veya çelişiyorsa kuralın içine şu alert eklenmelidir:
    > [!WARNING]
    > Bu kural `[[business-rules/BR_089_some_rule]]` ile çelişmektedir. Öncelik sırası: BR_XXX > BR_089.

---

## 4. Sayfa Yaşam Döngüsü (Page Lifecycle)

Kod geliştikçe Wiki'nin eskimesini engellemek için her sayfa şu döngüye tabidir:

1.  **Draft:** Yapay zeka veya analist tarafından yeni yazılan, henüz koddan doğrulanmamış kurallar.
2.  **Active:** Kod analizi yapılarak (dosya yolu ve satır numarası verilerek) doğrulanmış kurallar.
3.  **Stale:** Kodda o bölümün değiştiği tespit edilmiş ancak analiz dokümanı henüz güncellenmemiş sayfalar.
4.  **Contradicted:** Kod tabanında iki farklı yerde birbiriyle çelişen validasyonlar bulunduğunda sayfa bu duruma çekilir ve analistin incelemesi istenir.

---

## 5. İletişim Protokolü (Operation Loops)

*   **Ingest:** Kod tabanına yeni bir geliştirme yapıldığında, analist değişen dosyaları yapay zekaya verir. Yapay zeka sadece o dosyaları okur, etkilenen `BR` ve `SVC` sayfalarını bulup günceller.
*   **Query:** Analist yeni analiz yazarken yapay zekaya *"Hafızandaki `.wiki` indeksine göre bu geliştirmeden etkilenecek dosyaları çıkar"* talimatını verir. Yapay zeka sadece Wiki linklerini takip ederek analiz hazırlar.

