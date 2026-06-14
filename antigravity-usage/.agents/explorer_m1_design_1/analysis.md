# Test Altyapı Tasarımı ve E2E Test Stratejisi Analizi

## 1. Çevre Değişkeni Geçersiz Kılmaları (Environment Overrides) Tasarımı

Testlerin kullanıcının canlı veritabanı (`usage.db`) ve canlı log dizini (`brain`) ile karışmaması için kod tabanında `BRAIN_DIR` ve `DB_PATH` değişkenlerinin çevre değişkenleri (`ANTIGRAVITY_BRAIN_DIR` ve `ANTIGRAVITY_DB_PATH`) ile geçersiz kılınabilmesi önerilmektedir.

### Mevcut Durum Analizi

1. **`scanner.py`**:
   - Satır 12: `BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")`
   - Satır 13: `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`

2. **`cli.py`**:
   - Satır 11: `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`

3. **`dashboard.py`**:
   - Satır 13: `DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")`

### Önerilen Değişiklikler (Diffs)

#### `scanner.py` Değişikliği
```python
# Eski Hali:
# BRAIN_DIR = Path("/Users/armaganercan/.gemini/antigravity/brain")
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen Hali:
BRAIN_DIR = Path(os.environ.get("ANTIGRAVITY_BRAIN_DIR", "/Users/armaganercan/.gemini/antigravity/brain"))
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

#### `cli.py` Değişikliği
```python
# Eski Hali:
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen Hali:
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

#### `dashboard.py` Değişikliği
```python
# Eski Hali:
# DB_PATH = Path("/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db")

# Önerilen Hali:
DB_PATH = Path(os.environ.get("ANTIGRAVITY_DB_PATH", "/Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/usage.db"))
```

---

## 2. E2E Test Harness Mimarisi (Test Harness Architecture)

Opaque-box testlerin gerçekleştirilmesi amacıyla, test kodlarının uygulamanın iç sınıflarını veya metotlarını doğrudan import etmemesi, bunun yerine CLI ve dashboard'u birer subprocess olarak çalıştırması planlanmıştır.

### Dizini Yapısı

Proje kök dizininde (root) `tests/` klasörü altında aşağıdaki yapı oluşturulacaktır:

```
tests/
├── run_tests.py             # Test çalıştırıcı ve ana orkestrasyon scripti
├── mock_brain/              # Sahte transcript dosyalarını barındıran dizin
│   ├── session_1/
│   │   └── .system_generated/logs/transcript.jsonl
│   └── session_2/
│       └── .system_generated/logs/transcript.jsonl
├── mock_db/                 # Test veritabanlarının oluşturulacağı izole dizin
│   └── test_usage.db
├── logs/                    # E2E test logları ve subprocess çıktıları
│   ├── cli_test.log
│   └── server_test.log
└── cases/                   # Test senaryolarının kodları
    ├── test_cli.py          # CLI komut testleri
    └── test_api.py          # Dashboard HTTP API ve sunucu testleri
```

### Test Runner Akışı (`run_tests.py`)

1. **Environment Setup**:
   `ANTIGRAVITY_BRAIN_DIR` değişkenini `tests/mock_brain` dizinine, `ANTIGRAVITY_DB_PATH` değişkenini ise `tests/mock_db/test_usage.db` dosyasına yönlendirir.
2. **Clean State**:
   Varsa eski `tests/mock_db/test_usage.db` dosyasını siler.
3. **CLI Scan Test**:
   `subprocess.run(["python", "cli.py", "scan"])` komutunu çalıştırarak sahte logları veri tabanına işler. Exit kodunun `0` olduğunu ve veritabanı dosyasının oluştuğunu doğrular.
4. **CLI Summary Tests**:
   `python cli.py stats`, `today`, ve `week` komutlarını subprocess ile çalıştırarak çıktıların formatını ve değerlerin doğruluğunu kontrol eder.
5. **Dashboard API Tests**:
   Dashboard sunucusunu background'da `subprocess.Popen(["python", "dashboard.py"])` ile başlatır. Port 8080'in açılmasını bekler (healthcheck loop).
