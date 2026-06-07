# Antigravity 2.0 & Google AI Ultra: Token Optimizasyonu ve Chat Yönetimi Rehberi

Yazılım geliştirme sürecinde AI asistanları kullanırken en büyük maliyet kalemi **Token** tüketimidir. Bu rehberde, teknik detaylarda boğulmadan, maliyetlerinizi nasıl minimumda tutacağınızı ve en yüksek verimi nasıl alacağınızı öğreneceksiniz.

---

## 1. Token Nedir ve Maliyet Nasıl Oluşur?

AI modelleri kelimeleri doğrudan okumaz; onları **Token** adı verilen küçük parçalara (heceler, karakter grupları) ayırır.
- Yazdığınız her talimat (Input),
- Projenizden okunan her kod dosyası (Context),
- AI'ın size verdiği her yanıt (Output),
birer token maliyetidir.

> [!IMPORTANT]
> AI modelleri her yeni mesajınızda, geçmişteki tüm konuşmayı (Chat History) baştan sona tekrar okur. Konuşma uzadıkça, her yeni soru sorduğunuzda ödediğiniz token miktarı katlanarak artar.

---

## 2. Token Maliyetlerini Düşürme Yöntemleri

### A. Chat Segmentation (Sohbeti Bölme) Stratejisi
* **Soru:** *"Bir projeye ayrı ayrı chat açarak görev vermek daha düşük maliyet mi?"*
* **Cevap:** **Evet, kesinlikle çok daha düşük maliyetlidir!**

Tek bir uzun chat oturumunda 5 farklı özellik geliştirmek yerine, her bir özellik veya hata çözümü için **yeni bir chat** açmalısınız.

| Yöntem | Context Window Durumu | Maliyet Etkisi |
| :--- | :--- | :--- |
| **Tek bir chat üzerinden devam etmek** | Sürekli biriken eski kodlar ve konuşmalar nedeniyle şişer. | 🔴 Çok Yüksek (Her mesajda eski kodları tekrar ödersiniz) |
| **Her görev için yeni chat açmak** | Sadece ilgili göreve ait kodlar okunur, temiz başlangıç yapılır. | 🟢 Çok Düşük (Sadece ihtiyacınız olan kadar ödersiniz) |

### B. "Gereksiz Dosya Okuma" Engelleyici
AI asistanına *"Tüm projeyi incele"* demek yerine, sadece üzerinde çalışacağı spesifik dosyaları belirtin. Antigravity 2.0'ın `view_file` gibi araçları sadece hedef dosyaları okuduğu için token tasarrufu sağlar.

### C. Kısa ve Net Prompt Yazımı (Prompt Engineering)
AI'a uzun hikayeler anlatmak yerine ne istediğinizi net, maddeler halinde yazın.
* **Kötü Örnek:** *"Şimdi bana bir web sitesi yap ama işte tasarımı güzel olsun, içine birkaç tane buton koyalım, butonlara basınca renk değişsin, geçen gün yaptığımız gibi olsun..."*
* **İyi Örnek:** *"Renk değiştiren 3 adet buton içeren basit bir HTML/CSS arayüzü oluştur."*

---

## 3. Subagent Kullanımı ile İş Bölümü

Antigravity 2.0 içerisinde `research` veya `self` gibi yardımcı ajanlar (**Subagents**) tanımlayabilirsiniz.
- Büyük bir araştırma görevi olduğunda bunu arka planda çalışacak bir `research` subagent'ına devredin.
- Ana chat ekranınız gereksiz kod analizleri ile dolup şişmez, böylece ana sohbetinizin token tüketimi düşük kalır.
