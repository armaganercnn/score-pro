# Özel Agent Yetenek ve Yapı Desenleri Analiz Raporu

Bu rapor, yazılım geliştirme süreçlerinde kullanılabilecek 5 farklı özel agent yeteneğini ve yapı desenini kişisel kullanım (personal use) odağında incelemektedir. Raporda her bir yeteneğin tanımı, çalışma şekli, faydaları, maliyetleri, riskleri, ilgili prompt şablonları ve yardımcı Python scriptleri detaylandırılmıştır.

## 1. Architectural Guardrail

### 1.1. Tanım ve Çalışma Şekli
Architectural Guardrail, agent'ın yazılım geliştirme sürecinde belirlenen sistem mimarisine, dizin yapısına, tasarım desenlerine ve kodlama standartlarına sadık kalmasını sağlayan kontrol mekanizmasıdır. 

**Çalışma Şekli (Workflow):**
1. Kod yazım aşamasında veya commit öncesinde, agent'ın yapacağı değişiklikler tanımlanmış mimari kurallar listesi ile karşılaştırılır.
2. Örneğin, projenin modüler yapısında katmanlar arası doğrudan erişim yasağı varsa veya `.agents/` klasörü altına kaynak kod yazılmaması gerekiyorsa, statik analiz araçları veya kural denetleyici LLM modülleri devreye girer.
3. Kural ihlali tespit edildiğinde, agent'a otomatik geri bildirim verilerek kodun düzeltilmesi istenir.

### 1.2. Fayda ve Maliyet/Risk Analizi
- **Sisteme Katacağı Faydalar**:
* **Kod Tabanı Tutarlılığı (Consistency):** Kişisel projelerde zamanla oluşabilecek spagetti kod yapısını ve teknik borçlanmayı (technical debt) önler.
* **Hataları Erken Yakalama:** Yanlış dizinlere dosya yazma veya hatalı bağımlılık (dependency) oluşturma gibi yapısal hatalar daha kod derlenmeden çözülür.
* **Kalite Artışı (Quality Increase):** Kodun standartlara uygun ve düzenli kalmasını sağlar.
- **Maliyetler ve Riskler**:
* **API Maliyeti (API Cost):** Kodun mimari kurallara uygunluğunu kontrol etmek için yapılan her LLM sorgusu ek token tüketimi ve maliyet yaratır.
* **Gecikme Süresi (Latency):** Kodun her aşamada denetlenmesi, geliştirme döngüsünün (feedback loop) uzamasına neden olur.
* **Geliştirici Blokajı ve Bağlam Kayması (Context Drift):** Aşırı katı mimari kurallar, hızlı prototipleme (prototyping) yaparken agent'ın veya kullanıcının odaklanmasını zorlaştırabilir, küçük bir değişiklik için tüm yapıyı değiştirmek zorunda bırakabilir.
- **Bireysel Kullanım Değerlendirmesi ("Gerçekten İhtiyacımız Var mı?")**:
**Bireysel kullanım için orta derecede gereklidir.** Eğer çok küçük ölçekli, tek kullanımlık (disposable) scriptler yazılıyorsa Architectural Guardrail aşırı mühendislik (over-engineering) olacaktır. Ancak kişisel proje büyüdükçe veya birden fazla agent aynı projede iş birliği yaptıkça, projenin çığırından çıkmasını önlemek için hafifletilmiş (lightweight) bir mimari denetim mekanizması oldukça faydalıdır.

---

### 1.3. Prompt Şablonu (SKILL.md Formatı)
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

### 1.4. Yardımcı Script Taslağı (Python)
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

