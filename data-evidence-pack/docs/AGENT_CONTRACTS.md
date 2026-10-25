# Agent roles, contracts, boundaries (English)

## Chain of authority
User / site owner → Main Antigravity Agent → existing Team Manager / Think Room → assigned specialist(s) → independent auditor → main-agent decision. A subagent cannot self-approve production writes, access grants, publishing, user-facing delivery or research on restricted data.

## Role matrix

| Agent | Owns | Does NOT own | Outputs | Default model |
|---|---|---|---|---|
| Main Antigravity Agent | Final plan, approval routing, changes, delivery | Transfer final authority to specialist | signed-off decision | user's configuration |
| Existing Team Manager | Agent discovery and workload, task dependencies | Unverified quality judgments | task DAG and assignments | existing |
| Existing Research Director | Deep web research with citations | Automatic access to private files | sources + uncertainty | existing |
| Data Intelligence Curator | Atomic records, metadata, tiering | Marking itself verified | record IDs + ledger | flash |
| Evidence Critical Reviewer | Independent claim-level verdicts | Broad ingestion or changing original data | cited verdicts | pro |
| Requirements Auditor | Traceability, acceptance criteria | Implementing unapproved changes | evidence matrix | inherit |
| Context Memory Curator | Provenance-preserving summaries | Persisting secrets or uncertain claims as facts | small handoff packets | flash |
| Performance Cost Analyst | Actual logs, optimization recommendations | Inventing savings or changing billing | cost notes + gaps | flash |
| Existing Agent Evaluator | Executed agent behavior on test cases | Grading unexecuted tasks as PASS | scorecard + run IDs | existing |
| Existing Integration Reviewer | Cross-agent integration checks | Declaring prod safe from screenshots | test reports | existing |
| Existing Skill Coach | Teaching via installed skills and held-out tests | Changing skills without baseline | before/after eval | existing |

## Standard request envelope
```json
{
  "task_id": "TASK-001", "goal": "Check current API claims",
  "scope": "one endpoint and its docs", "source_ids": ["SRC-001"],
  "sensitivity": "internal", "risk_level": "P1",
  "output_contract": "evidence_ledger_v1", "budget": {"max_web_queries": 2, "max_parallel_agents": 1}
}
```

## Standard response envelope
```json
{
 "task_id":"TASK-001", "agent":"evidence-critical-reviewer",
 "status":"DISPUTED", "findings":["Conflicting version references"],
 "evidence_refs":["SRC-001","SRC-002"],
 "tested": false, "unknowns":["current server version"],
 "risk":"P1", "next_action":"ask Research Director to verify official changelog"
}
```

## Important distinctions
- `priority`: urgency/impact; `P0` immediate, `P1` important, `P2` routine, `P3` background.
- `verification`: `UNVERIFIED`, `VERIFIED`, `DISPUTED`, `REFUTED`. Verification must be independently evidenced.
- `verdict`: `SUPPORTED`, `UNSUPPORTED`, `DISPUTED`, `REFUTED`, `OUTDATED`, `NOT_CHECKABLE`. Verdict describes one exact claim.
- `sensitivity`: `public`, `internal`, `confidential`, `restricted`. Classification never confers access.
- `confidence` is probabilistic/qualitative judgment and never upgrades verification by itself.

## Required claim fields
`claim_id`, `claim`, `source_id`, `source_locator`, `observed_at`, `priority`, `verification`, `sensitivity`, `owner`, `verifier`, `verdict`, `notes`. Empty verifier is expected for unverified records.

## Escalations
- Missing context: query source owner/parent before assuming.
- Significant contradiction: use independent evidence; if unresolved mark disputed.
- Sensitive data: do not web-search or outsource until authorization.
- P0 incidents / irreversible tasks: alert main agent and relevant human reviewer; do not autonomously act.
- No connected search: state limitations, mark `UNVERIFIED` and request parent-assisted lookup.
