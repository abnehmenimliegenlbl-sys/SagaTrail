<?php
  /**
   * SagaTrail – OSM Partner-Leads Harvester
   * 
   * Liest alle Routen aus sagatrail_routen, fragt Overpass API
   * nach Restaurants / Cafés / Lodges ab und schreibt Treffer
   * in sagatrail_partner_leads.
   * 
   * Kann tagelang laufen – überspringt bereits abgefragte Routen
   * (sagatrail_osm_progress). Bei Neustart einfach wieder starten.
   * 
   * Ausführen: php osm-harvest.php
   * Im Hintergrund: nohup php osm-harvest.php >> harvest.log 2>&1 &
   */

  // ============================================================
  // KONFIGURATION – Anpassen!
  // ============================================================
  define('DB_HOST', 'localhost');
  define('DB_USER', 'dein_db_user');
  define('DB_PASS', 'dein_db_passwort');
  define('DB_NAME', 'deine_wp_datenbank');
  define('DB_PORT', 3306);

  // Radius um Route-Mittelpunkt/-Start/-Ende (in Metern)
  define('RADIUS_M', 2000);

  // Pause zwischen Overpass-Anfragen (Sekunden) – bitte nicht unter 3
  define('PAUSE_SEKUNDEN', 5);

  // Overpass-Endpunkt
  define('OVERPASS_URL', 'https://overpass-api.de/api/interpreter');

  // OSM-Typen die uns interessieren
  // amenity: restaurant, cafe, bar, pub, fast_food, biergarten, food_court
  // tourism: hotel, hostel, guest_house, camp_site, caravan_site, alpine_hut, wilderness_hut
  define('OVERPASS_FILTER', '
    node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten|food_court)$"](around:{RADIUS}m,{LAT},{LNG});
    node["tourism"~"^(hotel|hostel|guest_house|camp_site|caravan_site|alpine_hut|wilderness_hut)$"](around:{RADIUS}m,{LAT},{LNG});
    way["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten|food_court)$"](around:{RADIUS}m,{LAT},{LNG});
    way["tourism"~"^(hotel|hostel|guest_house|camp_site|caravan_site|alpine_hut|wilderness_hut)$"](around:{RADIUS}m,{LAT},{LNG});
  ');

  // ============================================================
  // DATENBANKVERBINDUNG
  // ============================================================
  $pdo = new PDO(
      "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
      DB_USER,
      DB_PASS,
      [
          PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]
  );

  log_msg("=== SagaTrail OSM Harvester gestartet ===");
  log_msg("Radius: " . RADIUS_M . "m | Pause: " . PAUSE_SEKUNDEN . "s");

  // ============================================================
  // ROUTEN LADEN (noch nicht abgefragte zuerst)
  // ============================================================
  $routen = $pdo->query("
      SELECT r.*
      FROM sagatrail_routen r
      LEFT JOIN sagatrail_osm_progress p ON p.route_id = r.id
      WHERE p.route_id IS NULL
      ORDER BY r.kanton, r.name
  ")->fetchAll();

  $total   = count($routen);
  $counter = 0;

  log_msg("Noch zu verarbeiten: {$total} Routen");

  foreach ($routen as $route) {
      $counter++;
      log_msg("[{$counter}/{$total}] {$route['name']} ({$route['kanton']})");

      // Punkte: Mitte, Start und Ende der Route
      // (Mitte ist in lat/lng gespeichert; Start/Ende kommen aus
      //  der Geometrie – hier nutzen wir nur den Mittelpunkt,
      //  da WP keine JSONB-Geometrie kennt. Für Start/Ende müsste
      //  man die Koordinaten ebenfalls exportieren – 
      //  oder du fügst start_lat/end_lat Spalten hinzu.)
      $punkte = [
          ['lat' => $route['lat'], 'lng' => $route['lng']],
      ];

      $leads = [];

      foreach ($punkte as $punkt) {
          $pois = overpass_abfragen($punkt['lat'], $punkt['lng']);
          foreach ($pois as $poi) {
              $osm_id = ($poi['type'] ?? 'node') . '-' . $poi['id'];
              if (isset($leads[$osm_id])) continue; // Deduplizierung
              $leads[$osm_id] = [
                  'route_id'   => $route['id'],
                  'route_name' => $route['name'],
                  'kanton'     => $route['kanton'],
                  'osm_id'     => $osm_id,
                  'typ'        => bestimme_typ($poi['tags'] ?? []),
                  'name'       => $poi['tags']['name'] ?? '',
                  'adresse'    => baue_adresse($poi['tags'] ?? []),
                  'telefon'    => $poi['tags']['phone'] ?? $poi['tags']['contact:phone'] ?? null,
                  'website'    => $poi['tags']['website'] ?? $poi['tags']['contact:website'] ?? null,
                  'lat'        => $poi['lat'] ?? ($poi['center']['lat'] ?? null),
                  'lng'        => $poi['lon'] ?? ($poi['center']['lon'] ?? null),
              ];
          }
      }

      // Leads ohne Namen verwerfen
      $leads = array_filter($leads, fn($l) => !empty($l['name']));

      // In DB schreiben
      $eingefuegt = 0;
      foreach ($leads as $lead) {
          try {
              $stmt = $pdo->prepare("
                  INSERT IGNORE INTO sagatrail_partner_leads
                      (route_id, route_name, kanton, osm_id, typ, name, adresse, telefon, website, lat, lng)
                  VALUES
                      (:route_id, :route_name, :kanton, :osm_id, :typ, :name, :adresse, :telefon, :website, :lat, :lng)
              ");
              $stmt->execute($lead);
              if ($stmt->rowCount() > 0) $eingefuegt++;
          } catch (PDOException $e) {
              log_msg("  FEHLER beim Einfügen ({$lead['osm_id']}): " . $e->getMessage());
          }
      }

      // Fortschritt markieren
      $pdo->prepare("
          INSERT INTO sagatrail_osm_progress (route_id, anzahl_leads)
          VALUES (:id, :n)
          ON DUPLICATE KEY UPDATE abgefragt_am = NOW(), anzahl_leads = :n
      ")->execute([':id' => $route['id'], ':n' => $eingefuegt]);

      log_msg("  → " . count($leads) . " POIs gefunden, {$eingefuegt} neu eingetragen");

      // Höfliche Pause
      sleep(PAUSE_SEKUNDEN);
  }

  log_msg("=== Fertig! Alle Routen verarbeitet. ===");


  // ============================================================
  // HILFSFUNKTIONEN
  // ============================================================

  function overpass_abfragen(float $lat, float $lng): array {
      $filter = str_replace(
          ['{RADIUS}', '{LAT}', '{LNG}'],
          [RADIUS_M, $lat, $lng],
          OVERPASS_FILTER
      );

      $query = "[out:json][timeout:30];\n(\n{$filter}\n);\nout center tags;";

      $ctx = stream_context_create([
          'http' => [
              'method'  => 'POST',
              'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
              'content' => http_build_query(['data' => $query]),
              'timeout' => 45,
          ],
      ]);

      for ($versuch = 1; $versuch <= 3; $versuch++) {
          $raw = @file_get_contents(OVERPASS_URL, false, $ctx);
          if ($raw !== false) {
              $json = json_decode($raw, true);
              return $json['elements'] ?? [];
          }
          log_msg("  Overpass Versuch {$versuch} fehlgeschlagen – warte 15s …");
          sleep(15);
      }

      log_msg("  Overpass nicht erreichbar – Route übersprungen");
      return [];
  }

  function bestimme_typ(array $tags): string {
      $amenity = $tags['amenity'] ?? '';
      $tourism  = $tags['tourism'] ?? '';

      $map = [
          'restaurant'   => 'Restaurant',
          'cafe'         => 'Café',
          'bar'          => 'Bar',
          'pub'          => 'Pub',
          'fast_food'    => 'Schnellimbiss',
          'biergarten'   => 'Biergarten',
          'food_court'   => 'Food Court',
          'hotel'        => 'Hotel',
          'hostel'       => 'Hostel',
          'guest_house'  => 'Pension',
          'camp_site'    => 'Campingplatz',
          'caravan_site' => 'Wohnmobilstellplatz',
          'alpine_hut'   => 'Berghütte',
          'wilderness_hut' => 'Wildnishütte',
      ];

      return $map[$amenity] ?? $map[$tourism] ?? ucfirst($amenity ?: $tourism ?: 'Sonstiges');
  }

  function baue_adresse(array $tags): ?string {
      $teile = array_filter([
          $tags['addr:street'] ?? null,
          $tags['addr:housenumber'] ?? null,
          ($tags['addr:postcode'] ?? '') . ' ' . ($tags['addr:city'] ?? ''),
      ]);
      $adresse = implode(', ', $teile);
      return $adresse ?: null;
  }

  function log_msg(string $msg): void {
      $ts = date('Y-m-d H:i:s');
      echo "[{$ts}] {$msg}\n";
      flush();
  }
  