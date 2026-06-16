# Handoff Report — Flow Visualizer Gap Analysis & PO Vision Alignment

This report outlines the detailed findings and implementation design to support the Flow Visualizer requirements (R2, R3, R4) and the visionary enhancements requested by the PO team.

---

## 1. Observation

### Backend Code Observations:
1. **Orchestration Task Execution and Tracing**:
   - In `backend/src/main/java/com/akilliorganizasyon/agents/service/OrchestrationService.java`, the task is executed in `executeAgentTask` (lines 430-492) and the trace is recorded in `recordTrace` (lines 495-526):
     ```java
     private void recordTrace(UUID runId, AgentTask task, AgentRefDto agent, AgentProfile profile,
                              String systemPrompt, String userPrompt,
                              AgentContextService.WorkingContext context,
                              com.akilliorganizasyon.shared.ai.AiExecutionTracker.TrackerContext tracker) {
         ...
         trace.setSystemPrompt(systemPrompt);
         trace.setUserPrompt(userPrompt);
         if (tracker != null) {
             trace.setInputTokens(tracker.getInputTokens());
             trace.setOutputTokens(tracker.getOutputTokens());
             trace.setTotalTokens(tracker.getTotalTokens());
             trace.setDurationMs(tracker.getDurationMs());
             trace.setAccessedScreens(tracker.getAccessedScreens());
             trace.setCalledTools(tracker.getCalledTools());
         }
         traceRepository.save(trace);
     }
     ```
2. **Governance Evaluations (DataSource Access)**:
   - In `backend/src/main/java/com/akilliorganizasyon/agentlifecycle/service/AgentGuardService.java`, the `evaluate` method (lines 62-95) manages permission checks for capabilities:
     ```java
     public Decision evaluate(UUID agentId, String capabilityType, String targetRef, String action) {
     ```
3. **Execution Tracker Context**:
   - In `backend/src/main/java/com/akilliorganizasyon/shared/ai/AiExecutionTracker.java`, the thread-local `TrackerContext` (lines 55-98) tracks input/output tokens and called tools.
4. **Task Trace Storage**:
   - In `backend/src/main/java/com/akilliorganizasyon/agents/domain/AgentTaskTrace.java`, lines 71-77 map collections as JSONB:
     ```java
     @JdbcTypeCode(SqlTypes.JSON)
     @Column(name = "accessed_screens", columnDefinition = "jsonb")
     private List<String> accessedScreens = new ArrayList<>();
     ```

### Frontend Code Observations:
1. **Store Graph Construction**:
   - In `frontend/src/modules/aidebug/store/flowVisualizer.ts`, the `transformRunToGraph` method (lines 292-521) converts task items into Vue Flow `nodes` and `edges`:
     ```typescript
     detail.tasks.forEach((task) => {
       const trace = detail.traces.find((t) => t.taskId === task.id)
       ...
       const sourceId = task.parentTaskId || 'root-run'
       tempEdges.push({
         id: `e-${sourceId}-${task.id}`,
         source: sourceId,
         target: task.id,
         animated: task.status === 'RUNNING',
         style: {
           strokeWidth: 2,
           stroke: task.status === 'FAILED' ? '#ef4444' : task.status === 'SUCCESS' ? '#10b981' : '#64748b',
         },
       })
     ```
2. **Düğüm Kartı (AgentNode.vue)**:
   - In `frontend/src/modules/aidebug/components/AgentNode.vue`, CSS statuses are computed in `statusClasses` (lines 55-79):
     ```typescript
     const statusClasses = computed(() => { ... })
     ```
3. **Detay Çekmecesi (FlowDetailDrawer.vue)**:
   - In `frontend/src/modules/aidebug/components/FlowDetailDrawer.vue`, the `detail` data is rendered using subcomponents (lines 106-270).

---

## 2. Logic Chain

