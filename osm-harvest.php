<?php
/**
 * SagaTrail – OSM Partner-Leads Harvester (Web-Version)
 *
 * INSTALLATION:
 *   1. Datei hochladen nach: /sites/sagatrail.ch/osm-harvest.php
 *      (ins WordPress-Wurzelverzeichnis, gleiche Ebene wie wp-config.php)
 *
 * TASK SCHEDULER (Infomaniak):
 *   URL:      https://sagatrail.ch/osm-harvest.php
 *   Password: aktivieren, Passwort = HARVEST_TOKEN unten
 *   Intervall: alle 5–10 Minuten
 *
 * SICHERHEIT: Script prüft den Token, bevor es irgendetwas ausführt.
 */

// ============================================================
// GEHEIMER TOKEN – diesen Wert im Task Scheduler als Passwort eintragen
// ============================================================
define('HARVEST_TOKEN', 'sagatrail_harvest_2026');

// ============================================================
// KONFIGURATION
// ============================================================
define('BATCH_SIZE',   10);    // Routen pro Aufruf
define('RADIUS_M',   2000);    // Suchradius in Metern
define('PAUSE_SEK',     5);    // Pause zwischen Overpass-Anfragen
define('OVERPASS_URL', 'https://overpass-api.de/api/interpreter');

// ============================================================
// SICHERHEITS-CHECK
// ============================================================
// Token kommt entweder als HTTP-Basic-Auth-Passwort (Task Scheduler)
// oder als GET-Parameter ?token=... (manueller Test im Browser)
$incoming = $_SERVER['PHP_AUTH_PW']
    ?? $_SERVER['HTTP_X_TOKEN']
    ?? ($_GET['token'] ?? '');

if ($incoming !== HARVEST_TOKEN) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Forbidden – falscher Token.');
}

// ============================================================
// AUSGABE-EINSTELLUNGEN
// ============================================================
set_time_limit(120); // 2 Minuten – Infomaniak bricht danach ab
header('Content-Type: text/plain; charset=utf-8');
header('X-Accel-Buffering: no'); // Nginx: Zeile für Zeile ausgeben
ob_implicit_flush(true);
ob_end_flush();

// ============================================================
// WORDPRESS LADEN
// (wp-load.php liegt im gleichen Ordner wie dieses Script)
// ============================================================
if (!defined('ABSPATH')) {
    require_once __DIR__ . '/wp-load.php';
}

global $wpdb;

// ============================================================
// FORTSCHRITT
// ============================================================
$gesamt     = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_routen");
$erledigt   = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_osm_progress");
$noch_offen = $gesamt - $erledigt;

osm_log("=== SagaTrail OSM Harvester ===");
osm_log("Fortschritt: {$erledigt}/{$gesamt} Routen erledigt, {$noch_offen} offen");

if ($noch_offen <= 0) {
    osm_log("Alle Routen abgefragt. Fertig!");
    exit;
}

// ============================================================
// NÄCHSTE ROUTEN LADEN
// ============================================================
$routen = $wpdb->get_results($wpdb->prepare("
    SELECT r.*
    FROM sagatrail_routen r
    LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
    WHERE p.route_id IS NULL
    ORDER BY r.kanton, r.name
    LIMIT %d
", BATCH_SIZE), ARRAY_A);

osm_log("Verarbeite " . count($routen) . " Routen …");

foreach ($routen as $route) {
    osm_log("→ {$route['name']} ({$route['kanton']}, lat={$route['lat']}, lng={$route['lng']})");

    $pois      = overpass_abfragen((float)$route['lat'], (float)$route['lng']);
    $leads     = [];

    foreach ($pois as $poi) {
        $osm_id = ($poi['type'] ?? 'node') . '-' . $poi['id'];
        if (isset($leads[$osm_id])) continue;
        $name = trim($poi['tags']['name'] ?? '');
        if ($name === '') continue;

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
        $wpdb->insert('sagatrail_partner_leads', $lead,
            ['%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%f','%f']);
        if ($wpdb->rows_affected > 0) $eingefuegt++;
    }

    $wpdb->query($wpdb->prepare(
        "INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
         VALUES (%s, %d)
         ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = %d",
        $route['id'], $eingefuegt, $eingefuegt
    ));

    osm_log("   " . count($leads) . " POIs, {$eingefuegt} neu");
    sleep(PAUSE_SEK);
}

osm_log("=== Durchlauf fertig ===");


// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function overpass_abfragen(float $lat, float $lng): array {
    $r = RADIUS_M;
    $query = "[out:json][timeout:25];\n(\n"
        . "  node[\"amenity\"~\"^(restaurant|cafe|bar|pub|fast_food|biergarten)$\"](around:{$r},{$lat},{$lng});\n"
        . "  node[\"tourism\"~\"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$\"](around:{$r},{$lat},{$lng});\n"
        . "  way[\"amenity\"~\"^(restaurant|cafe|bar|pub|fast_food|biergarten)$\"](around:{$r},{$lat},{$lng});\n"
        . "  way[\"tourism\"~\"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$\"](around:{$r},{$lat},{$lng});\n"
        . ");\nout center tags;";

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\n"
                   . "User-Agent: SagaTrail/1.0 (sagatrail.ch)\r\n",
        'content' => http_build_query(['data' => $query]),
        'timeout' => 35,
    ]]);

    for ($v = 1; $v <= 3; $v++) {
        $raw = @file_get_contents(OVERPASS_URL, false, $ctx);
        if ($raw !== false) {
            $json = json_decode($raw, true);
            $count = count($json['elements'] ?? []);
            osm_log("   Overpass: {$count} Elemente erhalten");
            return $json['elements'] ?? [];
        }
        osm_log("   Overpass Versuch {$v} fehlgeschlagen – warte 10s");
        sleep(10);
    }
    return [];
}

function bestimme_typ(array $tags): string {
    $map = [
        'restaurant'=>'Restaurant','cafe'=>'Café','bar'=>'Bar',
        'pub'=>'Pub','fast_food'=>'Schnellimbiss','biergarten'=>'Biergarten',
        'hotel'=>'Hotel','hostel'=>'Hostel','guest_house'=>'Pension',
        'camp_site'=>'Campingplatz','alpine_hut'=>'Berghütte',
        'wilderness_hut'=>'Wildnishütte',
    ];
    $a = $tags['amenity'] ?? '';
    $t = $tags['tourism'] ?? '';
    return $map[$a] ?? $map[$t] ?? ucfirst($a ?: $t ?: 'Sonstiges');
}

function baue_adresse(array $tags): ?string {
    $parts = array_filter([
        trim(($tags['addr:street'] ?? '') . ' ' . ($tags['addr:housenumber'] ?? '')),
        trim(($tags['addr:postcode'] ?? '') . ' ' . ($tags['addr:city'] ?? '')),
    ]);
    $a = trim(implode(', ', $parts));
    return $a ?: null;
}

function osm_log(string $msg): void {
    $ts = date('Y-m-d H:i:s');
    echo "[{$ts}] {$msg}\n";
    flush();
    error_log("[SagaTrail OSM] {$msg}");
}
