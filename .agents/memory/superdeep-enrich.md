---
name: SuperDeep Route Enrichment
description: fetchRouteSuperDeep function, enrich-super admin endpoint, and lessons about NWN/RWN sub-relation structure in OSM.
---

## fetchRouteSuperDeep

Added to `artifacts/api-server/src/lib/overpass.ts` after `fetchRouteGeometryChunked`.

Expands member relations **2 levels deep**: Super-Relation → Parent-Route-Relations → Etappen → Ways.

Used as the **3rd fallback** in `enrichOneRoute` (routeService.ts), after standard `out geom;` and chunked fallback.

**How to apply:** Required for NWN/RWN routes whose OSM structure is 3 levels deep (a super-relation groups regional route relations, which group Etappen). `fetchRouteGeometryChunked` only goes 1 level and finds no ways in these cases.

**Why:** Standard loader + chunked both returned null/empty for 25 osm-* NWN/RWN super-relations because all their ways are buried 2+ levels deep.

## POST /admin/routes/enrich-super

- **Group A:** Reset osm-* routes with `geometry_version=-1` to 0 → enrich loop picks them up with SuperDeep fallback.
- **Group B:** Tries to cut placeholder-nwn/rwn-*-etappe-N from parent geometry, first via Wikipedia then via OSM sub-relations.
- **Status:** GET /admin/routes/enrich-super-status

**Results from first real run:**
- Group A: 25 super-relations reset → enrich loop enriched 17/25 on first pass (pending reduced to 8).
- Group B: 0/9 enriched — see below.

## Why 9 Placeholder Etappen remain unenrichable

These placeholder routes have stage numbers beyond what exists in OSM or German Wikipedia:

| ID | Network | Ref | Stage | Problem |
|----|---------|-----|-------|---------|
| placeholder-nwn-5-etappe-12 | NWN | 5 | 12 | Jura-Höhenweg Wikipedia has "Etappen und Sehenswürdigkeiten" section (regex fixed) but stage 12 is not listed |
| placeholder-nwn-5-etappe-13 | NWN | 5 | 13 | Same |
| placeholder-nwn-6-etappe-15 | NWN | 6 | 15 | Voie des Alpes — no German WP, 45 OSM parents with ref=6 but none have Etappe 15 as sub-relation |
| placeholder-rwn-62-etappe-2/3/4 | RWN | 62 | 2,3,4 | Walserweg Gottardo — no German WP, OSM candidates have no nwn/rwn network tag (0 parent candidates) |
| placeholder-nwn-2-etappe-9 | NWN | 2 | 9 | Trans Swiss Trail — WP has Etappen section but stage 9 not listed |
| placeholder-nwn-4-etappe-24/31 | NWN | 4 | 24,31 | Via Jacobi — WP not found under this title, OSM has ref=4 but Etappe 24/31 not in sub-relations of top 4 candidates |

**Root cause:** `fetchSubRelations` queries `rel(r)[route~"^(hiking|foot)$"]` — but the actual Etappen may not have `route=hiking` tag, or the parent OSM relation found by `fetchOsmRelationsByRef(ref)` is not the correct super-relation for these high-numbered stages.

**Recommendation:** Add these 9 to `docs/unenrichable-routes.md` (permanent -1). A manual fix would require knowing the exact OSM relation IDs for each Etappe.

## fetchWikiEtappen regex (fixed)

Changed from `==\s*Etappen\s*==` to `==\s*Etappen[^=\n]*==` to also match headers like "Etappen und Sehenswürdigkeiten". Affects Jura-Höhenweg but stage count is still limited by what WP lists.
