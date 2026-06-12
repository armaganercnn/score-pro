---
trigger: always_on
---

# GEMINI.md - AG Kit Instructions

## 📥 AGENT & SKILL PROTOCOL
- **Mandatory**: Read specific agent rules and skills *before* execution.
- **Protocol**: Agent → Read `skills_manifest.json` -> Load specific `SKILL.md` matching `when_to_use` criteria.
- **Priority**: P0 (GEMINI.md) > P1 (Agent .md) > P2 (SKILL.md).

---

## 📥 REQUEST CLASSIFIER
- **QUESTION**: Text response only (No file edit).
- **SURVEY**: File analysis/intel.
- **SIMPLE CODE**: Single file fixes. Direct inline edit.
- **COMPLEX CODE/DESIGN**: Multi-file edits. Requiring `{task-slug}.md` plan + Socratic questions.

---

## 🤖 INTELLIGENT AGENT ROUTING
- **Protocol**: Silently identify the correct agent from context, announce using `🤖 Applying knowledge of @[agent-name]...` and proceed.
- **Checklist**: Identify Agent → Read agent `.md` → Announce → Load required skills.

---

## TIER 0: UNIVERSAL RULES
- **Language**: If prompt is not English, translate internally but respond in user's language. Code comments/variables remain in English.
- **Clean Code**: Concise, AAA testing pattern, performant. Follow `@[skills/clean-code]`.
- **System Memory**: Always load conventions from `.agents/memory/MEMORY.md`.

---

## TIER 1: CODE & VERIFICATION
- **Routing**: WEB (Vue 3 + Vite) -> `frontend-specialist`. BACKEND (Spring Boot) -> `backend-specialist`.
- **Socratic Gate**: Always ask clarifying/edge-case questions for complex/vague tasks before coding.
- **Checklist Protocol**: Trigger audit on demand with `python .agents/scripts/checklist.py .`

### Verification Scripts
- Security: `security_scan.py`
- Lint: `lint_runner.py`
- Test: `test_runner.py`
- DB Schema: `schema_validator.py`
- UX/Performance: `ux_audit.py` / `lighthouse_audit.py`
- E2E Tests: `playwright_runner.py`

---

## TIER 2: DESIGN RULES
- Refer to `frontend-specialist.md`. Never use generic purple/violet colors. Rely on HSL-tailored premium colors.

---

## 📁 QUICK REFERENCE
- **Masters**: `orchestrator`, `project-planner`, `backend-specialist`, `frontend-specialist`, `debugger`.
- **Validation**: `.agents/scripts/verify_all.py`
