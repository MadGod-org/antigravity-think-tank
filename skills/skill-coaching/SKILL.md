---
name: skill-coaching
description: Use to equip custom subagents with role-specific SKILL.md files, update triggering descriptions, create tests and verify an agent learned the workflow behavior using JEV and SUBQ decision frameworks.
---

# Skill coaching is configuration + evaluation, not weight training
 - Inspect existing agent `.md` frontmatter and available Skills; don't overwrite user-authored agents or grant extra tools automatically.
 - Identify exact missing behavior, a minimal SKILL.md with YAML `name`, `description`, short instructions and optional references. Do not dump all 100 skills into the agent context.
 - **Cognitive Decision Framing (JEV & SUBQ):**
   * Use **JEV (`jev-decision-layer`)** to evaluate bounded instruction choices, eliminate semantic ambiguity, resolve conflicting directives, and ensure clean separation of concerns.
   * Use **SUBQ (`subq-decision-layer`)** for rapid probability sanity checks, assessing confidence scores in trigger detection and robustness against adversarial edge cases.
 - For Antigravity, configure a verified skill path in the custom agent `skills` field only after checking it exists and resolves; skill loading behavior may vary by surface/version.
 - Use the official Anthropic skill-creator framework if installed, but do not assume it is installed. Reference: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
 - Build 3–8 realistic test prompts (trigger and non-trigger), golden outputs and safety constraints.
 - Compare identical tasks before/after. Revise descriptions if skill is not selected; revise instructions if executed incorrectly. Prefer examples, minimal templates and explicit pass criteria.
 - Parent agent reviews skill diffs and approves installation; evaluation follows `agent-evaluation` with JEV/SUBQ arbitration.
 - Record outcome in a skill registry: source, version/commit, dependencies, tests, score, permissions, owner. Never claim permanent learning across sessions without persisted configuration.

