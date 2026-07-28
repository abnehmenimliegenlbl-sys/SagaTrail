---
name: Routenfoto Geo-Filter + Dedupe
description: Warum Commons-Textsuche für Routen einen CH/FL-Geo-Filter und ein Dedupe-Register braucht
---

**Regel:** Commons-Textsuche-Treffer für Routenfotos müssen (a) Koordinaten innerhalb der Schweiz/Liechtenstein-Bbox haben ODER Routennamen-Wörter im Dateititel, und (b) eine bereits an eine andere Route vergebene URL wird nicht wiederverwendet (in-memory `vergebeneUrls`-Map in commonsPhoto.ts + NOT-EXISTS-Guard beim DB-Writeback).

**Why:** Der Textsuche-Fallback `"<Routenname> Wanderweg"` lieferte für Code-Namen (K11…) generische Streutreffer — ein US-Feuerwachturm ("Walde Lookout") landete auf 725 Routen. Commons-Relevanzsortierung allein reicht nicht.

**How to apply:** Bei Änderungen an der Fotoauswahl beide Schutzmechanismen erhalten; nach Logik-Upgrades `POST /admin/photos/reset` (ADMIN_TOKEN) nutzen, um alte Fehltreffer zu leeren (Client holt lazy neu). "fixme"-Platzhalter in OSM-Namen werden in `formatNumberedRouteName` gestrippt.
