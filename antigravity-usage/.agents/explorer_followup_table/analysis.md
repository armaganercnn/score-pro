# Sessions Table Analysis & Layout Recommendations

Bu rapor, `dashboard.py` dosyasındaki Sessions (Oturumlar) tablosunun yerleşimi ve render kodunun analizi ile talep edilen 4 gereksinimi karşılamak için yapılması gereken değişiklikleri açıklamaktadır.

---

## 1. Yatayda Tam Genişlik (Full Width Layout)
**Mevcut Durum:**
- `.container` (satır 400-404) sınıfı `max-width: 1400px;` olarak tanımlanmıştır.
- `header` (satır 274) ve `#filter-bar` (satır 322) da `max-width: 1400px;` ile sınırlandırılmıştır.
- `.table-card` (satır 514) doğrudan `.container` içinde yer aldığı için en fazla 1340px genişliğe (padding hariç) ulaşabilmektedir.

**Öneri:**
- Diğer grafikler ve metriklerin 1400px genişlikte kalması estetik açıdan daha iyidir. Bu nedenle, `.container`'ı grafiklerin bittiği yerde (satır 880 dolaylarında) kapatıp, `.table-card` için tam genişlikte (`max-width: 100%`) yeni bir `.container-wide` sarmalayıcısı oluşturulmalıdır.

**HTML Değişikliği (Satır ~880):**
```html
</div> <!-- Mevcut .container kapatılır -->

<div class="container-wide">
    <div class="table-card">
        <h2>Son Oturumlar (Sessions)...</h2>
        ...
    </div>
</div>
```

**CSS Değişikliği (Satır ~405):**
```css
.container-wide {
    max-width: 100%;
    margin: 0 auto;
    padding: 0 30px 20px 30px;
}
```

---

## 2. Token ve Önbellek Detayları (Sütun Ayrımı)
**Mevcut Durum:**
- Tabloda 9 adet sütun bulunmaktadır. "Giriş" sütunu (`td` ve `th`) hem ana Giriş Tokenlerini hem de altında `⚡ Önbellek Okuma` değerini tek hücrede göstermektedir.
- Sütun başlıkları HTML `<thead>` içerisinde tanımlıdır.
- Satırlar JavaScript ile dinamik render edilmektedir:
  - **Ana Satırlar (Parent Rows):** `dashboard.py` satır 1424-1448 aralığında.
  - **Alt Görev Satırları (Child Rows):** `dashboard.py` satır 1508-1532 aralığında.

**Öneri:**
Tablodaki "Giriş" sütununu aşağıdaki gibi 4 ayrı sütuna bölüp toplam sütun sayısını 11'e çıkarmalıyız:
1. **Giriş (Input)**
2. **Önbellek Okuma / Hit (Cache Read)**
3. **Önbellek Yazma (Cache Creation)**
4. **Çıkış (Output)**

### A. Table Headers (`<thead>` Değişikliği - Satır ~889)
```html
<tr>
    <th>Oturum...</th>
    <th>Proje...</th>
    <th>Son Aktif...</th>
    <th>Süre...</th>
    <th>Model...</th>
    <th>Dönüş...</th>
    <th>Giriş<span class="info-icon">i<span class="tooltip-text">Bu sohbette harcanan toplam girdi tokenleri (prompt tokens).</span></span></th>
    <th>Önbellek Okuma / Hit<span class="info-icon">i<span class="tooltip-text">Önbelleğe alınmış bağlamlardan (context caching) okunan ve tekrar faturalandırılmayan/indirimli tokenler.</span></span></th>
    <th>Önbellek Yazma<span class="info-icon">i<span class="tooltip-text">Önbelleğe ilk kez yazılan ve sonraki dönüşlerde okunabilecek bağlam tokenleri.</span></span></th>
    <th>Çıkış<span class="info-icon">i<span class="tooltip-text">Bu sohbette üretilen toplam çıktı tokenleri (completion tokens).</span></span></th>
    <th>Tahmini Maliyet...</th>
</tr>
```

### B. Parent Rows (`tr.innerHTML` Değişikliği - Satır ~1424)
Mevcut Giriş ve Çıkış td alanları:
```javascript
<td class="mono" title="${inputTitle}">
    ${formatNumber(s.displayInput)}
    ${cacheHtml}
</td>
<td class="mono">${formatNumber(s.displayOutput)}</td>
```
Aşağıdaki gibi güncellenmelidir (sütun ayrımı yapılarak):
```javascript
<td class="mono">${formatNumber(s.displayInput)}</td>
<td class="mono" style="color: var(--color-cache-read); font-weight: 500;">
    ${s.displayCacheRead > 0 ? `⚡ ${formatNumber(s.displayCacheRead)} <span style="font-size: 10px; color: var(--text-muted); margin-left: 4px;">(%${((s.displayCacheRead / (s.displayInput || 1)) * 100).toFixed(0)})</span>` : '-'}
</td>
<td class="mono" style="color: var(--color-cache-creation); font-weight: 500;">
    ${s.displayCacheCreation > 0 ? `💾 ${formatNumber(s.displayCacheCreation)}` : '-'}
</td>
<td class="mono">${formatNumber(s.displayOutput)}</td>
```

