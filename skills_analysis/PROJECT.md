# Project: Skills Analysis (Özel Agent ve Skill Yapıları Analizi)

## Architecture
- **Data Flow**: Alt subagent'lar (Explorer, Worker, Reviewer) kendilerine atanan konularda araştırma raporları, prompt şablonları ve entegrasyon taslakları üretecek. Orchestrator bu çıktıları bir araya getirerek nihai `skills_analysis_report.md` dosyasını oluşturacaktır.
- **Code Layout**:
  - `.agents/orchestrator/` - Orchestrator koordinasyon dosyaları
  - `.agents/explorer_1/` - Araştırma ve analiz çıktıları
  - `.agents/worker_1/` - Prompt şablonları (SKILL.md formatında) ve entegrasyon scriptleri
  - `.agents/reviewer_1/` - Değerlendirme ve inceleme raporları
  - `skills_analysis_report.md` - Nihai birleşik rapor (Proje Kök Dizini)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Research & Analysis | 5 skill yapısının tanımı, çalışma şekli, fayda/maliyet ve risk analizlerinin yapılması | none | DONE |
| 2 | M2: Templates & Script Drafts | Her skill için SKILL.md formatında prompt şablonu ve CLI/Python script taslaklarının hazırlanması | M1 | DONE |
| 3 | M3: Report Compilation | M1 ve M2 çıktılarının skills_analysis_report.md altında birleştirilmesi | M2 | IN_PROGRESS (4a963f6b-941e-4d57-979b-7ed3cf888267) |
| 4 | M4: Review & Verification | Raporun format, dil ve bütünlük açısından Reviewer tarafından kontrol edilmesi | M3 | PLANNED |

## Interface Contracts
- **M1 Araştırma Raporu**: `.agents/explorer_1/research.md` - Her skill için Tanım, Çalışma Şekli, Fayda, Maliyet, Risk ve "Gerçekten Gerekli mi?" kısımlarını içermelidir.
- **M2 Şablon/Script Çıktıları**: `.agents/worker_1/templates/` dizininde her skill için `<skill_name>_SKILL.md` ve ilgili taslak kod dosyaları.
- **Nihai Rapor**: `skills_analysis_report.md` - Tüm analiz, şablon ve scriptleri içeren tek bir Markdown dosyası.