6. **API Query Tests**:
   `urllib.request` kütüphanesi yardımıyla `/api/data` ve `/api/scan` uç noktalarına istek atarak JSON yanıtlarını doğrular.
7. **Clean Teardown**:
   Dashboard sunucusu subprocess'ini sonlandırır (`SIGINT` veya `terminate`).
8. **Logging**:
   Subprocess hata çıktılarını ve standart çıktılarını `tests/logs/` altına kaydeder.

---

## 3. Özellik Envanteri (Feature Inventory) ve 4-Tier Test Matrisi

### Özellik Envanteri

1. **F1: Scanner (Transcript Parsing & Ingestion)**
   - Transcript dosyalarından turn ve session çıkarma.
   - Model adını settings change loglarından okuma.
   - `cwd` ve `project_name` parametrelerini tool çağrısı argümanlarından çıkarma.
   - Token tahminlemesi ve prompt cache maliyet hesaplaması (ilk turn cache yazma, sonraki turn cache okuma).
   - İşlenen dosyaların takibi (incremental scan).
   - Hatalı satırların göz ardı edilmesi (JSON decode robustness).
2. **F2: CLI Commands**
   - Veritabanı yoksa hata mesajı ve exit code 1 verilmesi.
   - `scan` komutu ile tarama başlatılması.
   - `stats`, `today`, `week` raporlama komutları ve biçimlendirilmiş tabloları.
3. **F3: Dashboard Server & HTTP API**
   - Web sunucusu başlatılması ve tarayıcının otomatik açılması.
   - `/api/data` JSON API'si (tüm modeller, günlük istatistikler, projeler, oturumlar).
   - `/api/scan` API'si (arka planda tarama tetikleme).
   - HTML/CSS/JS dashboard arayüzü sunumu.
4. **F4: Cost Calculation & Normalization**
   - Fiyatlandırma matrisinin (Gemini, Claude, GPT-OSS) maliyet hesaplamasında doğru uygulanması.
   - Caching maliyet katsayılarının doğruluğu.
   - Model adlarının normalizasyonu ve fallback mekanizması.

---

### 4-Tier Test Senaryoları Eşleştirmesi

#### Tier 1: Feature Coverage (En az 5 case per feature)
- **F1: Scanner**
  - TC_F1_1: Standart çok turlu (multi-turn) log tarama.
  - TC_F1_2: Model değiştirme içeren log tarama.
  - TC_F1_3: Farklı tool çağrıları ile `cwd` ve `project_name` çıkarma.
  - TC_F1_4: JSONL dosyasında hatalı formatta satırların atlanması.
  - TC_F1_5: Dosya değişmediğinde mükerrer tarama yapılmaması (incremental logic).
- **F2: CLI Commands**
  - TC_F2_1: DB dosyası yokken `stats` komutunun hata vermesi.
  - TC_F2_2: `scan` komutunun başarılı çalışması.
  - TC_F2_3: `today` çıktısında biçimlendirilmiş maliyet ve turn detaylarının olması.
  - TC_F2_4: `week` çıktısında gün bazlı gruplama ve alt toplamların doğruluğu.
  - TC_F2_5: `stats` komutunda all-time özet bilgilerin bulunması.
- **F3: Dashboard API**
  - TC_F3_1: Sunucunun port 8080 üzerinde sorunsuz açılması ve kapanması.
  - TC_F3_2: Boş veritabanı ile `/api/data` isteği.
  - TC_F3_3: Dolu veritabanı ile `/api/data` isteği ve JSON veri yapısı kontrolü.
  - TC_F3_4: `/api/scan` isteği ile veri tabanının güncellenmesi.
  - TC_F3_5: Root `/` endpoint'inin HTML içeriği dönmesi.
- **F4: Cost & Normalization**
  - TC_F4_1: Gemini model ailesi için doğru maliyet hesabı.
  - TC_F4_2: Claude model ailesi için doğru maliyet hesabı.
  - TC_F4_3: GPT-OSS için maliyet hesabı.
  - TC_F4_4: Prompt caching (okuma vs yazma) maliyetlerinin doğru yansıtılması.
  - TC_F4_5: Bilinmeyen model adlarının fallback modeline (Gemini 3.5 Flash) normalizasyonu.