### C. Child Rows (`ctr.innerHTML` Değişikliği - Satır ~1508)
Mevcut Giriş ve Çıkış td alanları:
```javascript
<td class="mono" style="color: var(--text-muted);" title="${childInputTitle}">
    ${formatNumber(c.input)}
    ${childCacheHtml}
</td>
<td class="mono" style="color: var(--text-muted);">${formatNumber(c.output)}</td>
```
Aşağıdaki gibi güncellenmelidir (alt görev satırı renk uyumluluğu için `opacity: 0.7` ile):
```javascript
<td class="mono" style="color: var(--text-muted);">${formatNumber(c.input)}</td>
<td class="mono" style="color: var(--color-cache-read); opacity: 0.7;">
    ${c.cache_read > 0 ? `⚡ ${formatNumber(c.cache_read)} <span style="font-size: 9px; color: var(--text-muted); margin-left: 2px;">(%${((c.cache_read / (c.input || 1)) * 100).toFixed(0)})</span>` : '-'}
</td>
<td class="mono" style="color: var(--color-cache-creation); opacity: 0.7;">
    ${c.cache_creation > 0 ? `💾 ${formatNumber(c.cache_creation)}` : '-'}
</td>
<td class="mono" style="color: var(--text-muted);">${formatNumber(c.output)}</td>
```

---

## 3. Tooltips ve Bilgi İkonları
**Mevcut Durum:**
- Tooltip'ler `.info-icon` ve içindeki `.tooltip-text` span yapıları aracılığıyla CSS ile saf HTML/CSS bazlı tasarlanmıştır.
- `th` içindeki tooltip'ler `th .info-icon .tooltip-text` (satır 750) kuralı ile aşağı yöne (`top: 130%`) açılacak şekilde özelleştirilmiştir.

**Öneri:**
Ayrılan yeni sütunlara da bu şablon birebir uygulanmalıdır:
- **Giriş:** `Giriş<span class="info-icon">i<span class="tooltip-text">Asistana gönderilen toplam girdi token birimleri (prompt tokens).</span></span>`
- **Önbellek Okuma / Hit:** `Önbellek Okuma / Hit<span class="info-icon">i<span class="tooltip-text">Önbelleğe alınmış bağlamlardan okunan ve daha düşük maliyetli/indirimli tokenler.</span></span>`
- **Önbellek Yazma:** `Önbellek Yazma<span class="info-icon">i<span class="tooltip-text">Önbelleğe ilk kez yazılan ve sonraki isteklerde okunabilecek bağlam tokenleri.</span></span>`
- **Çıkış:** `Çıkış<span class="info-icon">i<span class="tooltip-text">Asistan tarafından üretilen toplam çıktı token birimleri (completion tokens).</span></span>`

---

## 4. Estetik Bütünlük ve Metin Çakışmalarını Önleme
**Mevcut Durum:**
- Sütun sayısı 11'e çıktığında, dar ekranlarda veya küçük pencere boyutlarında sütun içerikleri birbirinin üzerine binebilir.
- `.table-responsive` sınıfı `overflow-x: auto` ve `width: 100%` kurallarına sahiptir; bu sayede tablo genişliği sığmadığında yatay kaydırma çubuğu çıkmaktadır.

**Öneri:**
- Hücre içi metinlerin kırılmasını (wrap) ve çakışmasını engellemek için `th` ve `td` öğelerine `white-space: nowrap` eklenmelidir.
- Koyu uzay temasına (Dark Space Theme) sadık kalınarak, pasif/sıfır olan önbellek değerlerinde `-` karakteri `var(--text-muted)` rengiyle sönük gösterilmeli, aktif önbellek değerlerinde ise mevcut `--color-cache-read` (#10b981) ve `--color-cache-creation` (#06b6d4) renkleri kullanılmalıdır.

**CSS Güncellemesi (Satır ~543-553):**
```css
th {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 8px 12px;
    border-bottom: 1px solid var(--card-border);
    font-weight: 700;
    letter-spacing: 0.8px;
    white-space: nowrap; /* Metin kırılmasını engeller */
}

td {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    font-size: 13px;
    color: var(--text-main);
    vertical-align: middle;
    white-space: nowrap; /* Metin kırılmasını engeller */
}
```

---

## 5. Mevcut Testlerin Durumu
- `tests/test_dashboard.py` dosyası incelenmiştir.
- Mevcut testler:
  1. `test_dashboard_home`: Ana sayfanın yüklenmesini denetler.
  2. `test_dashboard_api_data`: `/api/data` JSON formatını doğrular.
  3. `test_dashboard_api_scan`: `/api/scan` tetikleme API'sini doğrular.
  4. `test_dashboard_404`: Olmayan yolların 404 döndürdüğünü test eder.
- Testler `python3 -m pytest -x -q -p no:cacheprovider` komutu ile çalıştırılmış ve **tüm testlerin (14 passed) başarıyla geçtiği** doğrulanmıştır.
- Yapılacak değişiklikler tamamen HTML/CSS/JS frontend katmanında olduğu ve `/api/data` API formatını etkilemediği için bu testlerin kırılması beklenmemektedir.
