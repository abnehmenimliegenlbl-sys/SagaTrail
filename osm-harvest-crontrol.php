<?php
/**
 * SagaTrail – OSM Harvester (WP-Crontrol / wp_schedule_event Version)
 * Läuft als WordPress-Cron-Hook, kein direkter HTTP-Aufruf.
 */

define('ST_BATCH_SIZE', 10);
define('ST_RADIUS_M', 2000);
define('ST_PAUSE_SEK', 4);
define('ST_OVERPASS_URL', 'https://overpass-api.de/api/interpreter');

global $wpdb;
error_log('[SagaTrail OSM] === Funktion gestartet ===');

// ============================================================
// SCHRITT 1: KATEGORIE-BACKFILL
// Bestehende Leads ohne kategorie-Wert bekommen ihn aus typ.
// ============================================================
$backfilled = (int) $wpdb->query(
    "UPDATE sagatrail_partner_leads
        SET kategorie = CASE
            WHEN typ IN ('Restaurant','Café','Bar','Pub','Schnellimbiss','Biergarten') THEN 'F+B'
            WHEN typ IN ('Hotel','Hostel','Pension','Campingplatz','Berghütte','Wildnishütte') THEN 'Herberge'
            ELSE 'Sonstiges'
        END
      WHERE (kategorie IS NULL OR kategorie = '')
        AND typ IS NOT NULL AND typ != ''"
);
if ($backfilled > 0) {
    error_log("[SagaTrail OSM] Kategorie-Backfill: {$backfilled} Leads aktualisiert.");
}

// ============================================================
// SCHRITT 2: FORTSCHRITT PRÜFEN
// ============================================================
$gesamt     = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_routen");
$erledigt   = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_osm_progress");
$noch_offen = $gesamt - $erledigt;
error_log("[SagaTrail OSM] Routen: {$gesamt} | Erledigt: {$erledigt} | Offen: {$noch_offen}");

if ($noch_offen <= 0) {
    error_log('[SagaTrail OSM] Alle Routen fertig.');
    return;
}

