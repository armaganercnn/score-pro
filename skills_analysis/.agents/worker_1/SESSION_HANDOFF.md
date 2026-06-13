# Session Handoff

## Purpose / Amaç
Bu skill, geliştirme oturumu (session) sonunda yapılan çalışmaların bir sonraki mühendis veya ajana (agent) kesintisiz bir şekilde aktarılmasını (handoff) sağlar. Aktarılan bilgiler sayesinde alıcı taraf, ek soru sormaya gerek duymadan doğrudan çalışmaya devam edebilir.

## Prompt Template / Prompt Şablonu
Aşağıdaki prompt şablonu, bir session sonunda detaylı ve yapılandırılmış bir handoff raporu üretmek için kullanılır:

```markdown
# Session Handoff Prompt

Lütfen bu geliştirme oturumunun sonunda aşağıdaki 5 bileşenden oluşan bir `handoff.md` raporu oluştur:

1. **Observation (Gözlem)**: Doğrudan gözlemlediğin somut verileri belirt (değişen dosya yolları, satır numaraları, birebir hata mesajları, çalıştırılan komutlar ve sonuçları).
2. **Logic Chain (Mantık Zinciri)**: Gözlemlerden ulaştığın çıkarımlara giden adım adım mantık yürütmeni açıkla. Her adım bir gözleme dayanmalıdır.
3. **Caveats (Kısıtlar/Uygarılar)**: İncelemediğin alanları, yaptığın varsayımları ve değerlendirdiğin alternatif çözümleri belirt. Kısıt yoksa "No caveats" yaz.
4. **Conclusion (Sonuç)**: Mantık zinciri tarafından desteklenen nihai durum ve yapılan değişikliklerin özeti.
5. **Verification Method (Doğrulama Yöntemi)**: Yapılan değişikliklerin nasıl test edileceğini açıklayan net adımlar ve komutlar (örn: `pytest`, `cargo test`, veya manuel test adımları).
```

## Helper Script / Yardımcı Script (`handoff_generator.py`)
Bu script, geliştirme dizinindeki git durumunu (`git status`, `git diff`, son commit'ler) otomatik olarak analiz eder ve yukarıdaki 5 bileşenli handoff şablonunu doldurarak bir taslak (`handoff_draft.md`) oluşturur.

### Özellikler (Features)
- Git entegrasyonu: Değiştirilen dosyaları, untracked dosyaları ve git logunu otomatik okur.
- Otomatik şablon dolumu: Değişiklikleri "Observation" ve "Conclusion" alanlarına yerleştirir.
- Git olmayan dizinlerde fallback: Klasör taraması ile mevcut dosyaları listeler.

### Kullanım (Usage)
```bash
python3 handoff_generator.py --dir <proje_dizini> --output <cikti_dosya_adi.md>
```
