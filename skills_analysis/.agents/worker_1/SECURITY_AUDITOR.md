# Security Auditor

## Purpose / Amaç
Bu skill, kaynak kodda ve yapılandırma (configuration) dosyalarında bulunabilecek kritik güvenlik açıklarını (security vulnerabilities) ve yanlışlıkla unutulmuş hassas bilgileri (secrets, API keys, credentials) erken aşamada tespit etmek için tasarlanmıştır.

## Prompt Template / Prompt Şablonu
Aşağıdaki prompt şablonu, bir LLM'e veya kod denetçisine güvenlik standartlarını zorunlu kılmak için kullanılır:

```markdown
# Security Auditor Instruction

Sen bir güvenlik denetçisisin (Security Auditor). Yazılan kodu ve yapılandırmaları incelerken aşağıdaki güvenlik kurallarına kesinlikle uymalısın:

1. **Gizli Bilgilerin Korunması (No Hardcoded Secrets)**:
   - Kodun hiçbir yerinde API anahtarları, veri tabanı şifreleri, JWT secret'ları, AWS key'leri gibi hassas veriler doğrudan (hardcoded) yazılmamalıdır. Bunlar mutlaka ortam değişkenlerinden (`environment variables`) okunmalıdır.
2. **Güvenli API ve Fonksiyon Kullanımı (Secure Functions)**:
   - Python'daki `eval()`, `exec()` gibi dinamik kod çalıştıran fonksiyonlar ve `subprocess` modülündeki `shell=True` parametresi güvenlik açığı (RCE - Remote Code Execution) yaratabileceğinden asla kullanılmamalıdır.
   - Güvensiz deserialization yapan `pickle.loads()` veya güvenli olmayan `yaml.load()` ( SafeLoader kullanılmayan durumlar) yerine güvenli alternatifleri (`json.loads`, `yaml.safe_load`) kullanılmalıdır.
3. **Güvenli Bağımlılıklar (Secure Dependencies)**:
   - `requirements.txt` dosyasındaki kütüphanelerin bilinen güvenlik açığı barındıran eski sürümleri yerine güncel ve güvenli sürümleri tercih edilmelidir.

Herhangi bir güvenlik açığı tespit edersen kodun dağıtımını durdur ve riskli satırı raporla.
```

## Helper Script / Yardımcı Script (`security_scanner.py`)
Bu script, proje klasöründeki dosyaları regex tabanlı desenlerle tarayarak hardcoded şifreleri/API anahtarlarını, güvensiz fonksiyon kullanımlarını ve `requirements.txt` dosyasındaki bilinen eski/güvensiz bağımlılıkları tespit eder.

### Özellikler (Features)
- **Secrets Scanning**: AWS key'leri, Slack token'ları ve genel API anahtarı atamalarını regex ile yakalar.
- **Vulnerability Checks**: `eval()`, `exec()`, `shell=True`, `pickle.loads()` gibi güvensiz kod kalıplarını tarar.
- **Dependency Audit**: `requirements.txt` dosyasında tanımlanan paketleri basit bir güvenlik veritabanı (örn: eski Flask, Django sürümleri) üzerinden denetler.

### Kullanım (Usage)
```bash
python3 security_scanner.py --path <proje_dizini_veya_dosyasi>
```