**Script Kodları (`guardrail_auditor.py`):**
```python
#!/usr/bin/env python3
import os
import ast
import json
import sys
import argparse

DEFAULT_RULES = {
    "forbidden_imports": {
        "presentation": ["db", "database", "sqlalchemy", "psycopg2", "mysql"],
        "ui": ["db", "database", "sqlalchemy", "psycopg2", "mysql"],
        "domain": ["flask", "fastapi", "django", "sqlalchemy", "requests", "ui", "presentation"]
    }
}

class ImportVisitor(ast.NodeVisitor):
    def __init__(self):
        self.imports = []

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append((alias.name, node.lineno))
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            self.imports.append((node.module, node.lineno))
        self.generic_visit(node)

def audit_file(file_path, rules):
    violations = []
    # Normalize path and split into components
    normalized_path = os.path.normpath(file_path)
    parts = normalized_path.split(os.sep)
    
    # Determine which rule keys match the file path components
    matched_keys = []
    for key in rules.get("forbidden_imports", {}):
        if key in parts:
            matched_keys.append(key)
    
    if not matched_keys:
        return violations

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=file_path)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return violations

    visitor = ImportVisitor()
    visitor.visit(tree)

    for imp, lineno in visitor.imports:
        for key in matched_keys:
            forbidden_list = rules["forbidden_imports"][key]
            for forbidden in forbidden_list:
                # Check if the imported module starts with or matches forbidden import
                if imp == forbidden or imp.startswith(forbidden + "."):
                    violations.append({
                        "file": file_path,
                        "line": lineno,
                        "imported": imp,
                        "rule_key": key,
                        "forbidden": forbidden
                    })

    return violations

def main():
    parser = argparse.ArgumentParser(description="Architectural Guardrail Auditor")
    parser.add_argument("--path", default=".", help="Project directory to scan")
    parser.add_argument("--rules", help="Path to JSON file containing architectural rules")
    args = parser.parse_args()

    rules = DEFAULT_RULES
    if args.rules:
        if os.path.exists(args.rules):
            try:
                with open(args.rules, "r") as f:
                    rules = json.load(f)
            except Exception as e:
                print(f"Failed to load rules JSON: {e}")
                sys.exit(1)
        else:
            print(f"Rules file {args.rules} not found. Using default rules.")

    print("Running Architectural Guardrail Auditor...")
    print(f"Rules: {json.dumps(rules, indent=2)}")
    print(f"Scanning directory: {args.path}")

    all_violations = []
    for root, _, files in os.walk(args.path):
        # Skip hidden files and directories (except '.' and '..')
        if any(part.startswith('.') and part not in ['.', '..'] for part in root.split(os.sep)):
            continue
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                violations = audit_file(file_path, rules)
                all_violations.extend(violations)

    if all_violations:
        print("\n[!] Architectural Guardrail Violations Found:")
        for v in all_violations:
            print(f"  {v['file']}:{v['line']} - Domain/Layer '{v['rule_key']}' is importing '{v['imported']}' which is forbidden (matches rule '{v['forbidden']}')")
        sys.exit(1)
    else:
        print("\n[+] No architectural violations found. Guardrails intact.")
        sys.exit(0)

if __name__ == "__main__":
    main()

```

## 2. Session Handoff

### 2.1. Tanım ve Çalışma Şekli
Session Handoff, bir agent'ın görevini tamamladığında, bağlam limiti (context limit) dolduğunda veya görevi başka bir uzman agent'a devrederken mevcut durumu, atılan adımları ve kalan işleri standartlaştırılmış bir rapor halinde aktarması sürecidir.

**Çalışma Şekli (Workflow):**
1. Agent çalışmasını bitirmeden veya yeni bir seansa geçilmeden önce mevcut iş durumunu analiz eder.
2. Bir devir dosyası (`handoff.md`) oluşturur. Bu dosya; yapılan gözlemleri (observations), mantık zincirini (logic chain), varsayımları/riskleri (caveats), ulaşılan sonucu (conclusion) ve doğrulama yöntemlerini (verification method) içerir.
3. Sonraki agent veya yeni seans bu devir dosyasını okuyarak geçmiş konuşma geçmişini (chat history) tamamen yüklemek zorunda kalmadan doğrudan işe başlar.

### 2.2. Fayda ve Maliyet/Risk Analizi
- **Sisteme Katacağı Faydalar**:
* **Büyük Oranda Token Tasarrufu (Token Saving):** Tüm konuşma geçmişinin (context) her seferinde yeniden yüklenmesini engeller. Sadece özet raporun okunması yeterlidir.
* **Bağlam Taşmasını (Context Overflow) Önleme:** LLM'in bağlam penceresini gereksiz geçmişle doldurmayarak daha doğru kararlar almasını sağlar.
* **Süreklilik:** Agent'ın yarıda kalan işleri unutmadan, sonraki seansa pürüzsüz aktarmasını sağlar.
- **Maliyetler ve Riskler**:
* **Yazma Gecikmesi (Latency):** Her adımın sonunda standart bir rapor hazırlamak ek bir işlem süresi gerektirir.
* **Bilgi Kaybı / Eksik Aktarım:** Handoff raporunu hazırlayan agent önemli bir detayı atlar veya yanlış aktarırsa, sonraki agent yanlış bilgi üzerinden devam eder ve hata zinciri (cascading failure) oluşur.
- **Bireysel Kullanım Değerlendirmesi ("Gerçekten İhtiyacımız Var mı?")**:
**Bireysel kullanım için kesinlikle gereklidir.** Özellikle uzun süren, birden fazla aşamadan oluşan kişisel projelerde LLM token limitleri ve maliyetleri hızlıca yükselebilir. Session Handoff hem maliyeti düşürür hem de agent'ın konudan sapmasını (context drift) engeller. Birden fazla agent'ın çalıştığı senaryolarda ise kaçınılmaz bir zorunluluktur.

---

