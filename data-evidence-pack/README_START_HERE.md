# Data & Evidence Intelligence Team — Antigravity Pack

**Version:** 1.0 • **Research checkpoint:** 2026-10-24 • **Language:** English

A lightweight, **review-first** extension for your existing Antigravity main agent, Team Manager / Think Room, Research Director and custom specialists. It supplies five workspace subagents, five skills, structured templates, a role/skill workbook, and offline validation scripts.

## Fast install

1. **Back up** your workspace `.agents/` folder and check for colliding custom agent names.
2. Unzip the archive into your **workspace root**, preserving the `.agents/` directory.
3. Read [`ANTIGRAVITY_TEAM_DATA_EVIDENCE_MANUAL.md`](ANTIGRAVITY_TEAM_DATA_EVIDENCE_MANUAL.md).
4. Run `python scripts/validate_package.py` from the package root; no dependencies, network, or API keys required.
5. Open Antigravity and use the main agent prompt shown in `docs/START_PROMPTS.md`.
6. Test on **synthetic/public data** first; require actual evidence before granting any verdict.

## What is installed / what is not

- **Included, installable:** `.agents/agents/*.md` and `.agents/skills/*/SKILL.md` in native workspace locations.
- **Included:** scripts/templates/catalog/English documentation and Excel-compatible CSV/XLSX register.
- **Not bundled:** source code or live access of Docling, Promptfoo, DeepEval, Phoenix, external research tools, or old project directors. These must be installed/configured separately when needed.
- **Not performed:** real Antigravity runtime execution, deep web fact-check of your private project, or real token benchmark.

Do not assume your existing Think Room ZIP is active; this kit remains useful standalone but coordinates with it when already installed.

## Operating rule

**Source → extract → classify → independently verify → optionally escalate → parent approves → deliver.**

The parent agent has ultimate authority. The critical reviewer never certifies its own authored evidence, and **no one writes to production by default**.
