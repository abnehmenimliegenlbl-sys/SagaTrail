import { LatLng } from "@/types";

/**
 * Gemeinsame Props der plattformspezifischen SwisstopoMap-Varianten
 * (SwisstopoMap.tsx nutzt eine WebView, SwisstopoMap.web.tsx ein iframe).
 */
export interface SwisstopoMapProps {
  /** Kartenmittelpunkt — der Ausgangspunkt der Wanderung */
  center: LatLng;
  /** Aktuelle GPS-Position, sofern erlaubt und verfuegbar */
  position?: LatLng | null;
  /** Beschriftung des Startpunkt-Markers */
  label?: string;
  height?: number;
  /**
   * Optionale Offline-Kacheln als Data-URIs, Schluessel `z/x/y`. Sind sie
   * gesetzt, werden lokale Kacheln bevorzugt und fehlende online nachgeladen.
   */
  offlineTiles?: Record<string, string> | null;
}

/**
 * Baut ein eigenstaendiges Leaflet-Dokument mit amtlichen swisstopo-Kacheln
 * (Landeskarte, WMTS, kein API-Schluessel noetig). Die Live-Position wird
 * nachtraeglich ueber das global gesetzte `window.sttSetPosition` aktualisiert,
 * damit keine Kacheln neu geladen werden.
 */
export function buildSwisstopoHtml(
  center: LatLng,
  label: string,
  offlineTiles?: Record<string, string> | null
): string {
  const lat = center.lat;
  const lng = center.lng;
  const title = JSON.stringify(label ?? "Start");
  const offlineJson =
    offlineTiles && Object.keys(offlineTiles).length > 0
      ? JSON.stringify(offlineTiles)
      : "null";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #10181A; }
  #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #10181A; }
  .leaflet-container { background: #10181A; font-family: -apple-system, system-ui, sans-serif; }
  .stt-start { width: 16px; height: 16px; border-radius: 50%; background: #B8935A; border: 2px solid #F5F3EC; box-shadow: 0 0 0 4px rgba(184,147,90,0.25); }
  .stt-live { width: 16px; height: 16px; border-radius: 50%; background: #C4462F; border: 2px solid #F5F3EC; box-shadow: 0 0 0 6px rgba(196,70,47,0.30); }
  .leaflet-control-attribution { background: rgba(16,24,26,0.7); color: #6B7568; }
  .leaflet-control-attribution a { color: #B8935A; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  (function () {
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lng}], 14);
    var offline = ${offlineJson};
    var tileUrl = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
    // Kachel-Layer, der lokale Offline-Kacheln bevorzugt und fehlende online nachlaedt.
    var OfflineLayer = L.TileLayer.extend({
      getTileUrl: function (coords) {
        if (offline) {
          var key = coords.z + '/' + coords.x + '/' + coords.y;
          if (offline[key]) return offline[key];
        }
        return L.TileLayer.prototype.getTileUrl.call(this, coords);
      }
    });
    new OfflineLayer(tileUrl, {
      maxZoom: 18,
      attribution: '&copy; swisstopo'
    }).addTo(map);
    var startIcon = L.divIcon({ className: '', html: '<div class="stt-start"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([${lat}, ${lng}], { icon: startIcon }).addTo(map).bindPopup(${title});
    var liveIcon = L.divIcon({ className: '', html: '<div class="stt-live"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    var liveMarker = null;
    window.sttSetPosition = function (plat, plng) {
      if (plat == null || plng == null) return;
      var ll = [plat, plng];
      if (!liveMarker) { liveMarker = L.marker(ll, { icon: liveIcon }).addTo(map); }
      else { liveMarker.setLatLng(ll); }
      map.panTo(ll, { animate: true });
    };
    setTimeout(function () { map.invalidateSize(); }, 200);
  })();
</script>
</body>
</html>`;
}
