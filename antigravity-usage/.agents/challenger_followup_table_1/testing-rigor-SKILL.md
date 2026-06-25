---
name: testing-rigor
description: >
  Test yazarken, test kapsamını artırırken, bir değişikliği testle doğrularken; ya da mevcut testler
  zayıf/yüzeysel/flaky olduğunda veya "buna test lazım mı" diye düşünüldüğünde kullan.
---

Testlerin amacı göstermelik bir test kapsama (coverage) oranı yakalamak değildir. Testler, kodun gelecekteki değişikliklere karşı kırılmamasını garanti altına almak ve gerçek hataları yakalamak için yazılır. Kırılmayan testler değersizdir.

## 1. TEST PRENSİPLERİ
* **Uygulamayı Değil Davranışı Test Et (Behavioral Testing)**: Dahili kod bloklarının çağrılarını (mocks/spies) test etmek yerine, girdi karşılığında alınan çıktıyı ve veri tabanı gibi kalıcı etkileri doğrula. Bu sayede kod refactor edildiğinde testler false-positive vermez.
* **Arrange-Act-Assert (AAA)**: Test kodunu üç belirgin bloğa ayır:
  - *Arrange*: Test verisini ve bağımlılıkları hazırla.
  - *Act*: Test edilecek metodu veya API'yi çağır.
  - *Assert*: Beklenen sonuçları doğrula.
* **Determinizm (Flakiness Önleme)**: Testlerin ağ kesintilerinden, veritabanı sıralamalarından veya sistem saatinden etkilenmesini önle. Zamanı dondur (freeze time), random fonksiyonlarının seed'lerini sabitle ve dış IO sınırlarını mock'la.

## 2. UÇ DURUM KONTROL LİSTESİ (Edge-Case Checklist)
Yazılan her fonksiyon için şu durumların test edildiğinden emin ol:

* [ ] **Boş ve Hatalı Girdiler**: `null`, `undefined`, boş string `""`, boş dizi `[]` veya eksik parametreler.
* [ ] **Sınır Değerleri (Boundary Values)**: `0`, `-1`, maksimum limit değerleri, off-by-one sınırları.
* [ ] **Tip Hataları**: Beklenmeyen veri tipleri veya malformed (bozuk) JSON yapıları.
* [ ] **Dış Bağımlılık Hataları**: Harici API'lerin yanıt vermemesi (timeout), `500 Internal Server Error` dönmesi veya bağlantı kesintileri.
* [ ] **Hata Fırlatma Mantığı**: Fonksiyonun hata durumlarında beklenen tipte exception fırlatıp fırlatmadığı (assert on exception types).

## 3. ADIMLAR
1. Projenin mevcut test kütüphanesine (örn: Spring Boot için JUnit/Mockito, Frontend için Vitest/Jest) ve isimlendirme kurallarına uy.
2. Yazılacak test senaryolarını kodlama öncesinde listele.
3. Testleri yazdıktan sonra **gerçekten çalıştır ve test çıktılarını kanıt olarak göster.** Çalıştırırken watch modunu kapat, `timeout` + fail-fast kullan ve çıktıyı sınırla — asılan test koşusu ve token israfı için `safe-execution` skill'ini uygula.

## 4. TEST SEVİYESİ STRATEJİSİ (Test Pyramid)
* **Doğru seviyede test et**: Çoğunluk hızlı **unit** test (saf mantık, edge-case'ler), daha az **integration** test (modül/DB/servis sınırları), çok az **e2e** test (kritik kullanıcı akışları). Her şeyi e2e ile test etme — yavaş ve kırılgan olur.
* **Kontratı test et**: Bir modülün dış davranışını (girdi→çıktı, yan etki) test et, iç implementasyonunu değil. Böylece refactor testleri boşuna kırmaz.
* **Neyi test ETME**: Framework/dil/kütüphane kodunu, trivial getter/setter'ları veya sabitleri test etme. Değer katmayan test sadece bakım yüküdür.
* **Her test kırılabilmeli**: Test ettiği üretim satırını sildiğinde test KIRILMALI. Kırılmıyorsa test sahtedir, değersizdir.

## 5. DEMİR KURAL (Iron Law)
```
TEST YAZILDI DEMEK, TESTİ ÇALIŞTIRIP GEÇTİĞİNİ GÖRMEK DEMEKTİR.
```
Yazıp çalıştırmadığın test, test değildir. Kuralın lafzını çiğnemek ruhunu çiğnemektir.

## 6. BAHANE TABLOSU (Rationalization → Gerçek)
| Bahane | Gerçek |
|---|---|
| "Çok basit, test etmeye değmez" | Basit kod da kırılır; test 30 saniye sürer, regresyonu kalıcı önler. |
| "Sonra test yazarım" | Sonra yazılan test, koda göre şekillenir; ne unuttuğunu yakalamaz. |
| "Elle denedim, çalışıyor" | Elle deneme sistematik değildir: kaydı yok, tekrar çalıştırılamaz, baskı altında unutulur. |
| "Coverage yüksek, yeterli" | Coverage sahte güvendir. Üretim satırını silince kırılmayan test değersizdir. |
| "Mock'larla hızlıca geçerim" | Mock'u test etmek kodu test etmek değildir; refactor'da false-positive üretir. |
| "Bu framework/getter zaten çalışıyor" | Doğru — onu test etme. Ama kendi davranışın/edge-case'in her zaman test edilir. |

## 7. RED FLAGS — DUR
- Test yazdın ama çalıştırıp geçtiğini görmedin
- "Sonra eklerim" diyorsun
- Test, kodun iç implementasyonunu (mock çağrısı) doğruluyor, davranışı değil
- Edge-case listesi yapmadan "bitti" diyorsun
- Üretim satırını silsen testin yine de geçeceğini biliyorsun
