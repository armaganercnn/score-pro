# E2E Test Stratejisi ve Altyapı Tasarım Raporu

## 1. Çevresel Değişken Geçersiz Kılmaları (Environment Overrides)

Testlerin kullanıcının canlı veritabanı ve log dosyalarıyla çakışmasını önlemek için `ANTIGRAVITY_BRAIN_DIR` ve `ANTIGRAVITY_DB_PATH` çevresel değişkenleri kullanılacaktır.

### cli.py Önerisi
Mevcut kod satırı (Satır 11):
```python
DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")
```
Önerilen kod değişikliği:
```python
import os
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

### scanner.py Önerisi
Mevcut kod satırları (Satır 12-13):
```python
BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")
DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")
```
Önerilen kod değişikliği:
```python
import os
BRAIN_DIR = Path(os.environ.get("ANTIGRAVITY_BRAIN_DIR", "/Users/armaganercan/.gemini/antigravity/brain"))
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

### dashboard.py Önerisi
Mevcut kod satırı (Satır 13):
```python
DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")
```
Önerilen kod değişikliği:
```python
import os
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

---

## 2. Test Koşum Mimarisi (Test Harness Architecture)

Tamamen kara kutu (opaque-box) çalışan, kod içi modül bağımlılığı olmayan ve sadece subprocess ile çalıştırılan test mimarisi.

### Dizin Yapısı
`tests/` dizini proje kök dizininde yer alacaktır:
```
tests/
├── run_tests.py                 # Test koşucu (test runner) betiği
├── test_cli.py                  # CLI komut testleri
├── test_dashboard.py            # API ve Dashboard sunucu testleri
├── fixtures/                    # İzole mock transcript dosyaları
│   ├── basic_session/           # Temel oturum logları
│   │   └── .system_generated/logs/transcript.jsonl
│   ├── model_override/          # Ondalık sayı içeren model değişim logları
│   │   └── .system_generated/logs/transcript.jsonl
│   ├── cache_heavy/             # Önbellek token mantığı logları
│   │   └── .system_generated/logs/transcript.jsonl
│   └── malformed/               # Hatalı/bozuk transcript logları
│       └── .system_generated/logs/transcript.jsonl
└── tmp/                         # Dinamik üretilen test çıktıları (gitignored)
    ├── test_usage.db
    └── test_brain/
