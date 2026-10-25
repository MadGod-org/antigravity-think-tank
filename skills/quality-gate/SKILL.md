---
name: quality-gate
description: Use before accepting worker tasks, merging diffs, deploying changes, or reporting that a multi-agent project is finished.
---

# Quality Gate & Completion Governance (گیت کیفیت و تأیید نهایی)

Use this skill before marking any subtask or Think Tank session `COMPLETED`.

## 1. Mandatory Verification Checklist
1. **Concrete Evidence:** Every completed subtask must cite real verification output (`node --test`, `py_compile`, HTTP status check, or DOM/contract assertion).
2. **Council Sign-Off (`vote-proposal`):**
   - `integration-reviewer`, `code-reviewer`, or `qa-reviewer` records their verification vote on the active proposal:
     `python tools\thinktank_bridge.py vote-proposal --conv-id <CONV_ID> --voter integration-reviewer --name "بازبین یکپارچگی" --stance APPROVE --confidence 98 --comment "<Test & Contract Evidence>"`
3. **95% Confidence Gate (`submit-review`):**
   - If the combined confidence of the Main Agent and `team-manager` is `< 95%`, do NOT mark the project complete; call `submit-review` to surface the human decision modal.
4. **Clean Lifecycle Reset (`complete`):**
   - Once all checks pass (`>= 95%` confidence), invoke:
     `python tools\thinktank_bridge.py complete --conv-id <CONV_ID> --summary "<Final Verification Summary>"`
   - This transitions all active subagents to `IDLE`, marks all subtasks `COMPLETED`, sets progress to `100%`, and prevents frozen UI cards.
