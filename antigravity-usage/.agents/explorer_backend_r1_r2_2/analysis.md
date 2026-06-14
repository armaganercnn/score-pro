# Analiz Raporu (R1 & R2)

## R1: Model Settings Parsing & Normalization

### Bulgular

1. **Model Ayarları Regex'i (scanner.py)**
   - **Dosya Konumu**: `scanner.py` satır 92
   - **Mevcut Kod**: `match = re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n\.]+)", text_to_search)`
   - **Hata Analizi**: `[^`\n\.]+` ifadesi nokta (`.`) karakterini dışlar. Model adlarında bulunan versiyon numaralarındaki noktalar (örn. `Gemini 3.5` veya `Gemini 3.1`) regex'in eşleşmeyi yarıda kesmesine neden olur. Eşleşen değer `"Gemini 3"` şeklinde kırpılır.

2. **Model Adı Normalizasyonu (dashboard.py)**
   - **Dosya Konumu**: `dashboard.py` satır 51-71 (`normalize_model_name` fonksiyonu)
   - **Hata Analizi**: `scanner.py` tarafından üretilen kırpılmış `"Gemini 3"` değeri bu fonksiyona girdiğinde hiçbir `if` koşuluyla (`opus`, `sonnet`, `pro`, `oss`, `gpt`, `flash`) eşleşmez. Bu nedenle varsayılan olarak `"Gemini 3.5 Flash (Medium)"` değerine geri döner. Bu durum, `Gemini 3.1 Pro` modellerinin de yanlışlıkla `Gemini 3.5 Flash` olarak sınıflandırılmasına yol açar.

3. **Frontend Model İsmi Temizleme (dashboard.py JS)**
   - **Dosya Konumu**: `dashboard.py` satır 769-784 (`cleanModelName` JS fonksiyonu)
   - **Hata Analizi**: Python tarafındaki normalizasyon hatası nedeniyle yanlış veriyi alır ve yanlış etiketlerle gösterir. Eğer Python tarafındaki normalizasyon düzeltilirse burası da doğru çalışacaktır.

---

## R2: Caching & Cost Calculation

### Bulgular

1. **Önbellek (Caching) Mantığı (scanner.py)**
   - **Dosya Konumu**: `scanner.py` satır 226-232
   - **Mevcut Kod**:
     ```python
     if len(turns) == 0:
         cache_read = 0
         cache_creation = input_tokens
     else:
         cache_read = cumulative_tokens
         cache_creation = input_tokens
     ```
   - **Mantık Analizi**: İlk turda önbellek okuma `0`, önbellek yazma `input_tokens` olur. Sonraki turlarda ise önceki tüm turların toplamı (`cumulative_tokens`) önbellekten okunur (`cache_read`), yeni girilen `input_tokens` ise önbelleğe yazılır (`cache_creation`).

2. **Maliyet Hesaplama Formülü (dashboard.py)**
   - **Dosya Konumu**: `dashboard.py` satır 45-50 (`calc_cost` fonksiyonu)
   - **Mevcut Kod**:
     ```python
     def calc_cost(model, inp, out, cache_read=0, cache_write=0):
         p = get_pricing(model)
         cr_rate = p.get("cache_read", p["input"] * 0.1)
         cw_rate = p.get("cache_write", p["input"] * 1.25)
         return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
     ```
   - **Hata/Eksik Analizi**: 
     - Parametrelerde tanımlı `inp` (giriş tokeni) formülde hiç kullanılmamaktadır.
     - `cache_write` (yani `cache_creation_tokens`) oranı varsayılan olarak `input * 1.25` çarpanıyla hesaplanmaktadır. Ancak Anthropic ve Gemini API fiyatlandırmalarında önbellek yazma (cache creation) ek bir ücrete tabi olmayıp standart giriş (input) ücretiyle aynıdır (`input * 1.0`). Mevcut durum yapay bir maliyet artışına sebep olur.

3. **Maliyet Hesaplama Formülü (cli.py)**
   - **Dosya Konumu**: `cli.py` satır 44-46 (`calc_cost` fonksiyonu)
   - **Mevcut Kod**:
     ```python
     def calc_cost(model, inp, out):
         p = get_pricing(model)
         return (inp * p["input"] / 1_000_000) + (out * p["output"] / 1_000_000)
     ```
   - **Hata/Eksik Analizi**: `cli.py` önbellek verilerini (`cache_read` ve `cache_creation`) veritabanından çekmez ve maliyet hesabına katmaz. Tüm giriş tokenlerini standart fiyattan hesaplar. Bu durum, CLI ile Dashboard arasında ciddi maliyet raporlama farklarına sebep olur. Ayrıca `cli.py` içerisindeki `PRICING` sözlüğünde önbellek fiyat tanımları bulunmamaktadır.

---

## Önerilen Düzeltme Stratejisi (Concrete Fix Strategy)

### R1 Düzeltmesi
1. **`scanner.py` Güncellemesi**:
   - `parse_settings_change` içindeki regex deseni noktaları içerecek şekilde değiştirilmeli.
   - Öneri: `[^`\n]+` (nokta `.` kısıtlaması kaldırılacak).
   - Yeni regex: `re.search(r"changed setting\s+`Model Selection`\s+from\s+.*?\s+to\s+([^`\n]+)", text_to_search)`

2. **`dashboard.py` Güncellemesi**:
   - `normalize_model_name` fonksiyonu doğru model adlarını (noktalı halleriyle) eşleştirebilecek hale getirilecek. Eşleşme regex düzeltildiği için otomatik olarak düzelecektir ancak fallback mantığına ek güvenlik kontrolleri eklenebilir.

### R2 Düzeltmesi
1. **Maliyet Hesaplama Formüllerinin Eşitlenmesi**:
   - `dashboard.py` ve `cli.py` içerisindeki `calc_cost` mantığı ve `PRICING` tabloları ortaklaştırılmalı veya senkronize edilmeli.
   - `PRICING` tablolarındaki `cache_write` katsayı çarpanı `1.25` yerine `1.0` (standart input fiyatı) olarak güncellenmeli.
   - `cli.py` veritabanı sorgularına `cache_read_tokens` ve `cache_creation_tokens` sütunları eklenmeli ve maliyet formülü önbelleği hesaba katacak şekilde güncellenmeli:
     ```python
     def calc_cost(model, inp, out, cache_read=0, cache_write=0):
         p = get_pricing(model)
         cr_rate = p.get("cache_read", p["input"] * 0.1)
         cw_rate = p.get("cache_write", p["input"] * 1.0)
         return (cache_read * cr_rate / 1_000_000) + (cache_write * cw_rate / 1_000_000) + (out * p["output"] / 1_000_000)
     ```
