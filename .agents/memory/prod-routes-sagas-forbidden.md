---
name: Prod-Routen und -Sagen sind verbotene Zone
description: Explizite Nutzeranweisung: external_routes und sagas in Prod dürfen nicht verändert werden.
---

# Prod-Routen und -Sagen: verbotene Zone

## Regel
Die Tabellen `external_routes` und `sagas` in der **Produktionsdatenbank** dürfen vom Agenten **nicht verändert** werden — weder durch direkte SQL-Writes, noch durch Admin-Endpunkte (warm-all, import, bulk-insert, prune, push-scripts etc.).

**Why:** Der Nutzer pflegt Routen- und Sagendaten in Prod manuell (Fotos, Beschreibungen, etc.). Ein versehentlicher Push hat gezeigt dass selbst UPSERT-Operationen Datenverlust riskieren.

**How to apply:**
- Nie `push_routes_to_prod.cjs` oder ähnliche Sync-Scripts ohne explizite schriftliche Freigabe ausführen
- Nie `/admin/routes/import`, `/admin/routes/warm-all`, `/admin/routes/warm-canton`, `/admin/routes/prune`, `/admin/routes/bulk-insert` gegen Prod aufrufen
- Nie direkte SQL-Writes auf Prod-`external_routes` oder Prod-`sagas`
- Lesende Abfragen (GET) sind erlaubt
- Bei Unsicherheit: erst fragen
