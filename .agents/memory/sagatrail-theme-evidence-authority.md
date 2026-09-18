---
name: Theme evidence authority
description: Server and mobile fallback responsibilities for route themes whose criteria depend on route or feature geometry
---

Geometry-dependent theme rules are authoritative on the server. A mobile POI fallback must not infer a broader match from point proximity when it cannot reproduce the required route or feature geometry.

**Why:** A single nearby POI cannot prove conditions such as a minimum distance traveled alongside one water feature or a transport point being at a route endpoint. Broad fallback matches create stale or false theme assignments.

**How to apply:** Add new geometry-sensitive evidence to the server refresh and persist it with the route quality check. In mobile fallback code, omit the theme rather than guessing when the required geometry is unavailable.