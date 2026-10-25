# Antigravity installation and validation

1. Open your project folder; back up any `.agents/agents` / `.agents/skills` files with matching names.
2. Extract this ZIP to workspace root; contents are designed for **workspace scope**:
   - `.agents/agents/<name>.md`
   - `.agents/skills/<name>/SKILL.md`
3. Verify with `python scripts/validate_package.py`.
4. Restart/refresh Antigravity agent customizations if new agents are not shown, and check installed agents in its custom-agent UI.
5. Use the prompt in `docs/START_PROMPTS.md` to ask main agent to enumerate installed custom agents **and only present available capabilities**.
6. Run small public/synthetic tests with no external tool or production permission.
7. For optional packages install from the **maintainers' README only** after reviewing their code, licenses, credentials and applicable data-policy restrictions.
8. If you already installed the prior `team-orchestration-director` package, keep it; these five roles do not overwrite its `team-manager`, `skill-coach`, `agent-evaluator`, `integration-reviewer` or `council-critic` roles.

## Why workspace agents instead of a new plugin?
Native workspace custom agents are simpler, require no speculative `plugin.json` packaging and are directly documented by Google. A plugin wrapper could be created later after runtime compatibility tests.

## Scope and capability caveats
- `flash`/`pro` model tiers depend on the Antigravity account; switch to `inherit` if unavailable.
- Some tool names vary by environment version; current examples use documented `view_file`, `grep_search`, `run_command`. Validate against your installed tool mapping and change tool names if required to avoid hangs.
- `commandExecutionPolicy: off` makes the three review roles read-only from shell perspective. Review role contents also forbid writes.
- A `SKILL.md` does not automatically load an external framework. The package works at prompt/workflow level until optional integrations are genuinely installed.

Documentation:
- https://www.antigravity.google/docs/subagents/
- https://antigravity.google/docs/skills
