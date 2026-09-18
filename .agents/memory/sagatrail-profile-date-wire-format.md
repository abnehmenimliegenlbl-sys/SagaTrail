---
name: Profile date wire format
description: Keeps community profile birthdays stable across generated Zod schemas and mobile editing.
---

The profile API stores birthdays as date-only values and must return them as `YYYY-MM-DD`, not a serialized JavaScript `Date` timestamp. The generated server schema currently coerces OpenAPI `format: date` fields to `Date`, so route response mapping needs to restore the date-only wire value after validation.

**Why:** Mobile profile editing validates and saves the user-facing date-only format. A timezone-bearing ISO timestamp makes an otherwise valid birthday fail validation and appear unsaved.

**How to apply:** When changing profile response mapping or regenerating API schemas, verify that GET and PUT `/api/me` and the avatar response all return `dateOfBirth` as `YYYY-MM-DD` or `null`.