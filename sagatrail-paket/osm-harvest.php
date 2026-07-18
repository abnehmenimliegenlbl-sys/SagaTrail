<?php
/**
 * SagaTrail – OSM Partner-Leads Harvester
 *
 * AUSFÜHRUNG: Als Cron-Job auf dem Server (z.B. Infomaniak Cron)
 *   Alle 5 Minuten: php /pfad/zum/script/osm-harvest.php
 *   Oder via WP-CLI:  wp eval-file osm-harvest.php
 *
 * Das Script verarbeitet pro Aufruf BATCH_SIZE Routen und beendet sich
 * danach sauber. Der Cron-Job startet es immer wieder, bis alle 695
 * Routen abgearbeitet sind. sagatrail_osm_progress trackt den Fortschritt.
 *
 * EINBINDUNG IN WORDPRESS (wenn kein SSH-Zugang):
 *   1. Script in wp-content/uploads/osm-harvest.php hochladen
 *   2. In Infomaniak Hosting-Panel → Cron-Jobs → alle 5 Minuten:
 *      php /home/clients/.../wp-content/uploads/osm-harvest.php
 *
 * HINWEIS: Das Script benötigt WordPress-Umgebung für $wpdb.
 * Wenn du es direkt über WP aufrufen willst, füge oben ein:
 *   define('ABSPATH', '/pfad/zu/wordpress/');
 *   require(ABSPATH . 'wp-load.php');
 */

// ============================================================
// KONFIGURATION
// ============================================================

/** Routen pro Cron-Aufruf (bei 5 Min Intervall = ~1400 Routen/Tag) */
define('BATCH_SIZE', 10);

/** Radius um Route-Mittelpunkt in Metern */
define('RADIUS_M', 2000);

/** Pause zwischen Overpass-Anfragen in Sekunden */
define('PAUSE_SEK', 6);

/** Overpass direkt – PHP läuft bereits auf Infomaniak, kein Proxy nötig */
define('OVERPASS_URL',   'https://overpass-api.de/api/interpreter');
define('OVERPASS_TOKEN', ''); // leer = kein Token-Header

// ============================================================
// WORDPRESS-UMGEBUNG LADEN
// (auskommentieren wenn als WP-Snippet ausgeführt – $wpdb ist
//  dann bereits verfügbar)
// ============================================================
if (!defined('ABSPATH')) {
    // Pfad: wp-content/uploads/sagatrail/ → drei Ebenen hoch = WordPress-Root
    $wp_root = dirname(__FILE__) . '/../../..';
    define('ABSPATH', $wp_root . '/');
    require($wp_root . '/wp-load.php');
}

global $wpdb;

// ============================================================
// FORTSCHRITT PRÜFEN
// ============================================================
$gesamt    = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_routen");
$erledigt  = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_osm_progress");
$noch_offen = $gesamt - $erledigt;

osm_log("=== SagaTrail OSM Harvester | {$erledigt}/{$gesamt} Routen erledigt | {$noch_offen} offen ===");

if ($noch_offen <= 0) {
    osm_log("Alle Routen abgefragt. Fertig!");
    exit(0);
}