### R2: Data Source Visualization
- **Reasoning**:
  1. We need to track which registered DataSources (`knowledge_base`, `erp`, `tmsdb` etc.) are read during agent task execution.
  2. Permission checks are centralized in `AgentGuardService.evaluate`.
  3. By checking if the current thread has an active `AiExecutionTracker.TrackerContext` during `evaluate(..., "DATA_SOURCE", targetRef, ...)`, we can log `targetRef` inside `TrackerContext` (Step 1 -> Step 2).
  4. The logged data sources can then be stored in the database under a new `accessed_data_sources` column in `AgentTaskTrace` (Step 3).
  5. The frontend store will extract this list from the trace and populate the node data, which is then rendered on the `AgentNode` cards and inside the `FlowDetailDrawer` (Step 4 -> Step 5).

### R3: Loop Detection
- **Reasoning**:
  1. An execution loop occurs when a task delegates back to an agent that is already executing an ancestor task in the current call chain.
  2. We can detect this dynamically by traversing up the `parentTaskId` hierarchy from the current task (Step 1).
  3. If a cycle is detected, we mark the task status as `LOOP_DETECTED` (a new `AgentTaskStatus` value) and abort execution with a controlled exception (Step 2).
  4. In the frontend, the store `flowVisualizer.ts` will style edges targeting `LOOP_DETECTED` nodes with red dashed styles and `animated: true`. The `AgentNode.vue` will display a red pulse glow and `ShieldAlert` icon (Step 3 -> Step 4).

### R4: Detailed Problem & Performance Analysis
- **Reasoning**:
  1. Latency bottlenecks are determined by comparing task `durationMs` to thresholds (Step 1).
  2. Adding latency color coding directly to the `AgentNode` metrics section alerts users to bottlenecks (Step 2).
  3. Classifying error messages in the backend (e.g. `TIMEOUT`, `GOVERNANCE_DENIED`, `LOOP_DETECTED`, `AI_PROVIDER_ERROR`) allows mapping them to customized remediation rules on the frontend. Showing these actions in the detail panel improves troubleshooting speed (Step 3).

### PO Visionary Enhancements
- **Reasoning**:
  1. Token costs are calculated per node in the frontend using the model rate mapping (similar to the global run calculator).
  2. Visual animated flow paths are produced by using SVG dash-array animation on Vue Flow edges based on node execution status.
  3. Bottlenecks are visually highlighted using a glowing orange outline on nodes with duration > 10s or attempt > 1.

---

## 3. Caveats

- We assume database migration scripts will be added to create the `accessed_data_sources` column in the `agent_task_traces` table.
- Since we are in CODE_ONLY read-only mode, code modifications have not been applied. Implementation must be done by the implementer agent.
- No other caveats.

---

## 4. Conclusion

The Gap Analysis reveals that while the Flow Visualizer successfully represents the basic delegation topology, it lacks structured logging of enterprise data sources, dynamic visualization of call loops, and root-cause mapping for failures. Implementing the proposals detailed below will align the visualizer with the PO's vision.

### Implementation Strategy:
1. **Database / Entity**:
   - Add `accessed_data_sources` jsonb column to `agent_task_traces` table.
   - Expand `AgentTaskTrace` domain model and `AgentTaskTraceDto` record.
2. **Backend Services**:
   - Add `accessedDataSources` list to `AiExecutionTracker.TrackerContext`.
   - Update `AgentGuardService.evaluate` to push target refs to tracker.
   - Update `OrchestrationService` to:
     - Check parent task hierarchy for agent loops before execution.
     - Save tracked data sources to trace entity in `recordTrace`.
3. **Frontend Integration**:
   - Update `flowVisualizer.ts` store mapping.
   - Update `AgentNode.vue` and `FlowDetailDrawer.vue` to display data sources, token costs, bottleneck glow, and loop alerts.

---

## 5. Verification Method

To independently verify the implementation:
1. Run backend tests:
   ```bash
   mvn -q -B test
   ```
2. Build the frontend codebase:
   ```bash
   npm run build
   ```
3. Verify files:
   - Check `AgentTaskTraceDto.java` contains `List<String> accessedDataSources`.
   - Check `AgentTaskStatus.java` contains `LOOP_DETECTED`.
   - Check `flowVisualizer.ts` maps `accessedDataSources` and formats loop edge styling.
