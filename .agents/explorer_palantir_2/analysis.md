# Agent Orchestration, Loop Detection, and Token/Cost Metrics Investigation

## Executive Summary
This report details the implementation of agent orchestration, loop detection, duration tracking, and token/cost metrics computation in the "Akıllı Organizasyon" project.
The codebase utilizes a **ThreadLocal context tracker** (`AiExecutionTracker`) on the backend to collect raw execution metrics, which are then persisted as task traces. However, cost calculations are computed **exclusively on the frontend** using hardcoded pricing lists. A lightweight ancestor traversal algorithm handles **loop detection** on the backend, throwing exceptions and updating task states when cycles or role-repetition thresholds are breached.
Several architectural gaps, including discrepant cost calculations between components and database N+1 queries during loop detection, have been identified.

---

## 1. Backend Implementations

### A. Agent Orchestration Lifecycle & Tracing
Agent orchestration is initiated asynchronously.
- **Entry Point**: `AgentOrchestrationController.java` (`/api/agents/orchestrate`) calls `OrchestrationService.java:orchestrate()`.
- **Background Runner**: A thread-pool executor (`orchestrationExecutor`) runs `executeRun()`, which iterates through planned steps and delegates tasks.
- **Task Execution**: Executed in `executeAgentTask()` inside `OrchestrationService.java`.
- **ThreadLocal Tracking**: Before executing a task, `com.akilliorganizasyon.shared.ai.AiExecutionTracker.start()` initializes a `TrackerContext` stored in a `ThreadLocal` wrapper.
- **Data Capture**: 
  - Generative AI calls go through `AiChatService.java` which captures prompt metadata (input/output tokens, duration) and stores it in the `TrackerContext`.
  - Security evaluations in `AgentGuardService.java` check permissions and register accessed data sources into the same tracker context.
- **Persistence**: In the `finally` block of `executeAgentTask()`, the tracker context is read and persisted to the `agent_task_traces` table via the `AgentTaskTrace` entity, and `AiExecutionTracker.stop()` clears the thread.
- **Aggregate Metrics**: At run termination, `recordMetrics()` computes the overall run stats (task count, delegation count, total duration, and summed tokens) and persists them to the `orchestration_metrics` table.

### B. Loop Detection Mechanism
Loop detection prevents infinite delegation cycles among agents.
- **File Path**: `backend/src/main/java/com/akilliorganizasyon/agents/service/OrchestrationService.java`
- **Method**: `private boolean detectLoop(AgentTask task, AgentRefDto agent)` (Lines 863–886)
- **Logic**:
  The system traverses the task hierarchy upwards using `parentTaskId` and performs two checks:
  1. **Exact Agent Repetition**: Checks if the same `agentId` about to run already exists in the ancestral task path. If found, a cycle is detected (`occurrences >= 1`).
  2. **Role/Type Cycle**: Checks if other agents of the same `type` (role) have run. If the ancestor path contains $\ge 2$ instances of the same role, running the current agent would constitute the 3rd invocation, which is flagged as a loop (`roleOccurrences >= 2`).
- **Abrupt Termination**:
  If a loop is detected:
  - The task status is updated to `LOOP_DETECTED`.
  - A system trace message is recorded.
  - A `BusinessException("LOOP_DETECTED", ...)` is thrown, immediately halting that branch of execution.

```java
    private boolean detectLoop(AgentTask task, AgentRefDto agent) {
        UUID parentId = task.getParentTaskId();
        int occurrences = 0;
        int roleOccurrences = 0;
        while (parentId != null) {
            java.util.Optional<AgentTask> parentOpt = taskRepository.findById(parentId);
            if (parentOpt.isEmpty()) {
                break;
            }
            AgentTask parent = parentOpt.get();
            if (parent.getAgentId().equals(task.getAgentId())) {
                occurrences++;
            }
            java.util.Optional<AgentRefDto> pAgentOpt = agentDirectory.find(parent.getAgentId());
            if (pAgentOpt.isPresent()) {
                AgentRefDto pAgent = pAgentOpt.get();
                if (pAgent.type() != null && pAgent.type().equalsIgnoreCase(agent.type())) {
                    roleOccurrences++;
                }
            }
            parentId = parent.getParentTaskId();
        }
        return occurrences >= 1 || roleOccurrences >= 2;
    }
```

