# Antigravity Usage Dashboard - Backend Analysis Report (R1 & R2)

Bu rapor, Antigravity Usage Dashboard projesindeki model ayarları ayrıştırma/normalizasyon (R1) ve önbellekleme/maliyet hesaplama (R2) sorunlarının tespiti ve çözüm stratejilerini içermektedir.

---

## 1. R1: Model Settings Parsing & Normalization

### 1.1. `scanner.py` Model Settings Regex Sorunu
- **Dosya Konumu**: `scanner.py` (Satır 92)
- **Mevcut Kod**:
  ```python
  match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n\.]+)", text_to_search)
  ```
- **Hata Analizi**:
  Regex içindeki `([^`\n\.]+)` ifadesi, model adındaki ilk noktayı (`.`) gördüğünde eşleşmeyi durdurur. Örneğin; `Gemini 3.5 Flash (High)` veya `Gemini 3.1 Pro (Low)` gibi ondalık sürüm içeren modeller ayrıştırılırken `Gemini 3` olarak kesilir.
- **Çözüm Stratejisi**:
  Eşleşme grubunda nokta karakterine izin vermek için regex `r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n]+)"` olarak güncellenmelidir. Satır 95-99 arasındaki mevcut temizleme mantığı (`re.split(r"\.\s+[A-Z]", val)` ve `val.endswith(".")`) cümle sonundaki noktaları ve sonraki cümleleri güvenle temizleyecektir:
  ```python
  match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n]+)", text_to_search)
  ```

### 1.2. `dashboard.py` Model Normalizasyonu
- **Dosya Konumu**: `dashboard.py` (Satır 51-71, `normalize_model_name` fonksiyonu)
- **Mevcut Kod**:
  ```python
  def normalize_model_name(model):
      if not model:
          return "Gemini 3.5 Flash (Medium)"
      m = model.lower()
      if "opus" in m:
          return "Claude Opus 4.6 (Thinking)"
      if "sonnet" in m:
          return "Claude Sonnet 4.6 (Thinking)"
      if "pro" in m:
          if "high" in m:
              return "Gemini 3.1 Pro (High)"
          return "Gemini 3.1 Pro (Low)"
      if "oss" in m or "gpt" in m:
          return "GPT-OSS 120B (Medium)"
      if "flash" in m:
          if "high" in m:
              return "Gemini 3.5 Flash (High)"
          if "low" in m:
              return "Gemini 3.5 Flash (Low)"
          return "Gemini 3.5 Flash (Medium)"
      return "Gemini 3.5 Flash (Medium)"
  ```
- **Hata Analizi**:
  Kesilmiş model adı `"Gemini 3"` normalizasyon fonksiyonuna gönderildiğinde, substring eşleşmelerinin hiçbirine girmeyerek varsayılan `"Gemini 3.5 Flash (Medium)"` modeline düşmektedir.
- **Çözüm Stratejisi**:
  `scanner.py` üzerindeki regex düzeltildiğinde, veritabanına tam adlar (örneğin `"Gemini 3.5 Flash (High)"` veya `"Gemini 3.1 Pro (High)"`) yazılacaktır. Bu durumda `normalize_model_name` fonksiyonu substring kontrolleri (`"flash"`, `"pro"`, `"high"`) sayesinde doğru normalizasyonu yapacaktır. Ek bir normalizasyon kodu değişikliğine gerek yoktur.

---

## 2. R2: Caching & Cost Calculation

### 2.1. `scanner.py` Önbellekleme Mantığı
- **Dosya Konumu**: `scanner.py` (Satır 226-234, `scan_transcript_file` fonksiyonu)
- **Mevcut Kod**:
  ```python
  # Estimate prompt caching
  if len(turns) == 0:
      cache_read = 0
      cache_creation = input_tokens
  else:
      cache_read = cumulative_tokens
      cache_creation = input_tokens
  ```
- **Analiz**:
  - İlk dönüşte (`len(turns) == 0`) önbellek okuma `0` ve önbellek yazma `input_tokens` olarak belirlenir.
  - Sonraki dönüşlerde (`len(turns) > 0`) önbellek okuma önceki tüm dönüşlerin toplam token sayısı olan `cumulative_tokens` (tüm geçmiş), önbellek yazma ise mevcut dönüşün `input_tokens` değeri olarak belirlenir.
  - Bu mantık, chat oturumundaki ardışık prompt caching sistemini doğru bir şekilde simüle eder. Elde edilen değerler veritabanına `cache_read_tokens` ve `cache_creation_tokens` olarak yazılmaktadır. Değişikliğe gerek yoktur.

