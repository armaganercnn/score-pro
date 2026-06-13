# Clean Code & Simplifier

## Purpose / Amaç
Bu skill, yazılan kodun okunabilirliğini, bakım kolaylığını (maintainability) artırmak ve karmaşıklığı en aza indirmek için tasarlanmıştır. Uzun metotları, aşırı iç içe geçmiş (nested) kontrol yapılarını (if/else/loops) ve yüksek bilişsel karmaşıklığı (cognitive complexity) erken aşamada tespit edip sadeleştirmeye zorlar.

## Prompt Template / Prompt Şablonu
Aşağıdaki prompt şablonu, bir LLM'e veya kod üretici asistana kod sadeleştirme ve temiz kod prensipleri (Clean Code Principles) uygulama talimatı vermek için kullanılır:

```markdown
# Clean Code & Simplifier Instruction

Sen bir temiz kod (Clean Code) ve sadelik denetçisisin. Kod yazarken veya düzenlerken aşağıdaki kurallara kesinlikle uymalısın:

1. **Tek Sorumluluk Prensibi (Single Responsibility Principle - SRP)**:
   - Her fonksiyon veya sınıf sadece tek bir işi yapmalıdır. Çok amaçlı "tanrı" fonksiyonlardan (god functions) kaçın.
2. **Fonksiyon Boyutu (Function Length Limit)**:
   - Bir fonksiyonun uzunluğu gövde dahil 40 satırı geçmemelidir. Gerekirse alt fonksiyonlara (helper functions) parçala.
3. **Bilişsel Karmaşıklık (Cyclomatic/Cognitive Complexity)**:
   - İç içe geçen (nested) koşul yapılarını (`if`/`loop`) en fazla 3 derinlik seviyesinde tut.
   - Hızlı geri dönüş (Early Return / Guard Clauses) desenlerini tercih et. Aşırı `else` blokları yerine koşul sağlanmadığı anda fonksiyondan çık.
4. **Kendini Tekrar Etme (DRY - Don't Repeat Yourself)**:
   - Tekrarlanan kod bloklarını ortak metotlarda birleştir.

Kodu teslim etmeden önce karmaşıklık analizini yap ve en sade haliyle sun.
```

## Helper Script / Yardımcı Script (`complexity_analyser.py`)
Bu script, Python dosyalarındaki fonksiyonların satır sayılarını ve McCabe siklomatik karmaşıklığını (Cyclomatic Complexity) AST (Abstract Syntax Tree) aracılığıyla analiz eder. Belirlenen limitleri (varsayılan: karmaşıklık > 10, uzunluk > 40 satır) aşan fonksiyonları raporlar.

### Özellikler (Features)
- AST Parser ile doğrudan Python syntax ağacını analiz ederek karar noktalarını (decision points: `if`, `for`, `while`, `try`, `except`, `and`, `or`, vb.) doğru bir şekilde sayar.
- CLI üzerinden limitlerin dinamik olarak ayarlanabilmesini sağlar.
- CI/CD ve git hook süreçlerine entegre edilebilir exit code desteği sunar.

### Kullanım (Usage)
```bash
python3 complexity_analyser.py --path <proje_dizini_veya_dosyasi> --max-complexity 10 --max-length 40
```
