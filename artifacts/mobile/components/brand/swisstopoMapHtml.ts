import { LatLng } from "@/types";

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
  const aerialwaysJson =
    aerialways && aerialways.length > 0 ? JSON.stringify(aerialways) : "null";
  const poisJson = pois && pois.length > 0 ? JSON.stringify(pois) : "null";
  const partnersJson =
    partners && partners.length > 0 ? JSON.stringify(partners) : "null";
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
    rows += legendZeile('<span class="stt-linie-iwn"></span>', legend.wegInternational);
    rows += legendZeile('<span class="stt-linie-nwn"></span>', legend.wegNational);
    rows += legendZeile('<span class="stt-linie-rwn"></span>', legend.wegRegional);
    rows += legendZeile('<span class="stt-linie-lwn"></span>', legend.wegLokal);
    rows += legendZeile('<span class="stt-linie-mehrfach"></span>', legend.wegMehrfach);
    rows += legendZeile('<span class="stt-schild stt-schild-gruen">2</span>', legend.nummerWanderland);
    rows += legendZeile('<span class="stt-schild stt-schild-weiss">HW</span>', legend.nummerLokal);
    rows += legendZeile('<span class="stt-schild stt-schild-weiss"><span class="stt-raute"></span></span>', legend.wegzeichen);
    rows += legendZeile('<span class="stt-wegweiser"></span>', legend.wegweiser);
    if (aerialways && aerialways.length > 0) {
      rows += legendZeile('<span class="stt-linie-seilbahn"></span>', legend.seilbahn);
      rows += legendZeile('<div class="stt-seilbahn-station"></div>', legend.seilbahnStation);
    }
    if (pois && pois.length > 0)
      rows += legendZeile('<div class="stt-poi"></div>', legend.poi);
    if (partners && partners.length > 0)
      rows += legendZeile('<div class="stt-partner-standard" style="display:inline-block;flex-shrink:0"></div>', legend.partner);
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
  /* --- Kartenmarker (unveraendert) --- */
  .stt-start { width: 16px; height: 16px; border-radius: 50%; background: #DA291C; border: 2px solid #F5F3EC; box-shadow: 0 0 0 4px rgba(218,41,28,0.25); }
  .stt-ziel  { width: 16px; height: 16px; border-radius: 50%; background: #F5F3EC; border: 3px solid #DA291C; box-shadow: 0 0 0 4px rgba(218,41,28,0.25); }
  .stt-live  { width: 16px; height: 16px; border-radius: 50%; background: #2F6FED; border: 2px solid #F5F3EC; box-shadow: 0 0 0 6px rgba(47,111,237,0.30); }
  .stt-seilbahn-station { width: 9px; height: 9px; border-radius: 2px; background: #5B6B78; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(91,107,120,0.25); }
  .stt-poi-tipp     { width: 36px; height: 36px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; box-sizing: border-box; cursor: pointer; }
  .stt-poi          { width: 13px; height: 13px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #6B7EA8; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(107,126,168,0.25); }
  .stt-partner-tipp     { width: 40px; height: 40px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; box-sizing: border-box; cursor: pointer; }
  .stt-partner-basic    { width: 11px; height: 11px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #B8832A; box-shadow: 0 0 0 2px rgba(184,131,42,0.30); }
  .stt-partner-standard { width: 14px; height: 14px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #C8932E; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(200,147,46,0.40); }
  .stt-partner-premium  { width: 18px; height: 18px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg,#E8B84B,#C8832A); border: 2.5px solid #DA291C; box-shadow: 0 0 0 3px rgba(218,41,28,0.55), 0 0 0 6px rgba(218,41,28,0.20); }
  .stt-wasser  { width: 10px; height: 10px; border-radius: 50%; background: #38BDF8; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(56,189,248,0.28); }
  .stt-parking { width: 20px; height: 20px; border-radius: 4px; background: #1E6FB5; border: 2px solid #F5F3EC; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #F5F3EC; font-size: 12px; font-family: -apple-system,system-ui,sans-serif; box-shadow: 0 0 0 3px rgba(30,111,181,0.28); cursor: default; }
  .stt-picker  { width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #DA291C; border: 2.5px solid #F5F3EC; box-shadow: 0 2px 10px rgba(0,0,0,0.45); cursor: crosshair; }
  /* --- Legende --- */
  #stt-legende { position: absolute; bottom: env(safe-area-inset-bottom, 0px); left: 8px; z-index: 1000;
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
  #stt-legende .stt-poi, #stt-legende .stt-partner-basic, #stt-legende .stt-partner-standard, #stt-legende .stt-partner-premium { box-shadow: none; cursor: default; }
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
  .maplibregl-ctrl-bottom-left { bottom: env(safe-area-inset-bottom, 0px) !important; }
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

    /* Carto Voyager — 2D und 3D-Basis */
    map.addSource('carto', {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
    });
    map.addLayer({ id: 'base-carto', type: 'raster', source: 'carto' });

    /* swisstopo SWISSIMAGE — Satellit */
    map.addSource('swissimage', {
      type: 'raster',
      tiles: ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.swisstopo.admin.ch">swisstopo</a>',
      minzoom: 2,
      maxzoom: 19
    });
    map.addLayer({ id: 'base-sat', type: 'raster', source: 'swissimage', layout: { visibility: 'none' } });

    /* Waymarked Trails — Wanderweg-Overlay */
    map.addSource('waymarked', {
      type: 'raster',
      tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
    });
    map.addLayer({ id: 'waymarked', type: 'raster', source: 'waymarked', paint: { 'raster-opacity': 0.85 } });

    /* AWS Terrain-DEM (Terrarium-Encoding) fuer 3D/Sat */
    map.addSource('terrain', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 15
    });
    map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'terrain',
      paint: { 'hillshade-intensity': 0.35, 'hillshade-shadow-color': '#10181A', 'hillshade-highlight-color': '#F5F3EC' }
    });

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
      aerialways.forEach(function(a) {
        var g = a.geometry;
        if (!g || g.length < 2) return;
        var stEl = document.createElement('div'); stEl.className = 'stt-seilbahn-station';
        new maplibregl.Marker({ element: stEl }).setLngLat([g[0][1], g[0][0]]).addTo(map);
        var enEl = document.createElement('div'); enEl.className = 'stt-seilbahn-station';
        new maplibregl.Marker({ element: enEl }).setLngLat([g[g.length-1][1], g[g.length-1][0]]).addTo(map);
      });
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

      var startEl = document.createElement('div'); startEl.className = 'stt-start';
      new maplibregl.Marker({ element: startEl })
        .setLngLat([coords[0][0], coords[0][1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(${title}))
        .addTo(map);

      var zielEl = document.createElement('div'); zielEl.className = 'stt-ziel';
      new maplibregl.Marker({ element: zielEl })
        .setLngLat([coords[coords.length-1][0], coords[coords.length-1][1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText('Ziel'))
        .addTo(map);

      var bounds = coords.reduce(function(b,c){ return b.extend(c); }, new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 36, duration: 0 });
    } else {
      var startEl2 = document.createElement('div'); startEl2.className = 'stt-start';
      new maplibregl.Marker({ element: startEl2 })
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

    /* Partner-Marker */
    if (partners) {
      partners.forEach(function(p) {
        var paket = p.paket || 'basic';
        var el = document.createElement('div'); el.className = 'stt-partner-tipp';
        var dot = document.createElement('div'); dot.className = 'stt-partner-' + paket; el.appendChild(dot);
        el.addEventListener('click', function(e) { e.stopPropagation(); post(JSON.stringify({ type: 'stt-partner-press', id: p.id })); });
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
      });
    }

    /* POI-Marker */
    if (pois) {
      pois.forEach(function(p) {
        var el = document.createElement('div'); el.className = 'stt-poi-tipp';
        var dot = document.createElement('div'); dot.className = 'stt-poi'; el.appendChild(dot);
        el.addEventListener('click', function(e) { e.stopPropagation(); post(JSON.stringify({ type: 'stt-poi-press', id: p.id })); });
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
      });
    }

    /* Trinkwasserquellen */
    if (waters) {
      waters.forEach(function(w) {
        var el = document.createElement('div'); el.className = 'stt-wasser';
        new maplibregl.Marker({ element: el }).setLngLat([w.lng, w.lat])
          .setPopup(new maplibregl.Popup({ offset: 8 }).setText(w.name || 'Trinkwasser'))
          .addTo(map);
      });
    }

    /* Parkplaetze */
    if (parking) {
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
      });
    }

    /* Picker-Modus */
    if (picker) {
      map.getCanvas().style.cursor = 'crosshair';
      var pickerMarker = null;
      map.on('click', function(e) {
        var plat = e.lngLat.lat, plng = e.lngLat.lng;
        if (!pickerMarker) {
          var pel = document.createElement('div'); pel.className = 'stt-picker';
          pickerMarker = new maplibregl.Marker({ element: pel, anchor: 'bottom' }).setLngLat([plng, plat]).addTo(map);
        } else {
          pickerMarker.setLngLat([plng, plat]);
        }
        post(JSON.stringify({ type: 'stt-mapclick', lat: plat, lng: plng }));
      });
    }

    /* Live-Positionsmarker */
    var liveEl = document.createElement('div'); liveEl.className = 'stt-live';
    var liveMarker = null;
    window.__sttApply = function(ll) {
      if (!ll) return;
      if (!liveMarker) { liveMarker = new maplibregl.Marker({ element: liveEl }).setLngLat([ll[1], ll[0]]).addTo(map); }
      else { liveMarker.setLngLat([ll[1], ll[0]]); }
      map.panTo([ll[1], ll[0]], { animate: true });
    };
    var early = window.__sttGetPending && window.__sttGetPending();
    if (early) window.__sttApply(early);

    /* Initialen Mode anwenden (nach dem Load) */
    applyMode();
    setTimeout(function() { map.resize(); }, 200);
  });
})();
</script>
</body>
</html>`;
}
