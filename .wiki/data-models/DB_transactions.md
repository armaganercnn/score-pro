---
id: DB_transactions
title: "Ödeme İşlemleri Tablosu"
status: "active"
---

# DB_transactions: Ödeme İşlemleri Tablosu

## 1. Tablo Tanımı
Veritabanında ödeme işlemlerinin durumunu, miktarını ve kanal bilgisini tutan `transactions` tablosunun şemasıdır.

## 2. Kritik Kolonlar
- `id` (UUID, Primary Key)
- `amount` (Decimal, İşlem Tutarı) -> `[[business-rules/BR_001_minimum_payment_limit]]`
- `channel` (Varchar, İşlemin geldiği kanal) -> `[[sales-channels/CHN_mobile_app]]` veya `[[sales-channels/CHN_web_portal]]`
- `status` (Varchar, İşlem Durumu: SUCCESS, FAILED, PENDING)

## 3. İlişkili Servisler
- Bu tabloya doğrudan kayıt atan servis: `[[services/SVC_payment_gateway]]`
