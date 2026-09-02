---
name: SwissTopo profile request size
description: Request-size constraint and geometry-preserving profile handling
---

The SwissTopo profile endpoint receives GeoJSON through a GET query parameter, so the HTTP request line becomes too large at roughly 126 LV95 coordinate pairs. A route with more points must be queried in overlapping chunks and the returned distances rebased to the original route distance.

**Why:** Raising the point cap alone turns normal 500-point routes into HTTP 400/414 failures and leaves the app without a profile.

**How to apply:** Keep each request below the measured safe size, overlap adjacent chunks by one route point, omit duplicate or slightly backward profile samples at joins, and use original cumulative route distance for map alignment.

SwissTopo-Ausfälle werden pro Chunk mit wenigen Backoff-Versuchen abgefangen; erst erfolgreiche, vollständige Chunks dürfen zusammengeführt werden.

**Why:** Ein Retry auf dem bereits teilweise zusammengeführten Profil könnte bei einem späteren Chunk weiterhin unvollständige oder falsch ausgerichtete Daten ausliefern.

**How to apply:** Temporäre HTTP-/Netzwerkfehler begrenzt wiederholen, dauerhafte Fehler direkt abbrechen und bei jedem fehlenden Chunk das gesamte Profil als `null` behandeln.

SwissTopo resampelt jede Anfrage auf eine eigene Profilpunktzahl (oft ungefähr 200 Punkte), die nicht der Anzahl der Eingangspunkte entspricht.

**Why:** Eine Prüfung auf `response.length === requestPointCount` verwirft auch gültige Höhenprofile und lässt die Kartenfarbgebung lautlos auf Grün zurückfallen.

**How to apply:** Mindestens zwei gültige, monotone Profilpunkte verlangen; die Antwortlänge nicht an die Eingangspunktzahl koppeln.