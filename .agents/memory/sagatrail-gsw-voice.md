---
name: SagaTrail gsw-Erzählstimme
description: Entscheidung rund um Schweizerdeutsch-Text und ElevenLabs-Stimme für gsw
---

Regel: Für gsw wird der **geschriebene** Erzähltext als echtes Schweizerdeutsch (Mundart) generiert; **gesprochen** wird IMMER Hochdeutsch (DE-Stimme).
**Why:** ElevenLabs kann kein Schweizerdeutsch sprechen. Nutzerentscheid 2026-08-04: geschriebene Texte dürfen Dialekt bleiben, aber alle TTS-Ausgaben auf Hochdeutsch umstellen.
**How to apply:** `voiceCandidatesForLanguage` mappt `gsw → de` (DE-Stimme, kein Heidi). `synthesizeNarration` normalisiert gsw-Text weiterhin (hilft der DE-Stimme bei Mundartformen). `narrationLang` in hike/[id].tsx immer `gsw → "de"` (unabhängig von Provider). feedbackPack für gsw verwendet den DE-Pack + `useOpenAIForFeedback = true`.

Constraint: ElevenLabs-Community-/Bibliotheks-Stimmen brauchen Bezahlplan (402 auf Gratis). DE-Wunschstimme ist erster Kandidat und fällt bei 401/402/403/404 auf Standardstimme zurück.

Push-Nachrichten: geschriebene gsw-Pushs bleiben echte Mundart (pushTranslator schliesst nur "de" aus).

Cache-Invalidierung: `DELETE /api/admin/stories/gsw` (x-admin-token) löscht gecachte gsw-Storys aus der DB.
