---
name: SagaTrail meetup message history
description: Persistent public-meetup messages and notification fan-out
---

Nachrichten für öffentliche Treffpunkte werden einmal in der Nachrichtenhistorie gespeichert und separat pro Empfänger in die Push-Outbox verteilt; Rate-Limits und das Treffpunktlimit zählen nur die Historieneinträge.

**Why:** Ein Outbox-Eintrag pro Empfänger würde bei mehreren Teilnehmenden dieselbe Nachricht mehrfach zählen und das Limit zu früh auslösen; ohne Empfänger gäbe es zudem keinen Verlaufseintrag.

**How to apply:** Bei Änderungen an Treffpunktnachrichten immer Historie, Berechtigungen, Limitierung und Push-Fan-out als getrennte Verantwortlichkeiten behandeln.