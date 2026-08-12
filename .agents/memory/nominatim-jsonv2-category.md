---
name: Nominatim jsonv2 field name
description: Nominatim format=jsonv2 returns "category", not "class" — filtering on r.class silently rejects every hit.
---

Nominatim `format=jsonv2` renames the `class` field to `category`. Code filtering results by `r.class` gets `undefined` for every hit and silently rejects all results (looks like "no matches" even for Schloss/Ruine queries that clearly exist).

**Why:** Cost a full 59-saga verification run that found 0 hits despite valid castle/ruins results.

**How to apply:** When consuming Nominatim search results, always read `r.category ?? r.class` (or use `format=json` which keeps `class`).
