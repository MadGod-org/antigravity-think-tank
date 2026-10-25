---
name: task-orchestration
description: Inventory available agents, decompose project work into WBS subtasks, assign ownership, and track live progress and evidence in the Antigravity Think Tank.
---

# Task Orchestration & Work Breakdown Structure (سازمان‌دهی و تقسیم کار پروژه)

Use this skill to decompose multi-step projects into explicit subtasks assigned to canonical subagents and track their real-time execution in the Think Tank UI.

## 1. Canonical Subagent Roster
Assign work only to real, registered roles:
- **Core / Supervisory:** `main_agent`, `team-manager`, `council-architect`, `council-critic`, `agent-evaluator`, `skill-coach`
- **Data, Evidence & Governance Specialists:** `data-intelligence-curator` (`data-intake-tiering`), `evidence-critical-reviewer` (`evidence-verification`), `requirements-auditor` (`requirements-traceability`), `context-memory-curator` (`context-cost-control`), `performance-cost-analyst` (`context-cost-control`, `agent-output-scoring`)
- **Engineering & Design:** `ui-frontend-designer`, `backend-auditor`, `firestore-rules-author`
- **Quality & Verification:** `code-reviewer`, `qa-reviewer`, `visual-qa`, `integration-reviewer`, `flutter_a11y_agent`
- **Domain Specialists:** `research-scout`, `wp_technical_operator`, `ecommerce_seo_operator`, `image-generator`

### Integrated Evidence & Delivery Pipeline
`MAIN → TEAM MANAGER → DATA INTELLIGENCE CURATOR → EVIDENCE CRITICAL REVIEWER → SPECIALISTS → REQUIREMENTS AUDITOR / INTEGRATION REVIEWER → CONTEXT MEMORY CURATOR → MAIN SIGN-OFF`

## 2. Live Subtask Delegation (`assign-subtask` / `update-subtask`)
Every delegated unit of work MUST be registered on the Think Tank Subtasks Board so progress (`%`), assignee workload, and deliverables are visible in both the **Overview** and **Conversations -> تقسیم کار** tabs:

1. **Create / Assign a Subtask:**
   ```powershell
   python tools\thinktank_bridge.py assign-subtask --conv-id <CONV_ID> --id <subtask-id> --title "<Subtask Title>" --assignee <agent-id> --from team-manager --status ASSIGNED --priority HIGH --deliverable "<Expected Artifact / Test Evidence>"
   ```
2. **Transition to In-Progress / Review / Completed:**
   ```powershell
   python tools\thinktank_bridge.py update-subtask --conv-id <CONV_ID> --id <subtask-id> --title "<Subtask Title>" --assignee <agent-id> --status IN_PROGRESS|REVIEW|COMPLETED --deliverable "<Verified Output>"
   ```
3. **Final Session Completion:**
   When all subtasks are verified, close out the task lifecycle:
   ```powershell
   python tools\thinktank_bridge.py complete --conv-id <CONV_ID> --summary "<Final Delivery Summary>"
   ```
