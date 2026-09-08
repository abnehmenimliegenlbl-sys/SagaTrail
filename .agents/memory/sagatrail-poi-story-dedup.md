---
name: SagaTrail POI story deduplication
description: A POI's full story may only be narrated once per hike across general and approach-trigger flows.
---

# Full POI story deduplication

The general nearby-POI flow and the progressive 200 m/50 m approach flow share one story claim. A claim is keyed by POI ID and by physical proximity, so the same place represented by different OSM objects cannot be narrated twice. Closing and reopening the automatic POI tile must not release that claim.

**Why:** leaving the POI boundary can clear `nearbyPoi`; without a shared claim, the same location may be selected again or reached through the other narration path and its complete story is heard twice.

**How to apply:** keep the claim for the entire hike, use it before starting async cache/API loading, and preserve it when the proximity tile closes. Do not rely on a single flow-specific ID ref.