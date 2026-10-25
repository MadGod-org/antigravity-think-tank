# Audited external source catalog and selection notes — 2026-10-24

The URLs below were researched and checked for the linked functions. **We do not claim to have executed these third-party skills or to have measured their impact in Antigravity.** Distinguish maintainer-authored skills from independent community experiments, frameworks, and official platform docs.

| Project | Type | Maintainer or status | Why relevant | URL |
|---|---|---|---|---|
| Google Antigravity — Custom Subagents | official platform docs | Official | Runtime metadata, tool allowlist, model tiers and discovery | https://www.antigravity.google/docs/subagents/ |
| Google Antigravity — Skills | official platform docs | Official | Skill directories and frontmatter | https://antigravity.google/docs/skills |
| Docling — Document Conversion Skill | Agent Skill + CLI | Maintainer skill | Parse PDF/DOCX/PPTX/XLSX into structured text/JSON | https://github.com/docling-project/docling/blob/main/docling/.agents/skills/docling/SKILL.md |
| K-Dense — Exploratory Data Analysis | Agent Skill | Maintainer skill | Quality profiling for local tabular/scientific data | https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/exploratory-data-analysis/SKILL.md |
| K-Dense — Scientific Critical Thinking | Agent Skill | Maintainer skill | Methodological critique, confounders and claims | https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/scientific-critical-thinking/SKILL.md |
| K-Dense — Peer Review | Agent Skill | Maintainer skill | Structured review of authorized materials | https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/peer-review/SKILL.md |
| Fact Check Skill — petar-nauka | Agent Skill | Independent, small project | Evidence ledger, claim decomposition, provenance | https://github.com/petar-nauka/fact-check-skill/blob/main/SKILL.md |
| Superpowers — Verification Before Completion | Agent Skill | Popular community skill | Fresh evidence before completion claims | https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md |
| Superpowers — Subagent Driven Development | Agent Skill | Popular community skill | Delegation, independent task review | https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md |
| Anthropic — Skill Creator | Agent Skill | Vendor maintained | Design and compare skills with evals | https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md |
| Promptfoo — Evals | Agent Skill + CLI | Maintainer skill | Behavioral regression evals and objective assertions | https://github.com/promptfoo/promptfoo/blob/main/plugins/promptfoo/skills/promptfoo-evals/SKILL.md |
| DeepEval | Evaluation framework | Maintainer framework | Component/trajectory/end-to-end evaluation | https://github.com/confident-ai/deepeval |
| Arize Phoenix | Observability | Maintainer framework | Tracing, dataset curation and experiments | https://github.com/Arize-ai/phoenix |
| Antigravity native research subagent | Built-in platform agent | Official built-in | Codebase search and structural navigation | https://www.antigravity.google/docs/subagents/ |

## Ratings methodology
`fit_1_to_5` below is a **curatorial compatibility score**, NOT a GitHub star count or validated output-quality score. The classification weighs task relevance, inspectable instructions, publisher credibility, implementation friction and cost overhead. For explicit live star counts, query GitHub at installation time. Do not freeze changing ratings as facts.

## Selection logic
- **Core:** Docling, EDA, verification-before-completion, critical thinking and fact-check ledger. Core skill URL ≠ automatic installed capability.
- **Evaluations:** Prefer Promptfoo where deterministic assertions/test fixtures dominate; DeepEval for trajectory-specific scoring; Phoenix for runtime trace observability. Choose based on an observable task; do not install all three by default.
- **Research:** Existing Research Director is the escalation target; no broad web crawling by default.
- **Skill improvement:** Anthropic Skill Creator is a writing/test workflow, not proof of model training.

## Community sentiment
Anecdotal Reddit users report both benefits of separated reviewers and high startup/context costs for unbounded subagents:
https://www.reddit.com/r/ClaudeCode/comments/1p8ja9l/subagents_taking_over_25k_tokens_on_startup/
https://www.reddit.com/r/ClaudeCode/comments/1ur70w0/where_do_subagents_actually_pay_off_in_typical/
Treat these as experiences, not controlled performance benchmarks.
