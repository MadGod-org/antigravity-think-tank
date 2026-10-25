---
name: browser-check
description: Test browser behavior, performance and functional regressions.
---

# Browser QA
- Check built-in browser tools first, then attach ONE optional MCP: Playwright for UI flows OR Chrome DevTools for network/performance.
- Test important paths: navigation, forms, error states, responsive layout and relevant Console errors.
- Use staging/test accounts for login, cart and checkout. Do not perform real purchases or irreversible actions.
- For each test record environment, steps, expected, observed, pass/fail/not-run and any screenshot/log path.
- Do not call unavailable tools or claim test success without evidence.
