import os
import re

def extract_between(text, start_pattern, end_patterns):
    # Find start
    start_match = re.search(start_pattern, text)
    if not start_match:
        return ""
    start_idx = start_match.end()
    
    # Find end
    min_end_idx = len(text)
    for end_pat in end_patterns:
        end_match = re.search(end_pat, text[start_idx:])
        if end_match:
            end_idx = start_idx + end_match.start()
            if end_idx < min_end_idx:
                min_end_idx = end_idx
                
    return text[start_idx:min_end_idx].strip()

def main():
    base_dir = "/Users/armaganercan/.gemini/antigravity/scratch/skills_analysis"
    explorer_dir = os.path.join(base_dir, ".agents/explorer_1")
    worker_1_dir = os.path.join(base_dir, ".agents/worker_1")
    
    research_path = os.path.join(explorer_dir, "research.md")
    with open(research_path, "r", encoding="utf-8") as f:
        research_content = f.read()
        
    skills = [
        {
            "num": 1,
            "key": "Architectural Guardrail",
            "md_file": "ARCHITECTURAL_GUARDRAIL.md",
            "py_file": "guardrail_auditor.py"
        },
        {
            "num": 2,
            "key": "Session Handoff",
            "md_file": "SESSION_HANDOFF.md",
            "py_file": "handoff_generator.py"
        },
        {
            "num": 3,
            "key": "Clean Code & Simplifier",
            "md_file": "CLEAN_CODE_SIMPLIFIER.md",
            "py_file": "complexity_analyser.py"
        },
        {
            "num": 4,
            "key": "TDD Enforcer",
            "md_file": "TDD_ENFORCER.md",
            "py_file": "test_runner_checker.py"
        },
        {
            "num": 5,
            "key": "Security Auditor",
            "md_file": "SECURITY_AUDITOR.md",
            "py_file": "security_scanner.py"
        }
    ]
    
    report_sections = []
    
    # Intro
    intro = "Bu rapor, yazılım geliştirme süreçlerinde kullanılabilecek 5 farklı özel agent yeteneğini ve yapı desenini kişisel kullanım (personal use) odağında incelemektedir. Raporda her bir yeteneğin tanımı, çalışma şekli, faydaları, maliyetleri, riskleri, ilgili prompt şablonları ve yardımcı Python scriptleri detaylandırılmıştır."
    report_sections.append(f"# Özel Agent Yetenek ve Yapı Desenleri Analiz Raporu\n\n{intro}\n")
    
    for skill in skills:
        num = skill["num"]
        key = skill["key"]
        md_file = skill["md_file"]
        py_file = skill["py_file"]
        
        # Extract from research.md
        # The section in research.md starts with "## [num]. [key]" or "## [num]. [Something]"
        # Let's find "## [num]."
        section_start = rf"##\s*{num}\.\s*{key}"
        # End patterns for the main skill section: the next skill section or the table
        end_pats = [rf"##\s*{num+1}\.", r"##\s*Özet Karşılaştırma Tablosu", r"---"]
        skill_research = extract_between(research_content, section_start, [rf"##\s*{num+1}\.", r"##\s*Özet Karşılaştırma Tablosu"])
        
        # Sub-extracts from skill_research
        definition = extract_between(skill_research, r"###\s*Tanım ve Çalışma Şekli", [r"###"])
        benefits = extract_between(skill_research, r"###\s*Sisteme Katacağı Faydalar", [r"###"])
        costs = extract_between(skill_research, r"###\s*Olası Maliyetler ve Riskler", [r"###"])
        need = extract_between(skill_research, r"###\s*\"Gerçekten İhtiyacımız Var mı\?\"\s*Değerlendirmesi", [r"###"])
        
        # Read worker_1 markdown file
        md_path = os.path.join(worker_1_dir, md_file)
        with open(md_path, "r", encoding="utf-8") as f:
            md_content = f.read()
            
        # Extract Prompt Template
        # Usually starts with ## Prompt Template / Prompt Şablonu and ends with ## Helper Script or similar
        prompt_sec = extract_between(md_content, r"##\s*Prompt Template\s*/\s*Prompt Şablonu", [r"##\s*Helper Script\s*/\s*Yardımcı Script"])
        # Now find the markdown code block within prompt_sec
        # We need the prompt template (from ARCHITECTURAL_GUARDRAIL.md) in SKILL.md format
        # Let's extract the code block contents
        # But wait, does it have markdown blocks? Yes, wrapped in ```markdown ... ```
        code_blocks = re.findall(r"```markdown(.*?)```", prompt_sec, re.DOTALL)
        if code_blocks:
            prompt_template = code_blocks[0].strip()
        else:
            # Fallback
            prompt_template = prompt_sec.strip()
            
        # Extract helper script description
        helper_sec = extract_between(md_content, r"##\s*Helper Script\s*/\s*Yardımcı Script\s*\(`" + re.escape(py_file) + r"`\)", [r"$"])
        if not helper_sec:
            # Try without filename
            helper_sec = extract_between(md_content, r"##\s*Helper Script\s*/\s*Yardımcı Script", [r"$"])
            
        # Clean helper_sec from the usage blocks and make it look clean
        # Let's extract the description, features, usage etc.
        # But we need: "Explain the script, and paste the code inside code block"
        # Let's translate sections or clean it up to Turkish prose
        # Let's see: we want to keep features/usage.
        helper_explanation = helper_sec.strip()
        
        # Read the py file
        py_path = os.path.join(worker_1_dir, py_file)
        with open(py_path, "r", encoding="utf-8") as f:
            py_code = f.read()
            
        # Build section
        section = f"## {num}. {key}\n\n"
        section += f"### {num}.1. Tanım ve Çalışma Şekli\n{definition}\n\n"
        section += f"### {num}.2. Fayda ve Maliyet/Risk Analizi\n"
        section += f"- **Sisteme Katacağı Faydalar**:\n{benefits}\n"
        section += f"- **Maliyetler ve Riskler**:\n{costs}\n"
        section += f"- **Bireysel Kullanım Değerlendirmesi (\"Gerçekten İhtiyacımız Var mı?\")**:\n{need}\n\n"
        section += f"### {num}.3. Prompt Şablonu (SKILL.md Formatı)\n"
        section += f"```markdown\n{prompt_template}\n```\n\n"
        section += f"### {num}.4. Yardımcı Script Taslağı (Python)\n"
        section += f"{helper_explanation}\n\n"
        section += f"**Script Kodları (`{py_file}`):**\n"
        section += f"```python\n{py_code}\n```\n"
        
        report_sections.append(section)
        
    # Section 6: Karşılaştırma ve Özet Tablo
    table_sec = extract_between(research_content, r"##\s*Özet Karşılaştırma Tablosu", [r"$"])
    report_sections.append(f"## 6. Karşılaştırma ve Özet Tablo\n\n{table_sec}\n")
    
    full_report = "\n".join(report_sections)
    
    output_report_path = os.path.join(base_dir, "skills_analysis_report.md")
    with open(output_report_path, "w", encoding="utf-8") as f:
        f.write(full_report)
        
    print(f"Report compiled successfully at: {output_report_path}")

if __name__ == "__main__":
    main()
