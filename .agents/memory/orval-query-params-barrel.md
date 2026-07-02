---
name: Orval query params -> api-zod barrel clash
description: Adding query params to an OpenAPI operation breaks the @workspace/api-zod barrel; how to fix and why.
---

# Adding query params to an endpoint can break the api-zod barrel

When you add query parameters to an operation in `lib/api-spec/openapi.yaml` and run
`pnpm --filter @workspace/api-spec run codegen`, the zod client emits an
`<Operation>Params` **zod value** in `generated/api.ts` AND the TS-types output
emits a same-named `<Operation>Params` **type** in `generated/types/`. The
`lib/api-zod/src/index.ts` barrel re-exports both with `export *`, so `tsc --build`
fails with TS2308 ("already exported a member named 'GetCantonRoutesParams'").

**Fix:** in `lib/api-zod/src/index.ts`, namespace the types re-export:
`export * as types from "./generated/types";` (keep `export * from "./generated/api";`).
`export type *` does NOT fix it — a wildcard type re-export still collides at the
member level with the wildcard value export.

**Why this is safe:** in this repo nothing imports model *types* from
`@workspace/api-zod` — every consumer imports zod schema *values* (e.g.
`GetCantonRoutesResponse`, `CreateStoryBody`). `index.ts` is hand-maintained (not
under `generated/`), so orval's `clean: true` won't overwrite the fix. If you ever
need a model type from api-zod, reach it via `types.*` (or import it from
`@workspace/api-client-react`, which exposes the same types flat via `api.schemas`).

**How to apply:** expect this the first time ANY endpoint gains query params; re-apply
the namespace line if the barrel is ever regenerated/reset.
