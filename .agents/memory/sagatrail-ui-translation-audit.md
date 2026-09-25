---
name: UI translation audit
description: How to audit SagaTrail mobile translations beyond compile-time dictionary checks.
---

SagaTrail's `StringsDict` catches missing required dictionary keys, but it does not catch optional dictionary fields or visible text literals embedded directly in screens and components.

**Why:** The group location labels, safety check-in states, sharing actions, and live pulse states had valid TypeScript but still fell back to German or English because their fields were optional or bypassed the language dictionaries.

**How to apply:** Audit dictionary key parity across all nine supported languages, then separately search visible JSX text, accessibility labels, placeholders, `?? "..."` fallbacks, and raw backend enum values. Translate enums at the presentation boundary rather than displaying their wire values. Make user-facing fields required when every language must provide them; exclude route/POI names, units, technical identifiers, logs, and narrative content that is intentionally sourced elsewhere.