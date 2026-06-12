# AG Kit Architecture — Optimized for Akıllı Organizasyon

> Comprehensive AI Agent Capability expansion Toolkit — Optimized for Spring Boot & Vue 3 Stack

---

## 📋 Overview

AG Kit is a modular system consisting of:

- **9 Specialist Agents** - Role-based AI personas optimized for this workspace
- **13 Active Skills** - Domain-specific local knowledge modules with conditional loading
- **15+ Global Skills** - Loaded via the global `ag-kit-plugin`
- **8 Workflows** - Slash command procedures

---

## 🏗️ Directory Structure

```plaintext
.agents/
├── ARCHITECTURE.md          # This file
├── agent/                  # 9 Specialist Agents
├── skills/                  # 13 local Skills (with conditional loading)
├── workflows/               # 8 Slash Commands
├── rules/                   # Global Rules (GEMINI.md)
├── memory/                  # Persistent Memory
└── scripts/                 # Master Validation Scripts
```

---

## 🤖 Agents (9)

Specialist AI personas for different domains: `orchestrator`, `project-planner`, `frontend-specialist`, `backend-specialist`, `database-architect`, `security-auditor`, `test-engineer`, `debugger`, `product-owner`.

---

## 🧩 Active Skills (13 Local)

Local knowledge domains that agents can load on-demand based on task context:
- `api-patterns`: REST API design principles
- `architecture`: System design patterns, ADRs
- `bash-linux`: Bash/Linux terminal patterns
- `batch-operations`: Multi-file pattern-based modifications
- `deployment-procedures`: Production deployment principles and Docker Compose
- `intelligent-routing`: Automatic agent selection and routing
- `parallel-agents`: Multi-agent coordination patterns
- `performance-profiling`: Speed, Web Vitals, and optimization
- `server-management`: Infrastructure management and process monitoring
- `simplify-code`: Reduce over-engineered complexity
- `testing-patterns`: Unit & integration testing patterns
- `vulnerability-scanner`: Security auditing, OWASP compliance
- `webapp-testing`: E2E web app testing (Playwright)

---

## 🔄 Workflows (8)

Slash command procedures: `/brainstorm`, `/orchestrate`, `/plan`, `/remember`, `/debug`, `/test`, `/verify`, `/compress`.
