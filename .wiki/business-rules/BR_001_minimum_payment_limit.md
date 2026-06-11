---
id: BR_001
title: "Minimum Ödeme Limiti Kontrolü"
status: "active"
created_at: 2026-06-09
updated_at: 2026-06-09
verified_by: "Antigravity"
---

# BR_001: Minimum Ödeme Limiti Kontrolü

## 1. İş Açıklaması (Business Description)
Kredi kartı ve debit kart ile yapılan ödemelerde, işlem başına minimum ödeme tutarı **10.00 TL / USD / EUR** olmalıdır. Bu limitin altındaki işlemler API seviyesinde reddedilir ve kullanıcıya hata mesajı gösterilir.

## 2. Kanıtlar ve Kod Referansları (Code Traceability)
- **Kod Sınıfı/Metodu:** `[PaymentController.java](file:///Users/armaganercan/.gemini/antigravity/scratch/backend/src/controllers/PaymentController.java#L45-L52)` -> `validatePaymentAmount()`
- **Veritabanı Tablosu:** `[[data-models/DB_transactions]]` -> `amount`
- **İlgili Servis:** `[[services/SVC_payment_gateway]]`

## 3. Kanallara Göre Durum (Sales Channels)
- **Web Portal:** `[[sales-channels/CHN_web_portal]]` -> Limit 10.00 TL olarak tam uygulanıyor.
- **Mobile App:** `[[sales-channels/CHN_mobile_app]]` -> Mobil uygulama üzerinde de giriş anında validasyon bulunmaktadır.

## 4. Değişiklik Geçmişi (Change Log)
- **2026-06-09:** Kural ilk kez belgelendi.
