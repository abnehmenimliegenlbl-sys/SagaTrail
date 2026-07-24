---
name: SagaTrail gsw-Erzählstimme
description: Entscheidung rund um Schweizerdeutsch-Text und ElevenLabs-Stimme für gsw
---

Regel: Für gsw wird der Erzähltext als echtes **Schweizerdeutsch (Mundart)** generiert; die Schweizer ElevenLabs-Stimme (Heidi factual, kMdYHZK2wkocJnpZxE08) wird bevorzugt.
**Why:** Nutzerentscheid 2026-07-24 — Dialekttext erwünscht, überschreibt Entscheid 2026-07-08 (damals Hochdeutsch).
**How to apply:** `LANGUAGE_LABEL.gsw = "Schweizerdeutsch (Mundart)"` in storyGenerator.ts; Prompt enthält Dialekt-Schreibhinweise (isch/hät/nöd/…). Fallback-Kette bleibt: Schweizer-Stimme → Standardstimme → OpenAI (liest Mundarttext dann neutraler, aber verständlich).

Constraint: ElevenLabs-Community-/Bibliotheks-Stimmen brauchen Bezahlplan (402 auf Gratis). Die gsw-Wunschstimme ist erster Kandidat und fällt bei 401/402/403/404 automatisch zurück — greift nach Plan-Upgrade ohne Codeänderung.

Cache-Invalidierung: `DELETE /api/admin/stories/gsw` (x-admin-token) löscht gecachte Hochdeutsch-gsw-Storys aus der DB, sodass neue als Mundart regeneriert werden.
