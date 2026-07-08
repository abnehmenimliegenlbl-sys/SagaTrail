import { LatLng } from "@/types";

/** Minimale Marker-Daten fuer einen Point of Interest auf der Karte. */
export interface MapPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

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
   * Ausgeduennter Wegverlauf als [lat, lng]-Paare. Ist er gesetzt, wird die
   * Route als Linie mit Start- und Ziel-Marker gezeichnet und der Ausschnitt
   * auf den gesamten Weg gezoomt. Fehlt er (kuratierte Seed-Route), zeigt die
   * Karte nur den Ausgangspunkt.
   */
  geometry?: number[][] | null;
  /**
   * Optionale Offline-Kacheln als Data-URIs, Schluessel `z/x/y`. Sind sie
   * gesetzt, werden lokale Kacheln bevorzugt und fehlende online nachgeladen.
   */
  offlineTiles?: Record<string, string> | null;
  /**
   * Seilbahnen/Standseilbahnen im Kartenausschnitt (typische alpine
   * Wander-Verkehrsmittel), je Eintrag ein Wegverlauf als [lat, lng]-Paare.
   */
  aerialways?: { id: string; geometry: number[][] }[] | null;
  /**
   * Points of Interest im Kartenausschnitt. Antippen eines Markers meldet
   * dessen `id` an die Host-App zurueck (WebView-postMessage bzw.
   * window.postMessage im Web), damit dort ein Detailausschnitt (Text +
   * Bild) angezeigt werden kann.
   */
  pois?: MapPoi[] | null;
  /** Wird mit der `id` des angetippten POI-Markers aufgerufen. */
  onPoiPress?: (id: string) => void;
  /**
   * Lokalisierte Beschriftungen der auf-/zuklappbaren Kartenlegende
   * (lib/i18n/screens/map.ts). Fehlen sie, wird keine Legende gezeigt.
   */
  legend?: MapLegendLabels | null;
}

/** Beschriftungen der Kartenlegende (bereits lokalisiert vom Host). */
export interface MapLegendLabels {
  title: string;
  route: string;
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
  seilbahn: string;
  seilbahnStation: string;
  poi: string;
}

/**
 * Baut ein eigenstaendiges Leaflet-Dokument. Basiskarte ist Carto Voyager
 * (helle, reduzierte Strassenkarte ohne Hoehenlinien/Relief), darueber liegt
 * das Waymarked-Trails-Wanderwege-Overlay (offizielle OSM-Wanderrouten farbig
 * hervorgehoben) — zusammen deutlich weniger "ueberladen" als die amtliche
 * swisstopo-Landeskarte, aber mit klar erkennbaren Wegen. Der Wegverlauf der
 * eigenen Route wird zusaetzlich als eigene Linie gezeichnet; die
 * Live-Position wird nachtraeglich ueber das global gesetzte
 * `window.sttSetPosition` aktualisiert, damit keine Kacheln neu geladen
 * werden.
 */
