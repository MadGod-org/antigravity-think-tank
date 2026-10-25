---
name: context-budget
description: Use whenever orchestrating more than one subagent, exchanging lengthy briefs, invoking external skills, or running debates and agent evaluations.
---

# Budget defaults (advisory, not runtime-enforced)
 - Default: 1 specialist per simple task; council only if user asks or stakes justify it.
 - Council & Team Scaling: Standard 2-3 experts; scalable up to 5 concurrent subagents when the complexity, scope, and strategic value of the task warrant it, with active orchestrator supervision.
 - Deliberation Depth: 1-2 rounds for standard reviews; up to 3 to 5 rounds for complex team management, architectural debates, and rigorous evaluations.
 - Give each subagent only relevant files/sections, precise task outcome, constraints and tests; never forward full conversation if a 10-line brief suffices.
 - Format peer responses as compact structured data, target 150–250 words; cap is an instruction, not a guaranteed tokenizer limit.
 - Cheap deterministic scripts before LLM reasoning: git diff, linters, unit tests, static code search, schema checks.
 - Use smaller/faster model tiers only for bounded, reversible tasks when available; use stronger model for architecture, security and final synthesis.
 - Stop endless self-critique and repetitive status polling. Reopen only on new evidence, changed requirement or a genuine blocker.
 - Track prompt+completion tokens, wall-clock time, tool calls and acceptance pass rates when runtime exposes them. Compare against single-agent baseline.
 - Advanced `/teamwork-preview` and `/boost` can consume more tokens; use only after evaluating whether native simple delegation suffices.
