# Antigravity Usage Dashboard - E2E Testing Track Design Analysis

Bu rapor, Milestone 1 (Test Infrastructure Design) kapsamında **Explorer 3** tarafından hazırlanmıştır. Opaque-box E2E test stratejisi, test harness mimarisi, environment overrides tasarımı ve 4-tier test matrisini içerir.

---

## 1. Environment Overrides Design (BRAIN_DIR & DB_PATH)

Testlerin kullanıcının canlı veritabanı (`usage.db`) ve chat logları (`brain`) ile çakışmasını önlemek için çevresel değişken (environment variable) tabanlı override mekanizması önerilmektedir. 

### Mevcut Durum (Hardcoded Paths)
- **`cli.py` (Satır 11):** `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`
- **`scanner.py` (Satır 12-13):**
  - `BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")`
  - `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`
- **`dashboard.py` (Satır 13):** `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`

### Önerilen Çevresel Değişkenler
- `ANTIGRAVITY_BRAIN_DIR`: Test log dizinini (mock transcripts) işaret eder.
- `ANTIGRAVITY_DB_PATH`: Geçici test SQLite veritabanını işaret eder.

### Kod Değişikliği Önerileri (Proposed Implementation)

#### A. `cli.py` Güncellemesi
```python
# Mevcut:
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen:
import os
DEFAULT_DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", str(DEFAULT_DB_PATH)))
```

#### B. `scanner.py` Güncellemesi
```python
# Mevcut:
# BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen:
import os
DEFAULT_BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")
DEFAULT_DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

BRAIN_DIR = Path(os.environ.get("ANTIGRAVITY_BRAIN_DIR", str(DEFAULT_BRAIN_DIR)))
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", str(DEFAULT_DB_PATH)))
```

#### C. `dashboard.py` Güncellemesi
```python
# Mevcut:
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen:
import os
DEFAULT_DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", str(DEFAULT_DB_PATH)))
```

---

## 2. Test Harness Architecture

Test paketi **opaque-box** prensibine dayanacaktır; `cli.py` ve `dashboard.py` dosyaları subprocess olarak çalıştırılacaktır.

### Dizin Yapısı (Directory Structure)
`PROJECT.md` kuralları gereği test kodları projenin ana dizininde `tests/` klasörü altında bulunmalıdır.

```
/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/
├── cli.py
├── scanner.py
├── dashboard.py
├── tests/
│   ├── conftest.py            # Test fixture'ları, env setup/cleanup, server runner
│   ├── test_cli.py            # CLI komut testleri
│   ├── test_dashboard.py      # Web/API sunucu testleri
│   ├── mock_brain/            # Mock chat logları
│   │   ├── session_01_flash_high/
│   │   │   └── .system_generated/logs/transcript.jsonl
│   │   ├── session_02_tokens/
│   │   │   └── .system_generated/logs/transcript.jsonl
│   │   └── session_03_invalid/
│   │       └── .system_generated/logs/transcript.jsonl
│   └── logs/                  # Test ve sunucu çalışma logları
│       ├── test_run.log
│       └── dashboard_server.log
```

### Mock Transcript Dosya Formatı (`transcript.jsonl` Örneği)
`scanner.py` tarafından parse edilmek üzere hazırlanmış mock log içeriği:

```json
{"created_at": "2026-06-14T08:00:00Z", "type": "USER_INPUT", "source": "USER_EXPLICIT", "content": "<USER_SETTINGS_CHANGE>changed setting `Model Selection` from Gemini 3.5 Flash (Medium) to Gemini 3.5 Flash (High)</USER_SETTINGS_CHANGE>\nKullanıcı ilk sorusu."}
{"created_at": "2026-06-14T08:00:10Z", "type": "PLANNER_RESPONSE", "source": "MODEL", "thinking": "Thinking text...", "content": "Modelin cevabı.", "tool_calls": [{"name": "list_dir", "args": {"DirectoryPath": "/Users/armaganercan/project"}}]}
{"created_at": "2026-06-14T08:01:00Z", "type": "USER_INPUT", "source": "USER_EXPLICIT", "content": "Kullanıcı ikinci sorusu."}
{"created_at": "2026-06-14T08:01:15Z", "type": "PLANNER_RESPONSE", "source": "MODEL", "thinking": "Thinking again...", "content": "Modelin ikinci cevabı.", "tool_calls": []}
```