### 2.3. Prompt Şablonu (SKILL.md Formatı)
```markdown
# Session Handoff Prompt

Lütfen bu geliştirme oturumunun sonunda aşağıdaki 5 bileşenden oluşan bir `handoff.md` raporu oluştur:

1. **Observation (Gözlem)**: Doğrudan gözlemlediğin somut verileri belirt (değişen dosya yolları, satır numaraları, birebir hata mesajları, çalıştırılan komutlar ve sonuçları).
2. **Logic Chain (Mantık Zinciri)**: Gözlemlerden ulaştığın çıkarımlara giden adım adım mantık yürütmeni açıkla. Her adım bir gözleme dayanmalıdır.
3. **Caveats (Kısıtlar/Uygarılar)**: İncelemediğin alanları, yaptığın varsayımları ve değerlendirdiğin alternatif çözümleri belirt. Kısıt yoksa "No caveats" yaz.
4. **Conclusion (Sonuç)**: Mantık zinciri tarafından desteklenen nihai durum ve yapılan değişikliklerin özeti.
5. **Verification Method (Doğrulama Yöntemi)**: Yapılan değişikliklerin nasıl test edileceğini açıklayan net adımlar ve komutlar (örn: `pytest`, `cargo test`, veya manuel test adımları).
```

### 2.4. Yardımcı Script Taslağı (Python)
Bu script, geliştirme dizinindeki git durumunu (`git status`, `git diff`, son commit'ler) otomatik olarak analiz eder ve yukarıdaki 5 bileşenli handoff şablonunu doldurarak bir taslak (`handoff_draft.md`) oluşturur.

### Özellikler (Features)
- Git entegrasyonu: Değiştirilen dosyaları, untracked dosyaları ve git logunu otomatik okur.
- Otomatik şablon dolumu: Değişiklikleri "Observation" ve "Conclusion" alanlarına yerleştirir.
- Git olmayan dizinlerde fallback: Klasör taraması ile mevcut dosyaları listeler.

### Kullanım (Usage)
```bash
python3 handoff_generator.py --dir <proje_dizini> --output <cikti_dosya_adi.md>
```

**Script Kodları (`handoff_generator.py`):**
```python
#!/usr/bin/env python3
import os
import subprocess
import sys
import argparse

HANDOFF_TEMPLATE = """# Handoff Report - {timestamp}

## 1. Observation
{observation_content}

## 2. Logic Chain
- [ ] Logic Step 1: Based on observation, we need to ...
- [ ] Logic Step 2: Therefore, we changed ...

## 3. Caveats
{caveats_content}

## 4. Conclusion
{conclusion_content}

## 5. Verification Method
{verification_content}
"""

def run_cmd(cmd, cwd=None):
    try:
        res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd)
        if res.returncode == 0:
            return res.stdout.strip()
        return f"Error running '{cmd}': {res.stderr.strip()}"
    except Exception as e:
        return f"Exception executing command '{cmd}': {e}"

def main():
    parser = argparse.ArgumentParser(description="Session Handoff Generator")
    parser.add_argument("--dir", default=".", help="Project directory")
    parser.add_argument("--output", default="handoff_draft.md", help="Output draft file name")
    args = parser.parse_args()

    target_dir = os.path.abspath(args.dir)
    print(f"Generating handoff draft for directory: {target_dir}")

    # Check if git repository
    is_git = False
    git_check = run_cmd("git rev-parse --is-inside-work-tree", cwd=target_dir)
    if "true" in git_check.lower():
        is_git = True

    timestamp = run_cmd("date +'%Y-%m-%dT%H:%M:%S%z'")

    observation_content = ""
    conclusion_content = ""
    caveats_content = "No caveats."
    verification_content = ""

    if is_git:
        print("Git repository detected. Extracting recent changes...")
        # Get status
        status = run_cmd("git status --short", cwd=target_dir)
        # Get recent commits
        recent_commits = run_cmd("git log -n 5 --oneline", cwd=target_dir)
        # Get diff stat
        diff_stat = run_cmd("git diff --stat", cwd=target_dir)

        observation_content += "### Modified and Untracked Files:\n"
        if status:
            observation_content += f"```\n{status}\n```\n"
        else:
            observation_content += "No local modifications.\n"

        if diff_stat:
            observation_content += f"\n### Diff Stat:\n```\n{diff_stat}\n```\n"

        observation_content += f"\n### Recent Commits:\n```\n{recent_commits}\n```\n"
        
        conclusion_content = "### Completed Actions:\n"
        if status:
            conclusion_content += "Implemented changes in files:\n"
            for line in status.splitlines():
                parts = line.strip().split()
                if len(parts) >= 2:
                    conclusion_content += f"- Modified `{parts[-1]}`\n"
        else:
            conclusion_content += "- Codebase is up to date with no local changes.\n"
        
        verification_content = "### Verification Steps:\n1. Check git status to ensure changes are correct.\n2. Run automated test suite: `pytest` or `cargo test` depending on project type."
    else:
        print("Not a git repository. Listing directory contents...")
        files = []
        for root, _, filenames in os.walk(target_dir):
            if any(part.startswith('.') for part in root.split(os.sep)):
                continue
            for f in filenames:
                files.append(os.path.relpath(os.path.join(root, f), target_dir))
        
        observation_content = "### Directory Files:\n" + "\n".join(f"- {f}" for f in files[:20])
        if len(files) > 20:
            observation_content += f"\n... and {len(files) - 20} more files."
        
        conclusion_content = "- Manual check completed. List of files analyzed."
        verification_content = "- Run files manually to verify their functionality."

    content = HANDOFF_TEMPLATE.format(
        timestamp=timestamp,
        observation_content=observation_content,
        caveats_content=caveats_content,
        conclusion_content=conclusion_content,
        verification_content=verification_content
    )

    output_path = os.path.join(target_dir, args.output)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[+] Handoff draft generated successfully at: {output_path}")
    except Exception as e:
        print(f"[-] Failed to write handoff draft: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

```

## 3. Clean Code & Simplifier

### 3.1. Tanım ve Çalışma Şekli
Clean Code & Simplifier, agent tarafından yazılan kodun karmaşıklığını azaltmak, okunabilirliğini artırmak ve gereksiz kod parçalarını (boilerplate, dead code) temizlemek amacıyla uygulanan refactoring yeteneğidir.

**Çalışma Şekli (Workflow):**
1. Kod yazıldıktan sonra veya bağımsız bir gözden geçirme (code review) adımında, yazılan fonksiyonlar karmaşıklık analizi (cyclomatic complexity) ve okunabilirlik kriterlerine göre taranır.
2. Çok uzun fonksiyonlar, gereksiz iç içe geçmiş döngüler (nested loops) veya anlamsız değişken tanımlamaları tespit edilir.
3. Kod, aynı işlevi daha sade, anlaşılır ve temiz bir şekilde gerçekleştirecek biçimde yeniden düzenlenir (refactoring).

### 3.2. Fayda ve Maliyet/Risk Analizi
- **Sisteme Katacağı Faydalar**:
* **Okunabilirlik ve Bakım Kolaylığı:** Kodun geliştirici tarafından kolayca anlaşılmasını ve gelecekte kolayca değiştirilebilmesini sağlar.
* **Gelecekteki Token Tasarrufu:** Daha az kod satırı, agent'ın sonraki adımlarda kodu okurken daha az token tüketmesi anlamına gelir.
* **Hata (Bug) Azaltma:** Sade kodda mantık hataları daha kolay fark edilir ve gizli bug'ların barınma ihtimali düşer.
- **Maliyetler ve Riskler**:
* **Davranış Bozulması (Regression):** Kod sadeleştirilirken mevcut işlevlerin istemeden bozulması riski vardır. Güçlü test mekanizmaları yoksa risk büyüktür.
* **Ek API Maliyeti ve Gecikme:** Refactoring adımı ek LLM analizi ve kod yazımı gerektirdiğinden zaman ve bütçe maliyeti oluşturur.
- **Bireysel Kullanım Değerlendirmesi ("Gerçekten İhtiyacımız Var mı?")**:
**Bireysel kullanım için yüksek derecede faydalıdır.** Yapay zeka agent'ları sıklıkla gereksiz yere uzun, tekrarlı veya aşırı genel (AI slop) kodlar üretebilir. Bireysel geliştiricinin bu kodları elle temizlemesi zaman alıcıdır. Clean Code & Simplifier yeteneği, kod tabanını temiz tutarak geliştiricinin zihinsel yükünü hafifletir.

---

### 3.3. Prompt Şablonu (SKILL.md Formatı)
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

### 3.4. Yardımcı Script Taslağı (Python)
Bu script, Python dosyalarındaki fonksiyonların satır sayılarını ve McCabe siklomatik karmaşıklığını (Cyclomatic Complexity) AST (Abstract Syntax Tree) aracılığıyla analiz eder. Belirlenen limitleri (varsayılan: karmaşıklık > 10, uzunluk > 40 satır) aşan fonksiyonları raporlar.

### Özellikler (Features)
- AST Parser ile doğrudan Python syntax ağacını analiz ederek karar noktalarını (decision points: `if`, `for`, `while`, `try`, `except`, `and`, `or`, vb.) doğru bir şekilde sayar.
- CLI üzerinden limitlerin dinamik olarak ayarlanabilmesini sağlar.
- CI/CD ve git hook süreçlerine entegre edilebilir exit code desteği sunar.

### Kullanım (Usage)
```bash
python3 complexity_analyser.py --path <proje_dizini_veya_dosyasi> --max-complexity 10 --max-length 40
```

**Script Kodları (`complexity_analyser.py`):**
```python
#!/usr/bin/env python3
import os
import ast
import sys
import argparse

class ComplexityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.functions = []

    def visit_FunctionDef(self, node):
        self._analyze_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        self._analyze_function(node)
        self.generic_visit(node)

    def _analyze_function(self, node):
        complexity = 1
        # Traverse node's children to count decision points
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.ExceptHandler, ast.With, ast.Assert)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.IfExp):
                complexity += 1
            elif isinstance(child, ast.comprehension):
                complexity += 1

        # Calculate line length
        start_line = node.lineno
        end_line = getattr(node, "end_lineno", start_line)
        length = end_line - start_line + 1

        self.functions.append({
            "name": node.name,
            "line": start_line,
            "complexity": complexity,
            "length": length
        })

def analyze_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            tree = ast.parse(content, filename=file_path)
    except Exception as e:
        return None, f"Error parsing: {e}"

    visitor = ComplexityVisitor()
    visitor.visit(tree)
    return visitor.functions, None

def main():
    parser = argparse.ArgumentParser(description="Clean Code & Complexity Analyser")
    parser.add_argument("--path", default=".", help="Directory or file to scan")
    parser.add_argument("--max-complexity", type=int, default=10, help="Maximum allowed cyclomatic complexity")
    parser.add_argument("--max-length", type=int, default=40, help="Maximum allowed lines per function")
    args = parser.parse_args()

    target = os.path.abspath(args.path)
    print("Running Clean Code & Complexity Analyser...")
    print(f"Limits: max-complexity={args.max_complexity}, max-length={args.max_length}")
    print(f"Scanning target: {target}")

    python_files = []
    if os.path.isfile(target):
        if target.endswith(".py"):
            python_files.append(target)
    else:
        for root, _, files in os.walk(target):
            if any(part.startswith('.') and part not in ['.', '..'] for part in root.split(os.sep)):
                continue
            for f in files:
                if f.endswith(".py"):
                    python_files.append(os.path.join(root, f))

    violations = []
    for file_path in python_files:
        funcs, err = analyze_file(file_path)
        if err:
            print(f"[!] {file_path}: {err}")
            continue
        
        for fn in funcs:
            has_violation = False
            reasons = []
            if fn["complexity"] > args.max_complexity:
                has_violation = True
                reasons.append(f"complexity {fn['complexity']} > {args.max_complexity}")
            if fn["length"] > args.max_length:
                has_violation = True
                reasons.append(f"length {fn['length']} lines > {args.max_length}")
            
            if has_violation:
                violations.append({
                    "file": file_path,
                    "name": fn["name"],
                    "line": fn["line"],
                    "reasons": ", ".join(reasons)
                })

    if violations:
        print("\n[!] Complexity Violations Found:")
        for v in violations:
            rel_path = os.path.relpath(v["file"])
            print(f"  {rel_path}:{v['line']} - Function '{v['name']}' violates rules: {v['reasons']}")
        sys.exit(1)
    else:
        print("\n[+] Clean code checks passed. All functions within complexity and size limits.")
        sys.exit(0)

if __name__ == "__main__":
    main()

```

## 4. TDD Enforcer

### 4.1. Tanım ve Çalışma Şekli
TDD Enforcer, yazılım geliştirme sürecinde Test-Driven Development (Test Güdümlü Geliştirme) metodolojisini katı bir şekilde zorunlu kılan yapıdır.

**Çalışma Şekli (Workflow):**
1. Agent yeni bir özellik eklemeden veya değişiklik yapmadan önce, bu özelliğin davranışını test edecek bir test senaryosu yazmaya zorlanır.
2. Yazılan test çalıştırılır ve başarısız olduğu görülür (Red aşaması).
3. Agent, sadece bu testin geçmesini sağlayacak en minimal kodu yazar.
4. Testler tekrar çalıştırılır ve başarılı olduğu doğrulanır (Green aşaması).
5. Kod refactor edilir. Testlerin hala başarılı olduğu doğrulanmadan kodun sisteme entegrasyonuna izin verilmez.

### 4.2. Fayda ve Maliyet/Risk Analizi
- **Sisteme Katacağı Faydalar**:
* **Maksimum Güvenilirlik:** Kodun her zaman test edilmiş ve doğrulanmış olmasını garanti eder. Regression riskini sıfıra yaklaştırır.
* **Daha İyi Tasarım:** Test edilebilir kod yazmaya zorladığı için yazılım mimarisini daha modüler ve loose-coupled hale getirir.
- **Maliyetler ve Riskler**:
* **Aşırı Yüksek Gecikme Süresi (Latency):** Sürekli test yazmak, çalıştırmak ve beklemek geliştirme sürecini ciddi oranda yavaşlatır.
* **Yüksek API Maliyeti:** Her test-kod-test döngüsü (Red-Green-Refactor) LLM ile çok sayıda etkileşim gerektirir.
* **Esneklik Kaybı:** Kişisel projelerin doğasında olan hızlı deneme-yanılma ve keşifsel (exploratory) kodlama süreçlerini engelleyerek geliştirme motivasyonunu kırabilir.
- **Bireysel Kullanım Değerlendirmesi ("Gerçekten İhtiyacımız Var mı?")**:
**Bireysel kullanım için genellikle gereksizdir ve verimsizdir.** Kişisel projelerde hız ve esneklik ön plandadır. TDD Enforcer gibi katı bir yapının zorunlu kılınması, geliştirme hızını aşırı yavaşlatır ve API maliyetlerini katlar. Test yazmak önemlidir ancak bunu katı kurallarla agent seviyesinde zorlamak yerine, kritik fonksiyonlar için isteğe bağlı (on-demand) test yazım yetenekleri tercih edilmelidir.

---

### 4.3. Prompt Şablonu (SKILL.md Formatı)
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

### 4.4. Yardımcı Script Taslağı (Python)
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

**Script Kodları (`test_runner_checker.py`):**
```python
#!/usr/bin/env python3
import os
import ast
import subprocess
import sys
import argparse

class AssertionVisitor(ast.NodeVisitor):
    def __init__(self):
        self.assertion_count = 0

    def visit_Assert(self, node):
        self.assertion_count += 1
        self.generic_visit(node)

    def visit_Call(self, node):
        # Check for self.assert* calls commonly used in unittest
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "self":
                if node.func.attr.startswith("assert"):
                    self.assertion_count += 1
        self.generic_visit(node)

def count_assertions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=file_path)
        visitor = AssertionVisitor()
        visitor.visit(tree)
        return visitor.assertion_count
    except Exception as e:
        print(f"Error parsing test file {file_path}: {e}")
        return 0

def run_tests(command):
    print(f"Executing test suite using: {command}")
    try:
        res = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print("--- Test Runner Output ---")
        print(res.stdout)
        if res.stderr:
            print("--- Test Runner Errors ---")
            print(res.stderr)
        return res.returncode == 0
    except Exception as e:
        print(f"Failed to execute test command '{command}': {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="TDD Enforcer & Test Auditor")
    parser.add_argument("--path", default=".", help="Root directory of the codebase")
    parser.add_argument("--run", action="store_true", help="Execute the test command (e.g. pytest)")
    parser.add_argument("--cmd", default="pytest", help="Test command to run")
    args = parser.parse_args()

    root_dir = os.path.abspath(args.path)
    print("Running TDD Enforcer...")
    print(f"Target directory: {root_dir}")

    # Gather python files and tests
    src_files = []
    test_files = []
    for root, _, files in os.walk(root_dir):
        # Ignore virtualenvs, hidden files, agents folders
        if any((part.startswith('.') and part not in ['.', '..']) or part in ["venv", "env", "node_modules", ".agents"] for part in root.split(os.sep)):
            continue
        for f in files:
            if f.endswith(".py"):
                full_path = os.path.join(root, f)
                if f.startswith("test_") or f.endswith("_test.py"):
                    test_files.append(full_path)
                else:
                    src_files.append(full_path)

    print(f"Found {len(src_files)} source files and {len(test_files)} test files.")

    # 1. Check if test files contain assertions
    empty_tests = []
    for test_file in test_files:
        assertions = count_assertions(test_file)
        if assertions == 0:
            empty_tests.append(test_file)

    # 2. Check if source files have corresponding test files
    untested_src = []
    for src in src_files:
        src_name = os.path.basename(src)
        expected_test_name1 = "test_" + src_name
        expected_test_name2 = src_name.replace(".py", "_test.py")
        
        has_test = False
        for test in test_files:
            test_name = os.path.basename(test)
            if test_name == expected_test_name1 or test_name == expected_test_name2:
                has_test = True
                break
        
        if not has_test:
            untested_src.append(src)

    # Report results
    failed = False
    if empty_tests:
        print("\n[!] Warning: Test files with zero assertions detected (potential dummy tests):")
        for et in empty_tests:
            print(f"  - {os.path.relpath(et, root_dir)}")
        failed = True

    if untested_src:
        print("\n[!] Warning: Source files missing corresponding test file (e.g. test_foo.py for foo.py):")
        for us in untested_src:
            print(f"  - {os.path.relpath(us, root_dir)}")
        # Note: missing tests doesn't necessarily fail the build, but let's highlight it

    if args.run:
        test_success = run_tests(args.cmd)
        if not test_success:
            print("\n[!] Test suite execution failed.")
            failed = True
        else:
            print("\n[+] Test suite execution succeeded.")

    if failed:
        sys.exit(1)
    else:
        print("\n[+] TDD Enforcer checks passed successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()

```

## 5. Security Auditor

### 5.1. Tanım ve Çalışma Şekli
Security Auditor, yazılan koddaki güvenlik açıklarını, zafiyetleri ve hassas bilgi sızıntılarını (hardcoded secrets) tespit etmek için statik veya dinamik güvenlik analizi yapan denetim yeteneğidir.

**Çalışma Şekli (Workflow):**
1. Agent tarafından yazılan kod, sistemde tanımlı güvenlik kuralları ve yaygın zafiyet veritabanları (örn. OWASP Top 10) üzerinden taranır.
2. SQL Injection, XSS, güvensiz kütüphane bağımlılıkları veya kodun içine gömülmüş API anahtarları (hardcoded credentials) aranır.
3. Bir zafiyet bulunduğunda süreç durdurulur ve zafiyetin giderilmesi için agent'a hata raporu ve çözüm önerisi iletilir.

### 5.2. Fayda ve Maliyet/Risk Analizi
- **Sisteme Katacağı Faydalar**:
* **Güvenlik Güvencesi:** Kritik zafiyetlerin canlıya (production) çıkmasını engeller.
* **Hassas Veri Koruması:** API anahtarlarının ve şifrelerin istemeden Git repolarına yüklenmesini (leak) önler.
* **Bilinçli Kodlama:** Bireysel geliştiricinin gözünden kaçabilecek güvenlik açıklarını yakalayarak projenin güvenliğini artırır.
- **Maliyetler ve Riskler**:
* **False Positives (Hatalı Alarmlar):** Güvenlik araçları bazen güvenli kodları da zafiyet olarak işaretleyebilir. Bu durum agent'ın gereksiz yere vakit kaybetmesine yol açar.
* **Gecikme ve Maliyet:** Güvenlik analizleri ek tarama süreleri ve analiz API maliyetleri oluşturur.
- **Bireysel Kullanım Değerlendirmesi ("Gerçekten İhtiyacımız Var mı?")**:
**Bireysel kullanım için duruma göre gereklidir.** Eğer geliştirilen kişisel proje sadece lokalde çalışan basit bir araç ise kritik değildir. Ancak, internete açılacak (publicly hosted), kullanıcı verisi barındıran veya üçüncü parti API'lar (AWS, OpenAI vb.) ile entegre çalışan projelerde **kesinlikle gereklidir**. Özellikle API anahtarı sızıntılarını engellemek ve temel zafiyetleri önlemek için hafif bir Security Auditor (örn. gitleaks entegrasyonu ve temel regex taramaları) mutlaka bulunmalıdır.

---

### 5.3. Prompt Şablonu (SKILL.md Formatı)
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

### 5.4. Yardımcı Script Taslağı (Python)
Bu script, proje klasöründeki dosyaları regex tabanlı desenlerle tarayarak hardcoded şifreleri/API anahtarlarını, güvensiz fonksiyon kullanımlarını ve `requirements.txt` dosyasındaki bilinen eski/güvensiz bağımlılıkları tespit eder.

### Özellikler (Features)
- **Secrets Scanning**: AWS key'leri, Slack token'ları ve genel API anahtarı atamalarını regex ile yakalar.
- **Vulnerability Checks**: `eval()`, `exec()`, `shell=True`, `pickle.loads()` gibi güvensiz kod kalıplarını tarar.
- **Dependency Audit**: `requirements.txt` dosyasında tanımlanan paketleri basit bir güvenlik veritabanı (örn: eski Flask, Django sürümleri) üzerinden denetler.

### Kullanım (Usage)
```bash
python3 security_scanner.py --path <proje_dizini_veya_dosyasi>
```

**Script Kodları (`security_scanner.py`):**
```python
#!/usr/bin/env python3
import os
import re
import sys
import argparse

# Regex patterns for scanning
SECRET_PATTERNS = [
    # Match variables like api_key = "xyz123" with minimum length to avoid false positives
    (r'(?i)(api[-_]?key|secret|password|passwd|private[-_]?key|token|auth[-_]?token|credentials|aws[-_]?key)\s*=\s*[\'"][a-zA-Z0-9_\-\+\/\=\.]{8,}[\'"]', "Potential hardcoded secret/API key/password"),
    # Match AWS Client ID / secrets
    (r'([^A-Z0-9][A-Z0-9]{20}[^A-Z0-9])', "Potential AWS Access Key ID"),
    # Match standard slack token
    (r'xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}', "Potential Slack Token"),
]

INSECURE_FUNCTIONS = [
    (r'\beval\s*\(', "Use of eval() is dangerous"),
    (r'\bexec\s*\(', "Use of exec() is dangerous"),
    (r'subprocess\.(Popen|run|call|check_output)\s*\(.*shell\s*=\s*True', "subprocess call with shell=True"),
    (r'pickle\.loads\s*\(', "Insecure deserialization using pickle.loads()"),
    (r'yaml\.load\s*\([^,]*\)', "Insecure YAML loading. Use yaml.safe_load() instead"),
]

KNOWN_VULNERABLE_PACKAGES = {
    "django": "<4.2.11",
    "flask": "<2.3.0",
    "requests": "<2.31.0",
    "urllib3": "<1.26.17",
    "jinja2": "<3.1.3",
    "pyyaml": "<6.0.1",
}

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception as e:
        return [f"Could not read file {file_path}: {e}"]

    for i, line in enumerate(lines, 1):
        # 1. Scan for secrets
        for pattern, desc in SECRET_PATTERNS:
            if re.search(pattern, line):
                # Don't trigger if it's obviously a mock value or variable name without assignment
                if "placeholder" not in line.lower() and "dummy" not in line.lower() and "your_" not in line.lower():
                    findings.append(f"{file_path}:{i} - {desc}: {line.strip()}")

        # 2. Scan for insecure functions/calls
        for pattern, desc in INSECURE_FUNCTIONS:
            if re.search(pattern, line):
                findings.append(f"{file_path}:{i} - {desc}: {line.strip()}")

    return findings

def parse_requirement_version(line):
    # Match library==version
    match = re.match(r'^([a-zA-Z0-9\-_]+)\s*==\s*([0-9\.]+)', line.strip())
    if match:
        return match.group(1).lower(), match.group(2)
    return None, None

def check_requirements(file_path):
    findings = []
    if not os.path.exists(file_path):
        return findings

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                pkg, ver = parse_requirement_version(line)
                if pkg and pkg in KNOWN_VULNERABLE_PACKAGES:
                    target_ver = KNOWN_VULNERABLE_PACKAGES[pkg]
                    # Simple version comparison helper
                    ver_parts = [int(x) for x in ver.split('.') if x.isdigit()]
                    target_parts = [int(x) for x in target_ver.lstrip('<').split('.') if x.isdigit()]
                    if ver_parts < target_parts:
                        findings.append(f"{file_path}:{i} - Outdated and potentially vulnerable dependency '{pkg}=={ver}'. Upgrade to >= {target_ver.lstrip('<')}")
    except Exception as e:
        print(f"Error reading requirements file: {e}")
    return findings

def main():
    parser = argparse.ArgumentParser(description="Security & Secret Scanner")
    parser.add_argument("--path", default=".", help="Directory or file to scan")
    args = parser.parse_args()

    target = os.path.abspath(args.path)
    print("Running Security & Secret Scanner...")
    print(f"Scanning path: {target}")

    files_to_scan = []
    req_files = []

    if os.path.isfile(target):
        if target.endswith("requirements.txt"):
            req_files.append(target)
        else:
            files_to_scan.append(target)
    else:
        for root, _, files in os.walk(target):
            # Skip hidden folders, virtual environments
            if any((part.startswith('.') and part not in ['.', '..']) or part in ["venv", "env", "node_modules", ".agents"] for part in root.split(os.sep)):
                continue
            for f in files:
                full_path = os.path.join(root, f)
                if f == "requirements.txt":
                    req_files.append(full_path)
                elif f.endswith((".py", ".env", ".json", ".yml", ".yaml", ".ini", ".conf")):
                    files_to_scan.append(full_path)

    all_findings = []

    # Scan code and config files
    for file_path in files_to_scan:
        findings = scan_file(file_path)
        all_findings.extend(findings)

    # Scan dependencies
    for req_file in req_files:
        findings = check_requirements(req_file)
        all_findings.extend(findings)

    if all_findings:
        print("\n[!] Security Auditor Findings:")
        for finding in all_findings:
            print(f"  {finding}")
        sys.exit(1)
    else:
        print("\n[+] No security issues or hardcoded secrets found. Check passed.")
        sys.exit(0)

if __name__ == "__main__":
    main()

```

## 6. Karşılaştırma ve Özet Tablo

| Yetenek / Desen | Token Tasarrufu | Kaliteye Etkisi | Hız/Zaman Maliyeti | Kişisel Kullanım Kararı |
| :--- | :--- | :--- | :--- | :--- |
| **Architectural Guardrail** | Düşük | Yüksek | Orta | Opsiyonel (Büyük projelerde faydalı) |
| **Session Handoff** | **Çok Yüksek** | Orta | Düşük | **Kesinlikle Gerekli** |
| **Clean Code & Simplifier** | Orta | Yüksek | Orta | **Yüksek Derecede Önerilir** |
| **TDD Enforcer** | Düşük | **Çok Yüksek** | Yüksek | Gereksiz (Esnekliği öldürür) |
| **Security Auditor** | Düşük | Yüksek | Orta | Duruma Bağlı (Dışa açık projelerde kritik) |
