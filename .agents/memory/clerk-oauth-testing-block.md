---
name: Testing subagent blocks on Clerk sign-in screens with visible SSO buttons
description: e2e testing via runTest refuses to proceed past a Clerk auth screen if a Google/OAuth SSO button is visible, even when testClerkAuth/programmatic auth bypass is requested.
---

The `testing` skill's `runTest` refuses to interact with a login screen once it detects an external OAuth button (e.g. "Continue with Google"), classifying it as an external-auth blocker — even when `testClerkAuth: true` is passed and the prompt explicitly states the Clerk auth step is fully programmatic/API-based.

**Why:** Verified across two independent attempts with different phrasing; both hit the identical "blocked earlier ... external OAuth authentication" refusal. This appears to be a heuristic in the testing subagent that triggers on the mere presence of an SSO button in the screen, not on whether the flow actually invokes it.

**How to apply:** When an app has both email/password (or programmatic) Clerk auth AND a visible "Continue with Google" (or other OAuth) button on the same screen, do not expect `runTest` to get past it. Fall back to manual verification: typecheck, direct API curl checks of the protected endpoints (401/403 gating), and code-path review. Mention this limitation to the user rather than retrying the same call a third time.
