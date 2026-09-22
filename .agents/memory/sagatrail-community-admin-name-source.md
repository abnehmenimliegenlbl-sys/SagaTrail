---
name: Community administrator name source
description: Which persisted community administrator name should be exposed to the mobile app.
---

The authenticated community-membership response should prefer the active community administrator's `display_name` from the administrator membership record and fall back to the community's stored administrator name. The mobile overview and detail views should both show a localized administrator label.

**Why:** The two records are maintained by different community flows; relying only on the community row can leave the user-facing name stale or empty even when the administrator portal has a current display name.

**How to apply:** When changing community membership responses or admin editing, keep both sources available and preserve the fallback order. Do not add a second client-side data fetch just to resolve the administrator name.