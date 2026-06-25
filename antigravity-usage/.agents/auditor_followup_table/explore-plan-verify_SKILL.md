---
name: explore-plan-verify
description: >
  Herhangi bir kodlama görevine başlamadan HEMEN ÖNCE kullan: özellik geliştirme, hata düzeltme,
  refactoring veya mevcut bir dosyayı düzenleme. Kod tabanına ilk kez dokunulacağı her an devreye girer.
---

Bu skill, kıdemli bir yazılım mühendisinin iş disiplinini temsil eder. Kod tabanına doğrudan dokunmadan önce durum tespiti yapmayı, işi küçük ve doğrulanabilir adımlara bölmeyi ve kanıta dayalı doğrulamayı zorunlu kılar.

## 1. KEŞFET (Explore Phase)
Kod yazmadan önce "zemin etüdü" yap. Asla varsayımlarla dosyaları editleme.
* **Gereksinimi Anla**: Koda dalmadan önce ne istendiğini VE neden istendiğini netleştir. Gereksinim belirsizse ve bu çözümün yönünü değiştiriyorsa tek net soru sor; değiştirmiyorsa makul varsayımla ilerle ve varsayımı belirt.
* **Çağrı Yollarını Bul (Callers/Callees)**: Değiştireceğin fonksiyonu ve dosyayı kimlerin çağırdığını, bu fonksiyonun nerelere veri gönderdiğini `grep_search` ile tarayarak veri akış şemasını çıkar.
* **Mevcut Desenleri Kopyala**: Projenin loglama, hata yönetimi (exception handling), yapılandırma (config) ve test yazım desenlerini incele. Kendi stilini icat etme; mevcut stili birebir kopyala.
* **Kapsam Sınırlandırma**: İstenen işi yapacak en küçük dosya kümesini (minimal changeset) belirle. Gereksiz refactoring veya scope expansion yapma.
* **Geniş Araştırmada Delegasyon**: Çok sayıda dosya/modül taranacaksa ana bağlamı (context) korumak için keşfi paralel subagent'lara dağıt (`invoke_subagent`). Ana akışa sadece özet bulguları al, ham çıktıyı değil.

## 2. PLANLA (Plan Phase - Artırımlı & Modüler)
Büyük ve karmaşık işleri tek seferde yapmak LLM'lerin en sık hata yaptığı konudur. Planlama bu hatayı önler. Çok-adımlı/uzun otonom koşularda planın canlı tutulması ve bağlam yönetimi için `task-orchestration` skill'ini kullan.
* **Planlama Eşiği**: Detaylı bir `implementation_plan.md` hazırlamak sadece $>3$ dosya içeren büyük değişikliklerde veya kritik mimari/veri tabanı değişikliklerinde zorunludur. 1-2 dosyalık basit işlerde doğrudan `ACT` aşamasına geçilebilir.
* **İnkremental Geliştirme (Küçük Adımlar)**: İşi minimum 3-4 küçük, izole ve doğrulanabilir adıma (milestones) böl. 
* **Her Adım Bağımsız Doğrulanmalı**: Her bir adım bittiğinde sistem derlenebilmeli veya testleri çalışabilmelidir.
* **Read-Only Kapı (Plan Modu)**: Büyük/riskli işlerde plan onaylanana kadar HİÇBİR dosyayı değiştirme — sadece araştır ve planı sun. Onay sonrası `ACT`'e geç (bkz. AGENTS.md → Plan Modu).
* **Mimarî Tasarım**: Plan esnasında `clean-code-simplifier` kurallarını (SRP, nesting, dependency limits) ve katman sınırlarını belirle.

## 3. UYGULA (Act Phase)
* **Adım Adım İlerleme (Incremental Coding)**: Planladığın adımları sırayla uygula. Bir adım tamamlanıp derleme/test doğrulaması geçilmeden asla bir sonraki adıma geçme.
* **Çevre Koduyla Uyum**: Yeni kodun girintileri, yorum yoğunluğu, isimlendirme kuralları (naming conventions) ve dil tercihleri çevre kodla mükemmel uyum sağlamalıdır.
* **Bağlam Yönetimi (Token Control)**: Terminal çıktılarını veya büyük test loglarını chat bağlamına doğrudan basma. Sadece hata/başarı özetlerini paylaşarak token bütçesini koru.

