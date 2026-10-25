---
name: backend-quality
description: Build and audit secure APIs, databases and reliable services.
---

# Backend quality
- Inspect stack, versions, tests, existing contracts, data model and migration history.
- Implement minimal diff. Enforce input validation, authorization per object, secure secret handling, rate limits and idempotency on side effects.
- For migrations inspect indexes, transaction boundaries, locking, backup and rollback. No destructive changes to production without explicit approval.
- Check retry policy, error handling, observability and API compatibility; consult official docs or Context7 only when required.
- Run targeted tests, types, linters and integration checks where tools are available. Never fabricate a passing test.
- Return change summary, verification evidence and remaining risks.
