# Quick prompts for Main Antigravity Agent

## Discovery and assessment
```text
Inspect the installed workspace custom agents under .agents/agents/ and skills under .agents/skills/.
Keep my previous Team Manager / Think Room and Research Director intact. Do not fabricate agents that are absent.
Explain the role/skill matrix briefly and prepare three synthetic acceptance tests for each new specialist.
Do not make production changes or enable external services.
```

## Operate Data & Evidence review
```text
Act as the main Antigravity agent with final authority.
For the attached evidence, have Data Intelligence Curator extract atomic findings with source IDs and priority/sensitivity/status.
Have Evidence Critical Reviewer independently inspect important factual claims and request limited public-source lookup only if actually available and authorized.
Escalate controversial, high-risk or consequential claims to the installed Research Director only when justified.
Have Requirements Auditor verify the decision against my original request and acceptance criteria.
Ask Context Curator for a short handoff; ask Cost Analyst only for real observed measurements.
Keep other subagents inactive. Return findings, citations, unresolved points and an approval decision. Never claim a subagent ran unless it did.
```

## Benchmark custom specialists
```text
Evaluate my custom subagents against a held-out synthetic dataset.
Freeze prompts and versions, record each invocation and tool use, retain evidence, and score only actually executed tests.
Use Promptfoo or DeepEval only if available and approved; otherwise generate test cases and mark live results NOT_TESTED.
Compare before/after on accuracy, safety, tools, latency and tokens, and do not auto-improve based solely on self-grading.
```
