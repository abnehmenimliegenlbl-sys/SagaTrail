import { LatLng } from "@/types";

/** Base64-kodiertes SagaTrail-Pin-Icon (rotes Berg-Symbol, transparent). */
const SAGA_PIN_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8" +
  "YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTITAUd0" +
  "AAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAACAAAAMQECABEA" +
  "AABaAAAAaYcEAAEAAABsAAAAAAAAAPJ2AQDoAwAA8nYBAOgDAABQYWludC5ORVQgNS4xLjEyAAADAACQ" +
  "BwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAA" +
  "MDEwMAAAAACDfy8cctDT3wAAAYdpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp" +
  "bj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9" +
  "ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkv" +
  "MDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjVi" +
  "ZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2Jl" +
  "LmNvbS90aWZmLzEuMC8iPjx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+PC9yZGY6" +
  "RGVzY3JpcHRpb24+PC9yZGY6UkRGPjwveDp4bXBtZXRhPg0KPD94cGFja2V0IGVuZD0ndyc/PiyUmAsA" +
  "ABF7SURBVGhD3ZlZrK7Xedd/zxre4Zv2cPY+g89JfJLj1q7jJiSOkiZxUugATis6qW6lqOSqTQVCoghE" +
  "LrgIFaqEBBKIuxQkVECgGqnQXER0IIkESRPUyiZx7DZ2HLk+xznjPnv4hndYaz1crO/bZ2fHMRSfvS/4" +
  "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";
/** Minimale Marker-Daten fuer einen Point of Interest auf der Karte. */
export interface MapPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Optionale Zusatzinfo fuer den Popup (z. B. Adresse, Typ). */
  description?: string | null;
}

/**
 * Gemeinsame Props der plattformspezifischen SwisstopoMap-Varianten
 * (SwisstopoMap.tsx nutzt eine WebView, SwisstopoMap.web.tsx ein iframe).
 */
/** Koordinate + Name einer Sage fuer den Kartenmarker. */
export interface SagaPin {
  lat: number;
  lng: number;
  name: string;
}

export interface SwisstopoMapProps {
  center: LatLng;
  position?: LatLng | null;
  label?: string;
  height?: number;
  geometry?: number[][] | null;
  altGeometry?: number[][] | null;
  offlineTiles?: Record<string, string> | null;
  aerialways?: { id: string; geometry: number[][] }[] | null;
  pois?: MapPoi[] | null;
  onPoiPress?: (id: string) => void;
  partners?: MapPoi[] | null;
  onPartnerPress?: (id: string) => void;
  waterSources?: MapPoi[] | null;
  parkingSpots?: MapPoi[] | null;
  pickerMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  legend?: MapLegendLabels | null;
  /** Sicherer Bereich oben (iOS-Statusleiste). Schiebt den 2D/3D/Sat-Toggle
   *  nach unten damit er nicht hinter der Statusleiste verschwindet. */
  safeAreaInsetTop?: number;
  /** Koordinate der zugehörigen Sage — wird als kleines SagaTrail-Icon auf der Karte dargestellt. */
  sagaPin?: SagaPin | null;
}

/** Beschriftungen der Kartenlegende (bereits lokalisiert vom Host). */
export interface MapLegendLabels {
  title: string;
  route: string;
  altRoute: string;
  start: string;
  ziel: string;
  position: string;
  wegInternational: string;
  wegNational: string;
  wegRegional: string;
  wegLokal: string;
  wegMehrfach: string;
  nummerWanderland: string;
  nummerLokal: string;
  wegzeichen: string;
  wegweiser: string;
  seilbahn: string;
  seilbahnStation: string;
  poi: string;
  partner: string;
}

/**
 * Baut ein eigenstaendiges MapLibre-GL-JS-Dokument mit drei waehlbaren
 * Kartenmodi: 2D (Carto Voyager flach), 3D (gleiche Basis + AWS-Terrain-
 * Exaggeration + Kamerakippung) und Satellit (swisstopo SWISSIMAGE + Terrain).
 * Die Waymarked-Trails-Wanderweg-Ueberlagerung, Routengeometrie, Marker und
 * das gesamte Nachrichten-Protokoll (sttSetPosition, stt-poi-press, …) bleiben
 * unveraendert. Offlinekacheln werden ueber transformRequest eingespielt.
 */
