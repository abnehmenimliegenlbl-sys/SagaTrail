---
name: Theme evidence independence
description: Why themed route results must not depend on the general route quality timestamp.
---

Server-side `themeKeys` are usable theme evidence even when the broader route-quality check has not yet populated `qualityCheckedAt`. Theme browsing must filter by the requested theme evidence, not by the unrelated quality-check timestamp.

**Why:** Existing route rows can have valid, previously generated theme evidence while all general quality timestamps are still unset. Combining both conditions makes every theme world appear empty.

**How to apply:** Keep theme evidence and general route quality as separate provenance fields. Use quality status/date for quality messaging and quality-specific filters, but do not require them for a theme result that already has a matching `themeKeys` entry.