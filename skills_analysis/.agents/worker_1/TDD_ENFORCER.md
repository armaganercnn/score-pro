# TDD Enforcer

## Purpose / Amaç
Bu skill, Test-Driven Development (TDD) metodolojisini ve test kapsamını (test coverage) güvence altına almak için tasarlanmıştır. Yazılan her yeni kodun veya değiştirilen davranışın uygun test senaryolarına sahip olmasını ve sahte (dummy/facade) testler yazılmamasını denetler.

## Prompt Template / Prompt Şablonu
Aşağıdaki prompt şablonu, bir LLM'e veya geliştirici asistana TDD pratiklerini zorunlu kılmak için kullanılır:

```markdown
# TDD Enforcer Instruction

Sen bir TDD (Test-Driven Development) ve test kalitesi denetçisisin. Kod yazarken ve entegre ederken aşağıdaki kurallara kesinlikle uymalısın:

1. **Önce Test (Test-First Approach)**:
   - Yeni bir özellik eklemeden veya bir hatayı düzeltmeden önce, davranışı tanımlayan başarısız bir test (failing test) yazılmalıdır.
2. **Sahte Test Yasağı (No Dummy/Empty Tests)**:
   - Yazılan her test dosyası ve fonksiyonu, gerçek davranışları kontrol eden anlamlı iddialar (`assert` veya unittest assertion metotları) içermelidir. Hiçbir assert içermeyen içi boş testler kesinlikle yasaktır.
3. **Birebir Eşleşme (Code-Test Co-location)**:
   - Eklenen veya değiştirilen her kaynak dosyası (`foo.py`) için mutlaka bir test dosyası (`test_foo.py` veya `foo_test.py`) bulunmalı veya güncellenmelidir.

Kod üretmeden önce, yazacağın testlerin listesini ve doğrulayacakları edge case'leri açıkla.
```

## Helper Script / Yardımcı Script (`test_runner_checker.py`)
Bu script, kaynak kod dizinindeki kaynak dosyaları ile test dosyaları arasındaki ilişkiyi inceler ve test dosyalarındaki assertion (iddia) sayısını AST aracılığıyla denetler. Ayrıca isteğe bağlı olarak test suite'i çalıştırabilir.

### Özellikler (Features)
- **Sahte Test Kontrolü**: Test dosyalarının içinde gerçekten `assert` veya `self.assert*` ifadesi olup olmadığını denetler.
- **Eşleşme Denetimi**: Her `.py` dosyası için karşılık gelen bir `test_*.py` veya `*_test.py` olup olmadığını raporlar.
- **Otomatik Test Çalıştırma**: `--run` argümanı ile test komutunu (örn: `pytest`) tetikler ve sonucunu değerlendirir.

### Kullanım (Usage)
```bash
# Sadece statik test dosyası ve assertion kontrollerini yapmak için:
python3 test_runner_checker.py --path <proje_dizini>

# Statik kontrollerin yanı sıra testleri de çalıştırmak için:
python3 test_runner_checker.py --path <proje_dizini> --run --cmd "pytest"
```
