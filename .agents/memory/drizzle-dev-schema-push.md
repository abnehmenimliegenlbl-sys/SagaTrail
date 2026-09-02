---
name: Drizzle development schema push
description: Non-interactive Drizzle pushes may stop on table identity and data-preservation prompts.
---

Drizzle's development `push` can still require interactive choices even with `--force`: new tables may be presented as create-versus-rename conflicts, and existing constraints may ask whether to truncate data.

**Why:** The API cannot use a newly declared table until the development database has it, while blindly accepting the destructive option could remove existing user data.

**How to apply:** Run the normal Drizzle development push through a pseudo-TTY when the runner has no TTY. Select create for genuinely new tables and the no-truncate option for existing tables; never use this as a reason to add startup DDL or manually alter production.