### 2.2. `dashboard.py` Maliyet Hesaplama
- **Dosya Konumu**: `dashboard.py` (Satır 45-50, `calc_cost` fonksiyonu)
- **Mevcut Kod**:
  ```python
  def calc_cost(model, inp, out, cache_read=0, cache_write=0):
      p = get_pricing(model)
      cr_rate = p.get("cache_read", p["input"] * 0.1)
      cw_rate = p.get("cache_write", p["input"] * 1.25)
      return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
  ```
- **Hata Analizi**:
  1. `inp` parametresi fonksiyona geçilmesine rağmen formül içerisinde hiç kullanılmamaktadır.
  2. Önbellekleme devre dışı olduğunda veya veritabanında `cache_read` ve `cache_write` 0 olduğunda, giriş token maliyeti tamamen ihmal edilmekte ve maliyet eksik hesaplanmaktadır.
- **Çözüm Stratejisi**:
  `cache_read` ve `cache_write` değerlerinin 0 olması durumunda standart giriş token ücretini (`inp`) kullanacak şekilde bir fallback eklenmelidir:
  ```python
  def calc_cost(model, inp, out, cache_read=0, cache_write=0):
      p = get_pricing(model)
      if cache_read == 0 and cache_write == 0:
          return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)
      cr_rate = p.get("cache_read", p["input"] * 0.1)
      cw_rate = p.get("cache_write", p["input"] * 1.25)
      return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
  ```

### 2.3. `cli.py` Maliyet Hesaplama ve Fiyatlandırma Tutarsızlığı
- **Dosya Konumu**: `cli.py` (Satır 14-23 `PRICING` kataloğu, Satır 44-46 `calc_cost` fonksiyonu, veritabanı sorguları)
- **Mevcut Kod**:
  ```python
  PRICING = {
      "Gemini 3.5 Flash (Medium)":   {"input": 0.075, "output": 0.30},
      ...
  }
  
  def calc_cost(model, inp, out):
      p = get_pricing(model)
      return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)
  ```
- **Hata Analizi**:
  1. `cli.py` fiyatlandırma kataloğunda `cache_read` ve `cache_write` oranları bulunmamaktadır.
  2. `cli.py` maliyet formülü önbellek parametrelerini kabul etmemekte ve hesaplamamaktadır.
  3. `cli.py` komutlarındaki SQL sorguları (`cmd_today`, `cmd_week`, `cmd_stats`) önbellek verilerini (`cache_read_tokens`, `cache_creation_tokens`) çekmemekte, sadece `SUM(input_tokens)` çekmektedir. Bu durum, CLI maliyet raporlamasının Dashboard ile tamamen tutarsız olmasına ve maliyetin ciddi derecede eksik gösterilmesine yol açmaktadır.
- **Çözüm Stratejisi**:
  1. `cli.py` altındaki `PRICING` kataloğu `dashboard.py` ile eşitlenerek önbellek fiyatları eklenmelidir.
  2. `cli.py` altındaki `calc_cost` fonksiyonu, `dashboard.py` için önerilen düzeltilmiş sürümle değiştirilmelidir.
  3. `cmd_today`, `cmd_week` ve `cmd_stats` içerisindeki SQL sorguları güncellenerek `cache_read_tokens` ve `cache_creation_tokens` değerleri sorgulanmalı ve hesaplamaya dahil edilmelidir.
  
  *Örnek SQL Güncellemesi (`cmd_today` için)*:
  ```sql
  SELECT
      COALESCE(model, 'unknown') as model_name,
      SUM(input_tokens)          as inp,
      SUM(output_tokens)         as out,
      SUM(cache_read_tokens)     as cread,
      SUM(cache_creation_tokens) as cwrite,
      COUNT(*)                   as turns
  FROM turns
  WHERE substr(timestamp, 1, 10) = ?
  GROUP BY model_name
  ORDER BY inp + out DESC
  ```
  *Örnek Çağrı Güncellemesi*:
  ```python
  cost = calc_cost(r["model_name"], r["inp"], r["out"], r["cread"], r["cwrite"])
  ```