#### Tier 2: Boundary & Corner Cases (En az 5 case per feature)
- **F1: Scanner**
  - TC_B_F1_1: Boş veya sıfır turn içeren transcript dosyası.
  - TC_B_F1_2: Log satırlarında `created_at` timestamp'inin eksik veya hatalı olması.
  - TC_B_F1_3: Tool çağrısında boş veya anlamsız argümanlar.
  - TC_B_F1_4: Aşırı uzun metin içeren loglar (token sınırları).
  - TC_B_F1_5: Sonek (suffix) içermeyen dizin yolları.
- **F3: Dashboard API**
  - TC_B_F3_1: Port çakışması durumunda sunucunun hata yönetimi.
  - TC_B_F3_2: Hatalı veya geçersiz API endpoint çağrıları (404 kontrolü).
  - TC_B_F3_3: Binlerce session kaydı içeren devasa veritabanı sorgulama performansı.
  - TC_B_F3_4: Veri tabanı varken ancak tablolar boşken API davranışı.
  - TC_B_F3_5: Eşzamanlı API isteklerinin SQLite kilitlemelerine karşı direnci.
- **F4: Cost & Normalization**
  - TC_B_F4_1: Sıfır token harcaması olan oturumlarda $0.0000 maliyet.
  - TC_B_F4_2: Aynı oturumda birden çok kez cache oluşturulması (ikinci turn cache write).
  - TC_B_F4_3: Ondalık sayı içeren model sürümleri (örn: Gemini 3.5 vs 3) için regex sınırları.
  - TC_B_F4_4: Kısmi isim eşleşmelerinde model ayrımı (örn: "Claude" kelimesinin Opus veya Sonnet'e doğru yönlendirilmesi).
  - TC_B_F4_5: Veritabanında negatif token değerleri bulunması (veri bozulması koruması).

#### Tier 3: Cross-Feature Combinations (Pairwise Combinations)
- TC_C_1: Arka planda aktif dashboard çalışırken CLI üzerinden `scan` yapılması.
- TC_C_2: Dashboard `/api/scan` tetiklenirken CLI `stats` çalıştırılması.
- TC_C_3: Aynı oturumda model değişimi olduğunda maliyetin `/api/data` ve CLI çıktısına model bazında yansıması.
- TC_C_4: Özel `ANTIGRAVITY_DB_PATH` ile hem CLI hem dashboard sunucusunun çalıştırılması.
- TC_C_5: Canlı log dosyasına turn eklenirken, UI üzerinden `/api/scan` tetiklenip anlık veri güncellenmesi.

#### Tier 4: Real-World Workload Scenarios (En az 5 senaryo)
- **TC_W_1: Full Developer Loop Simulation**
  - Geliştiricinin Claude Code açması, git dallarında gezinmesi, kod düzenlemesi, model değiştirmesi ve oturumu kapatması simüle edilir. CLI ve API çıktılarındaki tüm metrikler doğrulanır.
- **TC_W_2: Multi-Project Tracking**
  - Birden fazla proje ve farklı git dallarında eş zamanlı çalışma senaryosu. Proje bazlı metriklerin dashboard ve CLI çıktılarında doğru ayrıştırıldığı doğrulanır.
- **TC_W_3: Long-term Historic Usage**
  - Günler ve haftalar öncesine ait log kayıtlarının taratılması. `cli.py week` çıktısının kronolojik sıralaması ve alt toplamları doğrulanır.
- **TC_W_4: Database Corruption Recovery**
  - Mevcut veritabanının silinmesi veya bozulması durumunda scanner'ın veritabanını sıfırdan oluşturarak tüm transcript geçmişini kayıp olmadan kurtarması.
- **TC_W_5: Scale Stress Testing**
  - 100'den fazla oturum ve binlerce log satırı içeren devasa log dizinlerinin taranması. Performans, CPU/bellek tüketimi ve API tepki süreleri ölçülür.
