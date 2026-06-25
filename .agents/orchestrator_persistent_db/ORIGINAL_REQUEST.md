# Original User Request

## 2026-06-20T17:31:54+03:00

You are the Project Orchestrator for the 'Persistent Local Database Setup and Backup Automation' task.
Your mission is to coordinate and complete the requirements:
1. R1: Persistent Database Storage via Host Directory Mount in both root `docker-compose.yml` and `infra/docker-compose.yml`. Update `.gitignore` for `./infra/postgres_data`.
2. R2: Database Backup Automation Script `backup.sh` at project root. Update `.gitignore` for `./infra/backups/*.sql`.
3. R3: Database Restore Automation Script `restore.sh` at project root.
4. R4: Database Initialization Guardrails (idempotency in `DataSeeder` and `DemoDataSeeder`).

Please plan, spawn specialists, monitor progress, write your progress reports to `/Users/armaganercan/antigravity/intelligent-organization/.agents/orchestrator_persistent_db/progress.md`, and report back to me when you are ready or claim victory.
