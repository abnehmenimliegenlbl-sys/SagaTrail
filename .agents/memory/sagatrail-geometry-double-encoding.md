---
name: SagaTrail geometry double-encoding
description: enrichOneRoute used JSON.stringify(geometry) when writing to JSONB column, creating doubly-encoded string values that Zod silently stripped
---

## Rule

Never call `JSON.stringify()` when writing to a Drizzle JSONB column. Pass the plain JS array/object directly (cast `as any` if needed for type safety).

**Why:** Drizzle serializes JSONB values itself. Calling `JSON.stringify()` first produces a JSONB value whose type is `'string'` (not `'array'`). The Zod client schema (`zod.array(zod.array(zod.number()))`) silently strips string-type values, so routes render without geometry in the app.

**How to apply:** Any `db.update/insert.set({ geometry: JSON.stringify(...) })` is a bug. Use `geometry: value as any` instead. Also, check `jsonb_typeof(geometry)` in the DB when routes appear without map geometry.

## Recovery SQL (if double-encoding occurs again)

```sql
-- Unwrap string-type JSONB geometry to proper array
UPDATE external_routes
SET geometry = (geometry #>> '{}')::jsonb
WHERE jsonb_typeof(geometry) = 'string';
```

## Files fixed

- `artifacts/api-server/src/lib/routeService.ts` — `enrichOneRoute()`: removed `JSON.stringify`, added `source: "OpenStreetMap · swisstopo"` write-back
- `artifacts/api-server/src/routes/admin.ts` — restitch endpoint: removed `JSON.stringify`
- `artifacts/api-server/src/routes/cantons.ts` — `toRoute()`: added `parseGeometry()` fallback for any remaining string-type rows
