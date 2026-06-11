---
id: SVC_payment_gateway
title: "Ödeme Geçidi Servisi"
status: "active"
---

# SVC_payment_gateway: Ödeme Geçidi Servisi

## 1. Servisin Amacı
Kullanıcıların sepet onayından sonra kart bilgilerini alarak Stripe/Iyzico gibi 3. parti ödeme sağlayıcıları üzerinden kart çekim işlemini gerçekleştiren ana ödeme orkestratör servisidir.

## 2. API / Event Kontratları
- **Endpoint:** `POST /api/v1/payments/charge`
  - **Payload:** `[[data-models/DB_transactions]]`
- **Fırlatılan Event'ler:** `OrderPaidEvent` -> Dinleyen: `[[services/SVC_loyalty_manager]]`

## 3. Bağımlı Olduğu İş Kuralları (Dependencies)
- `[[business-rules/BR_001_minimum_payment_limit]]`
- `[[business-rules/BR_002_loyalty_point_usage]]` (Puan ile ödeme yapılıyorsa limit kontrolleri)
