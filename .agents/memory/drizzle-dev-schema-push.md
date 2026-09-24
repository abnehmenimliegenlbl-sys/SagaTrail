---
name: Drizzle development schema push
description: Non-interactive Drizzle pushes may stop on table identity and data-preservation prompts.
---

Drizzle's development `push` can still require interactive choices even with `--force`: new tables may be presented as create-versus-rename conflicts, and existing constraints may ask whether to truncate data.

Every persistent table and index that must survive Replit Publish needs to be represented in the Drizzle schema. Runtime DDL can create an object in production without adding it to development's schema, making Publish treat it as production-only and propose dropping it.

**Why:** The development database schema is the baseline for the production diff; app-side `CREATE TABLE` or `CREATE INDEX` statements do not register those objects with Drizzle.

**How to apply:** Keep persistent schema objects in Drizzle, inspect `explainSchemaDiff` before publishing, and if it proposes dropping an object still used by the app, add the exact definition to the schema source, push only to development, and recheck. Run the normal Drizzle development push through a pseudo-TTY when needed; choose create for new tables and no-truncate for existing data. Never manually alter production.