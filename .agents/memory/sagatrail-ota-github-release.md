---
name: SagaTrail OTA GitHub release
description: How to publish the production OTA when local GitHub CLI state is stale or unauthenticated.
---

The production OTA is triggered by a push to the GitHub `main` branch. The local `origin/main` ref can lag the actual GitHub branch, and the local Git CLI may not have usable GitHub credentials even when the Replit GitHub connection is active. In that case, reconcile against the live GitHub `main` ref and create the commit/tree through the connected GitHub API rather than forcing a stale local push.

**Why:** A blind force-push could remove newer OTA or application changes already on GitHub; the connected API preserves the current remote tree while applying the intended local changes.

**How to apply:** Compare the live GitHub ref before writing, use the current remote commit as the tree base, apply the current workspace changes, update `main` without force, then verify the EAS production OTA workflow reaches `SUCCESS` for both platforms.