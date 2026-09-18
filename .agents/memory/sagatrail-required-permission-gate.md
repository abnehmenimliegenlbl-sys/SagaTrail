---
name: SagaTrail required permission gate
description: Rules for enforcing and diagnosing the app-wide native permission check.
---

For authenticated users with a completed profile, SagaTrail must verify every required permission from the operating system at app start and whenever the app becomes active. If any permission is missing, the full permission screen remains mandatory until a final OS re-read confirms all permissions.

**Why:** A prior onboarding confirmation can survive in app data while iOS later reports a different permission state. Trusting the stored confirmation would let the app continue without capabilities that safety, navigation, and narration depend on.

**How to apply:** Persist the last fully granted result only as update/build-stamped diagnostic evidence. Log when a live OS read disagrees with that evidence, but never use the evidence to unlock the app. Keep checks generation-guarded so stale asynchronous reads cannot override newer auth or permission state.