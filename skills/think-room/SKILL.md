---
name: think-room
description: Coordinate evidence-based project discussion, architectural trade-offs, council voting, and peer critiques between the main agent, team manager, and subagents in the Antigravity Think Tank.
---

# Think Room Protocol (پروتکل هم‌اندیشی، نقد و اجماع شورا)

Use this skill when a project decision benefits from structured multi-agent deliberation, architectural trade-off analysis, red-team critique, and an interactive user decision card.

## 1. Deliberation Flow (جریان هم‌اندیشی و مناظرهٔ فنی)
1. **Frame the Decision (`team-manager` / Main Agent):**
   - Set the active project and directive:
     `python tools\thinktank_bridge.py set-task --conv-id <CONV_ID> --project "<Project>" --directive "<Directive>"`
2. **Propose & Challenge (`council-architect` ⇄ `council-critic`):**
   - `council-architect` formulates options and component contracts (`--thoughts`).
   - `council-critic` stress-tests the plan for race conditions, security risks, and UX/RTL edge cases (`--critique`, `--question`).
   - Peer exchanges MUST be streamed live using `collaborate` so `[فرستنده] ➔ [گیرنده]` badges appear in the chatroom:
     `python tools\thinktank_bridge.py collaborate --conv-id <CONV_ID> --from <sender-id> --to <recipient-id> --label "<Topic>" --message "<Full Technical Dialogue>"`
3. **Council Consensus Matrix (`vote-proposal`):**
   - Before or alongside presenting the final proposal card, supervisory and specialist subagents record their structured stance (`APPROVE`, `CONDITIONAL`, `CRITIQUE`, `REJECT`) and confidence score (`0-100%`):
     `python tools\thinktank_bridge.py vote-proposal --conv-id <CONV_ID> --voter <agent-id> --name "<Agent Title>" --stance APPROVE|CONDITIONAL|CRITIQUE|REJECT --confidence 95 --comment "<Justification>" --counter-argument "<Optional Risk/Condition>"`
4. **In-Chat Decision Card (`set-proposal`):**
   - Submit the synthesized plan with selectable options to the top of the chatroom:
     `python tools\thinktank_bridge.py set-proposal --conv-id <CONV_ID> --project "<Project>" --title "<Title>" --author "<Author>" --summary "<Summary>" --options "گزینه ۱,گزینه ۲,گزینه ۳"`
5. **Completion Lifecycle (`complete`):**
   - Once execution and verification finish, always run `complete` so all agents transition cleanly to `IDLE`, all subtasks mark `COMPLETED`, and progress reaches `100%`.