### Test Runner Stratejisi
1. **Runner**: Testleri çalıştırmak için standart `pytest` kütüphanesi önerilmektedir.
2. **Fixture (Setup & Teardown)**: `conftest.py` içerisinde tanımlanan bir pytest fixture'ı:
   - Geçici bir `tmp_path` oluşturur.
   - Bu yol altında `brain/` ve `usage.db` oluşturur.
   - `os.environ` üzerine `ANTIGRAVITY_BRAIN_DIR` ve `ANTIGRAVITY_DB_PATH` değerlerini yazar.
   - Test bitiminde çevresel değişkenleri temizler ve geçici dizini siler.
3. **Subprocess Yönetimi**: `subprocess.run` ve `subprocess.Popen` kullanılarak CLI ve API sunucusu izole prosesler halinde çağrılır. API testlerinde sunucunun hazır olup olmadığı (port polling) kontrol edildikten sonra API istekleri (`urllib.request` ile) gönderilir.

---

## 3. Feature Inventory & 4-Tier Test Strategy Matrisi

Antigravity Usage Dashboard sisteminde 6 ana özellik (feature) belirlenmiştir. Bu özellikler 4-tier test yapısına aşağıdaki şekilde eşlenmiştir.

### Feature 1: CLI Commands Execution (F1)
*CLI komutlarının (`scan`, `today`, `week`, `stats`, `dashboard`) doğru parametreler ve çıkış kodlarıyla (exit codes) çalışması.*

- **Tier 1: Feature Coverage (5 case)**
  1. `cli.py scan` komutunun başarılı çalışması (exit code 0, veritabanı dosyasının oluşması).
  2. `cli.py today` komutunun bugünün özetini tablo olarak basması ve 0 dönmesi.
  3. `cli.py week` komutunun haftalık ara toplamları listelemesi ve 0 dönmesi.
  4. `cli.py stats` komutunun tüm zamanların istatistiklerini vermesi ve 0 dönmesi.
  5. Geçersiz komut çağrıldığında (`cli.py invalid`) yardım mesajı basıp exit code 1 dönmesi.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. CLI argümansız çağrıldığında kullanım kılavuzunu basıp 1 dönmesi.
  2. Veritabanı dosyası yokken sorgu komutları (`today`, `week`, `stats`) çağrıldığında "Database not found..." hatası verip 1 dönmesi.
  3. Boş veritabanında sorgu komutlarının hata vermeden "No usage recorded..." basması ve 0 dönmesi.
  4. Veritabanı dosyasına erişim kısıtlandığında (dosya kilitli/salt okunur) CLI'ın çökmeyip hata yakalaması.
  5. Çok uzun parametre/argüman gönderildiğinde hata kontrolü yapılması.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - CLI sorguları çalışırken arka planda `dashboard.py` sunucusunun DB'yi okuması/yazması durumu.
- **Tier 4: Real-World Scenarios**
  - **Senaryo A**: Yeni bir ortamda önce `scan` çalıştırılması, hemen ardından `stats` sorgusu çekilerek beklenen başlangıç değerlerinin doğrulanması.

### Feature 2: Logs Scanner & DB Parsing (F2)
*`BRAIN_DIR` altındaki log dosyalarının taranması, `transcript.jsonl` satırlarının okunması ve veritabanı tablolarının doldurulması.*

- **Tier 1: Feature Coverage (5 case)**
  1. Tek bir oturum klasöründeki geçerli log dosyasının başarıyla taranması.
  2. Birden fazla oturum klasörünün taranıp `sessions` ve `turns` tablolarına kaydedilmesi.
  3. Idempotency testi: Aynı log dosyasının ikinci kez taranmasında değişiklik yoksa (`mtime` kontrolü) kaydın atlanması.
  4. Artımlı tarama (Incremental scan): Log dosyası güncellendiğinde (`mtime` değiştiğinde) yeni satırların okunup veritabanının güncellenmesi.
  5. Klasör filtresi: `.` ile başlayan gizli klasörlerin taranmadan atlanması.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. Boş `transcript.jsonl` (0 byte) dosyası varlığında scanner'ın çökmeden atlaması.
  2. Bozuk/Hatalı JSON satırı içeren dosyada hatalı satırın atlanıp geçerli satırların parse edilmeye devam etmesi.
  3. Klasör yapısının eksik olması (`.system_generated/logs/transcript.jsonl` yolunun bulunmaması).
  4. `BRAIN_DIR` klasörünün kendisinin sistemde bulunmaması durumunda uygun hata mesajı verilmesi.
  5. Log dosyasında zaman damgalarının (timestamp) geçersiz formatta olması durumunda UTC "now" değerinin atanması.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - Aynı anda hem model değişikliği satırları hem de geçersiz JSON satırları içeren karmaşık logların taranması.
