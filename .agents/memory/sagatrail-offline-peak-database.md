---
name: Offline peak database
description: Versionierter Offline-Bestand für reale OSM-Gipfel und höhenbewusste Panorama-Projektion.
---

Das Gipfelpanorama verwendet einen eigenen, versionierten Offline-Datensatz aus benannten `natural=peak`-POIs. Die Koordinaten stammen aus OpenStreetMap/Overpass; eine Gipfelhöhe wird nur übernommen, wenn OSM `ele` tatsächlich liefert. Fehlt die Beobachter- oder Gipfelhöhe, bleibt der Höhenwinkel unbekannt und wird nicht simuliert.

**Why:** Ein allgemeiner POI-Cache ist für die Panorama-Funktion zu klein und kann alte oder unvollständige Daten nicht erkennbar von einer aktuellen Gipfeldatenbank unterscheiden.

**How to apply:** Bei Änderungen am Gipfelschema oder am Offline-Terrainprofil die Panorama-Datenbankversion erhöhen. Offline- und Online-POIs vor der Projektion nach ID deduplizieren; für den Höhenwinkel immer einen frischen GPS-Fix und den zugehörigen aktuellen Höhenwert verlangen. Das gespeicherte SwissTopo-Profil ist eine autoritative Routenfläche, aber noch kein observer-zentriertes DEM und darf nicht als solches ausgegeben werden.