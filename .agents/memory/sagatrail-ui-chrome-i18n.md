---
name: SagaTrail UI-chrome i18n
description: How app-chrome localization (as opposed to saga narration) is structured across all mobile screens.
---

UI chrome (buttons, headers, labels, alerts, empty states) is localized into all 8 supported languages (de, gsw, fr, it, en, zh, es, pt), separately from saga narration text.

- Single source of truth: `AppContext.language` = `profile.language ?? pendingLanguage`. `pendingLanguage` is detected once from the system locale (falls back to English if unsupported) and persisted to AsyncStorage; it is used before onboarding completes. Once the user explicitly picks a language (onboarding step 4, or Einstellungen), that choice has permanent priority.
- Per-screen pattern: `lib/i18n/screens/<screen>.ts` exports a `<Screen>Strings` interface + a `StringsDict` (all 8 languages, TypeScript enforces completeness — no `Partial`/`as any`) + a `use<Screen>Strings()` hook built via `createUseStrings`.

**Why:** keeps translation additions compile-time-checked (missing a language is a type error) and keeps chrome strings decoupled from narration content, which has its own separate multilingual system in `storyContent.ts`.

**How to apply:** when adding a new screen or UI string, add it to the screen's strings dict (all 8 languages) rather than hardcoding text; never leave narration/story content, canton names, saga titles, or user-entered data in this system — those are out of scope and handled elsewhere.
