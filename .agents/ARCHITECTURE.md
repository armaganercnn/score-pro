# AG Kit Architecture — Optimized for Akıllı Organizasyon

> Comprehensive AI Agent Capability expansion Toolkit — Optimized for Spring Boot & Vue 3 Stack

---

## 📋 Overview

AG Kit is a modular system consisting of:

- **9 Specialist Agents** - Role-based AI personas optimized for this workspace
- **16 Active Skills** - Domain-specific local knowledge modules with conditional loading
- **15+ Global Skills** - Loaded via the global `ag-kit-plugin`
- **8 Workflows** - Slash command procedures

---

## 🏗️ Directory Structure

```plaintext
.agents/
├── ARCHITECTURE.md          # This file
├── agent/                  # 9 Specialist Agents
├── skills/                  # 16 local Skills (with conditional loading)
├── workflows/               # 8 Slash Commands
├── rules/                   # Global Rules (GEMINI.md)
├── memory/                  # Persistent Memory
└── scripts/                 # Master Validation Scripts
```

---

## 🤖 Agents (9)

Specialist AI personas for different domains.

| Agent                    | Focus                      | Skills Used                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `orchestrator`           | Multi-agent coordination   | parallel-agents, coordinator-mode, memory-system, context-compression, verify-changes |
| `project-planner`        | Discovery, task planning   | brainstorming, plan-writing, architecture                |
| `frontend-specialist`    | Vue 3 Web UI/UX            | frontend-design, tailwind-patterns                       |
| `backend-specialist`     | Spring Boot 3.x API        | api-patterns, database-design                            |
| `database-architect`     | PostgreSQL Schema, SQL     | database-design                                          |
| `security-auditor`       | Security compliance        | vulnerability-scanner                                    |
| `test-engineer`          | Testing strategies         | testing-patterns, tdd-workflow, webapp-testing           |
| `debugger`               | Root cause analysis        | systematic-debugging                                     |
| `product-owner`          | Strategy, backlog, MVP     | plan-writing, brainstorming                              |

---

## 🧩 Active Skills (16 Local + Global Plugin)

Modular knowledge domains that agents can load on-demand based on task context. Each skill has a `when_to_use` frontmatter field for conditional/intelligent loading.

### local Active Skills

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `api-patterns`          | REST API design principles                                            |
| `architecture`          | System design patterns, ADRs                                          |
| `bash-linux`            | Bash/Linux terminal patterns                                          |
| `batch-operations`      | Multi-file pattern-based modifications                                |
| `code-review-checklist` | Code review standards                                                 |
| `deployment-procedures` | Production deployment principles and Docker Compose                   |
| `documentation-templates`| README, API documentation templates                                  |
| `intelligent-routing`   | Automatic agent selection and routing                                 |
| `parallel-agents`       | Multi-agent coordination patterns                                     |
| `performance-profiling` | Speed, Web Vitals, and optimization                                   |
| `server-management`     | Infrastructure management and process monitoring                      |
| `simplify-code`         | Reduce over-engineered complexity                                     |
| `tdd-workflow`          | Test-driven development workflow principles                           |
| `testing-patterns`      | Unit & integration testing patterns                                   |
| `vulnerability-scanner` | Security auditing, OWASP compliance                                   |
| `webapp-testing`        | E2E web app testing (Playwright)                                      |

---

## 🔄 Workflows (8)

Slash command procedures. Invoke with `/command`.

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `/brainstorm`    | Socratic discovery                             |
| `/orchestrate`   | Multi-agent coordination                       |
| `/plan`          | Task breakdown                                 |
| `/remember`      | Save to persistent memory                      |
| `/debug`         | Debug issues                                   |
| `/test`          | Run tests                                      |
| `/verify`        | Prove code works by running it                 |
| `/compress`      | Auto-compress context in long sessions         |

---

## 🎯 Skill Loading Protocol (Conditional)

```plaintext
User Request → Check `when_to_use` frontmatter → Match? → Load full SKILL.md
                                                     ↓ No match
                                                  Skip (save tokens)
```

---

## 🛠️ Scripts (2)

Master validation scripts that orchestrate skill-level scripts.

### Master Scripts

| Script          | Purpose                                 | When to Use              |
| --------------- | --------------------------------------- | ------------------------ |
| `checklist.py`  | Priority-based validation (Core checks) | Development, pre-commit  |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agents/scripts/checklist.py .

# Full verification before deployment
python .agents/scripts/verify_all.py . --url http://localhost:8092
```

For details, see `scripts/README.md`
