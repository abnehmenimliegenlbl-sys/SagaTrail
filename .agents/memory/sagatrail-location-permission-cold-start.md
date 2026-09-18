---
name: Location permission read handling
description: Foreground permission reads must distinguish a transient native error from a confirmed denial
---

Treat a transient `expo-location` permission-read failure as unknown, not denied. After brief retries, `undetermined` with `canAskAgain` must enter the normal native permission request automatically; only a real denial should show the Hike permission banner.

**Why:** A post-update device repeatedly returned `undetermined` even though location had worked in the preceding build. Mapping that state to `denied` stopped GPS until the user tapped the manual banner, while the banner's preflight still showed `undetermined` and `canAskAgain`.

**How to apply:** Log only permission metadata (`status`, `granted`, `canAskAgain`) plus non-sensitive update identity; keep coordinates out of diagnostics. Retry transient reads, automatically call the native request for askable `undetermined`, retry on AppState active, and reserve `denied` for an actual denied result.