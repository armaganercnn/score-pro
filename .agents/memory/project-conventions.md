---
type: project
created: 2026-05-25
updated: 2026-05-25
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Visual Design & Theme
- The primary branding colors are Corporate Cobalt & Sapphire Blue (`#1A60EC` etc.) as defined in [business-blue-design-system.md](file:///Users/armaganercan/antigravity/intelligent-organization/docs/business-blue-design-system.md).
- Never use Acid Green or other theme colors as the primary accent, overriding generic template-based rules like "The Blue Trap".

## Technology Stack
- **Backend**: Spring Boot 3.x, Java 21, Maven, Spring Modulith, PostgreSQL 16 + pgvector, Flyway database migrations.
- **Frontend**: Vue 3 + Vite + TypeScript, Tailwind CSS.