export function buildSwisstopoHtml(
  center: LatLng,
  label: string,
  geometry?: number[][] | null,
  offlineTiles?: Record<string, string> | null,
  aerialways?: { id: string; geometry: number[][] }[] | null,
  pois?: MapPoi[] | null,
  legend?: MapLegendLabels | null
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
  const legendJson = legend ? JSON.stringify(legend) : "null";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<script>
  // Positionsfunktion frueh definieren (vor Leaflet), damit ein per
  // injectJavaScript/contentWindow gesetzter Standort auch dann gepuffert wird,
  // wenn er eintrifft, bevor die Karte fertig aufgebaut ist (iOS-WebView-Race).
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
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #10181A; }
  #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #10181A; }
  .leaflet-container { background: #10181A; font-family: -apple-system, system-ui, sans-serif; }
  .stt-start { width: 16px; height: 16px; border-radius: 50%; background: #B8935A; border: 2px solid #F5F3EC; box-shadow: 0 0 0 4px rgba(184,147,90,0.25); }
  .stt-ziel { width: 16px; height: 16px; border-radius: 50%; background: #F5F3EC; border: 3px solid #B8935A; box-shadow: 0 0 0 4px rgba(184,147,90,0.25); }
  .stt-live { width: 16px; height: 16px; border-radius: 50%; background: #C4462F; border: 2px solid #F5F3EC; box-shadow: 0 0 0 6px rgba(196,70,47,0.30); }
  .stt-seilbahn-station { width: 9px; height: 9px; border-radius: 2px; background: #5B6B78; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(91,107,120,0.25); }
  .stt-poi { width: 13px; height: 13px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #6B7EA8; border: 2px solid #F5F3EC; box-shadow: 0 0 0 3px rgba(107,126,168,0.25); cursor: pointer; }
  /* Unsichtbare, grosszuegige Tipp-Flaeche um den kleinen POI-Punkt — 13 px
     waren am Handy praktisch nicht treffbar. */
  .stt-poi-tipp { width: 36px; height: 36px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; box-sizing: border-box; cursor: pointer; }
  .leaflet-control-attribution { background: rgba(16,24,26,0.7); color: #6B7568; max-width: 55vw; }
  .leaflet-control-attribution a { color: #B8935A; }
  /* Auf-/zuklappbare Legende (unten links). Die Ecke wird ueber die
     Attribution (unten rechts) gehoben und die Legende leicht angehoben,
     damit lange Attributionstexte den Legenden-Kopf nicht ueberdecken
     und er antippbar bleibt. */
  .leaflet-bottom.leaflet-left { z-index: 1001; }
  .stt-legende { margin-bottom: 26px !important; }
  .stt-legende { background: rgba(16,24,26,0.88); color: #F5F3EC; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.35); font-size: 12px; line-height: 1.35; overflow: hidden; }
  .stt-legende-kopf { display: flex; align-items: center; gap: 6px; padding: 7px 10px; cursor: pointer; user-select: none; -webkit-user-select: none; font-weight: 600; color: #B8935A; }
  .stt-legende-pfeil { display: inline-block; transition: transform 0.15s ease; font-size: 10px; color: #F5F3EC; }
  .stt-legende.zu .stt-legende-pfeil { transform: rotate(-90deg); }
  .stt-legende-inhalt { padding: 0 10px 8px 10px; }
  .stt-legende.zu .stt-legende-inhalt { display: none; }
  .stt-legende-zeile { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .stt-legende-symbol { flex: 0 0 18px; display: flex; align-items: center; justify-content: center; }
  .stt-linie-route { width: 18px; height: 4px; border-radius: 2px; background: #B8935A; }
  /* Wanderweg-Farben des Waymarked-Trails-Overlays nach OSM-Netzwerkstufe:
     violett = international, rot = national, blau = regional, gelb = lokal.
     Verlaufen mehrere Routen auf demselben Weg, wechseln sich die Farben
     abschnittsweise ab (gestreifte Linie). */
  .stt-linie-iwn { width: 18px; height: 3px; border-radius: 2px; background: #9C5AC8; }
  .stt-linie-nwn { width: 18px; height: 3px; border-radius: 2px; background: #D9442E; }
  .stt-linie-rwn { width: 18px; height: 3px; border-radius: 2px; background: #4A63D0; }
  .stt-linie-lwn { width: 18px; height: 3px; border-radius: 2px; background: #E0C33B; }
  .stt-linie-mehrfach { width: 18px; height: 3px; border-radius: 2px; background: repeating-linear-gradient(90deg, #D9442E 0 4px, #4A63D0 4px 8px); }
  /* Routennummern-Schilder: gruen = Schweizer Wanderland (national/regional),
     weiss = uebrige/lokale Routen. */
  .stt-schild { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 13px; padding: 0 2px; border-radius: 2px; font-size: 9px; font-weight: 700; box-sizing: border-box; }
  .stt-schild-gruen { background: #3E7D3A; color: #FFFFFF; border: 1px solid #FFFFFF; }
  .stt-schild-weiss { background: #FFFFFF; color: #10181A; border: 1px solid #5B6B78; }
  .stt-linie-seilbahn { width: 18px; height: 0; border-top: 2.5px dashed #5B6B78; }
  .stt-legende .stt-start, .stt-legende .stt-ziel, .stt-legende .stt-live { width: 11px; height: 11px; box-shadow: none; }
  .stt-legende .stt-seilbahn-station { box-shadow: none; }
  .stt-legende .stt-poi { box-shadow: none; cursor: default; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  (function () {
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lng}], 14);
    var offline = ${offlineJson};
    var geometry = ${geometryJson};
    var aerialways = ${aerialwaysJson};
    // Basiskarte: helle, reduzierte Strassenkarte (kein Relief/Hoehenlinien).
    var tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
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
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
    }).addTo(map);

    // Wanderwege-Overlay: offizielle OSM-Wanderrouten farbig hervorgehoben,
    // damit Wege trotz reduzierter Basiskarte klar erkennbar bleiben.
    L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
      maxZoom: 18,
      opacity: 0.85,
      attribution: 'Wanderwege: &copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
    }).addTo(map);

    if (aerialways) {
      // Seilbahnen/Standseilbahnen: gestrichelte Linie plus kleine
      // Stationsmarker an den Enden, farblich klar von der Routen-Linie
      // unterschieden.
      var seilbahnIcon = L.divIcon({ className: '', html: '<div class="stt-seilbahn-station"></div>', iconSize: [9, 9], iconAnchor: [5, 5] });
      aerialways.forEach(function (a) {
        var g = a.geometry;
        if (!g || g.length < 2) return;
        L.polyline(g, { color: '#5B6B78', weight: 2.5, opacity: 0.9, dashArray: '1,7', lineCap: 'round' }).addTo(map);
        L.marker(g[0], { icon: seilbahnIcon }).addTo(map);
        L.marker(g[g.length - 1], { icon: seilbahnIcon }).addTo(map);
      });
    }

    var startIcon = L.divIcon({ className: '', html: '<div class="stt-start"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    var zielIcon = L.divIcon({ className: '', html: '<div class="stt-ziel"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });

    if (geometry && geometry.length > 1) {
      // Wegverlauf mit dunkler Kontur fuer Lesbarkeit auf beliebigen Kacheln.
      L.polyline(geometry, { color: '#10181A', weight: 7, opacity: 0.55, lineJoin: 'round', lineCap: 'round' }).addTo(map);
      var line = L.polyline(geometry, { color: '#B8935A', weight: 4, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map);
      var startPt = geometry[0];
      var endPt = geometry[geometry.length - 1];
      L.marker([startPt[0], startPt[1]], { icon: startIcon }).addTo(map).bindPopup(${title});
      L.marker([endPt[0], endPt[1]], { icon: zielIcon }).addTo(map).bindPopup('Ziel');
      map.fitBounds(line.getBounds(), { padding: [26, 26] });
    } else {
      L.marker([${lat}, ${lng}], { icon: startIcon }).addTo(map).bindPopup(${title});
    }

    var pois = ${poisJson};
    if (pois) {
      // Points of Interest: eigener Marker-Stil, Antippen meldet die POI-ID
      // an die Host-App zurueck (WebView oder Web-iframe), damit dort ein
      // Detailausschnitt (Text + Bild) angezeigt werden kann.
      // Grosse unsichtbare Tipp-Flaeche (36 px) um den kleinen Punkt, der
      // Anker haelt die Spitze des Punkts weiterhin auf der Koordinate.
      var poiIcon = L.divIcon({ className: '', html: '<div class="stt-poi-tipp"><div class="stt-poi"></div></div>', iconSize: [36, 36], iconAnchor: [18, 33] });
      pois.forEach(function (p) {
        var marker = L.marker([p.lat, p.lng], { icon: poiIcon }).addTo(map);
        marker.on('click', function () {
          var payload = JSON.stringify({ type: 'stt-poi-press', id: p.id });
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(payload);
          } else if (window.parent) {
            window.parent.postMessage(payload, '*');
          }
        });
      });
    }

    var legende = ${legendJson};
    if (legende) {
      // Auf-/zuklappbare Legende als eigenes Leaflet-Control unten links.
      // Eintraege fuer Seilbahn und Sehenswuerdigkeiten erscheinen nur, wenn
      // die Karte solche Elemente tatsaechlich zeigt; Start/Ziel/Route nur
      // bei vorhandenem Wegverlauf.
      var LegendeControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
          var box = L.DomUtil.create('div', 'stt-legende zu');
          var zeilen = [];
          function zeile(symbolHtml, text) {
            zeilen.push('<div class="stt-legende-zeile"><span class="stt-legende-symbol">' + symbolHtml + '</span><span>' + text + '</span></div>');
          }
          if (geometry && geometry.length > 1) {
            zeile('<span class="stt-linie-route"></span>', legende.route);
            zeile('<div class="stt-start"></div>', legende.start);
            zeile('<div class="stt-ziel"></div>', legende.ziel);
          } else {
            zeile('<div class="stt-start"></div>', legende.start);
          }
          zeile('<div class="stt-live"></div>', legende.position);
          zeile('<span class="stt-linie-iwn"></span>', legende.wegInternational);
          zeile('<span class="stt-linie-nwn"></span>', legende.wegNational);
          zeile('<span class="stt-linie-rwn"></span>', legende.wegRegional);
          zeile('<span class="stt-linie-lwn"></span>', legende.wegLokal);
          zeile('<span class="stt-linie-mehrfach"></span>', legende.wegMehrfach);
          zeile('<span class="stt-schild stt-schild-gruen">2</span>', legende.nummerWanderland);
          zeile('<span class="stt-schild stt-schild-weiss">7</span>', legende.nummerLokal);
          if (aerialways) {
            zeile('<span class="stt-linie-seilbahn"></span>', legende.seilbahn);
            zeile('<div class="stt-seilbahn-station"></div>', legende.seilbahnStation);
          }
          if (pois) zeile('<div class="stt-poi"></div>', legende.poi);
          box.innerHTML =
            '<div class="stt-legende-kopf"><span class="stt-legende-pfeil">\\u25BE</span>' + legende.title + '</div>' +
            '<div class="stt-legende-inhalt">' + zeilen.join('') + '</div>';
          var kopf = box.querySelector('.stt-legende-kopf');
          L.DomEvent.disableClickPropagation(box);
          L.DomEvent.disableScrollPropagation(box);
          L.DomEvent.on(kopf, 'click', function () {
            box.classList.toggle('zu');
          });
          return box;
        }
      });
      map.addControl(new LegendeControl());
    }

    var liveIcon = L.divIcon({ className: '', html: '<div class="stt-live"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    var liveMarker = null;
    // Wird von der frueh definierten sttSetPosition aufgerufen, sobald die Karte
    // steht; setzt bzw. verschiebt den Positionsmarker.
    window.__sttApply = function (ll) {
      if (!ll) return;
      if (!liveMarker) { liveMarker = L.marker(ll, { icon: liveIcon }).addTo(map); }
      else { liveMarker.setLatLng(ll); }
      map.panTo(ll, { animate: true });
    };
    // Eine bereits vor dem Kartenaufbau gepufferte Position jetzt anwenden.
    var early = window.__sttGetPending && window.__sttGetPending();
    if (early) window.__sttApply(early);
    setTimeout(function () { map.invalidateSize(); }, 200);
  })();
</script>
</body>
</html>`;
}
