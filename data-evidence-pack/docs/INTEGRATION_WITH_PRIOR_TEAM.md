# Integration with pre-existing Think Room, Research Director and custom agents

This kit extends, rather than supersedes, your earlier `team-orchestration-director` plugin. If installed, Team Manager is the orchestrator, Council Architect/Critic the brainstorming council, Skill Coach the trainer, Agent Evaluator the test owner, Integration Reviewer the final integration checker.

**New roles** (this ZIP):
- Data Intelligence Curator: runs first on substantial incoming files and notes. Emits atomic source-linked claims.
- Evidence Critical Reviewer: independently inspects **material claims**, not every small comment. When useful, requests Research Director escalation via Team Manager/main agent.
- Requirements Auditor: checks acceptance criteria after agents finish.
- Context Memory Curator: produces compact handoff only after verification statuses are attached.
- Performance Cost Analyst: audits measured data, not guesswork.

**Workflow:** MAIN → TEAM MANAGER → CURATOR → CRITIC → RESEARCH (conditional) → SPECIALISTS → REQUIREMENTS / INTEGRATION REVIEW → MAIN SIGN-OFF.

**Parallelism:** Curator and Requirements Auditor can analyze independent inputs concurrently. Critic cannot verify new claims until they have evidence records; it may process a pre-existing ledger separately. Concurrent file modifications remain prohibited without exclusive ownership. The cost analyst is triggered only for real logs or observed anomalous usage.

**Avoid duplication:** Do not create another `agent-evaluator` or `team-manager` with colliding IDs. Do not install whole heavy orchestration harnesses concurrently just to run these roles.
