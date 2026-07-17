<?php
/**
 * SagaTrail – OSM Partner-Leads Harvester via WP Cron
 *
 * INSTALLATION (eine von zwei Optionen):
 *
 * Option A – In functions.php einfügen:
 *   Den gesamten Code unten ans Ende von
 *   wp-content/themes/DEIN-THEME/functions.php kopieren.
 *
 * Option B – Als Mini-Plugin (empfohlen, unabhängig vom Theme):
 *   Diese Datei hochladen nach:
 *   wp-content/plugins/sagatrail-osm-cron/sagatrail-osm-cron.php
 *   Dann im WP-Admin unter Plugins aktivieren.
 *
 * TASK SCHEDULER (Infomaniak):
 *   URL:      https://sagatrail.ch/wp-cron.php?doing_wp_cron
 *   Kein Passwort nötig
 *   Intervall: alle 5 Minuten
 *
 * Das wars. WP Cron erledigt den Rest automatisch.
 */

// Plugin-Header (nur nötig wenn als Plugin verwendet):
// Plugin Name: SagaTrail OSM Harvester
// Description: Fragt Overpass nach Restaurants/Lodges entlang der SagaTrail-Routen ab.
// Version: 1.0

if (!defined('ABSPATH')) exit;

// ============================================================
// KONFIGURATION
// ============================================================
define('ST_BATCH_SIZE',  10);    // Routen pro Cron-Aufruf
define('ST_RADIUS_M',  2000);    // Suchradius in Metern
define('ST_PAUSE_SEK',    4);    // Pause zwischen Overpass-Anfragen (Sekunden)
define('ST_OVERPASS_URL', 'https://overpass-api.de/api/interpreter');

// ============================================================
// CRON-SCHEDULE: alle 5 Minuten registrieren
// ============================================================
add_filter('cron_schedules', function ($schedules) {
    if (!isset($schedules['alle_5_minuten'])) {
        $schedules['alle_5_minuten'] = [
            'interval' => 300,
            'display'  => 'Alle 5 Minuten',
        ];
    }
    return $schedules;
});

// ============================================================
// JOB REGISTRIEREN (beim Plugin-Aktivieren / ersten Laden)
// ============================================================
add_action('init', function () {
    if (!wp_next_scheduled('sagatrail_osm_harvest')) {
        wp_schedule_event(time(), 'alle_5_minuten', 'sagatrail_osm_harvest');
    }
});

// Job beim Deaktivieren des Plugins entfernen:
register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('sagatrail_osm_harvest');
});

// ============================================================
// DER EIGENTLICHE JOB
// ============================================================
add_action('sagatrail_osm_harvest', 'st_osm_harvest_batch');

function st_osm_harvest_batch(): void {
    global $wpdb;

    $gesamt     = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_routen");
    $erledigt   = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_osm_progress");
    $noch_offen = $gesamt - $erledigt;

    if ($noch_offen <= 0) {
        // Alle Routen fertig – Job abmelden
        wp_clear_scheduled_hook('sagatrail_osm_harvest');
        error_log("[SagaTrail OSM] Alle {$gesamt} Routen abgefragt. Cron-Job deaktiviert.");
        return;
    }

    error_log("[SagaTrail OSM] Start Batch | {$erledigt}/{$gesamt} erledigt");

    $routen = $wpdb->get_results($wpdb->prepare("
        SELECT r.*
        FROM sagatrail_routen r
        LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
        WHERE p.route_id IS NULL
        ORDER BY r.kanton, r.name
        LIMIT %d
    ", ST_BATCH_SIZE), ARRAY_A);

    foreach ($routen as $route) {
        $pois  = st_overpass_abfragen((float)$route['lat'], (float)$route['lng']);
        $leads = [];

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
                'typ'        => st_typ($poi['tags'] ?? []),
                'name'       => $name,
                'adresse'    => st_adresse($poi['tags'] ?? []),
                'telefon'    => $poi['tags']['phone'] ?? $poi['tags']['contact:phone'] ?? null,
                'website'    => $poi['tags']['website'] ?? $poi['tags']['contact:website'] ?? null,
                'lat'        => $poi['lat'] ?? ($poi['center']['lat'] ?? null),
                'lng'        => $poi['lon'] ?? ($poi['center']['lon'] ?? null),
            ];
        }

        $eingefuegt = 0;
        foreach ($leads as $lead) {
            $wpdb->insert('sagatrail_partner_leads', $lead,
                ['%s','%s','%s','%s','%s','%s','%s','%s','%s','%f','%f']);
            if ($wpdb->rows_affected > 0) $eingefuegt++;
        }

        $wpdb->query($wpdb->prepare(
            "INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
             VALUES (%s, %d)
             ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = %d",
            $route['id'], $eingefuegt, $eingefuegt
        ));

        error_log("[SagaTrail OSM] {$route['name']}: " . count($leads) . " POIs, {$eingefuegt} neu");
        sleep(ST_PAUSE_SEK);
    }

    error_log("[SagaTrail OSM] Batch fertig");
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function st_overpass_abfragen(float $lat, float $lng): array {
    $r     = ST_RADIUS_M;
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
        $raw = @file_get_contents(ST_OVERPASS_URL, false, $ctx);
        if ($raw !== false) {
            $json = json_decode($raw, true);
            return $json['elements'] ?? [];
        }
        sleep(10);
    }
    return [];
}

function st_typ(array $tags): string {
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

function st_adresse(array $tags): ?string {
    $parts = array_filter([
        trim(($tags['addr:street'] ?? '') . ' ' . ($tags['addr:housenumber'] ?? '')),
        trim(($tags['addr:postcode'] ?? '') . ' ' . ($tags['addr:city'] ?? '')),
    ]);
    $a = trim(implode(', ', $parts));
    return $a ?: null;
}
