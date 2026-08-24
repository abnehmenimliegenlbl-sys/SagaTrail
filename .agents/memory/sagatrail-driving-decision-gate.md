---
name: Driving decision gate
description: GPS chapter progression must pause while a perception decision is open.
---

Bei schnellen GPS-Sprüngen, etwa während Tests im fahrenden Auto, darf der
Kapitel-Fortschritt eine offene Entscheidungsfrage nicht schließen oder
überspringen.

**Why:** Ein einzelnes GPS-Update kann mehrere Kapitelgrenzen überschreiten.
Wenn dadurch `awaitingDecision` während Antwort und Bestätigungsansage
zurückgesetzt wird, können Sprach- und Prompt-Effekte dieselbe Entscheidung
erneut auslösen.

**How to apply:** Den Distanz-/Kapitel-Effekt bei offenem
`awaitingDecisionRef` pausieren lassen. Nach `chooseOption` oder dem Timeout
wird der Effekt erneut ausgeführt und holt anhand der gespeicherten Distanz
kontrolliert auf.