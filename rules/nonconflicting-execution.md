# Parallel execution and ownership
- Default max two independent implementation workers. Parallel advice may use up to three experts.
- One writable owner per file/area per wave; do not edit the same file from parallel workers.
- Ensure dependencies resolved before dependent task dispatch. Prefer branch/worktree isolation where available.
- Independent reviewer after implementation; deterministic tests and actual observed tool outputs take precedence over agent opinions.
- Prevent unnecessary repeated tool calls/polling or recursive spawning.
