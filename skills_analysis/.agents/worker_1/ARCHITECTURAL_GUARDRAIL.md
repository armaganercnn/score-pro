# Architectural Guardrail

## Purpose / Amaç
Bu skill, yazılım projesinin katmanlı mimarisini (layered architecture), bağımlılık kurallarını (dependency rules) ve modüler sınırlarını (boundaries) korumak için tasarlanmıştır. Modüller arası istenmeyen veya döngüsel bağımlılıkların (circular dependencies) oluşmasını otomatik olarak engeller.

## Prompt Template / Prompt Şablonu
Aşağıdaki prompt şablonu, bir LLM'e veya kod üretici asistana mimari kısıtları empoze etmek ve kod üretirken katman sınırlarına saygı duyulmasını sağlamak için kullanılabilir:

```markdown
# Architectural Guardrail Instruction

Sen bir mimari koruma (Architectural Guardrail) denetçisisin. Kod yazarken, refactoring yaparken ve yeni modüller eklerken aşağıdaki kurallara kesinlikle uymalısın:

1. **Katman Bağımlılığı Kuralı (Layer Dependency Rule)**:
   - Sunum/Arayüz katmanı (`presentation` veya `ui`), doğrudan veri tabanı (`db`/`data`) katmanına bağımlı olmamalıdır. Veri tabanı işlemleri sadece `domain` veya `application` katmanı servisleri üzerinden yürütülmelidir.
   - İş mantığı katmanı (`domain` veya `core`), framework'lerden veya dış kütüphanelerden bağımsız (pure) olmalıdır.
2. **Döngüsel Bağımlılık Yasağı (No Circular Dependencies)**:
   - Modüller arasında döngüsel bağımlılık (örneğin A'nın B'yi import etmesi ve B'nin de A'yı import etmesi) kesinlikle yasaktır.
3. **Erişim Kısıtlamaları (Access Control)**:
   - Sadece public API veya facade sınıfları dış modüllere açılmalıdır. Modül içi internal detaylar dışarıdan import edilmemelidir.

Kod yazmaya başlamadan önce, bu kuralların ihlal edilip edilmediğini kontrol et. Eğer önerilen değişiklik bu kuralları ihlal ediyorsa, değişikliği yapmayı reddet ve hatayı gerekçesiyle açıkla.
```

## Helper Script / Yardımcı Script (`guardrail_auditor.py`)
Bu script, Python projelerindeki import'ları AST (Abstract Syntax Tree) kullanarak statik olarak analiz eder ve tanımlanan mimari kuralları ihlal eden dosyaları raporlar.

### Özellikler (Features)
- Python AST modülü ile dosya bazlı import analizi (hem `import x` hem de `from x import y` biçimlerini yakalar).
- JSON tabanlı kural yapılandırması (varsayılan kurallar presentation, ui ve domain katmanlarını denetler).
- İhlal durumunda `non-zero` exit code (1) döndürerek CI/CD pipeline'larında veya git hook'larında doğrudan kullanılabilir.

### Kullanım (Usage)
```bash
python3 guardrail_auditor.py --path <proje_dizini> --rules <rules_config.json>
```

**Örnek `rules.json`:**
```json
{
  "forbidden_imports": {
    "presentation": ["db", "sqlalchemy", "psycopg2"],
    "ui": ["db", "database"],
    "domain": ["flask", "fastapi", "django", "ui"]
  }
}
```