// ============================================================
// SCHRITT 3: NÄCHSTE ROUTEN LADEN
// ============================================================
$routen = $wpdb->get_results($wpdb->prepare("
    SELECT r.* FROM sagatrail_routen r
    LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
    WHERE p.route_id IS NULL
    ORDER BY r.kanton, r.name
    LIMIT %d
", ST_BATCH_SIZE), ARRAY_A);

error_log('[SagaTrail OSM] Batch: ' . count($routen) . ' Routen');

foreach ($routen as $route) {
    error_log("[SagaTrail OSM] Route: {$route['name']} lat={$route['lat']} lng={$route['lng']}");

    $r   = ST_RADIUS_M;
    $lat = (float)$route['lat'];
    $lng = (float)$route['lng'];

    $query = '[out:json][timeout:25];'
        . '(node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten)$"](around:' . $r . ',' . $lat . ',' . $lng . ');'
        . 'node["tourism"~"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$"](around:' . $r . ',' . $lat . ',' . $lng . ');'
        . 'way["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten)$"](around:' . $r . ',' . $lat . ',' . $lng . ');'
        . 'way["tourism"~"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$"](around:' . $r . ',' . $lat . ',' . $lng . ');'
        . ');out center tags;';

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\nUser-Agent: SagaTrail/1.0\r\n",
        'content' => http_build_query(['data' => $query]),
        'timeout' => 35,
    ]]);

    $pois = [];
    for ($v = 1; $v <= 3; $v++) {
        $raw = @file_get_contents(ST_OVERPASS_URL, false, $ctx);
        if ($raw !== false) {
            $json = json_decode($raw, true);
            $pois = $json['elements'] ?? [];
            break;
        }
        error_log("[SagaTrail OSM] Overpass Versuch {$v} fehlgeschlagen");
        sleep(10);
    }
    error_log('[SagaTrail OSM] POIs: ' . count($pois));

    $leads = [];
    foreach ($pois as $poi) {
        $osm_id = ($poi['type'] ?? 'node') . '-' . $poi['id'];
        if (isset($leads[$osm_id])) continue;
        $name = trim($poi['tags']['name'] ?? '');
        if ($name === '') continue;

        $a = $poi['tags']['amenity'] ?? '';
        $t = $poi['tags']['tourism'] ?? '';
        $typen = [
            'restaurant'    => 'Restaurant', 'cafe'          => 'Café',
            'bar'           => 'Bar',        'pub'           => 'Pub',
            'fast_food'     => 'Schnellimbiss','biergarten'  => 'Biergarten',
            'hotel'         => 'Hotel',      'hostel'        => 'Hostel',
            'guest_house'   => 'Pension',    'camp_site'     => 'Campingplatz',
            'alpine_hut'    => 'Berghütte',  'wilderness_hut'=> 'Wildnishütte',
        ];
        $typ = $typen[$a] ?? $typen[$t] ?? ucfirst($a ?: $t ?: 'Sonstiges');
        $fb      = ['Restaurant','Café','Bar','Pub','Schnellimbiss','Biergarten'];
        $herberg = ['Hotel','Hostel','Pension','Campingplatz','Berghütte','Wildnishütte'];
        $kategorie = in_array($typ, $fb, true) ? 'F+B'
                   : (in_array($typ, $herberg, true) ? 'Herberge' : $typ);

        $strasse = trim(($poi['tags']['addr:street'] ?? '') . ' ' . ($poi['tags']['addr:housenumber'] ?? ''));
        $ort     = trim(($poi['tags']['addr:postcode'] ?? '') . ' ' . ($poi['tags']['addr:city'] ?? ''));
        $adresse = trim(implode(', ', array_filter([$strasse, $ort]))) ?: null;
        $email   = $poi['tags']['email'] ?? $poi['tags']['contact:email'] ?? null;

        $leads[$osm_id] = [
            'route_id'   => $route['id'],
            'route_name' => $route['name'],
            'kanton'     => $route['kanton'],
            'osm_id'     => $osm_id,
            'typ'        => $typ,
            'kategorie'  => $kategorie,
            'name'       => $name,
            'adresse'    => $adresse,
            'telefon'    => $poi['tags']['phone'] ?? $poi['tags']['contact:phone'] ?? null,
            'website'    => $poi['tags']['website'] ?? $poi['tags']['contact:website'] ?? null,
            'email'      => $email,
            'tier'       => $email ? 'Top' : null,
            'lat'        => $poi['lat'] ?? ($poi['center']['lat'] ?? null),
            'lng'        => $poi['lon'] ?? ($poi['center']['lon'] ?? null),
        ];
    }

    error_log('[SagaTrail OSM] Leads: ' . count($leads));

    $eingefuegt = 0;
    foreach ($leads as $lead) {
        // INSERT IGNORE verhindert Duplikate bei erneutem Durchlauf
        // (erfordert UNIQUE-Index auf osm_id in sagatrail_partner_leads)
        $wpdb->query($wpdb->prepare(
            "INSERT IGNORE INTO sagatrail_partner_leads
                (route_id, route_name, kanton, osm_id, typ, kategorie, name,
                 adresse, telefon, website, email, lat, lng, tier)
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %f, %f, %s)",
            $lead['route_id'], $lead['route_name'], $lead['kanton'],
            $lead['osm_id'],   $lead['typ'],        $lead['kategorie'],
            $lead['name'],     $lead['adresse'],    $lead['telefon'],
            $lead['website'],  $lead['email'],
            $lead['lat'],      $lead['lng'],
            $lead['tier']
        ));
        if ($wpdb->last_error) error_log('[SagaTrail OSM] Insert-Fehler: ' . $wpdb->last_error);
        if ($wpdb->rows_affected > 0) $eingefuegt++;
    }

    $wpdb->query($wpdb->prepare(
        "INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
         VALUES (%s, %d)
         ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = %d",
        $route['id'], $eingefuegt, $eingefuegt
    ));
    if ($wpdb->last_error) error_log('[SagaTrail OSM] Progress-Fehler: ' . $wpdb->last_error);

    error_log("[SagaTrail OSM] {$route['name']}: {$eingefuegt} eingetragen");
    sleep(ST_PAUSE_SEK);
}

error_log('[SagaTrail OSM] === Batch fertig ===');