### C. Duration Tracking
- **Orchestration Run Duration**: Captured coarsely via `startedAt` and `finishedAt` (`Instant.now()`) in the `orchestration_runs` table, and precisely as the `"duration.ms"` key in `orchestration_metrics` via `System.nanoTime()`.
- **Individual Task Duration**: LLM execution duration is timed in `AiChatService.java` using `System.currentTimeMillis()` around model calls. This is aggregated in `TrackerContext` and written to the `duration_ms` field of `AgentTaskTrace` (reflecting actual model execution and tool-call execution times).

### D. Token Tracking
- **Standard (Non-Streaming) Calls**: Tokens are extracted from the metadata of Spring AI's `ChatResponse`: `response.getMetadata().getUsage()`.
- **Streaming Calls**: Since token usage info is often omitted in streaming chunks, the system approximates tokens heuristically:
  - `inputTokens = (systemPrompt.length() + userPrompt.length()) / 4`
  - `outputTokens = responseContent.length() / 4`

---

## 2. Frontend Implementations

The frontend displays execution flows, node topologies, timelines, and costs.

### A. Store Layer
- **File Path**: `frontend/src/modules/aidebug/store/flowVisualizer.ts`
- **Responsibility**: Fetches run details and converts them into canvas nodes and edges (supporting Vue Flow / AntV G6).
- **Loop Visuals**: If `task.status === 'LOOP_DETECTED'`, it sets `isLoopEdge = true` which styles the corresponding edge with a thick dashed rose line (`stroke: '#f43f5e', strokeDasharray: '5 5'`) and animates it.

### B. Canvas Nodes (AgentNode.vue)
- **File Path**: `frontend/src/modules/aidebug/components/AgentNode.vue`
- **Loop Styling**: When `isLooping` is computed as true, the node renders with a pulsing border:
  `border-rose-500 bg-rose-50/5 ring-4 ring-rose-500/50 animate-pulse`
  It also displays a bouncing `ShieldAlert` warning icon.
- **Metrics Display**: Renders token count (e.g., `4.2k tkn`), duration in seconds (`nodeDuration`), and estimated cost.
- **Cost Calculation**: Calculated via a computed property. It maps model names (e.g. `gpt-4o`, `sonnet`, `gpt-3.5`) to hardcoded pricing rates (input/output per million tokens) and multiplies them by the node's token counts. If no match is found, it falls back to `gpt-4o` pricing (input $5.0, output $15.0 per million tokens).

### C. Flow Detail Drawer (FlowDetailDrawer.vue)
- **File Path**: `frontend/src/modules/aidebug/components/FlowDetailDrawer.vue`
- **Loop Warnings**: Displays a pulse-animated alert banner: `"Sonsuz Delegasyon Döngüsü (Loop) - Ajanlar arasında tekrarlı delegasyon tespit edildi"` if status is `LOOP_DETECTED`.
- **Cost Calculation**: Implements the exact same computed cost logic as `AgentNode.vue` with a fallback to `gpt-4o` pricing.

### D. Orchestration Flow View (OrchestrationFlowView.vue)
- **File Path**: `frontend/src/modules/aidebug/views/OrchestrationFlowView.vue`
- **Dashboard Totals**: Displays total tokens and cumulative cost for the entire run.
- **Cost Calculation**: Features a different cost calculation helper `calculateCost()` with a different set of pricing rates:
  - fallback model: `gpt-4o-mini` (input $0.15, output $0.60 per million tokens).
  - includes Gemini pricing (`gemini-1.5-pro`, `gemini-1.5-flash`), which is absent in `AgentNode.vue`.

### E. Orchestration Timeline (OrchestrationTimeline.vue)
- **File Path**: `frontend/src/modules/aidebug/components/OrchestrationTimeline.vue`
- **Duration Representation**: Calculates step duration dynamically using `task.updatedAt - task.createdAt`.

