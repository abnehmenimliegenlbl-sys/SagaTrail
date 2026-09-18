---
name: Route quality provenance
description: Durable rule for route and POI source evidence and refresh behavior.
---

Route and POI data shown to hikers must expose a check status/date and a source that can be opened independently for the route, geometry, distance, ascent, difficulty, and POI record. A successful external POI response is authoritative for that route and replaces its evidence; a failed response preserves the last verified evidence.

**Why:** A compressed theme flag or a transient Overpass result cannot explain why a route is shown, and deleting evidence during an outage would make temporary network failures look like real-world POI removals.

**How to apply:** Keep route quality separate from official correctness: assess plausibility server-side, label missing sources as partial/unverified, and only remove old route POI evidence inside the successful refresh transaction.