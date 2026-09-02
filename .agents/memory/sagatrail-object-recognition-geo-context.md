---
name: Object recognition geo context
description: Geografische Kontextregeln für die kamerabasierte Objekterkennung
---

Die Fotoanalyse darf Ortsnamen und OSM-Kontext nur aus benannten Objekten innerhalb von 500 m um die aktuelle Telefonposition beziehen. Routen-POIs sind dafür ungeeignet, weil sie bei einem Start abseits der Route entfernte Orte aus einem anderen Gebiet enthalten können.

**Why:** Ein Foto am Tüllinger wurde durch Wartenberg/Uf Berg aus dem Raum Basel/Liestal fehlgeleitet; die normale POI-Liste folgte dem Routen-Korridor und nicht dem tatsächlichen GPS-Standort.

**How to apply:** Live-POIs separat um die GPS-Position laden, vor dem Analyse-Request auf 0,5 km filtern und Distanz sowie Peilung mitsenden. Ohne passenden lokalen Namen allgemein beschreiben statt einen entfernten Wikipedia- oder Ortsnamen zu raten.