---

## 3. Discrepancies and Code Gaps

1. **Inconsistent and Mismatched Cost Calculations**:
   - `OrchestrationFlowView.vue` defines one set of pricing models and uses `gpt-4o-mini` ($0.15/$0.60) as a fallback.
   - `AgentNode.vue` and `FlowDetailDrawer.vue` define a different set of models and use `gpt-4o` ($5.0/$15.0) as a fallback.
   - Consequently, a model execution with 10,000 tokens on a local model or fallback model will show completely different costs on the node badge compared to the run summary totals on the dashboard.
   - **Fix**: Centralize the token-to-cost computation in a frontend utility or compute it on the backend, and keep the pricing table synchronized.

2. **N+1 Database Query in Loop Detection**:
   - The method `detectLoop` executes database lookups (`taskRepository.findById(parentId)`) sequentially in a `while` loop for every ancestor task. If the delegation stack is deep, this can degrade performance.
   - **Fix**: Since all tasks of a run are already fetched for other UI operations, they can be cached or fetched in a single query (`findByRunId`) during execution, or the hierarchy could be resolved in-memory.

3. **Mismatched Task Duration Sources**:
   - `AgentNode.vue` displays `durationMs` from `agent_task_traces`, which captures the actual LLM and tool invocation duration.
   - `OrchestrationTimeline.vue` calculates duration as `task.updatedAt - task.createdAt`, which includes network latencies, thread scheduling, and queue times.
   - This creates a difference between the "thinking duration" on the node and the "execution duration" on the timeline.
   - **Fix**: Provide both metrics clearly (e.g., "Queue + System Time" vs. "AI Execution Time") or unify them.

4. **Hardcoded Pricing on Client-Side**:
   - All LLM pricing rates are hardcoded directly into the frontend Vue code.
   - Adding or modifying models requires changes to multiple frontend files.
   - **Fix**: Fetch the model pricing dynamically from a backend endpoint or configurations (e.g., `application.yml` or database-driven settings).

5. **Heuristic Token Counting for Streams**:
   - The backend uses a hardcoded `characters / 4` estimation for stream tokens.
   - **Fix**: Integrate a proper BPE tokenizer library (like jtokkit for Java) on the backend to obtain precise token counts.

---

## 4. Key File Paths

| File Path | Description | Layer |
|---|---|---|
| `backend/.../agents/service/OrchestrationService.java` | Core orchestration logic, `detectLoop` method, run metrics aggregation | Backend Service |
| `backend/.../shared/ai/AiExecutionTracker.java` | ThreadLocal wrapper tracking tokens, duration, tools, screens, and data sources | Backend Utility |
| `backend/.../shared/ai/AiChatService.java` | Main AI call execution, records metadata & heuristically computes stream tokens | Backend Service |
| `backend/.../chatbot/service/ChatService.java` | Handles user-chatbot messaging, extracts tracker metrics to save in message metadata | Backend Service |
| `backend/.../agentlifecycle/service/AgentGuardService.java` | Governance shield, registers accessed data sources in the tracker context | Backend Service |
| `backend/.../agents/domain/AgentTaskTrace.java` | JPA Entity for task traces containing accumulated tokens and durations | Backend Entity |
| `frontend/src/modules/aidebug/store/flowVisualizer.ts` | Pinia store compiling tasks and traces into nodes, edges, and loop animations | Frontend Store |
| `frontend/src/modules/aidebug/components/AgentNode.vue` | Custom Vue Flow node styling loops (pulsing rose), rendering node metrics and cost | Frontend Component |
| `frontend/src/modules/aidebug/components/FlowDetailDrawer.vue` | Drawer detailing selected node, warning banner for loops, and node-level cost | Frontend Component |
| `frontend/src/modules/aidebug/views/OrchestrationFlowView.vue` | Main view displaying flow canvas, overall run totals, and aggregate cost | Frontend View |
| `frontend/src/modules/aidebug/components/OrchestrationTimeline.vue` | Sequential step timeline, calculating duration dynamically from task timestamps | Frontend Component |
