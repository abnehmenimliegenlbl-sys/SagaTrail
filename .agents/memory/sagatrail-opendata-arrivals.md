---
name: opendata.ch arrivals at small stops
description: Why "SBB live am Start" was empty and the fallback rule
---
Rule: transport.opendata.ch stationboard with `type=arrival` returns `stop.arrival = null` at many small bus/tram stops (only `departure*` is set). Any arrivals mapping must fall back to departure time/`to` field or the board renders empty.

**Why:** "SBB live am Start" was permanently blank for routes whose nearest station is a small stop; the server filtered on `arrivalTimestamp != null` and dropped everything. The user's own GPS position is irrelevant — transport lookups use ROUTE start/end coordinates, not user location.

**How to apply:** when consuming opendata.ch stationboards, filter on arrival OR departure timestamp, prefer arrival when present.
