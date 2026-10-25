# Token, time and delegation budget

Defaults are recommendations, not hard runtime enforcement.

- First ask: can the current agent complete this correctly without delegation? For simple tasks, **0 subagents**.
- Spawn **1 specialist** for a real independent domain need; **max 2 concurrent** specialist executions by default for nontrivial independent work. Critical Reviewer is not a general researcher.
- Minimize context handed to each specialist: target/task, 1–5 relevant source refs, constraints, explicit format, risk, confidence expectations; omit conversation transcript.
- Each specialist returns an executive summary of **≤12 lines**, with detailed artifact references for auditability.
- Use deterministic local scripts for counts, schema checks, deduplication and basic format validation.
- Reuse prior Research Director outputs only if their freshness/scope matches the claim; never treat stale cache as current evidence.
- Search escalation: first verify internal source, then maximum 1–2 narrow public-source lookups if needed; deep research only when high-risk, disputed or broad evidence needed and authorized.
- Do not call subagents to merely wait for other subagents, and never spawn nested agents automatically.
- If actual runtime token metrics aren't available, report `not measured` rather than a projected saving.
- Compare with a no-plugin baseline on 10 representative tasks. Track completed criteria, reviewer catches, agent calls, token counts, elapsed time, reruns and error rate.

Reddit community discussions indicate tradeoffs: isolated subagent context can help but startup and duplicated reads may increase token use. Evidence is anecdotal and not a guarantee of savings. Sources:
https://www.reddit.com/r/ClaudeCode/comments/1p8ja9l/subagents_taking_over_25k_tokens_on_startup/
https://www.reddit.com/r/ClaudeCode/comments/1ur70w0/where_do_subagents_actually_pay_off_in_typical/
