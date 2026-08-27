---
name: SagaTrail gsw-Erzählstimme
description: Entscheidung rund um Schweizerdeutsch-Text und ElevenLabs-Stimme für gsw
---

Regel: gsw = **Heidi-Stimme** (Schweizer Akzent, GSW_NARRATOR_VOICE_ID) + **Text in Hochdeutsch**.
**Why:** ElevenLabs kann kein Schweizerdeutsch sprechen. Nutzerentscheid 2026-08-04: Heidi bleibt die Stimme für gsw, aber der generierte Text ist Hochdeutsch (nicht Dialekt). Geschriebene Texte (Push, UI) dürfen weiterhin Dialekt sein.
**How to apply:**
- `voiceCandidatesForLanguage("gsw")` → [GSW_NARRATOR_VOICE_ID, DEFAULT] (Heidi bleibt)
- `LANGUAGE_LABEL.gsw = "Hochdeutsch"` in storyGenerator.ts → Anthropic generiert Hochdeutsch
- GSW_SYSTEM Dialekt-Prompt ist ENTFERNT — nie wieder einbauen
- `narrationLang` in hike/[id].tsx übergibt `profile?.language` unverändert (gsw) → Heidi wird gewählt
- `normalisiereGswText` ist ENTFERNT (war überflüssig, Text ist Hochdeutsch)

Cache-Invalidierung nach dieser Änderung nötig: `DELETE /admin/stories/gsw` (x-admin-token) löscht gecachte Dialekt-Storys, damit neue Hochdeutsch-Versionen generiert werden. Wurde 2026-08-05 ausgeführt (9 Stories gelöscht).

Constraint: ElevenLabs-Community-Stimmen brauchen Bezahlplan (402 auf Gratis). Heidi ist erster Kandidat, fällt bei 401/402/403/404 auf Standardstimme zurück.

Entscheidung: Das Persönlichkeits-Feedback nach einer Wahrnehmungsentscheidung läuft immer über OpenAI, auch bei `gsw`.
**Why:** Der Feedbacktext ist Hochdeutsch und OpenAI war im betroffenen Ablauf ausreichend laut; ein Wechsel auf ElevenLabs würde die Lautstärkepräferenz des Nutzers verletzen.
**How to apply:** Entscheidungsbestätigung und anschließender Feedback-Text erhalten `provider: "openai"`; die gsw-Sagenerzählung selbst darf weiterhin die Heidi-/ElevenLabs-Stimme verwenden.
