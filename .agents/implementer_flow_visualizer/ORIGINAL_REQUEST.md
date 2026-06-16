## 2026-06-16T00:13:44Z
You are a developer worker. Your task is to implement the Flow Visualizer enhancements (R1, R2, R3, R4) and PO vision details.

### MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please follow these instructions to implement the changes:

#### Phase 1: Update documentation and metadata (R1)
1. Copy the proposed `PROJECT.md` from `.agents/explorer_flow_visualizer/proposed_PROJECT.md` into the root `PROJECT.md`.
2. Copy the proposed wiki page from `.agents/explorer_flow_visualizer/proposed_wiki_analizi.md` into `.wiki/moduller/modul_aidebug_flow_visualizer_analizi.md`.

#### Phase 2: Backend Changes (R2, R3, R4)
1. Create a Flyway migration file `V42__add_accessed_data_sources_to_traces.sql` under `backend/src/main/resources/db/migration/` containing:
   `ALTER TABLE agent_task_traces ADD COLUMN IF NOT EXISTS accessed_data_sources JSONB NOT NULL DEFAULT '[]';`
2. Update `AgentTaskTrace.java` JPA entity (`com.akilliorganizasyon.agents.domain.AgentTaskTrace`):
   - Add a private field: `private List<String> accessedDataSources = new ArrayList<>();` mapped as a JSON/JSONB list. Ensure it matches how other lists (e.g. `calledTools` / `accessedScreens`) are mapped (using `@JdbcTypeCode(SqlTypes.JSON)` and `@Column(...)`).
   - Add getters/setters.
3. Update `AgentTaskTraceDto.java` (`com.akilliorganizasyon.agents.api.dto.AgentTaskTraceDto`) to include `List<String> accessedDataSources`. Update its usages (e.g. where it is mapped or instantiated).
4. Update `AgentTaskStatus.java` (`com.akilliorganizasyon.agents.domain.AgentTaskStatus`) to add the enum value `LOOP_DETECTED`.
5. Update `AiExecutionTracker.java` (`com.akilliorganizasyon.shared.ai.AiExecutionTracker`):
   - In `TrackerContext` class, add a thread-safe list to log accessed data sources: `private final List<String> accessedDataSources = new CopyOnWriteArrayList<>();` (or similar). Add getters/methods to retrieve and append to this list.
6. Update `AgentGuardService.java` (`com.akilliorganizasyon.agentlifecycle.service.AgentGuardService`):
   - In the `evaluate` method, check if the capabilityType is `"DATA_SOURCE"`. If so, and if there is an active `AiExecutionTracker.TrackerContext` for the current thread, record the `targetRef` (data source title/key) to it.
7. Update `OrchestrationService.java` (`com.akilliorganizasyon.agents.service.OrchestrationService`):
   - Before executing a task (e.g. in `executeAgentTask` or `runTask`), implement the loop detection logic:
     - Trace up the `parentTaskId` hierarchy of the current task.
     - Check if there are any ancestors with the same `agentId` or `agentRole` (or similar criteria mapping to the same agent or role, or repeating occurrences, e.g. >= 3 occurrences).
     - If a loop is detected, update the status of the current task to `AgentTaskStatus.LOOP_DETECTED`, add a warning warning trace, save/flush the task, and throw a controlled execution exception (or return early with loop detected status) to abort execution.
   - In `recordTrace`, retrieve the `accessedDataSources` list from the `AiExecutionTracker.TrackerContext` and populate it into the `AgentTaskTrace` entity before saving.

#### Phase 3: Frontend Changes (R2, R3, R4 & PO enhancements)
1. Update Pinia store `flowVisualizer.ts` (`frontend/src/modules/aidebug/store/flowVisualizer.ts`):
   - Read `accessedDataSources` from backend DTO and map it to flow nodes data.
   - Map `LOOP_DETECTED` status for nodes and mark edge/nodes as looping.
   - Format custom styling for loop edges: set stroke as `#f43f5e` (red/rose), thicker width, dashed pattern (`strokeDasharray: '5 5'`), and make it `animated: true`.
2. Update `AgentNode.vue` (`frontend/src/modules/aidebug/components/AgentNode.vue`):
   - Add badges inside the node card for: RAG (📚), Tools (🛠️), and Screens (📱) alongside their counts.
   - Implement `isLooping` visual highlights: red pulsed border glow and `ShieldAlert` warning icon.
   - Display latency indicators: if execution duration is > 3s yellow, > 8s red. If > 10s or attempt > 1, show bottleneck orange glowing outline.
   - Display individual node cost estimation in the card (using input/output tokens and rates for the model).
3. Update `FlowDetailDrawer.vue` (`frontend/src/modules/aidebug/components/FlowDetailDrawer.vue`):
   - Render lists of "Veri Kaynakları" (RAG, Tools, Screens) and loop warnings when present.
   - Add error category breakdown and root-cause mapping with actionable solution suggestions depending on error type (Zaman Aşımı, Döngü, Yetki/Kalkan Engeli).
   - Display model token cost details.

#### Phase 4: Verification
1. Run backend tests using `mvn -q -B test` (verify that Modulith verification and other tests pass).
2. Build frontend using `npm run build` and ensure there are no compilation or linter errors.
3. Write a handoff report documenting the changes made.

Once complete, send a message back to the Orchestrator with the path to your handoff report.
