---
name: API server bundle data files
description: How large TypeScript data files are kept out of the esbuild bundle using createRequire + JSON at runtime
---

# API server bundle — runtime data file pattern

## The rule
Large TypeScript data files (catalog data, HTML templates) must NOT be bundled by esbuild. Use the createRequire + JSON pattern instead.

**Why:** curatedSagasPakete.ts was 1.8 MB bundled, halving the bundle to 3.9 MB once extracted.

## How to apply
For any `src/lib/*.ts` that only exports static data:

1. Write the data as `src/lib/<name>.json` (one-time extraction via `vm.runInNewContext` to handle multi-line strings)
2. Replace the `.ts` file with a thin wrapper:
   ```typescript
   import { createRequire } from "node:module";
   import type { MyType } from "@workspace/db";
   const _r = createRequire(import.meta.url);
   export const MY_DATA: MyType[] = _r("./<name>.json");
   ```
3. Add a `copyFile` call in `build.mjs` to copy the JSON to `dist/`.

For HTML templates (`adminDashboardHtml.ts`):
```typescript
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const MY_HTML: string = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "my-file.html"), "utf8"
);
```

## Files currently using this pattern
- `src/lib/curatedSagasPakete.ts` → `curatedSagasPakete.json` (210 entries)
- `src/lib/curatedSagas.ts` → `curatedSagas.json` (26 entries)
- `src/lib/adminDashboardHtml.ts` → `admin-dashboard.html`

## Other build settings
- `stripe` and `stripe-replit-sync` are externalized (in node_modules at runtime)
- Source maps: `isDev ? "linked" : false` — never in production builds
- `.easignore` at workspace root excludes `artifacts/api-server/`, `artifacts/mockup-sandbox/`, `scripts/`, `.agents/`

## Extraction recipe (when adding new data files)
```javascript
// In a one-off Node.js script:
const vm = require('vm');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/^import.*$/gm, '').replace(/: MyType\[\]/g, '');
content = content.replace(/export const (\w+)\s*=/, 'exports.$1 =');
const sandbox = { exports: {} };
vm.runInNewContext(content, sandbox);
fs.writeFileSync(outFile, JSON.stringify(Object.values(sandbox.exports)[0]));
```
