---
name: Env vars land im Klartext in .replit
description: Warum Tokens/Keys nie als Env-Variable (shared/dev/prod) gesetzt werden duerfen
---

Regel: Sensible Werte (Admin-Tokens, API-Keys) duerfen nur als Secret existieren, nie ueber `setEnvVars` — egal ob shared, development oder production.

**Why:** Alle drei Env-Scopes werden im Klartext in die versionierte `.replit` geschrieben (`[env]`, `[env.development]`, `[env.production]`) und landen damit im Git-Verlauf. Genau so ist ein Admin-Token geleakt und musste rotiert werden. Der Secret-Speicher ist der einzige nicht versionierte Ort; Secrets kann der Agent nicht selbst setzen — `requestEnvVar` nutzen und den Nutzer den Wert eintragen lassen.

**How to apply:** Vor jedem `setEnvVars` fragen: Waere dieser Wert in einem oeffentlichen Repo ein Problem? Wenn ja → Secret via `requestEnvVar`. Bei einem bereits geleakten Wert: rotieren, aus `.replit` loeschen, in Prod erst nach Republish wirksam.
