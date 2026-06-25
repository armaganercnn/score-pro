# Scope: Automatic Lineage & Provenance (R1)

## Architecture
- `AiExecutionTracker` collects accessed data sources during report execution and agent tasks.
- Data lineage records are saved to the `data_lineage` table.
- Provenance blocks are attached to `ReportRun` (`source_info` JSONB) and `KnowledgeEntry` (`metadata` JSONB).

## Milestones
- Milestone 1: Implement Automatic Lineage tracking in `ReportExecutionService` and agent tasks.
- Milestone 2: Implement Provenance block zening for `ReportRun.source_info` and `KnowledgeEntry.metadata`.
- Milestone 3: Verify using unit/integration tests (`ReportExecutionServiceTest`).

## Interface Contracts
- Lineage format saved to `data_lineage`.
- Provenance block JSON:
```json
{
  "provenance": {
    "agentId": "uuid or null",
    "runId": "uuid or null",
    "accessedDataSources": ["uuid1", "uuid2"],
    "evaluatedPolicies": ["policy1"],
    "userId": "uuid",
    "metrics": {
      "tokens": 120,
      "durationMs": 450
    }
  }
}
```

## Code Layout
- Tracing context: `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`
- Report execution: `backend/src/main/java/com/akilliorganizasyon/reporting/service/ReportExecutionService.java`
- Knowledge writing: `backend/src/main/java/com/akilliorganizasyon/agents/service/AgentKnowledgeWriter.java`
- Tests: `backend/src/test/java/com/akilliorganizasyon/reporting/service/ReportExecutionServiceTest.java`
