---
name: SagaTrail gsw-Erzählstimme
description: Entscheidung und Plan-Limitierung rund um die Schweizerdeutsch-Stimme (ElevenLabs)
---

Regel: Für gsw bleibt der Erzähltext HOCHDEUTSCH; die "Schweizer Färbung" kommt allein über die Stimmwahl.
**Why:** Der Nutzer hat eine Hörprobe mit echtem Dialekttext explizit abgelehnt (2026-07-08) und wünscht Hochdeutsch mit Schweizer Akzent.
**How to apply:** Nie wieder Dialekttext an die TTS senden; Stimmen-Kandidat für gsw ist eine Schweizer-Akzent-Stimme, Text bleibt de.

Constraint: Der ElevenLabs-GRATIS-Plan blockiert Community-/Bibliotheks-Stimmen per API (402 payment_required, "Free users cannot use library voices"). Nur Premade-Stimmen funktionieren; keine davon hat Schweizer Akzent. Der API-Key hat zudem nur TTS-Berechtigung (kein voices_read/user_read).
**How to apply:** Die gsw-Wunschstimme (Schweizer Akzent, Community) ist als erster Kandidat verdrahtet und fällt bei 401/402/403/404 automatisch auf die Standardstimme zurück — nach einem Plan-Upgrade greift sie ohne Codeänderung. Der GCS-Audio-Cache ist stimmen-bewusst (Standardstimme = Legacy-Hash, andere Stimmen hängen die Voice-ID an), damit ein Upgrade sofort frisches Akzent-Audio liefert statt alter Dateien.
