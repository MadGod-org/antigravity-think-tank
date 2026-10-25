# Think Tank Governance, Cohesion & Lifecycle Rules

1. **Always Include Sidecar Link:** Whenever the Think Tank is updated or referenced, surface `[اتاق فکر زنده (Think Tank)](sidecar://team-orchestration-director/think-tank/)`.
2. **Real Subagent Roster Only:** Never invent fake subagents. Use canonical IDs from `role_catalog.json` (`main_agent`, `team-manager`, `council-architect`, `council-critic`, `ui-frontend-designer`, `backend-auditor`, `code-reviewer`, `qa-reviewer`, `visual-qa`, `integration-reviewer`, `research-scout`, `wp_technical_operator`, `ecommerce_seo_operator`, `agent-evaluator`, `skill-coach`).
3. **Newest-First Ordering:** All feeds (chatroom messages, subtasks, tool actions, activity stream, conversation rail) display newest items at the top.
4. **Live Work Breakdown (`assign-subtask` / `update-subtask`):** Decompose multi-part tasks into subtasks on the Think Tank board so progress and ownership are transparent.
5. **Council Consensus Matrix (`vote-proposal`):** Supervisory and specialist agents record their stance (`APPROVE`, `CONDITIONAL`, `CRITIQUE`, `REJECT`) and confidence `%` on the in-chat Decision Card.
6. **Clean Completion Lifecycle (`complete`):** Never leave agent cards frozen in `ACTIVE` after a task finishes. Always run `thinktank_bridge.py complete --conv-id <CONV_ID>` when work is done.