## 4. DOĞRULA (Verify Phase)
* **Kanıta Dayalı Raporlama**: "Çalışması gerekir" veya "derlenmeli" bir kanıt değildir. Gerçek derleme, test ve linter çıktılarını sun.
* **Davranışı Gerçekten Gözle**: Sadece test/build değil; uygun olduğunda uygulamayı/endpoint'i/scripti gerçekten çalıştır ve çıktıyı/davranışı gözlemle. Kodu tekrar okuyarak "çalışıyor" deme.
* **Güvenli Çalıştırma**: Test/SQL/build/script gibi asılabilecek komutları daima `timeout` ile, watch modu kapalı ve çıktıyı sınırlayarak çalıştır — bitmeyen komut ve tekrar döngüsü riskine karşı `safe-execution` skill'ini uygula.
* **Hata Döngüsü Engelleyici (Circuit Breaker)**: Bir test hatasını veya derleme problemini çözmeye çalışırken **2 denemeden** sonra hala başarısız oluyorsan dur. Sonsuz otonom döngüye girip token bütçesini tüketme, durumu raporla ve kullanıcının yönlendirmesini iste.
* **Playwright UI Doğrulama**: Sadece majör görsel değişikliklerde Playwright CLI ile ekran görüntüsü al; ufak CSS/hizalama işlerinde token tasarrufu için atla (bkz. `frontend-dev`).
* **Kendi Kendini İnceleme (Self-Review)**: Değişiklikleri bitirmeden önce diff'ini `code-self-review` kurallarına göre denetle.

## DEMİR KURAL (Iron Law)
```
KEŞİF YAPMADAN DOSYA DÜZENLEME. KANIT GÖSTERMEDEN "TAMAMLANDI" DEME.
```
Kuralın lafzını çiğnemek, ruhunu çiğnemektir. "Bu sefer atlasam olur" diye düşünüyorsan — bu bir bahanedir, dur.

## BAHANE TABLOSU (Rationalization → Gerçek)
| Bahane | Gerçek |
|---|---|
| "Bu kadar basit, keşfe gerek yok" | En pahalı hatalar 'basit' sanılan işlerde, denetlenmemiş varsayımlardan çıkar. 2 dakikalık keşif saatlerce hata ayıklamadan ucuzdur. |
| "Kod muhtemelen şöyle çalışıyordur" | Varsayım kanıt değildir. Çağıranları/çağrılanları `grep` ile gör, sonra dokun. |
| "Plan yapmaya gerek yok, kafamda var" | Kafadaki plan >3 dosyada dağılır. Yaz, görünür kıl (`task-orchestration`). |
| "Derlenmeli / çalışması gerekir" | "Gerekir" bir gözlem değil dilektir. Gerçek test/build/çalıştırma çıktısı sun. |
| "Kodu tekrar okudum, doğru görünüyor" | Okumak çalıştırmak değildir. Davranışı gerçekten gözle. |
| "Test başarısız ama küçük bir şeydir, devam edeyim" | Yeşil olmadan ilerleme yok. Adım bağımsız doğrulanmadan sonrakine geçme. |

## RED FLAGS — DUR ve Keşfe/Doğrulamaya Dön
- Keşif yapmadan ilk edit'i atıyorsun
- ">3 dosya" işinde plan/onay olmadan yazıyorsun
- Kanıt yerine "çalışıyor olmalı" diyorsun
- Aynı hatada 2. denemeyi geçtin (circuit breaker) ama hâlâ zorluyorsun
- "Bu durum farklı çünkü..." diye istisna uyduruyorsun

Bunların hepsi şu demek: dur, eksik adıma geri dön.