- **Tier 4: Real-World Scenarios**
  - **Senaryo B**: Hem eski formatta hem de yeni formatta schema yapısına sahip veritabanlarının varlığında, scanner'ın veritabanı şemasını otomatik yükseltmesi (`session_title` kolonunu eklemesi).

### Feature 3: Model Selection Parsing & Normalization (F3)
*Log dosyalarından model adının regex ile yakalanması, ondalıklı sayıların desteklenmesi ve model adlarının normalize edilmesi.*

- **Tier 1: Feature Coverage (5 case)**
  1. Standart model geçiş satırının başarıyla taranması (`Gemini 3.5 Flash (Medium)`).
  2. Bilinmeyen model adlarının substring eşlemesi ile normalize edilmesi (örn: "opus" -> "Claude Opus 4.6 (Thinking)").
  3. Model adı bulunmadığında varsayılan modelin (`Gemini 3.5 Flash (Medium)`) atanması.
  4. Arayüzde `gemini-3.5-flash` yerine `gemini-3.5-flash-medium` veya `flash-medium` isimlendirmesinin gösterilmesi.
  5. UI model filtrelerinde tüm model varyantlarının listelenmesi.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. **R1 regex hatası**: Ondalıklı sayı içeren model geçişlerinde (örn. `Gemini 3.5 Flash (High)`) model adının noktada kesilmeden tam olarak (`Gemini 3.5 Flash (High)`) yakalanması.
  2. Tek bir satırda birden fazla settings change etiketi bulunması.
  3. Model adının boş string veya sadece boşluk olması durumu.
  4. Substring eşlemesinde öncelik sırasının doğruluğu (örn: "gpt-oss-120b" girdisinin "gpt" yerine doğru modele gitmesi).
  5. Çok uzun veya anlamsız model adlarının varsayılana düşürülmesi veya güvenle kaydedilmesi.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - Farklı oturumlarda farklı model geçişlerinin yapılması ve her model için ayrı maliyet oranlarının eşleştirilmesi.
- **Tier 4: Real-World Scenarios**
  - **Senaryo C**: Kullanıcının oturum esnasında 3 farklı modele geçiş yapması (Flash -> Pro -> Opus). Her turn'ün kendi modeliyle kaydedildiğinin ve toplam maliyetin her modelin kendi fiyatı üzerinden hesaplandığının doğrulanması.

### Feature 4: Token Cost & Caching Logic (F4)
*Önbellek yazma (caching write), önbellek okuma (caching read) ve normal input/output token ücretlerinin formüle uygun hesaplanması.*

- **Tier 1: Feature Coverage (5 case)**
  1. İlk dönüşte (Turn 1) `cache_creation_tokens`'ın `input_tokens`'a eşit, `cache_read_tokens`'ın ise 0 olması.
  2. Sonraki dönüşlerde `cache_creation_tokens`'ın 0 olması, `cache_read_tokens`'ın kümülatif olarak birikmesi.
  3. CLI maliyet formülü doğrulaması.
  4. Dashboard API maliyet formülü doğrulaması.
  5. Modele göre doğru fiyatlandırma tablosunun (input, output, cache_read, cache_write) uygulanması.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. Turn token sayısının 0 olması durumunda bölme hatası yaşanmaması.
  2. Önbellek yazma sınır durumu: `normal_input = max(0, total_input - cache_write)` formülünde `total_input < cache_write` durumu oluşursa negatif değer üretilmemesi (0 olması).
  3. Sonraki dönüşlerde cache okumanın önceki kümülatif toplamı aşması veya altına düşmesi durumları.
  4. Tanımlanmamış model için maliyet hesaplanırken default modele düşülmesi.
  5. Loglarda negatif token sayısı tespiti durumunda maliyetin eksiye düşmesinin engellenmesi.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - Farklı modellerin farklı cache oranları ile kullanıldığı çok dönüşlü oturumların toplam maliyet hesabı.
- **Tier 4: Real-World Scenarios**
  - **Senaryo D**: Claude Sonnet ile yapılmış 3 dönüşlü bir oturum logu taranır. Turn 1 cache yazma ücretini, Turn 2 ve 3 cache okuma + ek input ücretini alır. Sonuç toplam maliyetin `usage.db` ve dashboard API üzerinde kuruşu kuruşuna doğru hesaplandığı test edilir.

### Feature 5: Date Range & Timezone Cutoff (F5)
*Tarih aralığı filtrelerinin UTC/timezone sapmalarını önleyecek şekilde +1 gün genişletilmiş olarak çalışması.*

