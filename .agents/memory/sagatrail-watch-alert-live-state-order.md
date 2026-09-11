---
name: Watch alert/live-state ordering
description: WatchConnectivity can deliver an action alert before the live state containing its destination content.
---

The Watch UI must not discard a confirmed navigation action just because the corresponding live-state payload has not arrived yet. Store the requested destination locally and complete navigation when the live state publishes the required page data.

**Why:** Alert messages and live-state snapshots use separate WatchConnectivity deliveries and can arrive in either order. Partner POI confirmation exposed this race: the alert was acknowledged while `poiStory` was still absent, so the page-opening condition was skipped.

**How to apply:** For any Watch alert that opens content from `LiveState`, handle both cases explicitly: open immediately when the data is present, or keep a pending destination and consume it when the data appears. Treat POI navigation as content, not a blocking alert: a generic narration status must not cover an active POI story while its card is being shown.