```

### Test Runner Tasarımı (`run_tests.py`)
1. **Hazırlık (Setup)**:
   - `tests/tmp/` dizinini oluştur.
   - Varsa eski `tests/tmp/test_usage.db` dosyasını sil.
   - `os.environ["ANTIGRAVITY_BRAIN_DIR"]` değerini mock fixture dizinine yönlendir.
   - `os.environ["ANTIGRAVITY_DB_PATH"]` değerini `tests/tmp/test_usage.db` olarak ayarla.
2. **Koşum (Execution)**:
   - CLI testlerini (`test_cli.py`) ve API testlerini (`test_dashboard.py`) çalıştır.
   - Dashboard API testleri için `dashboard.py` sunucusunu boş bir portta (örn. 8081) arka planda (`subprocess.Popen`) başlat.
   - HTTP istekleriyle API doğrulaması yap, ardından sunucuyu sonlandır (`terminate`).
3. **Temizlik (Teardown)**:
   - Test bitiminde `tests/tmp/` geçici dosyalarını temizle.

---

## 3. Özellik Envanteri ve 4-Aşamalı Test Eşleştirmesi (Feature Inventory & 4-Tier Mapping)

### Özellik Envanteri (Feature Inventory)
1. **FEAT_SCAN_DIR**: Log dizini tarama ve oturum klasörlerini algılama.
2. **FEAT_PARSE_TRANSCRIPT**: `transcript.jsonl` dosyasını satır satır okuma ve JSON ayrıştırma.
3. **FEAT_MODEL_DETECT**: `<USER_SETTINGS_CHANGE>` içerisinden model adı tespiti (Ondalık sayı/nokta karakteri içeren modeller dahil).
4. **FEAT_PROJECT_DETECT**: Araç çağrılarının (`Cwd`, `SearchPath` vb.) argümanlarından proje klasörü tespiti.
5. **FEAT_TOKEN_ESTIMATION**: Girdi ve çıktı metinlerinden karakter sayısına göre token tahmini.
6. **FEAT_CACHE_CALCULATION**: İlk dönüşte cache yazma, sonraki dönüşlerde cache okuma token hesabı.
7. **FEAT_DB_STORAGE**: Oturum ve turn bilgilerini SQLite veritabanına kaydetme/güncelleme.
8. **FEAT_DELTA_SCAN**: Değiştirilmemiş dosyaları `mtime` ve satır sayısı kontrolüyle atlama.
9. **FEAT_CLI_TODAY**: Günlük kullanım özeti çıktısı (tokenlar, model bazlı maliyet, aktif oturum).
10. **FEAT_CLI_WEEK**: Son 7 günlük tarih ve model bazlı kullanım, günlük subtotal çıktısı.
11. **FEAT_CLI_STATS**: Tüm zamanların kullanım özeti.
12. **FEAT_COST_CALC**: Model bazlı maliyet hesabı (Önbellek okuma/yazma oranları dahil).
13. **FEAT_DASHBOARD_API**: `/api/data` JSON çıktısı ve `/api/scan` tetikleme API'si.
14. **FEAT_DASHBOARD_UI**: HTML ve filtreleme arayüzü sunumu.

---

### 4-Aşamalı Test Planı Eşleştirmesi

#### Tier 1: Özellik Kapsamı (Category-Partition)
Her özellik için en az 5 temel senaryo:
* **Log Scanner & DB Storage**:
  1. Standart tek oturumlu log tarama, DB tablolarının (`sessions`, `turns`, `processed_files`) dolması.
  2. Birden fazla turn içeren oturum logu ayrıştırma.
  3. Git branch bilgisinin ("main" varsayılan) veritabanına doğru yazılması.
  4. Session başlığının `first_user_input_content` üzerinden çıkarılması.
  5. Scan başarılı bitiş mesajı ve exit code 0 kontrolü.
* **CLI Raporlama (`today`, `week`, `stats`)**:
  1. `cli.py today` çıktısının doğru sütun formatında yazdırılması.
  2. `cli.py week` çıktısının son 7 günü gruplaması ve alt toplamları basması.
  3. `cli.py stats` tüm zamanlar özeti ve benzersiz oturum sayısının doğruluğu.
  4. Token miktarlarının formatlanması (999 -> "999", 1000 -> "1.0K", 1000000 -> "1.00M").
  5. Maliyet değerlerinin formatlanması (Örn: < $1 ise 4 desimal `$0.0750`, >= $1 ise 2 desimal `$1.25`).
* **API Dashboard**:
  1. HTTP 200 ile `/` veya `/index.html` sayfa içeriği teslimi.
  2. `/api/data` JSON yapısında `all_models`, `daily`, `projects`, `sessions` alanlarının varlığı.
  3. `/api/scan` çağrısının scanner'ı tetiklemesi ve `{"success": true}` dönmesi.
  4. API yanıtında oturum sürelerinin (duration) dakika cinsinden hesabı.
  5. Dashboard verilerinin model bazlı doğru filtrelenmeye uygun JSON biçimi.

#### Tier 2: Sınır & Uç Durumlar (Boundary Value Analysis)
Her özellik için en az 5 uç durum senaryosu:
* **Log Ayrıştırma Edge Caseleri**:
  1. Boş veya sadece boş satırlardan oluşan `transcript.jsonl`.
  2. Satır aralarında bozuk/hatalı JSON içeren log dosyası (parser çökmemeli, satırı atlamalı).
  3. Ondalık noktalı model isimleri (`Gemini 3.5 Flash (High)`) regex tespiti (bug tespiti: `Gemini 3` olarak kesilmemeli).
  4. Turn verilerinde `input_tokens` veya `output_tokens` değerlerinin 0 olması durumu.
  5. `processed_files` tablosunda `mtime` eşit olmasına rağmen satır sayısının değişmesi durumunda delta scan'in dosyayı yeniden okuması.
* **CLI & DB Hata Yönetimi**:
  1. Veritabanı dosyası (`usage.db`) mevcut değilken `cli.py today` çalıştırılması (Hata basmalı ve exit code 1 olmalı).
  2. Veritabanında hiçbir kayıt yokken `cli.py today/week/stats` çalıştırılması ("No usage recorded today." / "No usage history found." fallback mesajları).
  3. Gelecekteki veya çok eski tarihli turn timestamps içeren veritabanında `today` ve `week` filtrelerinin boş dönmesi.
  4. Token maliyet hesabı fonksiyonunda tanımlanmamış model gelmesi durumunda fallback model (`Gemini 3.5 Flash (Medium)`) tarifesinin uygulanması.
  5. Çok uzun kullanıcı sorgularından session title üretilirken 60 karakter sınırında kesilip `...` eklenmesi.

#### Tier 3: Çapraz Özellik Kombinasyonları (Pairwise Combinatorial)
Faktörler arası etkileşim testleri:
1. **DB Durumu x Çevresel Ortam x Komut**:
   - DB Yok / İzole Test Ortamı / `cli.py scan` -> DB başarıyla oluşturulmalı.
   - DB Boş / İzole Test Ortamı / `cli.py today` -> "No usage" mesajı dönmeli.
   - DB Dolu / İzole Test Ortamı / `cli.py today` -> Gerçek veriler basılmalı.
   - DB Dolu / Canlı Ortam (ANTIGRAVITY_DB_PATH ayarsız) / `cli.py scan` -> Kullanıcı verisine dokunulmamalı (test veritabanı yalıtımı).
2. **API Durumu x DB Güncellemesi**:
   - Sunucu çalışırken arka planda `cli.py scan` ile DB güncellenmesi -> `/api/data` çağrısının yeni eklenen verileri anında yansıtması.
   - `/api/scan` çağrısı yapılırken DB dosyasının silinmesi -> API'nin çökmeyip `{"success": false, "error": ...}` dönmesi.

#### Tier 4: Gerçek Hayat Uygulama Senaryoları (Real-World Workloads)
En az 5 gerçekçi uçtan uca akış:
1. **Sıfırdan Kurulum ve İlk Tarama**:
   - Temiz ortam -> Loglar kopyalanır -> `scan` çalıştırılır -> `stats` ile toplam token ve maliyetlerin doğruluğu kontrol edilir.
2. **Artımlı Geliştirici Oturumu (Incremental Delta Scan)**:
   - Log dosyası taranır -> Oturuma yeni turn logları eklenir -> Yeniden `scan` çalıştırılır -> Delta scan sadece yeni eklenen turnleri veritabanına yazar.
3. **Çoklu Model ve Ayar Değişimi**:
   - Oturum sırasında `Gemini 3.5 Flash`, `Claude Sonnet 4.6` ve `Gemini 3.1 Pro` modelleri arasında geçiş yapılır. Veritabanında her turn'ün kendi modeliyle kaydedildiği ve maliyet hesabının her model için doğru çarpanlarla yapıldığı doğrulanır.
4. **Cache Odaklı Yoğun Oturum**:
   - İlk istekte cache yazma, sonraki 5 istekte cache okuma yapılan uzun bir konuşma logu taranır. scanner.py ve dashboard.py'deki cache token yazma/okuma maliyetlerinin tam eşleştiği teyit edilir.
5. **Çoklu Proje Analizi**:
   - Farklı `Cwd` yollarına sahip tool çağrıları içeren 3 ayrı oturum taranır. Dashboard API `/api/data` çıktısında projelerin doğru gruplandığı ve `projects` dizisi altındaki toplam maliyetlerin eşleştiği kontrol edilir.
6. **Gösterge Paneli Canlı Etkileşimi**:
   - Dashboard başlatılır -> `/api/data` çekilir -> `/api/scan` tetiklenir -> Yeni taranan verilerin `/api/data` üzerinde güncellendiği doğrulanır -> Sunucu kapatılır.
