import type { LatLng } from "@/types";
import { buildRouteGradeSegments } from "@/lib/terrainCues";
import type { MapPoi, MapLegendLabels, SwisstopoMapProps } from "./swisstopoMapHtml";
import { SAGA_PIN_B64 } from "./swisstopoMapHtml";

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
  const routeGrades = json(buildRouteGradeSegments(geometry, _elevationProfile));
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
    .leaflet-control-attribution { background: rgba(16,24,26,.7); color: #6B7568; max-width: 55vw; font-size: 9px; }
    .leaflet-control-attribution a { color: #DA291C; }
    #controls { position: absolute; top: ${Math.max(8, safeAreaInsetTop) + 8}px; left: 10px; z-index: 1000; display: flex; gap: 6px; }
    .control-group { display: flex; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
    button { border: 0; border-right: 1px solid rgba(255,255,255,.08); padding: 6px 11px; background: rgba(16,24,26,.9); color: #8A9BA8; font: 600 12px -apple-system,system-ui,sans-serif; }
    button:last-child { border-right: 0; }
    button.active { background: #DA291C; color: #fffaf0; }
    #map.view-3d .leaflet-tile-pane,
    #map.view-3d .leaflet-overlay-pane,
    #map.view-3d .leaflet-shadow-pane,
    #map.view-3d .leaflet-marker-pane {
      transform: perspective(950px) rotateX(36deg) scale(1.12);
      transform-origin: 50% 72%;
      transition: transform .45s ease;
    }
    #map:not(.view-3d) .leaflet-tile-pane,
    #map:not(.view-3d) .leaflet-overlay-pane,
    #map:not(.view-3d) .leaflet-shadow-pane,
    #map:not(.view-3d) .leaflet-marker-pane { transition: transform .45s ease; }
    .flag { width: 30px; height: 38px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
    .poi { width: 13px; height: 13px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #6B7EA8; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(107,126,168,.25); }
    .poi-tipp { width: 36px; height: 36px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; box-sizing: border-box; cursor: pointer; }
    .poi-cluster { width: 32px; height: 32px; border-radius: 50%; background: #cc0000; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(204,0,0,.25), 0 2px 7px rgba(0,0,0,.35); color: #F5F3EC; font: 700 11px -apple-system,system-ui,sans-serif; display: flex; align-items: center; justify-content: center; }
    .live { width: 16px; height: 16px; border-radius: 50%; background: #2F6FED; border: 2px solid #fffaf0; box-shadow: 0 0 0 6px rgba(47,111,237,.28); box-sizing: border-box; }
    .partner-tipp { width: 44px; height: 44px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; cursor: pointer; }
    .partner-pin { display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 8px; position: relative; }
    .partner-pin::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #fff; }
    .partner-pin--basic { width: 24px; height: 24px; opacity: .72; }
    .partner-pin--standard { width: 30px; height: 30px; }
    .partner-pin--premium { width: 36px; height: 36px; }
    .partner-pin--open { box-shadow: 0 0 0 2px #22c55e; }
    .partner-pin--closed { box-shadow: 0 0 0 2px #cc0000; }
    .water { width: 10px; height: 10px; border-radius: 50%; background: #38BDF8; border: 2px solid #fffaf0; box-sizing: border-box; }
    .parking, .safety { min-width: 20px; height: 20px; padding: 0 3px; border-radius: 5px; background: #2563A8; border: 2px solid #fffaf0; box-sizing: border-box; color: #fff; font: 800 10px -apple-system,system-ui,sans-serif; text-align: center; line-height: 16px; }
    .safety { background: #B21F2D; }
    .saga-tipp { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; background: rgba(255,255,255,.6); border-radius: 20px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
    .saga-tipp img { width: 28px; height: 28px; object-fit: contain; display: block; }
    #legend { position: absolute; bottom: 8px; left: 8px; z-index: 1000; max-width: 78%; padding: 7px 9px; border-radius: 9px; background: rgba(16,24,26,.88); color: #f5f3ec; font-size: 11px; line-height: 1.35; }
    #legend strong { color: #DA291C; }
    #legend.hidden { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="controls">
    <div class="control-group">
      <button id="btn-2d" class="active">2D</button>
      <button id="btn-3d">3D</button>
    </div>
    <div class="control-group">
      <button id="btn-topo" class="active">Topo</button>
      <button id="btn-sat">Sat</button>
    </div>
  </div>
  ${legend ? `<div id="legend"><strong>${json(legend.title).slice(1, -1)}</strong>${geometry && geometry.length > 1 ? `<br><span style="color:#20D466">━</span> ${json(legend.routeFlat).slice(1, -1)} · <span style="color:#FFD000">━</span> ${json(legend.routeGrade10to20).slice(1, -1)} · <span style="color:#FF8500">━</span> ${json(legend.routeGrade20to30).slice(1, -1)} · <span style="color:#FF3030">━</span> ${json(legend.routeGrade30plus).slice(1, -1)}` : ""}<br>● ${json(legend.position).slice(1, -1)}</div>` : ""}
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
  (function () {
    var center = [${safeCenter.lat}, ${safeCenter.lng}];
    var route = ${route};
    var routeGrades = ${routeGrades};
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
    var topoUrl = "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg";
    var carto = L.tileLayer(topoUrl, {
      maxZoom: 19, tileSize: 256,
      attribution: '&copy; <a href="https://www.swisstopo.admin.ch">swisstopo</a>'
    });
    var satellite = L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg", {
      maxZoom: 19, tileSize: 256, attribution: '&copy; swisstopo'
    });
    var active = carto.addTo(map);
    var trails = L.tileLayer("https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png", {
      maxZoom: 18, opacity: .85,
      attribution: 'Wanderwege: &copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
    }).addTo(map);
    if (offline && Object.keys(offline).length) {
      var offlineLayer = L.TileLayer.extend({
        getTileUrl: function (coords) {
          var key = coords.z + "/" + coords.x + "/" + coords.y;
          return offline[key] || L.TileLayer.prototype.getTileUrl.call(this, coords);
        }
      });
      active.remove();
      active = new offlineLayer(topoUrl, { maxZoom: 19, attribution: "Offline + swisstopo" }).addTo(map);
    }
    var is3d = false;
    var isSat = false;
    function updateModeButtons() {
      document.getElementById("btn-2d").classList.toggle("active", !is3d);
      document.getElementById("btn-3d").classList.toggle("active", is3d);
      document.getElementById("btn-topo").classList.toggle("active", !isSat);
      document.getElementById("btn-sat").classList.toggle("active", isSat);
    }
    document.getElementById("btn-2d").onclick = function () {
      is3d = false;
      map.getContainer().classList.remove("view-3d");
      updateModeButtons();
      setTimeout(function () { map.invalidateSize(false); }, 460);
    };
    document.getElementById("btn-3d").onclick = function () {
      is3d = true;
      map.getContainer().classList.add("view-3d");
      updateModeButtons();
      setTimeout(function () { map.invalidateSize(false); }, 460);
    };
    document.getElementById("btn-topo").onclick = function () {
      isSat = false;
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(active)) active.addTo(map);
      if (!map.hasLayer(trails)) trails.addTo(map);
      updateModeButtons();
    };
    document.getElementById("btn-sat").onclick = function () {
      isSat = true;
      if (map.hasLayer(active)) map.removeLayer(active);
      satellite.addTo(map);
      if (map.hasLayer(trails)) map.removeLayer(trails);
      updateModeButtons();
    };

    var allLayers = [];
    function addMarker(item, markerIcon, clickable) {
      if (!item || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      var marker = L.marker([item.lat, item.lng], { icon: markerIcon }).addTo(map);
      if (item.name || item.description) marker.bindPopup(popupText(item));
      if (clickable) marker.on("click", function () { post({ type: clickable, id: item.id }); });
      allLayers.push(marker);
    }
    function flagIcon(type) {
      var svg = type === "finish"
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><line x1="4" y1="1" x2="4" y2="38" stroke="#ccc" stroke-width="2.5" stroke-linecap="round"/><rect x="4" y="1" width="24" height="16" fill="#fff" stroke="#777" stroke-width=".5"/><rect x="4" y="1" width="8" height="5.3" fill="#111"/><rect x="20" y="1" width="8" height="5.3" fill="#111"/><rect x="12" y="6.3" width="8" height="5.4" fill="#111"/><rect x="4" y="11.7" width="8" height="5.3" fill="#111"/><rect x="20" y="11.7" width="8" height="5.3" fill="#111"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><line x1="4" y1="1" x2="4" y2="38" stroke="#ccc" stroke-width="2.5" stroke-linecap="round"/><polygon points="4,1 29,9 4,17" fill="#DA291C"/></svg>';
      return L.divIcon({ className: "", html: '<div class="flag">' + svg + '</div>', iconSize: [30, 38], iconAnchor: [4, 38] });
    }
    function gradeColor(band) {
      if (band === "yellow") return "#FFD000";
      if (band === "orange") return "#FF8500";
      if (band === "red") return "#FF3030";
      return "#20D466";
    }
    if (route && route.length > 1) {
      var latLngRoute = route.map(function (p) { return [p[0], p[1]]; });
      L.polyline(latLngRoute, { color: "#10181A", weight: 8, opacity: .55 }).addTo(map);
      if (routeGrades && routeGrades.length) {
        routeGrades.forEach(function (segment) {
          if (!segment.coordinates || segment.coordinates.length < 2) return;
          var segmentLine = segment.coordinates.map(function (p) { return [p[0], p[1]]; });
          L.polyline(segmentLine, { color: gradeColor(segment.band), weight: 4, opacity: .95, lineJoin: "round", lineCap: "round" }).addTo(map);
        });
      } else {
        L.polyline(latLngRoute, { color: "#20D466", weight: 4, opacity: .95 }).addTo(map);
      }
      if (alternateRoute && alternateRoute.length > 1) L.polyline(alternateRoute, { color: "#2EC4B6", weight: 3, dashArray: "7 6", opacity: .9 }).addTo(map);
      var bounds = L.latLngBounds(latLngRoute);
      map.fitBounds(bounds, { padding: [25, 25], maxZoom: 15 });
      addMarker({ lat: route[0][0], lng: route[0][1], name: ${json(label)} }, flagIcon("start"), null);
      addMarker({ lat: route[route.length - 1][0], lng: route[route.length - 1][1], name: "Ziel" }, flagIcon("finish"), null);
    } else {
      addMarker({ lat: center[0], lng: center[1], name: ${json(label)} }, flagIcon("start"), null);
    }
    (aerialways || []).forEach(function (a) {
      if (!a.geometry || a.geometry.length < 2) return;
      L.polyline(a.geometry.map(function (p) { return [p[0], p[1]]; }), { color: "#5B6B78", weight: 2, dashArray: "4 5" }).addTo(map);
    });
    var poiDisplayMarkers = [];
    var poiClusterMarkers = [];
    var poiIcon = L.divIcon({ className: "", html: '<div class="poi-tipp"><div class="poi"></div></div>', iconSize: [36,36], iconAnchor: [18,33] });
    var poiClusterZoom = 13;
    function clearPoiDisplay() {
      poiDisplayMarkers.forEach(function (marker) { marker.remove(); });
      poiClusterMarkers.forEach(function (marker) { marker.remove(); });
      poiDisplayMarkers = [];
      poiClusterMarkers = [];
    }
    function addPoiMarker(p) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
      var marker = L.marker([p.lat, p.lng], { icon: poiIcon }).addTo(map);
      if (p.name || p.description) marker.bindPopup(popupText(p));
      marker.on("click", function () { post({ type: "stt-poi-press", id: p.id }); });
      poiDisplayMarkers.push(marker);
    }
    function renderPoiClusters() {
      clearPoiDisplay();
      if (!pois || !pois.length) return;
      if (map.getZoom() > poiClusterZoom) {
        pois.forEach(addPoiMarker);
        return;
      }
      var buckets = {};
      pois.forEach(function (p) {
        if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
        var pixel = map.latLngToLayerPoint([p.lat, p.lng]);
        var key = Math.floor(pixel.x / 64) + ":" + Math.floor(pixel.y / 64);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(p);
      });
      Object.keys(buckets).forEach(function (key) {
        var group = buckets[key];
        if (group.length === 1) {
          addPoiMarker(group[0]);
          return;
        }
        var lat = group.reduce(function (sum, p) { return sum + p.lat; }, 0) / group.length;
        var lng = group.reduce(function (sum, p) { return sum + p.lng; }, 0) / group.length;
        var cluster = L.marker([lat, lng], {
          icon: icon("poi-cluster", String(group.length), [36,36]),
          zIndexOffset: 500
        }).addTo(map);
        cluster.on("click", function () {
          var bounds = L.latLngBounds(group.map(function (p) { return [p.lat, p.lng]; }));
          if (bounds.isValid() && map.getZoom() < 18) map.fitBounds(bounds, { padding: [40,40], maxZoom: 16 });
          else map.setZoom(Math.min(18, map.getZoom() + 1));
        });
        poiClusterMarkers.push(cluster);
      });
    }
    map.on("zoomend moveend", renderPoiClusters);
    renderPoiClusters();
    var partnerIcons = {
      restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
      cafe: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
      bar: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      hotel: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      uebernachtung: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      sac_huette: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      souvenir: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'
    };
    (partners || []).forEach(function (p) {
      var tier = p.paket || "basic";
      var size = tier === "premium" ? 18 : tier === "standard" ? 15 : 12;
      var paths = partnerIcons[(p.kategorie || "").toLowerCase()] || partnerIcons.restaurant;
      var html = '<div class="partner-tipp"><div class="partner-pin partner-pin--' + tier + (p.istOffen === true ? ' partner-pin--open' : ' partner-pin--closed') + '"><svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="#cc0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg></div></div>';
      addMarker(p, L.divIcon({ className: "", html: html, iconSize: [44,44], iconAnchor: [22,39] }), "stt-partner-press");
    });
    (waters || []).forEach(function (p) { addMarker(p, icon("water", "", [12,12]), null); });
    (parking || []).forEach(function (p) { addMarker(p, icon("parking", "P", [24,24]), null); });
    (safety || []).forEach(function (p) { addMarker(p, icon("safety", (p.category || "!").slice(0, 2).toUpperCase(), [28,24]), null); });
    if (sagaPin && Number.isFinite(sagaPin.lat) && Number.isFinite(sagaPin.lng)) {
      var sagaHtml = '<div class="saga-tipp"><img src="data:image/png;base64,${SAGA_PIN_B64}" alt="Sage"></div>';
      addMarker(sagaPin, L.divIcon({ className: "", html: sagaHtml, iconSize: [38,38], iconAnchor: [19,35] }), null);
    }

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