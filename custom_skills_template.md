# Antigravity 2.0: Standart Skill Dosyaları ve Şablon Rehberi

**Skill Files (Skill Dosyaları)**, AI asistanınıza belirli bir görevi (örneğin test yazma, hata ayıklama veya tasarım yapma) en doğru ve en az token tüketecek şekilde nasıl yapacağını öğreten rehber dökümanlardır.

---

## 1. Skill Dosyası Nedir ve Neden Kullanılır?

Her seferinde AI'a *"Kodları yazarken şu kurallara dikkat et, dosyaları şuraya kaydet"* demek yerine, bu kuralları bir kez **SKILL.md** dosyasına yazarsınız. AI bu dosyayı tek seferde okuyarak tüm talimatları anlar.

### Neleri Standartlaştırabiliriz?
1. **Kodlama Standartları:** Kodların hangi formatta yazılacağı (örneğin modern HTML/CSS kuralları).
2. **Proje Klasör Yapısı:** Dosyaların nereye kaydedileceği (Target Directory kuralları).
3. **Tekrarlayan Görevler:** Sıkça yaptığınız test etme, hata düzeltme adımları.

---

## 2. Standart Skill Şablonu (SKILL.md)

Projelerinizde kullanabileceğiniz örnek bir **SKILL.md** yapısı:

```markdown
---
name: project-developer-skill
description: Proje geliştirme ve dosya yönetim standartları
---

# Proje Geliştirme Yönergeleri

Bu skill aktif edildiğinde AI aşağıdaki kurallara kesin olarak uymalıdır.

## 1. Dosya Oluşturma Kuralları
- Tüm yeni kod dosyaları `/scratch` veya belirtilen ana dizin altında oluşturulmalıdır.
- Gereksiz geçici dosyalar (tmp) oluşturulmamalıdır.

## 2. Tasarım ve Arayüz Kuralları
- HTML dosyalarında modern ve temiz yapılar kullanılmalıdır.
- CSS yazılırken karmaşık kütüphaneler yerine sade ve şık Vanilla CSS tercih edilmelidir.
- Renk paletleri modern koyu mod (Dark Mode) uyumlu olmalıdır.

## 3. Çalıştırma Kuralları
- Yazılan kodların çalışabilirliği test edilmeden kullanıcıya "bitti" denilmemelidir.
```

---

## 3. Skill Dosyalarını Nasıl Kullanırsınız?

1. Projenizin ana dizininde `.antigravity/skills/proje-gelistirme/` adında bir klasör oluşturun.
2. Bu klasörün içine yukarıdaki şablona göre bir `SKILL.md` dosyası kaydedin.
3. Konuşma sırasında AI'a *"Geliştirme yaparken bu skill dosyasındaki kuralları uygula"* demeniz yeterlidir.
