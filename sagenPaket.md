# Format für Sagen-Pakete (SagaTrail)

Dieses Dokument beschreibt das Format, in dem neue Schweizer Sagen geliefert werden müssen, damit sie direkt in SagaTrail übernommen werden können. Eine Lieferung ("Sagen-Paket") ist eine JSON-Datei mit einem Array von Sagen-Objekten nach dem unten stehenden Schema.

## Grundprinzipien

- **Nur gemeinfreie, historisch belegte Sagen.** Keine frei erfundenen oder KI-generierten Legenden. Jede Sage muss auf eine echte, prüfbare Quelle zurückgehen (z. B. eine historische Sagensammlung aus dem 19./frühen 20. Jahrhundert, die gemeinfrei ist).
- **Eine Datei = eine Liste von Sagen-Objekten** (JSON-Array), siehe Beispiel unten.
- **Alle Felder auf Deutsch verfassen**, ausser den Übersetzungen unter `summaries` (siehe dort). Der Rest der App übersetzt/verarbeitet die Sagen serverseitig weiter.

## Schema pro Sage

```jsonc
{
  // Eindeutige, sprechende ID in Kleinbuchstaben, nur a-z/0-9/Bindestrich.
  // Beispiel: "teufelsbrucke", "wilhelm-tell-apfelschuss"
  "id": "string (eindeutig im gesamten Paket)",

  // Anzeigename der Sage.
  "title": "string",

  // Offizieller Name des Schweizer Kantons, in dem die Sage spielt.
  // Muss exakt einem der 26 Kantone entsprechen (deutsche Schreibweise):
  // Aargau, Appenzell Ausserrhoden, Appenzell Innerrhoden, Basel-Landschaft,
  // Basel-Stadt, Bern, Freiburg, Genf, Glarus, Graubünden, Jura, Luzern,
  // Neuenburg, Nidwalden, Obwalden, Schaffhausen, Schwyz, Solothurn,
  // St. Gallen, Tessin, Thurgau, Uri, Waadt, Wallis, Zug, Zürich
  "canton": "string",

  // Zentrales Motiv der Sage in wenigen Worten.
  // Beispiel: "Pakt mit dem Teufel", "Freiheit und Auflehnung"
  "coreMotif": "string",

  // Atmosphärischer Grundton, der die Erzählweise prägt.
  // Beispiel: "Düster und stürmisch", "Ehrfürchtig, wundersam"
  "mood": "string",

  // Konkreter Bildsuchbegriff für Wikimedia Commons, um ein passendes Titelfoto
  // zu finden. NICHT das abstrakte Motiv/Thema (coreMotif), sondern ein
  // greifbares, fotografierbares Objekt/Ort (z. B. "Teufelsbrücke Schöllenen",
  // "Braunbär", "Wilhelm Tell Denkmal"). Auf Deutsch, kurz und präzise.
  "bildmotiv": "string",

  // Deutsche Kurzfassung der Sage (Fliesstext, 3-6 Sätze).
  // Dient als Anzeige-Standard und Fallback für alle Sprachen.
  "summary": "string",

  // Pro Zielsprache eine eigenständig verfasste Zusammenfassung (nicht nur
  // eine wörtliche Übersetzung des deutschen Texts, sondern natürlich
  // formuliert). Der Schlüssel "de" MUSS enthalten sein und inhaltlich
  // identisch mit "summary" sein.
  //
  // Erforderliche Sprachschlüssel: de, en, fr, it, es, pt, zh
  // Optional (falls verfügbar): gsw (Schweizerdeutsch)
  //
  // "reviewEmpfohlen": true setzen, wenn der Text automatisiert erzeugt
  // wurde bzw. noch von einem Menschen gegengelesen werden sollte;
  // false, wenn der Text bereits qualitätsgeprüft ist.
  "summaries": {
    "de": { "text": "string", "reviewEmpfohlen": false },
    "en": { "text": "string", "reviewEmpfohlen": true },
    "fr": { "text": "string", "reviewEmpfohlen": true },
    "it": { "text": "string", "reviewEmpfohlen": true },
    "es": { "text": "string", "reviewEmpfohlen": true },
    "pt": { "text": "string", "reviewEmpfohlen": true },
    "zh": { "text": "string", "reviewEmpfohlen": true },
    "gsw": { "text": "string", "reviewEmpfohlen": true }
  },

  // Optional: kurze Regieanweisung, welche Stellen für ein jüngeres
  // Publikum abgemildert werden sollten (z. B. Gewalt- oder Todesdrohungen).
  // Kein separater Kindertext, nur ein Hinweis in einem Satz.
  "altersstufenHinweis": "string (optional)",

  // Strukturierte, nachvollziehbare Quellenangabe. Muss auf ein
  // konkretes, gemeinfreies Werk verweisen (Autor, Titel, Jahr, Fundstelle).
  "quelle": {
    "autor": "string",
    "werk": "string",
    "jahr": "string (z. B. \"1862\" oder \"um 1470\")",
    "fundstelleUrl": "string (URL zur Quelle, z. B. digitalisierte Sammlung oder Wikipedia-Artikel zum Werk)"
  },

  // Menschlich lesbare Kurzform der Quelle, abgeleitet aus "quelle".
  // Format: "<Autor>: <Werk> (<Jahr>)"
  "source": "string",

  // Reale Koordinaten des Sagen-Schauplatzes, falls die Quelle die Sage
  // einem konkreten, auffindbaren Ort zuordnet. Weglassen, wenn der Ort
  // nicht lokalisierbar ist (dann muss koordinatenSicherheit
  // "nicht_lokalisierbar" sein).
  "coordinates": { "lat": 46.6529, "lng": 8.5837 },

  // Wie sicher die Ortsangabe ist:
  // "exakt"              -> konkreter, eindeutig identifizierbarer Ort
  // "ungefaehr"           -> ungefähre Region/Gegend bekannt
  // "nicht_lokalisierbar" -> kein realer Ort zuordenbar (dann "coordinates" weglassen)
  "koordinatenSicherheit": "exakt | ungefaehr | nicht_lokalisierbar",

  // true, wenn dieser Ort der zentrale/wichtigste Schauplatz der Sage ist
  // (z. B. für die Zuordnung zu Wanderrouten in der Nähe). Meistens true,
  // ausser eine Sage hat mehrere gleichwertige Schauplätze.
  "isAnchorPlace": true
}
```

