---
name: SagaTrail POI-Klick Fix
description: DOM-Event-Listener auf MapLibre-Markern in RN WebView sind unzuverlässig; geographische Distanz statt Pixel-Distanz als Hit-Test.
---

## Wurzelursache (bestätigt durch Debugging)

`pois`, `partners`, `aerialways` sind async State in `hike/[id].tsx`. Jede Änderung triggert `useMemo` in `SwisstopoMap.tsx` → neues `html` → WKWebView lädt neue Page. iOS WKWebView droppt `postMessage`-Aufrufe von der alten Page während eines Reload-Übergangs → `onMessage` feuert nie → POI-Klick-Kanal komplett tot.

## Funktionierende Lösung

**SwisstopoMap.tsx**: `pois`, `partners`, `aerialways` aus `useMemo`-Deps entfernen, `null` an `buildSwisstopoHtml` übergeben. WebView lädt einmal stabil. Daten per `injectJavaScript` nach `ready=true` nachliefern:
- `window.sttSetPois(json)` — GeoJSON-Source + Cluster-Layer + DOM-Marker + Render-Loop
- `window.sttSetPartners(json)` — Partner-Pins
- `window.sttSetAerialways(json)` — Seilbahn-Lines + Marker

**swisstopoMapHtml.ts**: `window.sttSet*`-Funktionen in `map.on('load')` definiert. Click-Handler prüft `map.getSource('stt-pois')` statt `if (pois)` (var ist immer null).

**Keine DOM-Marker + Render-Loop für gecl usterte POIs:** Hybrid aus `maplibregl.Marker` (DOM) + Cluster-Layer + `map.on('render')`-Hide-Logik ließ Marker "kurz erscheinen und verschwinden". Lösung: Einzel-POIs als sichtbarer Circle-Layer (`filter: ['!',['has','point_count']]`) — MapLibre blendet beim Clustern automatisch; Cluster-Zähler als Symbol-Layer mit `text-font: ['Noto Sans Regular']` (Style hat demotiles-Glyphs).

**onLoadEnd ist unzuverlässig als Inject-Trigger:** WKWebView feuert `onLoadEnd` auch für Zwischen-Dokumente (about:blank); Injektion landet dann im falschen Dokument und verpufft — besonders beim Vollbild-Wechsel, wo `KarteVollbild` die Karte un-/remountet und Daten schon gecacht sind. Lösung: Map-HTML sendet `stt-html-ready` per postMessage aus `map.on('load')`; RN setzt `ready` erst darauf und injiziert dann.

**Injektions-Race:** `onLoadEnd` (WebView) kann VOR MapLibre's `load`-Event feuern. Werden `window.sttSet*` erst in `map.on('load')` definiert, verpufft ein früher `injectJavaScript`-Aufruf still (z.B. beim Vollbild-Wechsel, wenn Daten schon da sind). Lösung: `window.sttSet*` sofort im globalen Scope definieren, Daten in `_sttPending` puffern, `_sttApply.*` erst nach map-load setzen und Pending anwenden.

**Warum kein DOM-Event-Listener auf Markern:** Diese werden auch von WKWebView nicht zuverlässig an `onMessage` weitergeleitet. Stattdessen: `pointer-events:none` auf Marker-Element + `queryRenderedFeatures` auf unsichtbarer `stt-poi-click-target`-Schicht in `map.on('click')`.

**How to apply:** Jede neue async-geladene Kartenkomponente (z.B. waterSources wenn die mal dynamisch wird) muss per `injectJavaScript` nachgeliefert werden — NICHT in useMemo-Deps aufnehmen.
