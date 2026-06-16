# Context Registry - Flow Visualizer Enhancements

## Repositories & Paths
- Project Root: `/Users/armaganercan/antigravity/intelligent-organization`
- Backend: `/Users/armaganercan/antigravity/intelligent-organization/backend`
- Frontend: `/Users/armaganercan/antigravity/intelligent-organization/frontend`
- Agent Workspace: `/Users/armaganercan/antigravity/intelligent-organization/.agents/orchestrator`

## Key Files to Investigate
### Backend
- `OrchestrationService.java` (needs loop detection logic)
- `RunDetailDto.java` or `AgentTaskDto.java` or similar (needs loop flag/warnings)
- Other related files in `com.akilliorganizasyon` backend modules.

### Frontend
- `AgentNode.vue` (needs icons/badges for RAG/Tools/Screens)
- `FlowDetailDrawer.vue` (needs details for data sources, warnings, latency/errors)
- `useFlowVisualizerStore.ts` (needs mapping of loop edges/nodes, alerts)
- `OrchestrationFlowView.vue` (visualizer page)

### Documentation & Wiki
- `.wiki/moduller/modul_aidebug_flow_visualizer_analizi.md` (to update for R1)
- `.wiki/wiki_index.json` (ensure index matches)
