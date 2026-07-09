---
name: Replit AI Integrations proxy can fail even when correctly configured
description: Anthropic (and likely other) AI Integrations proxy returned "not configured" despite correct env vars and repeated re-provisioning; direct-API-key fallback resolves it.
---

The Replit AI Integrations proxy (used via `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY`) can itself return `404 Replit AI Integrations is not configured` on every request, even when:
- both env vars are confirmed present in the running process
- `setupReplitAIIntegrations` was re-run 3x (the documented retry limit) with restarts in between
- curling the proxy base URL directly (bypassing the SDK) reproduces the same error

This points to an outage/misconfiguration in the proxy service itself, not the app or its env vars — not something fixable from within the workspace.

**Fix pattern:** add a fallback in the shared Anthropic client (`lib/integrations-anthropic-ai/src/client.ts`) that prefers a direct `ANTHROPIC_API_KEY` (user's own key, requested via `requestEnvVar`) when present, and only falls back to the AI Integrations proxy (`baseURL` + proxy key) otherwise. This lets the user unblock themselves immediately instead of waiting on a platform-side fix, while preserving the free proxy path for when it's healthy again.

**Why:** confirmed via direct curl to the proxy base URL — ruled out app-level bugs (client init, cached env, wrong var names) before concluding it was a platform-side outage.
