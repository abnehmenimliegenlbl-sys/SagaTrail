import type { LatLng } from "@/types";
import type { MapPoi, MapLegendLabels, SwisstopoMapProps } from "./swisstopoMapHtml";

type LeafletMapArgs = Pick<
  SwisstopoMapProps,
  | "center"
  | "label"
  | "geometry"
  | "offlineTiles"
  | "aerialways"
  | "pois"
  | "partners"
  | "pickerMode"
  | "altGeometry"
  | "waterSources"
  | "parkingSpots"
  | "safetyPois"
  | "elevationProfile"
  | "sagaPin"
  | "safeAreaInsetTop"
>;

function json(value: unknown): string {
  // Werte stammen teilweise aus externen OSM-Namen. Ein HTML-String darf
  // niemals durch "</script>" vorzeitig beendet werden.
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function points(geometry?: number[][] | null): string {
  return json(
    geometry && geometry.length > 1
      ? geometry.filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1]),
        )
      : null,
  );
}

function markerData(items?: MapPoi[] | null): string {
  return json(
    items?.filter(
      (item) =>
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        typeof item.name === "string",
    ) ?? null,
  );
}

export function buildLeafletMapHtml(
  {
    center,
    label = "Start",
    geometry,
    offlineTiles,
    aerialways,
    pois,
    partners,
    pickerMode,
    altGeometry,
    waterSources,
    parkingSpots,
    safetyPois,
    elevationProfile: _elevationProfile,
    sagaPin,
    safeAreaInsetTop = 0,
  }: LeafletMapArgs,
  legend?: MapLegendLabels | null,
): string {
  const safeCenter: LatLng = {
    lat: Number.isFinite(center.lat) ? center.lat : 46.8,
    lng: Number.isFinite(center.lng) ? center.lng : 8.2,
  };
  const route = points(geometry);
  const alternateRoute = points(altGeometry);
  const offline = json(offlineTiles);
  const aerialwayData = json(
    aerialways?.filter((a) => Array.isArray(a.geometry) && a.geometry.length > 1) ?? null,
  );
  const poiData = markerData(pois);
  const partnerData = markerData(partners);
  const waterData = markerData(waterSources);
  const parkingData = markerData(parkingSpots);
  const safetyData = markerData(safetyPois);
  const sagaData = sagaPin ? json(sagaPin) : "null";
  const legendData = json(legend);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { margin: 0; width: 100%; height: 100%; overflow: hidden; }
    body { background: #10181A; font-family: -apple-system, system-ui, sans-serif; }
    #map { position: absolute; inset: 0; background: #10181A; }
    .leaflet-container { background: #10181A; font-family: -apple-system, system-ui, sans-serif; }
    .leaflet-control-zoom { display: none; }
    .leaflet-control-attribution { background: rgba(16,24,26,.78); color: #c7d0ca; font-size: 9px; }
    .leaflet-control-attribution a { color: #e6a75c; }
    #controls { position: absolute; top: ${Math.max(8, safeAreaInsetTop) + 8}px; left: 10px; z-index: 1000; display: flex; gap: 5px; }
    button { border: 0; padding: 7px 10px; border-radius: 8px; background: rgba(16,24,26,.9); color: #b5c0bb; font: 600 12px -apple-system,system-ui,sans-serif; }
    button.active { background: #DA291C; color: #fffaf0; }
    .pin { width: 15px; height: 15px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fffaf0; box-sizing: border-box; box-shadow: 0 0 0 3px rgba(0,0,0,.18); }
    .pin > span { display: block; transform: rotate(45deg); color: #fff; font: 800 9px -apple-system,system-ui,sans-serif; text-align: center; line-height: 11px; }
    .start { background: #DA291C; }
    .finish { background: #fffaf0; border-color: #DA291C; }
    .live { width: 16px; height: 16px; border-radius: 50%; background: #2F6FED; border: 2px solid #fffaf0; box-shadow: 0 0 0 6px rgba(47,111,237,.28); box-sizing: border-box; }
    .poi { background: #c4462f; }
    .partner { width: 24px; height: 24px; border-radius: 7px; background: #fff; border: 2px solid #cc0000; box-sizing: border-box; color: #cc0000; font: 800 12px -apple-system,system-ui,sans-serif; text-align: center; line-height: 20px; }
    .water { width: 10px; height: 10px; border-radius: 50%; background: #38BDF8; border: 2px solid #fffaf0; box-sizing: border-box; }
    .parking, .safety { min-width: 20px; height: 20px; padding: 0 3px; border-radius: 5px; background: #2563A8; border: 2px solid #fffaf0; box-sizing: border-box; color: #fff; font: 800 10px -apple-system,system-ui,sans-serif; text-align: center; line-height: 16px; }
    .safety { background: #B21F2D; }
    .saga { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,.9); border: 2px solid #DA291C; box-sizing: border-box; color: #DA291C; font-size: 18px; text-align: center; line-height: 24px; }
    #legend { position: absolute; bottom: 8px; left: 8px; z-index: 1000; max-width: 78%; padding: 7px 9px; border-radius: 9px; background: rgba(16,24,26,.88); color: #f5f3ec; font-size: 11px; line-height: 1.35; }
    #legend strong { color: #e6a75c; }
    #legend.hidden { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="controls">
    <button id="mapButton" class="active">Karte</button>
    <button id="satButton">Sat</button>
  </div>
  ${legend ? `<div id="legend"><strong>${json(legend.title).slice(1, -1)}</strong><br>${geometry && geometry.length > 1 ? "● Route · " : ""}● Standort</div>` : ""}
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
  (function () {
    var center = [${safeCenter.lat}, ${safeCenter.lng}];
    var route = ${route};
    var alternateRoute = ${alternateRoute};
    var offline = ${offline};
    var aerialways = ${aerialwayData};
    var pois = ${poiData};
    var partners = ${partnerData};
    var waters = ${waterData};
    var parking = ${parkingData};
    var safety = ${safetyData};
    var sagaPin = ${sagaData};
    var picker = ${pickerMode ? "true" : "false"};
    var map = L.map("map", { zoomControl: false, attributionControl: true, tap: false }).setView(center, 14);

    function post(value) {
      var payload = JSON.stringify(value);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(payload);
      else if (window.parent) window.parent.postMessage(payload, "*");
    }
    function icon(className, text, size) {
      return L.divIcon({ className: "", html: '<div class="' + className + '">' + (text || "") + '</div>', iconSize: size || [20, 20], iconAnchor: [(size || [20,20])[0] / 2, (size || [20,20])[1] / 2] });
    }
    function popupText(item) {
      var text = item.name || "";
      if (item.description) text += "\\n" + item.description;
      if (item.phone) text += "\\nTel. " + item.phone;
      return text;
    }
    var carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19, tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
    });
    var satellite = L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg", {
      maxZoom: 19, tileSize: 256, attribution: '&copy; swisstopo'
    });
    var active = carto.addTo(map);
    if (offline && Object.keys(offline).length) {
      var offlineLayer = L.TileLayer.extend({
        getTileUrl: function (coords) {
          var key = coords.z + "/" + coords.x + "/" + coords.y;
          return offline[key] || L.TileLayer.prototype.getTileUrl.call(this, coords);
        }
      });
      active.remove();
      active = new offlineLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19, attribution: "Offline + CARTO/OpenStreetMap" }).addTo(map);
    }
    document.getElementById("mapButton").onclick = function () {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(active)) active.addTo(map);
      this.classList.add("active"); document.getElementById("satButton").classList.remove("active");
    };
    document.getElementById("satButton").onclick = function () {
      if (map.hasLayer(active)) map.removeLayer(active);
      satellite.addTo(map);
      this.classList.add("active"); document.getElementById("mapButton").classList.remove("active");
    };

    var allLayers = [];
    function addMarker(item, markerIcon, clickable) {
      if (!item || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      var marker = L.marker([item.lat, item.lng], { icon: markerIcon }).addTo(map);
      if (item.name || item.description) marker.bindPopup(popupText(item));
      if (clickable) marker.on("click", function () { post({ type: clickable, id: item.id }); });
      allLayers.push(marker);
    }
    if (route && route.length > 1) {
      var latLngRoute = route.map(function (p) { return [p[0], p[1]]; });
      L.polyline(latLngRoute, { color: "#10181A", weight: 8, opacity: .7 }).addTo(map);
      L.polyline(latLngRoute, { color: "#DA291C", weight: 4, opacity: .95 }).addTo(map);
      if (alternateRoute && alternateRoute.length > 1) L.polyline(alternateRoute, { color: "#2EC4B6", weight: 3, dashArray: "7 6", opacity: .9 }).addTo(map);
      var bounds = L.latLngBounds(latLngRoute);
      map.fitBounds(bounds, { padding: [25, 25], maxZoom: 15 });
      addMarker({ lat: route[0][0], lng: route[0][1], name: ${json(label)} }, icon("pin start", "", [20,20]), null);
      addMarker({ lat: route[route.length - 1][0], lng: route[route.length - 1][1], name: "Ziel" }, icon("pin finish", "", [20,20]), null);
    } else {
      addMarker({ lat: center[0], lng: center[1], name: ${json(label)} }, icon("pin start", "", [20,20]), null);
    }
    (aerialways || []).forEach(function (a) {
      if (!a.geometry || a.geometry.length < 2) return;
      L.polyline(a.geometry.map(function (p) { return [p[0], p[1]]; }), { color: "#5B6B78", weight: 2, dashArray: "4 5" }).addTo(map);
    });
    (pois || []).forEach(function (p) { addMarker(p, icon("pin poi", "", [20,20]), "stt-poi-press"); });
    (partners || []).forEach(function (p) { addMarker(p, icon("partner", "★", [28,28]), "stt-partner-press"); });
    (waters || []).forEach(function (p) { addMarker(p, icon("water", "", [12,12]), null); });
    (parking || []).forEach(function (p) { addMarker(p, icon("parking", "P", [24,24]), null); });
    (safety || []).forEach(function (p) { addMarker(p, icon("safety", (p.category || "!").slice(0, 2).toUpperCase(), [28,24]), null); });
    if (sagaPin && Number.isFinite(sagaPin.lat) && Number.isFinite(sagaPin.lng)) addMarker(sagaPin, icon("saga", "✦", [32,32]), null);

    var pending = null, liveMarker = null;
    var liveIcon = icon("live", "", [20,20]);
    window.sttSetPosition = function (lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      pending = [lat, lng];
      if (window.__sttApply) window.__sttApply(pending);
    };
    window.__sttApply = function (position) {
      if (!position) return;
      if (!liveMarker) liveMarker = L.marker(position, { icon: liveIcon, zIndexOffset: 1000 }).addTo(map);
      else liveMarker.setLatLng(position);
      map.panTo(position, { animate: false });
    };
    window.sttSetPois = window.sttSetPartners = window.sttSetAerialways = window.sttSetSafetyPois = function () {};
    if (pending) window.__sttApply(pending);
    if (picker) {
      map.getContainer().style.cursor = "crosshair";
      map.on("click", function (event) { post({ type: "stt-mapclick", lat: event.latlng.lat, lng: event.latlng.lng }); });
    }
    setTimeout(function () { map.invalidateSize(false); }, 100);
    setTimeout(function () { map.invalidateSize(false); }, 500);
    post({ type: "stt-html-ready" });
  })();
  </script>
</body>
</html>`;
}