export function buildSwisstopoHtml(
  center: LatLng,
  label: string,
  geometry?: number[][] | null,
  offlineTiles?: Record<string, string> | null,
  aerialways?: { id: string; geometry: number[][] }[] | null,
  pois?: MapPoi[] | null,
  legend?: MapLegendLabels | null,
  partners?: MapPoi[] | null,
  pickerMode?: boolean,
  altGeometry?: number[][] | null,
  waterSources?: MapPoi[] | null,
  safeAreaInsetTop?: number,
  parkingSpots?: MapPoi[] | null
): string {
  const lat = center.lat;
  const lng = center.lng;
  const title = JSON.stringify(label ?? "Start");
  const geometryJson =
    geometry && geometry.length > 1 ? JSON.stringify(geometry) : "null";
  const offlineJson =
    offlineTiles && Object.keys(offlineTiles).length > 0
      ? JSON.stringify(offlineTiles)
      : "null";
  // aerialways/pois/partners werden NICHT ins HTML gebacken — sie werden nach
  // map-load per injectJavaScript via window.sttSet* nachgeliefert, damit die
  // WebView beim async-Laden dieser Daten nicht neu geladen wird (WKWebView
  // droppt postMessage waehrend eines Reloads → click-Kanal bricht ab).
  const aerialwaysJson = "null";
  const poisJson       = "null";
  const partnersJson   = "null";
  const waterSourcesJson =
    waterSources && waterSources.length > 0 ? JSON.stringify(waterSources) : "null";
  const parkingJson =
    parkingSpots && parkingSpots.length > 0 ? JSON.stringify(parkingSpots) : "null";
  const altGeometryJson =
    altGeometry && altGeometry.length > 1 ? JSON.stringify(altGeometry) : "null";
  const pickerJs = pickerMode ? "true" : "false";

  /* Legende: statisch als HTML bauen (kein JS-show noetig, kein display:none-Risiko) */
  function legendZeile(sym: string, txt: string): string {
    return `<div class="stt-legende-zeile"><span class="stt-legende-symbol">${sym}</span><span>${txt}</span></div>`;
  }
  const legendHtml = legend ? (() => {
    let rows = "";
    if (geometry && geometry.length > 1) {
      rows += legendZeile('<span class="stt-linie-route"></span>', legend.route);
      if (altGeometry && altGeometry.length > 1)
        rows += legendZeile('<span class="stt-linie-altroute"></span>', legend.altRoute);
      rows += legendZeile('<div class="stt-start"></div>', legend.start);
      rows += legendZeile('<div class="stt-ziel"></div>', legend.ziel);
    } else {
      rows += legendZeile('<div class="stt-start"></div>', legend.start);
    }
    rows += legendZeile('<div class="stt-live"></div>', legend.position);
    if (aerialways && aerialways.length > 0) {
      rows += legendZeile('<span class="stt-linie-seilbahn"></span>', legend.seilbahn);
      rows += legendZeile('<div class="stt-seilbahn-station"></div>', legend.seilbahnStation);
    }
    if (pois && pois.length > 0)
      rows += legendZeile('<div class="stt-poi"></div>', legend.poi);
    if (partners && partners.length > 0)
      rows += legendZeile('<div class="stt-partner-pin stt-partner-pin--standard" style="width:16px;height:16px;border-radius:5px;flex-shrink:0"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#cc0000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>', legend.partner);
    return (
      `<div id="stt-legende" class="zu">` +
      `<div class="stt-legende-kopf" onclick="this.parentElement.classList.toggle('zu')">` +
      `<span class="stt-legende-pfeil">&#9662;</span>${legend.title}` +
      `</div><div class="stt-legende-inhalt">${rows}</div></div>`
    );
  })() : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<script>
  (function () {
    var pending = null;
    window.sttSetPosition = function (plat, plng) {
      if (plat == null || plng == null) return;
      pending = [plat, plng];
      if (window.__sttApply) window.__sttApply(pending);
    };
    window.__sttGetPending = function () { return pending; };
  })();
</script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #10181A; }
  #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #10181A; }
  .stt-cluster-badge { position: absolute; transform: translate(-50%, -50%); color: #F5F3EC; font-size: 11px; font-weight: 700; font-family: -apple-system, system-ui, sans-serif; pointer-events: none; z-index: 10; }
  /* --- Kartenmarker (unveraendert) --- */
  .stt-start { width: 16px; height: 16px; border-radius: 50%; background: #DA291C; border: 2px solid #F5F3EC; box-shadow: 0 0 0 4px rgba(218,41,28,0.25); }
  .stt-ziel  { width: 16px; height: 16px; border-radius: 50%; background: #F5F3EC; border: 3px solid #DA291C; box-shadow: 0 0 0 4px rgba(218,41,28,0.25); }
  .stt-live  { width: 16px; height: 16px; border-radius: 50%; background: #2F6FED; border: 2px solid #F5F3EC; box-shadow: 0 0 0 6px rgba(47,111,237,0.30); }
  .stt-seilbahn-station { width: 9px; height: 9px; border-radius: 2px; background: #5B6B78; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(91,107,120,0.25); }
  .stt-poi-tipp     { width: 36px; height: 36px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; box-sizing: border-box; cursor: pointer; }
  .stt-poi          { width: 13px; height: 13px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #cc0000; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(204,0,0,0.25); }
  /* PARTNER PINS — weisse Kachel + Marken-Rot Icon (#cc0000) */
  .stt-partner-tipp { width: 44px; height: 44px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; cursor: pointer; }
  .stt-partner-pin  { display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 8px; position: relative; }
  .stt-partner-pin::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #fff; }
  .stt-partner-pin--basic    { width: 24px; height: 24px; opacity: 0.72; }
  .stt-partner-pin--standard { width: 30px; height: 30px; }
  .stt-partner-pin--premium  { width: 36px; height: 36px; box-shadow: 0 0 0 1.5px #cc0000; }
  .stt-partner-pin--premium::after { border-top-color: #cc0000; top: calc(100% + 1.5px); }
  .stt-partner-tipp--basic    { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.24)); }
  .stt-partner-tipp--standard { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.26)); }
  .stt-partner-tipp--premium  { filter: drop-shadow(0 2px 6px rgba(0,0,0,0.30)); }
  .stt-wasser  { width: 10px; height: 10px; border-radius: 50%; background: #38BDF8; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(56,189,248,0.28); }
  .stt-parking { width: 20px; height: 20px; border-radius: 4px; background: #1E6FB5; border: 2px solid #F5F3EC; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #F5F3EC; font-size: 12px; font-family: -apple-system,system-ui,sans-serif; box-shadow: 0 0 0 3px rgba(30,111,181,0.28); cursor: default; }
  .stt-picker  { width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #DA291C; border: 2.5px solid #F5F3EC; box-shadow: 0 2px 10px rgba(0,0,0,0.45); cursor: crosshair; }
  /* Saga-Pin */
  .stt-saga-tipp { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; cursor: pointer; background: rgba(255,255,255,0.60); border-radius: 20px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
  .stt-saga-tipp img { width: 28px; height: 28px; object-fit: contain; display: block; }
  /* --- Legende --- */
  #stt-legende { position: absolute; bottom: 0px; left: 8px; z-index: 1000;
    background: rgba(16,24,26,0.88); color: #F5F3EC; border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.35); font-size: 12px; line-height: 1.35;
    overflow: hidden; font-family: -apple-system, system-ui, sans-serif; }
  .stt-legende-kopf { display: flex; align-items: center; gap: 6px; padding: 7px 10px;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    font-weight: 600; color: #DA291C; }
  .stt-legende-pfeil { display: inline-block; transition: transform 0.15s ease; font-size: 10px; color: #F5F3EC; }
  #stt-legende.zu .stt-legende-pfeil { transform: rotate(-90deg); }
  .stt-legende-inhalt { padding: 0 10px 8px 10px; }
  #stt-legende.zu .stt-legende-inhalt { display: none; }
  .stt-legende-zeile { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .stt-legende-symbol { flex: 0 0 18px; display: flex; align-items: center; justify-content: center; }
  .stt-linie-route  { width: 18px; height: 4px; border-radius: 2px; background: #DA291C; }
  .stt-linie-altroute { width: 18px; height: 3px; border-image: repeating-linear-gradient(90deg,#2EC4B6 0 5px,transparent 5px 8px) 1; border-top: 3px solid; }
  .stt-linie-iwn    { width: 18px; height: 3px; border-radius: 2px; background: #9C5AC8; }
  .stt-linie-nwn    { width: 18px; height: 3px; border-radius: 2px; background: #D9442E; }
  .stt-linie-rwn    { width: 18px; height: 3px; border-radius: 2px; background: #4A63D0; }
  .stt-linie-lwn    { width: 18px; height: 3px; border-radius: 2px; background: #E0C33B; }
  .stt-linie-mehrfach { width: 18px; height: 3px; border-radius: 2px; background: repeating-linear-gradient(90deg,#D9442E 0 4px,#4A63D0 4px 8px); }
  .stt-schild       { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 13px; padding: 0 2px; border-radius: 2px; font-size: 9px; font-weight: 700; box-sizing: border-box; }
  .stt-schild-gruen { background: #3E7D3A; color: #FFF; border: 1px solid #FFF; }
  .stt-schild-weiss { background: #FFF; color: #10181A; border: 1px solid #5B6B78; }
  .stt-raute        { display: inline-block; width: 7px; height: 7px; background: #C4462F; transform: rotate(45deg); }
  .stt-wegweiser    { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #F5F3EC; }
  .stt-linie-seilbahn { width: 18px; height: 0; border-top: 2.5px dashed #5B6B78; }
  #stt-legende .stt-start, #stt-legende .stt-ziel, #stt-legende .stt-live { width: 11px; height: 11px; box-shadow: none; }
  #stt-legende .stt-seilbahn-station { box-shadow: none; }
  #stt-legende .stt-poi, #stt-legende .stt-partner-pin { box-shadow: none !important; cursor: default; }
  /* --- Karten-Toggles oben links (2D/3D + Topo/Sat) --- */
  #stt-controls { position: absolute; top: ${(safeAreaInsetTop ?? 0) + 10}px; left: 10px; z-index: 10;
    display: flex; gap: 6px; font-family: -apple-system, system-ui, sans-serif; }
  .stt-toggle { display: flex; border-radius: 8px; overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.45); }
  .stt-mbtn { padding: 6px 11px; font-size: 12px; font-weight: 600;
    background: rgba(16,24,26,0.88); color: #8A9BA8; cursor: pointer;
    border: none; border-right: 1px solid rgba(255,255,255,0.08);
    -webkit-user-select: none; user-select: none; }
  .stt-mbtn:last-child { border-right: none; }
  .stt-mbtn.active { background: #DA291C; color: #F5F3EC; }
  /* MapLibre overrides */
  .maplibregl-ctrl-bottom-right,
  .maplibregl-ctrl-bottom-left { bottom: 0px !important; }
  .maplibregl-ctrl-attrib { background: rgba(16,24,26,0.7) !important; max-width: 140px !important; }
  .maplibregl-ctrl-attrib a { color: #DA291C !important; }
  .maplibregl-ctrl-attrib-inner { color: #6B7568 !important; font-size: 9px !important;
    white-space: normal !important; word-break: break-word !important; line-height: 1.3 !important; }
</style>
</head>
<body>
<div id="map"></div>
<div id="stt-controls">
  <div class="stt-toggle">
    <button class="stt-mbtn active" id="btn-2d">2D</button>
    <button class="stt-mbtn" id="btn-3d">3D</button>
  </div>
  <div class="stt-toggle">
    <button class="stt-mbtn active" id="btn-topo">Topo</button>
    <button class="stt-mbtn" id="btn-sat">Sat</button>
  </div>
</div>
${legendHtml}
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
(function () {
  var offline   = ${offlineJson};
  var geometry  = ${geometryJson};
  var altGeom   = ${altGeometryJson};
  var aerialways = ${aerialwaysJson};
  var pois      = ${poisJson};
  var partners  = ${partnersJson};
  var waters    = ${waterSourcesJson};
  var parking   = ${parkingJson};
  var picker    = ${pickerJs};
  var centerLng = ${lng};
  var centerLat = ${lat};

  /* ---- MapLibre init mit leerem Stil ---- */
  /* Injektions-Puffer: sttSet* darf JEDERZEIT aufgerufen werden — auch bevor
     die Karte fertig geladen ist. Daten werden gepuffert und beim map-load
     angewendet. Ohne Puffer verpufft ein frueher injectJavaScript-Aufruf. */
  var _sttPending = { pois: null, partners: null, aerialways: null, sagaPin: null };
  var _sttApply   = { pois: null, partners: null, aerialways: null, sagaPin: null };
  window.sttSetPois = function(d) {
    _sttPending.pois = d;
    if (_sttApply.pois) _sttApply.pois(d);
  };
  window.sttSetPartners = function(d) {
    _sttPending.partners = d;
    if (_sttApply.partners) _sttApply.partners(d);
  };
  window.sttSetAerialways = function(d) {
    _sttPending.aerialways = d;
    if (_sttApply.aerialways) _sttApply.aerialways(d);
  };
  window.sttSetSagaPin = function(d) {
    _sttPending.sagaPin = d;
    if (_sttApply.sagaPin) _sttApply.sagaPin(d);
  };

  var map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [], glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf' },
    center: [centerLng, centerLat],
    zoom: 14,
    pitch: 0,
    bearing: 0,
    attributionControl: true,
    transformRequest: function (url) {
      if (offline) {
        var m = url.match(/\\/([0-9]+)\\/([0-9]+)\\/([0-9]+)(?:\\.\\w+)?(?:\\?.*)?$/);
        if (m) {
          var key = m[1] + '/' + m[2] + '/' + m[3];
          if (offline[key]) return { url: offline[key] };
        }
      }
      return { url: url };
    }
  });

  /* ---- Hilfsfunktion: postMessage an RN oder parent ---- */
  function post(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(payload);
    } else if (window.parent) {
      window.parent.postMessage(payload, '*');
    }
  }

  /* ---- Mode-Logik: 2 unabhaengige Toggles (Dimension + Layer) ---- */
  var is3d  = false;
  var isSat = false;

  function updateDimButtons() {
    document.getElementById('btn-2d').classList.toggle('active', !is3d);
    document.getElementById('btn-3d').classList.toggle('active',  is3d);
  }
  function updateLayerButtons() {
    document.getElementById('btn-topo').classList.toggle('active', !isSat);
    document.getElementById('btn-sat').classList.toggle('active',   isSat);
  }

  document.getElementById('btn-2d').addEventListener('click', function() {
    if (is3d) { is3d = false; updateDimButtons(); if (map.loaded()) applyMode(); }
  });
  document.getElementById('btn-3d').addEventListener('click', function() {
    if (!is3d) { is3d = true; updateDimButtons(); if (map.loaded()) applyMode(); }
  });
  document.getElementById('btn-topo').addEventListener('click', function() {
    if (isSat) { isSat = false; updateLayerButtons(); if (map.loaded()) applyMode(); }
  });
  document.getElementById('btn-sat').addEventListener('click', function() {
    if (!isSat) { isSat = true; updateLayerButtons(); if (map.loaded()) applyMode(); }
  });

  function applyMode() {
    if (map.getLayer('base-carto'))  map.setLayoutProperty('base-carto',  'visibility', isSat ? 'none' : 'visible');
    if (map.getLayer('base-sat'))    map.setLayoutProperty('base-sat',    'visibility', isSat ? 'visible' : 'none');
    if (map.getLayer('waymarked'))   map.setLayoutProperty('waymarked',   'visibility', isSat ? 'none' : 'visible');

    if (is3d) {
      map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
      map.easeTo({ pitch: 52, bearing: 0, duration: 600 });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }

  /* ---- Karte bereit ---- */
  map.on('load', function () {

    /* OpenTopoMap — Höhenkurven + OSM-Stadtdetails, gute Balance Stadt/Land */
    map.addSource('carto', {
      type: 'raster',
      tiles: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      minzoom: 2,
      maxzoom: 17,
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; OpenStreetMap'
    });
    map.addLayer({ id: 'base-carto', type: 'raster', source: 'carto', paint: { 'raster-fade-duration': 0 } });

    /* swisstopo SWISSIMAGE — Satellit */
    map.addSource('swissimage', {
      type: 'raster',
      tiles: ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.swisstopo.admin.ch">swisstopo</a>',
      minzoom: 2,
      maxzoom: 19
    });
    map.addLayer({ id: 'base-sat', type: 'raster', source: 'swissimage', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } });

    /* Waymarked Trails — Wanderweg-Overlay */
    map.addSource('waymarked', {
      type: 'raster',
      tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
    });
    map.addLayer({ id: 'waymarked', type: 'raster', source: 'waymarked', paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } });

    /* AWS Terrain-DEM (Terrarium-Encoding) fuer 3D/Sat */
    map.addSource('terrain', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 15
    });
    map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'terrain',
      paint: { 'hillshade-intensity': 0.18, 'hillshade-shadow-color': '#10181A', 'hillshade-highlight-color': '#F5F3EC' }
    });

    /* ---- Zoom-gesteuerte Sichtbarkeit ---- */
    /* Marker-Gruppen: { els: HTMLElement[], minZoom: number } */
    var zoomGroups = [];
    function updateZoomVisibility() {
      var z = map.getZoom();
      zoomGroups.forEach(function(g) {
        var vis = z >= g.minZoom ? '' : 'none';
        g.els.forEach(function(el) { el.style.display = vis; });
      });
      /* Seilbahn-Linienlayer ebenfalls */
      if (map.getLayer('seilbahnen-line')) {
        map.setLayoutProperty('seilbahnen-line', 'visibility', z >= 11 ? 'visible' : 'none');
      }
    }
    map.on('zoom', updateZoomVisibility);

    /* Seilbahnen */
    if (aerialways) {
      var seilbahnGeojson = {
        type: 'FeatureCollection',
        features: aerialways.map(function(a) {
          return { type: 'Feature', geometry: { type: 'LineString', coordinates: a.geometry.map(function(p){ return [p[1],p[0]]; }) } };
        })
      };
      map.addSource('seilbahnen', { type: 'geojson', data: seilbahnGeojson });
      map.addLayer({ id: 'seilbahnen-line', type: 'line', source: 'seilbahnen',
        paint: { 'line-color': '#5B6B78', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [1,3] }
      });
      var seilbahnEls = [];
      aerialways.forEach(function(a) {
        var g = a.geometry;
        if (!g || g.length < 2) return;
        var stEl = document.createElement('div'); stEl.className = 'stt-seilbahn-station'; stEl.style.zIndex = '1';
        new maplibregl.Marker({ element: stEl, zIndex: 1 }).setLngLat([g[0][1], g[0][0]]).addTo(map);
        var enEl = document.createElement('div'); enEl.className = 'stt-seilbahn-station'; enEl.style.zIndex = '1';
        new maplibregl.Marker({ element: enEl, zIndex: 1 }).setLngLat([g[g.length-1][1], g[g.length-1][0]]).addTo(map);
        seilbahnEls.push(stEl, enEl);
      });
      if (seilbahnEls.length) zoomGroups.push({ els: seilbahnEls, minZoom: 11 });
    }

    /* Routengeometrie */
    if (geometry && geometry.length > 1) {
      var coords = geometry.map(function(p){ return [p[1],p[0]]; });
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
      map.addLayer({ id: 'route-shadow', type: 'line', source: 'route',
        paint: { 'line-color': '#10181A', 'line-width': 7, 'line-opacity': 0.55,
          'line-blur': 1 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route',
        paint: { 'line-color': '#DA291C', 'line-width': 4, 'line-opacity': 0.95 },
        layout: { 'line-join': 'round', 'line-cap': 'round' } });

      var startEl = document.createElement('div'); startEl.className = 'stt-start'; startEl.style.zIndex = '30';
      new maplibregl.Marker({ element: startEl, zIndex: 30 })
        .setLngLat([coords[0][0], coords[0][1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(${title}))
        .addTo(map);

      var zielEl = document.createElement('div'); zielEl.className = 'stt-ziel'; zielEl.style.zIndex = '30';
      new maplibregl.Marker({ element: zielEl, zIndex: 30 })
        .setLngLat([coords[coords.length-1][0], coords[coords.length-1][1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText('Ziel'))
        .addTo(map);

      var bounds = coords.reduce(function(b,c){ return b.extend(c); }, new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 36, duration: 0 });
    } else {
      var startEl2 = document.createElement('div'); startEl2.className = 'stt-start'; startEl2.style.zIndex = '30';
      new maplibregl.Marker({ element: startEl2, zIndex: 30 })
        .setLngLat([centerLng, centerLat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(${title}))
        .addTo(map);
    }

    /* Alternativroute (Off-Route) */
    if (altGeom && altGeom.length > 1) {
      var altCoords = altGeom.map(function(p){ return [p[1],p[0]]; });
      map.addSource('altroute', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: altCoords } } });
      map.addLayer({ id: 'altroute-shadow', type: 'line', source: 'altroute',
        paint: { 'line-color': '#10181A', 'line-width': 6, 'line-opacity': 0.4 },
        layout: { 'line-join': 'round', 'line-cap': 'round' } });
      map.addLayer({ id: 'altroute-line', type: 'line', source: 'altroute',
        paint: { 'line-color': '#2EC4B6', 'line-width': 3.5, 'line-opacity': 0.95, 'line-dasharray': [2,1.5] },
        layout: { 'line-join': 'round', 'line-cap': 'round' } });
    }

    /* Partner-Marker — weisse Kachel mit Kategorie-Icon (#cc0000) */
    var PICONS = {
      restaurant:    '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
      cafe:          '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
      bar:           '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      hotel:         '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      uebernachtung: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      sac_huette:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      souvenir:      '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    };
    var PICON_DEFAULT = PICONS.restaurant;
    if (partners) {
      var partnerEls = [];
      partners.forEach(function(p) {
        var paket = p.paket || 'basic';
        var kat   = (p.kategorie || '').toLowerCase();
        var paths = PICONS[kat] || PICON_DEFAULT;
        var sz    = paket === 'premium' ? 18 : paket === 'standard' ? 15 : 12;
        var el  = document.createElement('div');
        el.className = 'stt-partner-tipp stt-partner-tipp--' + paket;
        var pin = document.createElement('div');
        pin.className = 'stt-partner-pin stt-partner-pin--' + paket;
        pin.innerHTML = '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="#cc0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
        el.appendChild(pin);
        el.addEventListener('click', function(e) { e.stopPropagation(); post(JSON.stringify({ type: 'stt-partner-press', id: p.id })); });
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
        partnerEls.push(el);
      });
      if (partnerEls.length) zoomGroups.push({ els: partnerEls, minZoom: 10 });
    }

    /* POI-Koordinaten und -Marker-Elemente: ausserhalb von if(pois) damit
       map.on('click') darauf zugreifen kann (Closures über load-Scope). */
    var poiCoords    = {};  /* id → [lng, lat] */
    var poiMarkerEls = {};  /* id → DOM-Element */

    /* POI-Marker mit MapLibre-Clustering */
    if (pois) {
      map.addSource('stt-pois', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pois.map(function(p) {
            return {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
              properties: { id: p.id, name: p.name }
            };
          })
        },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45
      });
      /* Cluster-Kreis (rot) */
      map.addLayer({
        id: 'stt-poi-clusters',
        type: 'circle',
        source: 'stt-pois',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#cc0000',
          'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 30, 21],
          'circle-stroke-color': '#F5F3EC',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      });
      /* Unsichtbare Click-Target-Schicht fuer unklustrierte POIs.
         circle-opacity:0 → geometrisch vorhanden (queryRenderedFeatures), visuell transparent.
         Der DOM-Marker übernimmt die visuelle Darstellung. */
      map.addLayer({
        id: 'stt-poi-click-target',
        type: 'circle',
        source: 'stt-pois',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 24,
          'circle-opacity': 0,
          'circle-stroke-opacity': 0,
          'circle-color': '#cc0000'
        }
      });
      /* Alle Einzel-Marker sofort erstellen.
         pointer-events:none → Touches fallen durch zum MapLibre-Canvas →
         map.on('click') kann per Pixel-Distanz-Check die Selektion übernehmen. */
      pois.forEach(function(p) {
        var wrap = document.createElement('div'); wrap.className = 'stt-poi-tipp';
        var dot  = document.createElement('div'); dot.className  = 'stt-poi';
        wrap.appendChild(dot);
        new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat]).addTo(map);
        wrap.style.pointerEvents = 'none';  /* Nach Marker-Init setzen */
        poiMarkerEls[p.id] = wrap;
        poiCoords[p.id]    = [p.lng, p.lat];
      });
      /* Cluster-Badges + Einzel-Marker ein-/ausblenden */
      var clusterBadges = {};
      map.on('render', function() {
        try {
          var clusterFeats = map.queryRenderedFeatures({ layers: ['stt-poi-clusters'] });
          var seen = {};
          var clusterPts = [];
          clusterFeats.forEach(function(f) {
            if (!f.properties || !f.geometry || !f.geometry.coordinates) return;
            var cid = String(f.properties.cluster_id);
            var pt  = map.project(f.geometry.coordinates);
            clusterPts.push(pt);
            seen[cid] = true;
            if (!clusterBadges[cid]) {
              var el = document.createElement('div');
              el.className = 'stt-cluster-badge';
              document.getElementById('map').appendChild(el);
              clusterBadges[cid] = el;
            }
            clusterBadges[cid].textContent = String(f.properties.point_count_abbreviated);
            clusterBadges[cid].style.left = pt.x + 'px';
            clusterBadges[cid].style.top  = pt.y + 'px';
          });
          Object.keys(clusterBadges).forEach(function(cid) {
            if (!seen[cid]) { clusterBadges[cid].remove(); delete clusterBadges[cid]; }
          });
          /* Einzel-Marker ausblenden wenn von einem Cluster-Kreis bedeckt (< 30 px) */
          Object.keys(poiMarkerEls).forEach(function(pid) {
            var coords = poiCoords[pid]; if (!coords) return;
            var mpt = map.project(coords);
            var hidden = clusterPts.some(function(cpt) {
              var dx = mpt.x - cpt.x, dy = mpt.y - cpt.y;
              return (dx * dx + dy * dy) < 900;
            });
            poiMarkerEls[pid].style.display = hidden ? 'none' : '';
          });
        } catch(e) { /* Render-Loop-Fehler still schlucken — JS-Thread nicht crashen */ }
      });
    }

    /* ---- Dynamisch injizierbare Datensätze ----------------------------------------
       Diese Funktionen werden per injectJavaScript aufgerufen, nachdem die WebView
       geladen ist. So lädt die WebView nur EINMAL — kein Reload bei async-Daten. */
    _sttApply.pois = function(poisData) {
      if (!poisData || !poisData.length) return;
      if (map.getSource('stt-pois')) return; /* Guard gegen Doppelaufruf */
      map.addSource('stt-pois', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: poisData.map(function(p) {
            return { type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
              properties: { id: p.id, name: p.name } };
          })
        },
        cluster: true, clusterMaxZoom: 13, clusterRadius: 45
      });
      map.addLayer({ id: 'stt-poi-clusters', type: 'circle', source: 'stt-pois',
        filter: ['has', 'point_count'],
        paint: { 'circle-color': '#cc0000',
          'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 30, 21],
          'circle-stroke-color': '#F5F3EC', 'circle-stroke-width': 2, 'circle-opacity': 0.9 }
      });
      /* Cluster-Anzahl als Text-Layer (Glyphs kommen vom Style) */
      map.addLayer({ id: 'stt-poi-cluster-count', type: 'symbol', source: 'stt-pois',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12
        },
        paint: { 'text-color': '#F5F3EC' }
      });
      /* Einzel-POIs als sichtbarer Kreis-Layer — MapLibre blendet sie beim
         Clustern automatisch aus (kein DOM-Marker, kein Render-Loop noetig) */
      map.addLayer({ id: 'stt-poi-punkt', type: 'circle', source: 'stt-pois',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#cc0000',
          'circle-radius': 7,
          'circle-stroke-color': '#F5F3EC',
          'circle-stroke-width': 2
        }
      });
      /* Unsichtbare, grosse Klick-Zielflaeche fuer Finger-Taps */
      map.addLayer({ id: 'stt-poi-click-target', type: 'circle', source: 'stt-pois',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 24, 'circle-opacity': 0, 'circle-stroke-opacity': 0, 'circle-color': '#cc0000' }
      });
      poisData.forEach(function(p) { poiCoords[p.id] = [p.lng, p.lat]; });
    };

    var _partnersApplied = false;
    _sttApply.partners = function(partnersData) {
      if (!partnersData || !partnersData.length) return;
      if (_partnersApplied) return; /* Guard gegen doppelte DOM-Marker */
      _partnersApplied = true;
      var partnerEls = [];
      partnersData.forEach(function(p) {
        var paket = p.paket || 'basic';
        var kat   = (p.kategorie || '').toLowerCase();
        var paths = PICONS[kat] || PICON_DEFAULT;
        var sz    = paket === 'premium' ? 18 : paket === 'standard' ? 15 : 12;
        var el  = document.createElement('div');
        el.className = 'stt-partner-tipp stt-partner-tipp--' + paket;
        var pin = document.createElement('div');
        pin.className = 'stt-partner-pin stt-partner-pin--' + paket;
        pin.innerHTML = '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="#cc0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
        el.appendChild(pin);
        el.addEventListener('click', function(e) { e.stopPropagation(); post(JSON.stringify({ type: 'stt-partner-press', id: p.id })); });
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
        partnerEls.push(el);
      });
      if (partnerEls.length) zoomGroups.push({ els: partnerEls, minZoom: 10 });
    };

    /* Saga-Pin: kleines SagaTrail-Icon an der Sagen-Koordinate.
       _sttSagaMarker hält den aktuellen MapLibre-Marker, damit er bei einem
       Wechsel (andere Sage, gleiche Karte) entfernt werden kann, bevor der
       neue gesetzt wird. */
    var SAGA_B64 = 'data:image/png;base64,${SAGA_PIN_B64}';
    var _sttSagaMarker = null;
    _sttApply.sagaPin = function(pin) {
      if (_sttSagaMarker) { _sttSagaMarker.remove(); _sttSagaMarker = null; }
      if (!pin) return;
      var wrap = document.createElement('div');
      wrap.className = 'stt-saga-tipp';
      var img = document.createElement('img');
      img.src = SAGA_B64;
      img.alt = pin.name || 'Sage';
      wrap.appendChild(img);
      var popup = new maplibregl.Popup({ offset: [0, -4], maxWidth: '200px' })
        .setHTML('<div style="font-family:-apple-system,system-ui,sans-serif;font-size:12px;font-weight:600;color:#10181A;padding:2px 0">' + (pin.name || 'Sage') + '</div>');
      _sttSagaMarker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map);
    };

    _sttApply.aerialways = function(aerialwaysData) {
      if (!aerialwaysData || !aerialwaysData.length) return;
      if (map.getSource('seilbahnen')) return;
      var seilbahnGeojson = { type: 'FeatureCollection', features: aerialwaysData.map(function(a) {
        return { type: 'Feature', geometry: { type: 'LineString', coordinates: a.geometry.map(function(p){ return [p[1],p[0]]; }) } };
      })};
      map.addSource('seilbahnen', { type: 'geojson', data: seilbahnGeojson });
      map.addLayer({ id: 'seilbahnen-line', type: 'line', source: 'seilbahnen',
        paint: { 'line-color': '#5B6B78', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [1,3] }
      });
      var seilbahnEls = [];
      aerialwaysData.forEach(function(a) {
        var g = a.geometry; if (!g || g.length < 2) return;
        var stEl = document.createElement('div'); stEl.className = 'stt-seilbahn-station';
        new maplibregl.Marker({ element: stEl }).setLngLat([g[0][1], g[0][0]]).addTo(map);
        var enEl = document.createElement('div'); enEl.className = 'stt-seilbahn-station';
        new maplibregl.Marker({ element: enEl }).setLngLat([g[g.length-1][1], g[g.length-1][0]]).addTo(map);
        seilbahnEls.push(stEl, enEl);
      });
      if (seilbahnEls.length) zoomGroups.push({ els: seilbahnEls, minZoom: 11 });
    };

    /* Gepufferte Daten anwenden, die VOR map-load injiziert wurden — erst
       danach Bereitschaft melden. onLoadEnd der WebView ist als Trigger
       unzuverlaessig (feuert auch fuer Zwischen-Dokumente). */
    if (_sttPending.pois)       _sttApply.pois(_sttPending.pois);
    if (_sttPending.partners)   _sttApply.partners(_sttPending.partners);
    if (_sttPending.aerialways) _sttApply.aerialways(_sttPending.aerialways);
    if (_sttPending.sagaPin)    _sttApply.sagaPin(_sttPending.sagaPin);
    post(JSON.stringify({ type: 'stt-html-ready' }));
    /* ------------------------------------------------------------------------------- */

    /* Trinkwasserquellen */
    if (waters) {
      var wasserEls = [];
      waters.forEach(function(w) {
        var el = document.createElement('div'); el.className = 'stt-wasser';
        new maplibregl.Marker({ element: el }).setLngLat([w.lng, w.lat])
          .setPopup(new maplibregl.Popup({ offset: 8 }).setText(w.name || 'Trinkwasser'))
          .addTo(map);
        wasserEls.push(el);
      });
      if (wasserEls.length) zoomGroups.push({ els: wasserEls, minZoom: 13 });
    }

    /* Parkplaetze */
    if (parking) {
      var parkingEls = [];
      parking.forEach(function(p) {
        var el = document.createElement('div'); el.className = 'stt-parking';
        el.textContent = 'P';
        var popupHtml = '<div style="font-family:-apple-system,system-ui,sans-serif;font-size:12px;line-height:1.4;max-width:160px">';
        popupHtml += '<strong style="font-size:13px">' + (p.name || 'Parkplatz') + '</strong>';
        if (p.description) popupHtml += '<div style="margin-top:3px;color:#8A9BA8">' + p.description + '</div>';
        popupHtml += '</div>';
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 12, maxWidth: '180px' }).setHTML(popupHtml))
          .addTo(map);
        parkingEls.push(el);
      });
      if (parkingEls.length) zoomGroups.push({ els: parkingEls, minZoom: 14 });
    }

    /* Picker-Modus Cursor */
    var pickerMarker = null;
    if (picker) { map.getCanvas().style.cursor = 'crosshair'; }

    /* Einheitlicher Click-Handler: POI-Cluster → Cluster-Tap, POI-Punkt → nativer Callback,
       Picker → Koordinaten-Post. Verwendet queryRenderedFeatures mit 22px Box statt
       layer-spezifischer Listener — viel zuverlässiger bei Finger-Taps auf kleinen Kreisen. */
    map.on('click', function(e) {
      var R = 22;
      var box = [[e.point.x - R, e.point.y - R], [e.point.x + R, e.point.y + R]];
      /* 1. POI-Cluster → reinzoomen */
      if (map.getSource && map.getSource('stt-pois')) {
        var clusterHits = map.queryRenderedFeatures(box, { layers: ['stt-poi-clusters'] });
        if (clusterHits.length) {
          var cId = clusterHits[0].properties.cluster_id;
          map.getSource('stt-pois').getClusterExpansionZoom(cId)
            .then(function(z) { map.easeTo({ center: clusterHits[0].geometry.coordinates, zoom: z + 0.5 }); })
            .catch(function() {});
          return;
        }
      }
      /* 2. Einzel-POI: unsichtbare click-target-Schicht (queryRenderedFeatures).
            Funktioniert weil die Schicht geometrisch gerendert ist, nur visuell transparent. */
      var poiHits = map.queryRenderedFeatures(box, { layers: ['stt-poi-click-target'] });
      if (poiHits.length) {
        var poiId = poiHits[0].properties && poiHits[0].properties.id;
        if (poiId) {
          post(JSON.stringify({ type: 'stt-poi-press', id: String(poiId) }));
          return;
        }
      }
      /* 3. Picker */
      if (picker) {
        var plat = e.lngLat.lat, plng = e.lngLat.lng;
        if (!pickerMarker) {
          var pel = document.createElement('div'); pel.className = 'stt-picker';
          pickerMarker = new maplibregl.Marker({ element: pel, anchor: 'bottom' }).setLngLat([plng, plat]).addTo(map);
        } else { pickerMarker.setLngLat([plng, plat]); }
        post(JSON.stringify({ type: 'stt-mapclick', lat: plat, lng: plng }));
      }
    });

    /* Live-Positionsmarker */
    var liveEl = document.createElement('div'); liveEl.className = 'stt-live'; liveEl.style.zIndex = '40';
    var liveMarker = null;
    window.__sttApply = function(ll) {
      if (!ll) return;
      if (!liveMarker) { liveMarker = new maplibregl.Marker({ element: liveEl, zIndex: 40 }).setLngLat([ll[1], ll[0]]).addTo(map); }
      else { liveMarker.setLngLat([ll[1], ll[0]]); }
      map.panTo([ll[1], ll[0]], { animate: true });
    };
    var early = window.__sttGetPending && window.__sttGetPending();
    if (early) window.__sttApply(early);

    /* Initialen Mode anwenden (nach dem Load) */
    applyMode();
    /* Zoom-Sichtbarkeit einmalig nach dem Load setzen (fitBounds hat Zoom geändert) */
    updateZoomVisibility();
    /* Globale Resize-Funktion: wird vom nativen onLayout-Handler aufgerufen
       damit MapLibre die echte WebView-Grösse kennt. Mehrere Pulse sichern
       ab, dass auch ein später settlender Layout-Pass berücksichtigt wird. */
    window.sttMapResize = function() {
      map.resize();
      updateZoomVisibility();
    };
    /* Initiale Resize-Pulse: 0 / 150 / 500 / 1200 ms nach map-load.
       Der 0-ms-Pulse greift meist nicht (Layout noch nicht settled),
       aber 150 ms + 500 ms fangen alle gängigen WebView-Render-Fälle ab. */
    [0, 150, 500, 1200].forEach(function(ms) {
      setTimeout(function() { map.resize(); updateZoomVisibility(); }, ms);
    });

    /* Route-Layer garantiert ganz oben — nach allen anderen Layern,
       damit Waymarked-Raster-Tiles und Seilbahnen nie darueber liegen. */
    function liftRouteLayers() {
      if (map.getLayer('route-shadow')) map.moveLayer('route-shadow');
      if (map.getLayer('route-line'))   map.moveLayer('route-line');
      if (map.getLayer('altroute-shadow')) map.moveLayer('altroute-shadow');
      if (map.getLayer('altroute-line'))   map.moveLayer('altroute-line');
    }
    liftRouteLayers();
    /* Nochmals nach 1s falls Tiles spaet nachladen und den Canvas neu ordnen */
    setTimeout(liftRouteLayers, 1000);
  });
})();
</script>
</body>
</html>`;
}