// ============================================================
// NÄCHSTE ROUTEN LADEN (noch nicht abgefragt)
// ============================================================
$routen = $wpdb->get_results($wpdb->prepare("
    SELECT r.*
    FROM sagatrail_routen r
    LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
    WHERE p.route_id IS NULL
    ORDER BY r.kanton, r.name
    LIMIT %d
", BATCH_SIZE), ARRAY_A);

osm_log("Verarbeite " . count($routen) . " Routen in diesem Durchlauf …");

foreach ($routen as $route) {
    osm_log("→ {$route['name']} ({$route['kanton']})");

    $pois   = overpass_abfragen((float)$route['lat'], (float)$route['lng']);
    $leads  = [];

    foreach ($pois as $poi) {
        $osm_id = ($poi['type'] ?? 'node') . '-' . $poi['id'];
        if (isset($leads[$osm_id])) continue;
        $name = $poi['tags']['name'] ?? '';
        if (empty($name)) continue;

        $leads[$osm_id] = [
            'route_id'   => $route['id'],
            'route_name' => $route['name'],
            'kanton'     => $route['kanton'],
            'osm_id'     => $osm_id,
            'typ'        => bestimme_typ($poi['tags'] ?? []),
            'name'       => $name,
            'adresse'    => baue_adresse($poi['tags'] ?? []),
            'telefon'    => $poi['tags']['phone']
                         ?? $poi['tags']['contact:phone']
                         ?? null,
            'website'    => $poi['tags']['website']
                         ?? $poi['tags']['contact:website']
                         ?? null,
            'email'      => $poi['tags']['email']
                         ?? $poi['tags']['contact:email']
                         ?? null,
            'lat'        => $poi['lat']             ?? ($poi['center']['lat'] ?? null),
            'lng'        => $poi['lon']             ?? ($poi['center']['lon'] ?? null),
        ];
    }

    $eingefuegt = 0;
    foreach ($leads as $lead) {
        $rows = $wpdb->insert(
            'sagatrail_partner_leads',
            $lead,
            ['%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%f','%f']
        );
        // INSERT IGNORE: bei UNIQUE-Verletzung gibt wpdb->insert false zurück
        // (das ist OK – Duplikat bereits vorhanden)
        if ($rows !== false && $wpdb->rows_affected > 0) $eingefuegt++;
    }

    // Fortschritt markieren
    $wpdb->query($wpdb->prepare(
        "INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
         VALUES (%s, %d)
         ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = %d",
        $route['id'], $eingefuegt, $eingefuegt
    ));

    osm_log("   " . count($leads) . " POIs gefunden, {$eingefuegt} neu eingetragen");

    sleep(PAUSE_SEK);
}

osm_log("=== Durchlauf abgeschlossen ===");


// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function overpass_abfragen(float $lat, float $lng): array {
    $radius = RADIUS_M;
    $query  = <<<OPQ
[out:json][timeout:30];
(
  node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten)$"](around:{$radius},{$lat},{$lng});
  node["tourism"~"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$"](around:{$radius},{$lat},{$lng});
  way["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten)$"](around:{$radius},{$lat},{$lng});
  way["tourism"~"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$"](around:{$radius},{$lat},{$lng});
);
out center tags;
OPQ;

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n"
                       . (OVERPASS_TOKEN ? "X-Proxy-Token: " . OVERPASS_TOKEN . "\r\n" : "")
                       . "User-Agent: SagaTrail/1.0 (sagatrail.ch)\r\n",
            'content' => http_build_query(['data' => $query]),
            'timeout' => 45,
        ],
    ]);

    for ($v = 1; $v <= 3; $v++) {
        $raw = @file_get_contents(OVERPASS_URL, false, $ctx);
        if ($raw !== false) {
            $json = json_decode($raw, true);
            return $json['elements'] ?? [];
        }
        osm_log("   Overpass Versuch {$v} fehlgeschlagen – warte 15s …");
        sleep(15);
    }
    osm_log("   Overpass nicht erreichbar – Route übersprungen");
    return [];
}

function bestimme_typ(array $tags): string {
    $map = [
        'restaurant' => 'Restaurant', 'cafe' => 'Café', 'bar' => 'Bar',
        'pub' => 'Pub', 'fast_food' => 'Schnellimbiss', 'biergarten' => 'Biergarten',
        'hotel' => 'Hotel', 'hostel' => 'Hostel', 'guest_house' => 'Pension',
        'camp_site' => 'Campingplatz', 'alpine_hut' => 'Berghütte',
        'wilderness_hut' => 'Wildnishütte',
    ];
    $a = $tags['amenity'] ?? '';
    $t = $tags['tourism'] ?? '';
    return $map[$a] ?? $map[$t] ?? ucfirst($a ?: $t ?: 'Sonstiges');
}

function baue_adresse(array $tags): ?string {
    $teile = array_filter([
        ($tags['addr:street'] ?? '') . ' ' . ($tags['addr:housenumber'] ?? ''),
        trim(($tags['addr:postcode'] ?? '') . ' ' . ($tags['addr:city'] ?? '')),
    ]);
    $a = trim(implode(', ', $teile));
    return $a ?: null;
}

function osm_log(string $msg): void {
    $ts = date('Y-m-d H:i:s');
    // In WP-Umgebung: ins PHP-Error-Log schreiben
    error_log("[SagaTrail OSM] {$msg}");
    // Für CLI/Cron auch auf stdout:
    if (php_sapi_name() === 'cli') {
        echo "[{$ts}] {$msg}\n";
        flush();
    }
}
