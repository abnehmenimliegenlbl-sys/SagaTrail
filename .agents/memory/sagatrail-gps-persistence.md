---
name: Persistente GPS-Prüfung
description: Dauerhafte Speicherung und Auslieferung der redaktionellen Koordinaten-Sicherheitsstufe für Sagen.
---

Die Datenbank `catalog_sagas` ist die dauerhafte Quelle für manuell verifizierte Saga-Koordinaten und `koordinatenSicherheit`. Das Startup-Seeding darf diese beiden Felder bei bestehenden Datensätzen nicht aus dem gebündelten JSON überschreiben; das JSON ist nur der Ausgangswert für neue Sagen. Die ausdrücklich markierten redaktionellen Saga-Ersatzdatensätze sind die Ausnahme und dürfen ihre neuen Ortsdaten, Sicherheitsstufe und Fotos beim Seeding übernehmen.

**Why:** Das Produktions-Dateisystem ist bei Neustarts und Deployments nicht persistent. Wenn ein Admin-Update zusätzlich oder ausschließlich in eine JSON-Datei geschrieben wird und das Seeding die DB-Felder bei jedem Start ersetzt, erscheinen bereits verifizierte Sagen wieder als „Muss GPS Verifiziert werden“.

**How to apply:** GPS-Admin-Lesen und -Schreiben immer gegen `catalog_sagas` ausführen. Koordinatenänderungen nach einem Server-Neustart prüfen; die persistierten DB-Werte müssen gegenüber den Bundle-Werten Vorrang haben, außer bei einem bewusst gepflegten Saga-Ersatz.