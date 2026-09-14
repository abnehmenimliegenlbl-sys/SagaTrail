---
name: Localized saga titles
description: Why SagaTrail keeps a local complete title map for the mobile resolver.
---

SagaTrail stores the complete localized title map in the mobile bundle and lets the central title resolver prefer it over catalog summaries. This is the reliable OTA path when the catalog summaries contain narrative text but no structured title fields.

**Why:** The catalog had all translated summaries but zero translated title fields. Deriving titles from the first sentence produced long narrative fragments, while waiting for a native build would delay a content-only fix.

**How to apply:** Keep the map complete for every curated saga and every supported language (`gsw`, `fr`, `it`, `en`, `zh`, `es`, `pt`, `ru`). Validate IDs and non-empty titles before shipping. Do not route `gsw` to `de` in the title resolver; Swiss German has its own title entries even though narration/TTS may still use German.