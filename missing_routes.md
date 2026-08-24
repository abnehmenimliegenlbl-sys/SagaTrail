# Fehlende offizielle SchweizMobil-Routen

Diese 32 verbleibenden Routennummern sind offizielle SchweizMobil-Routen. Für sie gibt
es im aktuellen Entwicklungsbestand noch keine passende National-,
Regional- oder Lokalroute (`nwr`, `rwr` oder `lwr`) mit dieser Nummer.
Zu allen Nummern ist ein offizielles JPG-Logo vorhanden.

Die Liste ist nach eindeutigen Routennummern dedupliziert. Mehrere
kantonale Logo-Dateien mit derselben Nummer zählen nur einmal.

## Fehlende Routennummern

```text
28, 121, 486, 566, 678, 699, 757, 783, 792,
804, 806, 811, 816, 817, 821, 823, 827, 828,
889, 902, 960, 974, 975, 990
```

**Anzahl:** 32

## Entfernte lokale Wanderland-Routen ohne Geometrie

Diese 38 offiziellen lokalen Wanderland-Routen (`lwr`) hatten in
Production `geometry_version = -1` und eine leere Geometrie (`0`
Streckenpunkte). Sie wurden aus Production entfernt und bleiben hier als
fehlende Routen zur späteren Nachbearbeitung dokumentiert.

```text
447, 458, 459, 463, 464, 472, 483, 583, 584, 701, 738, 748, 754,
759, 763, 769, 787, 826, 848, 857, 858, 864, 866, 899, 932, 933,
966, 967, 968, 973, 976, 979, 981, 994, 995, 996, 998, 999
```

**Anzahl:** 38

## Bereits besonders bestätigte Routen

### Route 28 – Freiburger Saane-Weg

Die offizielle SchweizMobil-Seite führt Route 28 als **Freiburger
Saane-Weg** mit der Strecke:

```text
Rossens – Fribourg – Düdingen, Staumauer/Camping
```

Die Route besteht aus zwei Etappen:

```text
Etappe 1: Rossens – Fribourg
Etappe 2: Fribourg – Düdingen, Staumauer/Camping
```

Die offizielle Gesamtangabe beträgt 39 km. Das lokale Logo ist
`WL_028.jpg`. In `external_routes` gibt es aktuell weder die
Gesamtroute noch passende Etappen mit Referenz 28.

### Route 66 – übersprungen

Route 66 ist der **Liechtensteiner Panoramaweg** und verläuft
vollständig in Liechtenstein. Sie wird deshalb nicht als fehlende
Schweizer Route weiterverfolgt.

## Abgrenzung

Die Prüfung bezieht sich auf den Entwicklungsbestand. Die früheren
Nummern `164, 167, 168, 670, 671, 697, 718, 108 und 207` sind nicht in
dieser Liste enthalten, weil die betreffenden Routen inzwischen als
kantonale Routen mit `K`-Nummern geführt werden.