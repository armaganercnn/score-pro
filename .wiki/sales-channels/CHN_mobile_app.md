---
id: CHN_mobile_app
title: "Mobil Uygulama Kanalı"
status: "active"
---

# CHN_mobile_app: Mobil Uygulama Kanalı

## 1. Kanal Tanımı
Müşterilerin iOS ve Android cihazlar üzerinden sipariş vermesini sağlayan yerel mobil uygulama satış kanalıdır.

## 2. API ve Servis Bağımlılıkları
- Ödeme ve checkout işlemlerini `[[services/SVC_payment_gateway]]` üzerinden gerçekleştirir.
- Puan görüntüleme işlemleri için `[[services/SVC_loyalty_manager]]` servisini çağırır.

## 3. Kanala Özel Sınırlamalar / Kurallar
- Mobil kanalda minimum ödeme kontrolü `[[business-rules/BR_001_minimum_payment_limit]]` yerel arayüzde (UI) de denetlenir, böylece sunucuya gitmeden kullanıcı engellenir.
