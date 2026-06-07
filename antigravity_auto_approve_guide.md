# Google Antigravity 2.0 Otomatik Onay (Auto-Approve) Yapılandırma Kılavuzu

Google Antigravity 2.0'ın sürekli geliştirme (continuous development) süreçlerinde terminal komutları, dosya yazma ve okuma işlemleri gibi durumlar için sizden sürekli onay (approval) istemesini engellemek ve işlemleri tam otonom hale getirmek için aşağıdaki yapılandırmaları uygulayabilirsiniz.

---

## 1. Antigravity IDE (Arayüz) Üzerinden Yapılandırma

Antigravity IDE, VS Code tabanlı olduğu için bu ayarları kullanıcı arayüzü (UI) üzerinden kolayca yönetebilirsiniz:

1. **Settings Sayfasını Açın:**
   * macOS için `Cmd + ,` kısayolunu kullanın.
   * Windows / Linux için `Ctrl + ,` kısayolunu kullanın.
   * Alternatif olarak, sol alt köşedeki **Settings** (Çark simgesi) simgesine tıklayabilirsiniz.
   
2. **Terminal Execution Policy Ayarını Değiştirin:**
   * Arama çubuğuna `Terminal Execution Policy` veya `Antigravity` yazın.
   * Karşınıza çıkan **Terminal Execution Policy** seçeneğini bulun. Varsayılan olarak `Request review` (Onay iste) olan bu değeri **`Always proceed`** (Her zaman devam et/onayla) olarak güncelleyin.
   * Bu ayar, agent'ın terminal üzerinde çalıştıracağı komutların (örn: `git`, `npm install`, `npx` vb.) otomatik olarak onaylanmasını sağlar.

3. **Review Policy Ayarını Güncelleyin:**
   * Settings aramasında **Review Policy** (İnceleme Politikası) ayarını aratın.
   * Bu ayarı **`Always proceed`** durumuna getirdiğinizde, agent'ın oluşturduğu planlar (implementation plan) ve dosya değişiklikleri için sizden manuel onay isteme adımı tamamen devre dışı kalacaktır.

4. **JavaScript Execution Policy Ayarını Güncelleyin:**
   * Web tarama (browser automation) ve web tabanlı MCP entegrasyonlarının onay istemeden çalışabilmesi için **JavaScript Execution Policy** ayarını **`Always proceed`** yapın.

---

## 2. Terminal Sandbox Özelliğini Devre Dışı Bırakma (Alternatif)

Antigravity'nin komutları çalıştırırken kullandığı Terminal Sandbox yapısını devre dışı bırakmak da onay döngülerini azaltacaktır. 

Bunu global olarak uygulamak için `/Users/armaganercan/Library/Application Support/Antigravity IDE/User/settings.json` dosyanıza şu parametreyi ekleyebilirsiniz:

```json
{
  "enableTerminalSandbox": false
}
```

---

## 3. Antigravity CLI Üzerinde Otomatik Onay

Eğer Antigravity'yi terminal (CLI) üzerinden kullanıyorsanız, onay pencerelerini aşmak için şu yöntemleri uygulayabilirsiniz:

* **İnteraktif Konfigürasyon:** Terminalde `/config` veya `/settings` slash command'ini yazarak interaktif ayar menüsünü açabilir ve izin listelerini (allow list) buradan yönetebilirsiniz.
* **Geçici Bypass Flag'i:** CLI'ı başlatırken onay mekanizmasını tamamen devre dışı bırakmak için `--dangerously-skip-permissions` parametresini kullanabilirsiniz:
  ```bash
  antigravity --dangerously-skip-permissions
  ```

> [!WARNING]
> **Güvenlik Uyarısı:** Onay mekanizmasını tamamen devre dışı bırakmak (auto-approve), agent'ın sisteminizde kontrolsüz komutlar çalıştırmasına olanak tanır. Güvenilmeyen projelerde veya harici kod depolarında bu ayarın açık olması güvenlik riskleri barındırır.
