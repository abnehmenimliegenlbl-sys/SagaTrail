---
name: Production theme refresh
description: A successful theme endpoint can still return [] when production external_routes.theme_keys has not been populated.
---

The theme API returns HTTP 200 with an empty list when production theme evidence is missing; this is a data-refresh state, not necessarily a mobile OTA or cache failure. The protected refresh endpoint is mounted below `/api`, processes existing routes in the background, and can take a long time because it queries POI evidence per route.

**Why:** Direct production checks showed every tested theme empty until the refresh began; shortly after the refresh started, `wasserwege` already contained routes.

**How to apply:** Check the production response body and refresh status before changing mobile caching or shipping another OTA. Do not start a native build for this data-only repair.