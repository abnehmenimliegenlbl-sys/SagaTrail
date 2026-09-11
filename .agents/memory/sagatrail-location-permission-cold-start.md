---
name: Location permission cold-start handling
description: Foreground location permission can be read during a native cold-start or update race
---

Treat a transient `expo-location` permission-read failure as unknown, not denied: retry briefly and re-check when the app returns active before showing the Hike permission banner.

**Why:** A TestFlight update can relaunch the native process while Core Location is still reconnecting, whereas an ordinary app restart may not expose the timing window. The old catch-all mapped read errors directly to a false denial.

**How to apply:** Log only permission metadata (`status`, `granted`, `canAskAgain`), keep location coordinates out of diagnostics, and reserve the user-facing denial state for a confirmed non-granted response.