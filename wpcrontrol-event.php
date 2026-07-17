<?php
// SagaTrail OSM Harvester – PHP-Cron-Event für WP Crontrol
// Einfügen unter: WP Crontrol → PHP-Cron-Events → Hinzufügen
// Intervall: sagatrail_15min (siehe unten registrieren)
// Hook-Name: sagatrail_osm_harvest

global $wpdb;

$BATCH     = 10;
$RADIUS    = 2000;
$PAUSE     = 4;
$OVERPASS  = 'https://overpass-api.de/api/interpreter';

$gesamt   = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_routen");
$erledigt = (int) $wpdb->get_var("SELECT COUNT(*) FROM sagatrail_osm_progress");

error_log("[SagaTrail] Batch start: {$erledigt}/{$gesamt}");

if ($erledigt >= $gesamt) {
    error_log("[SagaTrail] Fertig – alle Routen abgefragt.");
    return;
}

$routen = $wpdb->get_results($wpdb->prepare("
    SELECT r.* FROM sagatrail_routen r
    LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
    WHERE p.route_id IS NULL
    ORDER BY r.kanton, r.name
    LIMIT %d
", $BATCH), ARRAY_A);

foreach ($routen as $route) {
    $lat = (float) $route['lat'];
    $lng = (float) $route['lng'];
    $r   = $RADIUS;

    $query = "[out:json][timeout:25];\n(\n"
        . "  node[\"amenity\"~\"^(restaurant|cafe|bar|pub|fast_food|biergarten)$\"](around:{$r},{$lat},{$lng});\n"
        . "  node[\"tourism\"~\"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$\"](around:{$r},{$lat},{$lng});\n"
        . "  way[\"amenity\"~\"^(restaurant|cafe|bar|pub|fast_food|biergarten)$\"](around:{$r},{$lat},{$lng});\n"
        . "  way[\"tourism\"~\"^(hotel|hostel|guest_house|camp_site|alpine_hut|wilderness_hut)$\"](around:{$r},{$lat},{$lng});\n"
        . ");\nout center tags;";

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\nUser-Agent: SagaTrail/1.0\r\n",
        'content' => http_build_query(['data' => $query]),
        'timeout' => 35,
    ]]);

    $raw  = @file_get_contents($OVERPASS, false, $ctx);
    $pois = $raw ? (json_decode($raw, true)['elements'] ?? []) : [];
    $leads = [];

    foreach ($pois as $poi) {
        $osm_id = ($poi['type'] ?? 'node') . '-' . $poi['id'];
        $name   = trim($poi['tags']['name'] ?? '');
        if (!$name || isset($leads[$osm_id])) continue;

        $typ_map = ['restaurant'=>'Restaurant','cafe'=>'Café','bar'=>'Bar','pub'=>'Pub',
            'fast_food'=>'Schnellimbiss','biergarten'=>'Biergarten','hotel'=>'Hotel',
            'hostel'=>'Hostel','guest_house'=>'Pension','camp_site'=>'Campingplatz',
            'alpine_hut'=>'Berghütte','wilderness_hut'=>'Wildnishütte'];
        $a = $poi['tags']['amenity'] ?? '';
        $t = $poi['tags']['tourism'] ?? '';

        $street  = trim(($poi['tags']['addr:street'] ?? '') . ' ' . ($poi['tags']['addr:housenumber'] ?? ''));
        $city    = trim(($poi['tags']['addr:postcode'] ?? '') . ' ' . ($poi['tags']['addr:city'] ?? ''));
        $adresse = trim(implode(', ', array_filter([$street, $city]))) ?: null;

        $leads[$osm_id] = [
            'route_id'   => $route['id'],
            'route_name' => $route['name'],
            'kanton'     => $route['kanton'],
            'osm_id'     => $osm_id,
            'typ'        => $typ_map[$a] ?? $typ_map[$t] ?? ucfirst($a ?: $t ?: 'Sonstiges'),
            'name'       => $name,
            'adresse'    => $adresse,
            'telefon'    => $poi['tags']['phone'] ?? $poi['tags']['contact:phone'] ?? null,
            'website'    => $poi['tags']['website'] ?? $poi['tags']['contact:website'] ?? null,
            'lat'        => $poi['lat'] ?? ($poi['center']['lat'] ?? null),
            'lng'        => $poi['lon'] ?? ($poi['center']['lon'] ?? null),
        ];
    }

    $neu = 0;
    foreach ($leads as $lead) {
        $wpdb->insert('sagatrail_partner_leads', $lead,
            ['%s','%s','%s','%s','%s','%s','%s','%s','%s','%f','%f']);
        if ($wpdb->rows_affected > 0) $neu++;
    }

    $wpdb->query($wpdb->prepare(
        "INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
         VALUES (%s, %d)
         ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = %d",
        $route['id'], $neu, $neu
    ));

    error_log("[SagaTrail] {$route['name']}: " . count($leads) . " POIs, {$neu} neu");
    sleep($PAUSE);
}

error_log("[SagaTrail] Batch fertig");