## Vollständiges Beispiel

```json
[
  {
    "id": "teufelsbrucke",
    "title": "Die Teufelsbrücke in der Schöllenen",
    "canton": "Uri",
    "coreMotif": "Pakt mit dem Teufel",
    "mood": "Düster und stürmisch",
    "bildmotiv": "Teufelsbrücke Schöllenen",
    "summary": "Die Schöllenenschlucht war unpassierbar, bis die verzweifelten Urner riefen, da solle doch der Teufel eine Brücke bauen. Der Teufel erschien und baute sie – zum Preis der ersten Seele, die hinüberginge. Die listigen Urner jagten einen Geissbock über die Brücke; ergrimmt wollte der Teufel sie mit einem Felsblock zerschmettern, doch das Zeichen eines Kreuzes lenkte den Stein ab.",
    "summaries": {
      "de": { "text": "Die Schöllenenschlucht war unpassierbar, bis die verzweifelten Urner riefen, da solle doch der Teufel eine Brücke bauen. ...", "reviewEmpfohlen": false },
      "en": { "text": "The Schöllenen gorge was impassable until the desperate people of Uri cried that the Devil himself should build a bridge. ...", "reviewEmpfohlen": false },
      "fr": { "text": "Les gorges des Schöllenen étaient infranchissables, jusqu'à ce que les Uranais désespérés s'écrient que le diable n'avait qu'à bâtir un pont. ...", "reviewEmpfohlen": false },
      "it": { "text": "La gola della Schöllenen era invalicabile, finché gli Urani disperati non gridarono che il diavolo costruisse pure un ponte. ...", "reviewEmpfohlen": false },
      "es": { "text": "El desfiladero de Schöllenen era intransitable hasta que los desesperados habitantes de Uri gritaron que el diablo mismo construyera un puente. ...", "reviewEmpfohlen": false },
      "pt": { "text": "O desfiladeiro de Schöllenen era intransponível até que os desesperados habitantes de Uri gritaram que o próprio diabo construísse uma ponte. ...", "reviewEmpfohlen": false },
      "zh": { "text": "舍勒能峡谷原本无法通行，直到绝望的乌里人喊道，干脆让魔鬼来造一座桥。...", "reviewEmpfohlen": true },
      "gsw": { "text": "D Schöllenenschlucht isch unpassierbar gsi, bis d Urner verzwiflet grüeft hend, de Tüüfel söll halt e Brugg boue. ...", "reviewEmpfohlen": true }
    },
    "altersstufenHinweis": "Den Seelenpakt und die Drohung des Teufels für jüngere Kinder abmildern; den listigen Ausgang mit dem Geissbock betonen.",
    "quelle": {
      "autor": "Alois Lütolf",
      "werk": "Sagen, Bräuche und Legenden aus den fünf Orten Lucern, Uri, Schwyz, Unterwalden und Zug",
      "jahr": "1862",
      "fundstelleUrl": "https://reader.digitale-sammlungen.de/resolve/display/bsb10453839.html"
    },
    "source": "Alois Lütolf: Sagen, Bräuche und Legenden aus den fünf Orten Lucern, Uri, Schwyz, Unterwalden und Zug (1862)",
    "coordinates": { "lat": 46.6529, "lng": 8.5837 },
    "koordinatenSicherheit": "exakt",
    "isAnchorPlace": true
  }
]
```

## Checkliste vor der Lieferung

- [ ] JSON ist syntaktisch valide und ein Array von Sagen-Objekten.
- [ ] Jede `id` ist eindeutig innerhalb des Pakets (und kollidiert nach Möglichkeit nicht mit bereits vorhandenen SagaTrail-IDs).
- [ ] `canton` entspricht exakt einem der 26 offiziellen Kantonsnamen (siehe Liste oben).
- [ ] `bildmotiv` ist ein konkretes, fotografierbares Objekt/Ort (nicht das abstrakte `coreMotif`).
- [ ] `summaries` enthält mindestens `de, en, fr, it, es, pt, zh`; `de` deckt sich inhaltlich mit `summary`.
- [ ] `quelle` verweist auf eine echte, gemeinfreie Quelle (kein Wikipedia-Zusammenfassungstext als alleinige Quelle, sondern das zugrundeliegende historische Werk).
- [ ] `coordinates` nur gesetzt, wenn die Quelle einen realen, auffindbaren Ort nennt; sonst `koordinatenSicherheit: "nicht_lokalisierbar"` und `coordinates` weglassen.
- [ ] Keine KI-generierten oder frei erfundenen Inhalte – nur historisch belegte Sagen.
