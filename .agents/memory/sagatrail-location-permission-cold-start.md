---
name: Location permission read handling
description: Foreground permission reads must distinguish a transient native error from a confirmed denial
---

Treat a transient `expo-location` permission-read failure as unknown, not denied: retry briefly and re-check when the app returns active before showing the Hike permission banner. This is defensive handling, not proof that Core Location is the root cause of an update-specific incident.

**Why:** The old catch-all mapped any native read error directly to a false denial. The current update-specific incident occurs after a long navigation path, so native startup timing alone is not a sufficient explanation; the active JS/OTA bundle and actual iOS authorization state must be distinguished.

**How to apply:** Log only permission metadata (`status`, `granted`, `canAskAgain`) plus non-sensitive update identity (`updateId`, embedded-launch flag); keep location coordinates out of diagnostics, and reserve the user-facing denial state for a confirmed non-granted response.