- **Tier 1: Feature Coverage (5 case)**
  1. CLI `today` sorgusunun sadece bugünün tarihini kapsayacak şekilde filtrelenmesi.
  2. CLI `week` sorgusunun son 7 gün aralığını sorgulaması.
  3. UI 7g (7 days) filtresinin `days + 1` (8 gün) veri çekmesi.
  4. UI 30g filtresinin 31 gün aralığını sorgulaması.
  5. UI "Hepsi" seçeneğinin tarih filtresini tamamen devre dışı bırakması.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. Artık yıl (Leap year) tarih geçiş sınırları.
  2. Ay geçiş sınırları (örn. 1'inde sorgulama yapılması).
  3. Loglarda farklı timestamp formatları (Z, +03:00 veya milisaniyeli).
  4. Veritabanında gelecek tarihli (hatalı sistem saati) kayıtların çökme yaratmaması.
  5. Çok eski tarihli (örn: 1970) kayıtların "Hepsi" haricindeki aralık dışı filtrelerde elenmesi.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - Farklı tarih filtreleri ile aktif model filtrelerinin kombinasyon halinde uygulanması.
- **Tier 4: Real-World Scenarios**
  - **Senaryo E**: Kullanıcı UTC+3 zaman dilimindedir ve 14 Haziran saat 01:00'de işlem yapmıştır (log saati 13 Haziran 22:00 UTC). Kullanıcı 7g filtresini seçtiğinde, +1 gün payı sayesinde bu kaydın kaybolmayıp grafiğe dahil edildiği test edilir.

### Feature 6: Dashboard UI & API Server (F6)
*Web sunucusunun ayağa kalkması, HTML sayfasını ve API isteklerini doğru formatta sunması.*

- **Tier 1: Feature Coverage (5 case)**
  1. Sunucunun belirtilen portta (örn. 8080) başarıyla dinlemeye başlaması.
  2. `/` ve `/index.html` isteklerine HTML şablonunun dönmesi.
  3. `/api/data` isteğine tüm modelleri ve özet istatistikleri içeren JSON dönmesi.
  4. `/api/scan` isteğinin tarayıcıyı tetikleyip success dönmesi.
  5. Bilinmeyen endpoint'ler için HTTP 404 dönülmesi.
- **Tier 2: Boundary & Corner Cases (5 case)**
  1. Port çakışması (port in use) durumunda sunucunun düzgünce sonlanması veya hata vermesi.
  2. Veritabanı dosyası yokken `/api/data` çağrıldığında 500 hatası yerine JSON formatında `{"error": ...}` dönmesi.
  3. Tarama esnasında hata oluşursa `/api/scan`'in `{"success": false, "error": ...}` dönmesi.
  4. Veritabanı boşken sunucunun boş listeler dönmesi ve UI'ın boş durumda çökmeden render edilmesi.
  5. Eşzamanlı (concurrent) API çağrılarında sunucunun thread-safe yanıt vermesi.
- **Tier 3: Cross-Feature Combinations (Pairwise)**
  - Sunucu açıkken arka planda CLI üzerinden veritabanının silinmesi/yeniden yazılması durumunda sunucunun sorgulara hata üretmeden cevap vermesi.
- **Tier 4: Real-World Scenarios**
  - **Senaryo F**: Sunucu başlatılır, `/api/scan` endpoint'i tetiklenir, ardından `/api/data` çekilip dönen oturum sayısının güncellendiği doğrulanır ve sunucu kapatılır.

---

## 4. Test Stratejisi Özeti (Matris Dağılımı)

Sistemdeki 6 ana özelliğin test planındaki dağılım matrisi:

| Feature | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Combinatorial) | Tier 4 (Workload) |
|---|---|---|---|---|
| **F1: CLI Commands** | 5 test case | 5 test case | DB states x commands | CLI lifecycle |
| **F2: Logs Scanner** | 5 test case | 5 test case | Formats x metadata | Multi-session update |
| **F3: Model Parsing** | 5 test case | 5 test case | Turns x models | Model change lifecycle |
| **F4: Token Cost** | 5 test case | 5 test case | Models x cache size | Full session billing |
| **F5: Date Range** | 5 test case | 5 test case | Date filter x models | Timezone offset logs |
| **F6: Dashboard Server** | 5 test case | 5 test case | Concurrency x DB state | Server lifecycle api |

**Toplam Minimum E2E Test Sayısı:**
- **Tier 1**: 30 Test Case
- **Tier 2**: 30 Test Case
- **Tier 3**: Pairwise Kombinasyonlar
- **Tier 4**: 6 Gerçekçi Senaryo
