# Original User Request

## Initial Request — 2026-06-14T02:32:11+03:00

Bu proje, önerilen 5 özel skill/agent yapısının (Architectural Guardrail, Session Handoff, Clean Code & Simplifier, TDD Enforcer, Security Auditor) sisteme sağlayacağı fayda ve maliyetlerin kişisel kullanım odağında araştırılıp analiz edilmesini amaçlar.

Working directory: /Users/armaganercan/.gemini/antigravity/scratch/skills_analysis
Integrity mode: demo

## Requirements

### R1. Skill/Agent Analizi
Her bir skill (Architectural Guardrail, Session Handoff, Clean Code & Simplifier, TDD Enforcer, Security Auditor) için:
- Tanım ve çalışma şekli.
- Sisteme katacağı faydalar (token tasarrufu, kalite artışı vb.).
- Olası maliyetler (api maliyeti, gecikme süresi vb.) ve riskler (bağlam kayması vb.).
- "Gerçekten ihtiyacımız var mı?" sorusuna net bir değerlendirme.

### R2. Şablonlar ve Entegrasyon
Her bir skill için:
- Kullanıma hazır prompt şablonu (SKILL.md formatında).
- Gerekli durumlarda eşlik edecek kod/script yapısının taslağı (örneğin handoff veya test için gerekli CLI/Python scriptleri).

### R3. Rapor Formatı
Tüm analizler tek bir kapsamlı markdown dosyası (`skills_analysis_report.md`) halinde teslim edilmelidir.

## Acceptance Criteria

### Rapor Kapsamı ve Yapısı
- [ ] Rapor `skills_analysis_report.md` adıyla belirtilen çalışma dizininde oluşturulmuş olmalıdır.
- [ ] 5 skill'in tamamı raporda yer almalıdır.
- [ ] Her skill için ayrı bir "Fayda/Maliyet/Gereklilik" analizi bulunmalıdır.
- [ ] Her skill için en az bir adet `SKILL.md` formatında prompt veya konsept şablonu içermelidir.

### Doğruluk ve Tutarlılık
- [ ] Rapor dilinin Türkçe olması, teknik terimlerin İngilizce kalması sağlanmalıdır.
- [ ] Şablonlar geçerli Markdown formatında olmalıdır.
