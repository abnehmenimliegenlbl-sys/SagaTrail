<?php
/**
 * SagaTrail Routen — WPCode PHP Snippet
 * Typ:  PHP Snippet  (immer aktiv, alle Seiten)
 * Seite: sagatrail.ch/routen
 *
 * API-Calls laufen server-seitig (wp_remote_get) mit WP-Transient-Cache (6h).
 * Der Browser ruft NUR /wp-admin/admin-ajax.php auf — keine Cross-Origin-Calls.
 */

/* ── AJAX-Handler: liefert Routen für einen Kanton ────────────────────── */
if ( ! function_exists( 'str_routes_ajax_handler' ) ) {

  $str_kantone_valid = [
    'Aargau','Appenzell Ausserrhoden','Appenzell Innerrhoden',
    'Basel-Landschaft','Basel-Stadt','Bern','Freiburg','Genf','Glarus',
    'Graubünden','Jura','Luzern','Neuenburg','Nidwalden','Obwalden',
    'Schaffhausen','Schwyz','Solothurn','St. Gallen','Tessin','Thurgau',
    'Uri','Waadt','Wallis','Zug','Zürich',
  ];

  function str_routes_ajax_handler() {
    global $str_kantone_valid;
    $kanton = isset( $_GET['kanton'] ) ? sanitize_text_field( wp_unslash( $_GET['kanton'] ) ) : '';
    if ( ! in_array( $kanton, $str_kantone_valid, true ) ) {
      wp_send_json_error( 'Ungültiger Kanton', 400 );
    }

    $key    = 'str_routes_' . md5( $kanton );
    $routes = get_transient( $key );

    if ( false === $routes ) {
      $url  = 'https://saga-trail.replit.app/api/cantons/' . rawurlencode( $kanton ) . '/routes';
      $resp = wp_remote_get( $url, [ 'timeout' => 20, 'sslverify' => true ] );
      if ( ! is_wp_error( $resp ) && 200 === (int) wp_remote_retrieve_response_code( $resp ) ) {
        $data = json_decode( wp_remote_retrieve_body( $resp ), true );
        $routes = is_array( $data ) ? $data : [];
      } else {
        $routes = [];
      }
      set_transient( $key, $routes, 6 * HOUR_IN_SECONDS );
    }

    wp_send_json( $routes );
  }

  add_action( 'wp_ajax_str_routes',        'str_routes_ajax_handler' );
  add_action( 'wp_ajax_nopriv_str_routes', 'str_routes_ajax_handler' );
}

/* ── Nur auf der Routen-Seite rendern ──────────────────────────────────── */
if ( ! is_page( 'routen' ) ) return;

/* ── Kanton-Daten (API-Name → ISO-Kürzel) ──────────────────────────────── */
$str_kantone = [
  [ 'api' => 'Aargau',                 'code' => 'AG' ],
  [ 'api' => 'Appenzell Ausserrhoden', 'code' => 'AR' ],
  [ 'api' => 'Appenzell Innerrhoden',  'code' => 'AI' ],
  [ 'api' => 'Basel-Landschaft',       'code' => 'BL' ],
  [ 'api' => 'Basel-Stadt',            'code' => 'BS' ],
  [ 'api' => 'Bern',                   'code' => 'BE' ],
  [ 'api' => 'Freiburg',               'code' => 'FR' ],
  [ 'api' => 'Genf',                   'code' => 'GE' ],
  [ 'api' => 'Glarus',                 'code' => 'GL' ],
  [ 'api' => 'Graubünden',             'code' => 'GR' ],
  [ 'api' => 'Jura',                   'code' => 'JU' ],
  [ 'api' => 'Luzern',                 'code' => 'LU' ],
  [ 'api' => 'Neuenburg',              'code' => 'NE' ],
  [ 'api' => 'Nidwalden',              'code' => 'NW' ],
  [ 'api' => 'Obwalden',               'code' => 'OW' ],
  [ 'api' => 'Schaffhausen',           'code' => 'SH' ],
  [ 'api' => 'Schwyz',                 'code' => 'SZ' ],
  [ 'api' => 'Solothurn',              'code' => 'SO' ],
  [ 'api' => 'St. Gallen',             'code' => 'SG' ],
  [ 'api' => 'Tessin',                 'code' => 'TI' ],
  [ 'api' => 'Thurgau',                'code' => 'TG' ],
  [ 'api' => 'Uri',                    'code' => 'UR' ],
  [ 'api' => 'Waadt',                  'code' => 'VD' ],
  [ 'api' => 'Wallis',                 'code' => 'VS' ],
  [ 'api' => 'Zug',                    'code' => 'ZG' ],
  [ 'api' => 'Zürich',                 'code' => 'ZH' ],
];

$str_ajax_url = admin_url( 'admin-ajax.php' );
?>

<!-- ============================================================
     SAGATRAIL ROUTEN  |  WPCode PHP Snippet
     ============================================================ -->
<style>
.str-wrap *, .str-wrap *::before, .str-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
.str-wrap {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a; line-height: 1.6;
}
.str-fw   { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }
.str-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

/* Hero */
.str-hero { background: #CC0000; padding: 64px 0 52px; color: #fff; }
.str-hero-badge {
  display: inline-block; background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3); border-radius: 20px;
  padding: 5px 16px; font-size: 0.72rem; letter-spacing: .12em;
  text-transform: uppercase; margin-bottom: 18px; color: #fff;
}
.str-hero h1 {
  font-size: clamp(1.9rem,5vw,3rem); font-weight: 800; line-height: 1.1;
  margin-bottom: 14px; color: #fff;
}
.str-hero p { font-size: 1.05rem; max-width: 560px; opacity: .9; color: #fff; }
.str-hero-stats {
  display: flex; gap: 36px; flex-wrap: wrap;
  margin-top: 32px; padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,.2);
}
.str-hero-stat strong { display: block; font-size: 1.8rem; font-weight: 800; color: #fff; line-height: 1; }
.str-hero-stat span   { font-size: 0.8rem; opacity: .75; color: #fff; }

/* Abschnitt-Kopf */
.str-section-label {
  font-size: .72rem; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: #CC0000; margin-bottom: 8px;
}
.str-section-title { font-size: clamp(1.3rem,2.5vw,1.9rem); font-weight: 800; margin-bottom: 24px; }

/* Kanton-Grid */
.str-kanton-section { padding: 48px 0 36px; background: #f7f7f5; }
.str-kanton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(116px, 1fr));
  gap: 9px;
}
.str-kanton-card {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 14px;
  padding: 14px 8px 11px; text-align: center; cursor: pointer;
  transition: border-color .15s, box-shadow .15s, transform .12s;
  user-select: none;
}
.str-kanton-card:hover { border-color: #CC0000; box-shadow: 0 4px 14px rgba(204,0,0,.12); transform: translateY(-2px); }
.str-kanton-card.str-active { border-color: #CC0000; background: #CC0000; }
.str-kanton-wappen {
  width: 48px; height: 48px; margin: 0 auto 7px;
  display: flex; align-items: center; justify-content: center;
}
/* Wappen-Bild: direkt als SVG geladen → perfekte Vektqualität */
.str-kanton-wappen img {
  width: 48px; height: 48px; object-fit: contain;
  border-radius: 3px;
  /* Fallback: sichtbar auch wenn SVG nicht lädt */
  background: #eee;
}
.str-kanton-code { font-size: .78rem; font-weight: 800; letter-spacing: .08em; color: #1a1a1a; }
.str-kanton-name { font-size: .66rem; color: #777; line-height: 1.25; margin-top: 2px; }
.str-kanton-card.str-active .str-kanton-code,
.str-kanton-card.str-active .str-kanton-name { color: #fff; }
.str-kanton-card.str-active .str-kanton-wappen img { filter: brightness(0) invert(1); }

/* Filter-Bereich */
.str-filter-section { background: #f7f7f5; padding-bottom: 8px; display: none; }
.str-filter-section.str-visible { display: block; }
.str-filter-card {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 16px;
  padding: 20px 20px 8px; margin-bottom: 16px;
}
.str-filter-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; padding-bottom: 14px;
  border-bottom: 1px solid #f0f0ee;
}
.str-filter-icon {
  width: 34px; height: 34px; background: #CC0000; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.str-filter-icon svg { width: 18px; height: 18px; }
.str-filter-title-text { font-size: 1rem; font-weight: 700; color: #1a1a1a; }

/* Dual-Range-Slider */
.str-filter-row { margin-bottom: 18px; }
.str-filter-row-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.str-filter-row-label { font-size: .9rem; font-weight: 600; color: #1a1a1a; }
.str-filter-row-val   { font-size: .82rem; font-weight: 600; color: #CC0000; }
.str-dual-range { position: relative; height: 32px; display: flex; align-items: center; }
.str-range-track {
  position: absolute; left: 0; right: 0; height: 4px;
  background: #e0e0e0; border-radius: 2px; pointer-events: none;
}
.str-range-fill { position: absolute; height: 4px; background: #CC0000; border-radius: 2px; }
.str-range-input {
  position: absolute; width: 100%; height: 0;
  appearance: none; -webkit-appearance: none;
  background: transparent; pointer-events: none; outline: none;
}
/* Swiss-Cross-Thumb */
.str-range-input::-webkit-slider-thumb {
  -webkit-appearance: none; width: 30px; height: 30px; border-radius: 50%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23CC0000'/%3E%3Crect x='16.5' y='8' width='7' height='24' rx='1.5' fill='white'/%3E%3Crect x='8' y='16.5' width='24' height='7' rx='1.5' fill='white'/%3E%3C/svg%3E") center/cover no-repeat;
  cursor: pointer; pointer-events: auto;
  box-shadow: 0 2px 8px rgba(204,0,0,.35); transition: transform .1s;
}
.str-range-input::-webkit-slider-thumb:hover { transform: scale(1.1); }
.str-range-input::-moz-range-thumb {
  width: 30px; height: 30px; border: none; border-radius: 50%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23CC0000'/%3E%3Crect x='16.5' y='8' width='7' height='24' rx='1.5' fill='white'/%3E%3Crect x='8' y='16.5' width='24' height='7' rx='1.5' fill='white'/%3E%3C/svg%3E") center/cover no-repeat;
  cursor: pointer; pointer-events: auto;
  box-shadow: 0 2px 8px rgba(204,0,0,.35);
}

/* Toggle */
.str-toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-top: 1px solid #f0f0ee;
}
.str-toggle-label { font-size: .9rem; font-weight: 500; color: #1a1a1a; }
.str-toggle {
  position: relative; width: 48px; height: 28px;
  background: #ddd; border-radius: 14px; cursor: pointer;
  transition: background .2s; flex-shrink: 0;
}
.str-toggle.str-on { background: #CC0000; }
.str-toggle::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 22px; height: 22px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.2); transition: transform .2s;
}
.str-toggle.str-on::after { transform: translateX(20px); }

/* Suchen-Button */
.str-search-btn {
  width: 100%; padding: 16px; background: #CC0000; color: #fff; border: none;
  border-radius: 12px; font-size: .85rem; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; cursor: pointer;
  margin: 8px 0 14px; transition: opacity .15s, transform .1s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.str-search-btn:hover   { opacity: .88; transform: translateY(-1px); }
.str-search-btn:active  { transform: translateY(0); opacity: .8; }
.str-search-btn:disabled { opacity: .5; cursor: default; }
.str-route-count-hint { font-size: .82rem; color: #888; margin-bottom: 20px; }

/* Ergebnisse */
.str-results-section { padding: 8px 0 64px; background: #f7f7f5; display: none; }
.str-results-section.str-visible { display: block; }
.str-results-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.str-results-title  { font-size: 1.3rem; font-weight: 800; color: #1a1a1a; }
.str-results-badge  {
  background: #CC0000; color: #fff; border-radius: 20px; padding: 2px 10px;
  font-size: .78rem; font-weight: 700; display: none;
}
.str-route-list  { display: flex; flex-direction: column; gap: 10px; }
.str-route-card  {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 14px;
  overflow: hidden; display: flex;
  transition: box-shadow .15s, transform .12s;
}
.str-route-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.08); transform: translateY(-1px); }
.str-route-card[data-hidden="true"] { display: none; }
.str-route-photo { width: 110px; min-width: 110px; background: #eee; overflow: hidden; flex-shrink: 0; }
.str-route-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.str-route-photo-ph {
  width: 100%; height: 100%; min-height: 90px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,#f2f2f0,#e6e6e4); font-size: 1.8rem;
}
.str-route-body  { padding: 14px 16px; flex: 1; min-width: 0; }
.str-route-name  { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 7px; line-height: 1.3; }
.str-route-meta  { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }
.str-tag {
  display: inline-flex; align-items: center; gap: 3px;
  border-radius: 6px; padding: 2px 7px;
  font-size: .72rem; font-weight: 600; white-space: nowrap;
}
.str-tag-dist { background: #f0f0f0; color: #444; }
.str-tag-asc  { background: #eef3fb; color: #2563eb; }
.str-tag-time { background: #f0fdf4; color: #16a34a; }
.str-tag-T1   { background: #dcfce7; color: #15803d; }
.str-tag-T2   { background: #d1fae5; color: #059669; }
.str-tag-T3   { background: #fff7ed; color: #ea580c; }
.str-tag-T4   { background: #fee2e2; color: #dc2626; }
.str-tag-T5   { background: #fef2f2; color: #991b1b; }
.str-tag-T6   { background: #1a1a1a; color: #fff; }
.str-route-desc {
  font-size: .82rem; color: #666; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.str-app-link { display: inline-flex; align-items: center; gap: 5px; font-size: .78rem; font-weight: 600; color: #CC0000; margin-top: 10px; }

/* Spinner & Leer */
.str-spinner     { text-align: center; padding: 60px 20px; }
.str-spinner-ring {
  display: inline-block; width: 40px; height: 40px;
  border: 3px solid #e8e8e6; border-top-color: #CC0000;
  border-radius: 50%; animation: str-spin .7s linear infinite;
}
@keyframes str-spin { to { transform: rotate(360deg); } }
.str-empty { text-align: center; padding: 50px 20px; }
.str-empty-icon { font-size: 2.8rem; margin-bottom: 14px; }
.str-empty h3   { font-size: 1rem; font-weight: 700; margin-bottom: 6px; color: #444; }
.str-empty p    { font-size: .85rem; color: #888; }

/* App-CTA */
.str-cta { background: #1a1a1a; padding: 52px 0; }
.str-cta h2 { font-size: clamp(1.3rem,2.5vw,1.9rem); font-weight: 800; color: #fff; margin-bottom: 10px; }
.str-cta p  { color: rgba(255,255,255,.65); margin-bottom: 24px; }
.str-cta-btns { display: flex; gap: 12px; flex-wrap: wrap; }
.str-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 10px;
  font-weight: 700; font-size: .88rem;
  background: #CC0000; color: #fff; text-decoration: none; transition: opacity .15s;
}
.str-cta-btn:hover   { opacity: .85; }
.str-cta-btn-out     { background: transparent; border: 1.5px solid rgba(255,255,255,.28); }

@media (max-width: 560px) {
  .str-route-photo { width: 88px; min-width: 88px; }
  .str-route-body  { padding: 11px 12px; }
  .str-kanton-grid { grid-template-columns: repeat(auto-fill, minmax(94px, 1fr)); gap: 6px; }
  .str-kanton-wappen, .str-kanton-wappen img { width: 38px; height: 38px; }
}
</style>

<div class="str-wrap" id="str-root">

  <!-- HERO -->
  <div class="str-fw str-hero">
    <div class="str-inner">
      <span class="str-hero-badge">🇨🇭 Schweizer Wanderrouten</span>
      <h1>Sagenrouten in allen 26 Kantonen</h1>
      <p>GPS-geführte Wanderungen auf den Spuren alter Schweizer Sagen — kostenlos in der SagaTrail-App.</p>
      <div class="str-hero-stats">
        <div class="str-hero-stat"><strong>200+</strong><span>Wanderrouten</span></div>
        <div class="str-hero-stat"><strong>26</strong><span>Kantone</span></div>
        <div class="str-hero-stat"><strong>T1–T6</strong><span>Schwierigkeit</span></div>
      </div>
    </div>
  </div>

  <!-- KANTONSAUSWAHL -->
  <div class="str-fw str-kanton-section">
    <div class="str-inner">
      <div class="str-section-label">Schritt 1 · Kanton wählen</div>
      <h2 class="str-section-title">Wo möchtest du wandern?</h2>
      <div class="str-kanton-grid" id="str-kanton-grid">
        <?php foreach ( $str_kantone as $k ) :
          $code_lc  = strtolower( $k['code'] );
          $wappen   = 'https://raw.githubusercontent.com/nzzdev/ch-canton-symbols/master/symbols/13x13/' . strtolower( $k['code'] ) . '.svg';
        ?>
        <div class="str-kanton-card"
             data-api="<?php echo esc_attr( $k['api'] ); ?>"
             data-code="<?php echo esc_attr( $k['code'] ); ?>"
             onclick="strSelectKanton('<?php echo esc_js( $k['api'] ); ?>', '<?php echo esc_js( $k['code'] ); ?>', this)">
          <div class="str-kanton-wappen">
            <img src="<?php echo esc_url( $wappen ); ?>"
                 alt="Wappen <?php echo esc_attr( $k['api'] ); ?>"
                 loading="lazy"
                 onerror="this.style.display='none'">
          </div>
          <div class="str-kanton-code"><?php echo esc_html( $k['code'] ); ?></div>
          <div class="str-kanton-name"><?php echo esc_html( $k['api'] ); ?></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <!-- FILTER -->
  <div class="str-fw str-filter-section" id="str-filter-section">
    <div class="str-inner">
      <div class="str-section-label">Schritt 2 · Filter &amp; Suche</div>
      <h2 class="str-section-title" id="str-filter-title">–</h2>
      <p style="font-size:.88rem;color:#666;margin-bottom:20px;margin-top:-8px;">
        Lege Distanz, Höhenmeter und Schwierigkeit fest. Danach folgt die passende Sage.
      </p>

      <div class="str-filter-card">
        <div class="str-filter-header">
          <div class="str-filter-icon">
            <svg fill="none" stroke="white" stroke-width="1.8" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <circle cx="8"  cy="6"  r="2.2" fill="white" stroke="none"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <circle cx="16" cy="12" r="2.2" fill="white" stroke="none"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
              <circle cx="11" cy="18" r="2.2" fill="white" stroke="none"/>
            </svg>
          </div>
          <span class="str-filter-title-text">Filter</span>
        </div>

        <!-- Distanz -->
        <div class="str-filter-row">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Distanz</span>
            <span class="str-filter-row-val" id="str-dist-val">0 km – 50+ km</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-dist-fill"></div></div>
            <input type="range" class="str-range-input" id="str-dist-lo" min="0" max="50" value="0"    step="1">
            <input type="range" class="str-range-input" id="str-dist-hi" min="0" max="50" value="50"   step="1">
          </div>
        </div>

        <!-- Höhenmeter -->
        <div class="str-filter-row">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Höhenmeter</span>
            <span class="str-filter-row-val" id="str-asc-val">0 hm – 3000+ hm</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-asc-fill"></div></div>
            <input type="range" class="str-range-input" id="str-asc-lo" min="0" max="3000" value="0"    step="50">
            <input type="range" class="str-range-input" id="str-asc-hi" min="0" max="3000" value="3000" step="50">
          </div>
        </div>

        <!-- Schwierigkeit -->
        <div class="str-filter-row" style="margin-bottom:4px;">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Schwierigkeit</span>
            <span class="str-filter-row-val" id="str-sac-val">T1 – T6</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-sac-fill"></div></div>
            <input type="range" class="str-range-input" id="str-sac-lo" min="1" max="6" value="1" step="1">
            <input type="range" class="str-range-input" id="str-sac-hi" min="1" max="6" value="6" step="1">
          </div>
        </div>

        <!-- Toggle -->
        <div class="str-toggle-row">
          <span class="str-toggle-label">Nur ganzjährige Routen</span>
          <div class="str-toggle" id="str-toggle-gj" onclick="strToggleGj()" role="switch" aria-checked="false"></div>
        </div>
      </div>

      <button class="str-search-btn" id="str-search-btn" onclick="strSearch()">
        <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Passende Routen suchen
      </button>
      <p class="str-route-count-hint" id="str-hint"></p>
    </div>
  </div>

  <!-- ERGEBNISSE -->
  <div class="str-fw str-results-section" id="str-results-section">
    <div class="str-inner">
      <div class="str-results-header">
        <h2 class="str-results-title" id="str-results-title">Routen</h2>
        <span class="str-results-badge" id="str-results-badge"></span>
      </div>
      <div id="str-route-list" class="str-route-list"></div>
    </div>
  </div>

  <!-- APP CTA -->
  <div class="str-fw str-cta">
    <div class="str-inner">
      <h2>Starte deine Sagenwanderung</h2>
      <p>GPS-Navigation, Audio-Erzählungen und historische Sagen — kostenlos in der App.</p>
      <div class="str-cta-btns">
        <a href="https://apps.apple.com/de/app/sagatrail/id6788260668" class="str-cta-btn" target="_blank" rel="noopener">🍎 &nbsp;App Store</a>
        <a href="https://play.google.com/store/apps/details?id=com.inster.sagatrail" class="str-cta-btn str-cta-btn-out" target="_blank" rel="noopener">▶ &nbsp;Google Play</a>
      </div>
    </div>
  </div>

</div><!-- .str-wrap -->

<script>
(function () {
  'use strict';

  /* ── AJAX-Endpunkt (PHP-seitig, mit WP-Transient-Cache) ── */
  var AJAX_URL = '<?php echo esc_js( $str_ajax_url ); ?>';

  /* ── State ── */
  var S = {
    kanton: null, routes: [],
    distLo: 0,  distHi: 50,
    ascLo:  0,  ascHi:  3000,
    sacLo:  1,  sacHi:  6,
    gj:     false,
    loading: false,
  };

  /* ── Dual-Range-Slider ── */
  function initDual(idLo, idHi, fillId, onUpdate) {
    var lo   = document.getElementById(idLo);
    var hi   = document.getElementById(idHi);
    var fill = document.getElementById(fillId);
    var wrap = fill.closest('.str-dual-range');

    /* Initialer z-index: lo oben, damit linker Thumb immer klickbar */
    lo.style.zIndex = 3;
    hi.style.zIndex = 2;

    function updateFill() {
      var mn = parseFloat(lo.min), mx = parseFloat(lo.max);
      var vLo = parseFloat(lo.value), vHi = parseFloat(hi.value);
      var pLo = (vLo - mn) / (mx - mn) * 100;
      var pHi = (vHi - mn) / (mx - mn) * 100;
      fill.style.left  = pLo + '%';
      fill.style.width = (pHi - pLo) + '%';
    }

    /* Vor mousedown/touchstart: näherster Thumb bekommt z-index 3 */
    function pickClosest(clientX) {
      var rect = wrap.getBoundingClientRect();
      var pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      var mn   = parseFloat(lo.min), mx = parseFloat(lo.max);
      var pLo  = (parseFloat(lo.value) - mn) / (mx - mn);
      var pHi  = (parseFloat(hi.value) - mn) / (mx - mn);
      if (Math.abs(pct - pLo) <= Math.abs(pct - pHi)) {
        lo.style.zIndex = 3; hi.style.zIndex = 2;
      } else {
        hi.style.zIndex = 3; lo.style.zIndex = 2;
      }
    }
    wrap.addEventListener('mousedown',  function(e){ pickClosest(e.clientX); });
    wrap.addEventListener('touchstart', function(e){ if(e.touches[0]) pickClosest(e.touches[0].clientX); }, {passive:true});

    function sync(mover) {
      var mn = parseFloat(lo.min), mx = parseFloat(lo.max);
      var vLo = parseFloat(lo.value), vHi = parseFloat(hi.value);
      if (mover === 'lo' && vLo > vHi) { lo.value = vHi; vLo = vHi; }
      if (mover === 'hi' && vHi < vLo) { hi.value = vLo; vHi = vLo; }
      updateFill();
      onUpdate(parseFloat(lo.value), parseFloat(hi.value));
    }
    lo.addEventListener('input', function(){ sync('lo'); });
    hi.addEventListener('input', function(){ sync('hi'); });
    updateFill();
    onUpdate(parseFloat(lo.value), parseFloat(hi.value));
  }

  initDual('str-dist-lo', 'str-dist-hi', 'str-dist-fill', function (lo, hi) {
    S.distLo = lo; S.distHi = hi;
    document.getElementById('str-dist-val').textContent =
      lo + ' km – ' + (hi >= 50 ? '50+ km' : hi + ' km');
    recount();
  });
  initDual('str-asc-lo', 'str-asc-hi', 'str-asc-fill', function (lo, hi) {
    S.ascLo = lo; S.ascHi = hi;
    document.getElementById('str-asc-val').textContent =
      lo + ' hm – ' + (hi >= 3000 ? '3000+ hm' : hi + ' hm');
    recount();
  });
  initDual('str-sac-lo', 'str-sac-hi', 'str-sac-fill', function (lo, hi) {
    S.sacLo = lo; S.sacHi = hi;
    document.getElementById('str-sac-val').textContent = 'T' + lo + ' – T' + hi;
    recount();
  });

  /* ── Toggle ── */
  window.strToggleGj = function () {
    S.gj = !S.gj;
    var el = document.getElementById('str-toggle-gj');
    el.classList.toggle('str-on', S.gj);
    el.setAttribute('aria-checked', S.gj ? 'true' : 'false');
    recount();
  };

  /* ── Filterlogik ── */
  function sacNum(sac) {
    if (!sac) return 0;
    var m = /T\s*([1-6])/i.exec(sac);
    return m ? parseInt(m[1], 10) : 0;
  }
  function filtered() {
    return S.routes.filter(function (r) {
      var km  = parseFloat(r.distanceTagKm || r.distanceKm || 0);
      var hm  = parseInt(r.ascentM || 0, 10);
      var sac = sacNum(r.sac);
      if (km  < S.distLo)                    return false;
      if (S.distHi < 50 && km > S.distHi)   return false;
      if (hm  < S.ascLo)                     return false;
      if (S.ascHi < 3000 && hm > S.ascHi)   return false;
      if (sac && (sac < S.sacLo || sac > S.sacHi)) return false;
      if (S.gj && r.season !== 'ganzjaehrig') return false;
      return true;
    });
  }
  function recount() {
    if (!S.routes.length) return;
    var n = filtered().length;
    document.getElementById('str-hint').textContent =
      n + ' Route' + (n !== 1 ? 'n' : '') + ' gefunden. Danach folgt die passende Sage.';
  }

  /* ── Kanton auswählen ── */
  window.strSelectKanton = function (apiName, code, el) {
    document.querySelectorAll('.str-kanton-card').forEach(function (c) {
      c.classList.remove('str-active');
    });
    el.classList.add('str-active');
    S.kanton = apiName;
    S.routes = [];
    document.getElementById('str-filter-title').textContent = apiName;
    document.getElementById('str-filter-section').classList.add('str-visible');
    document.getElementById('str-results-section').classList.remove('str-visible');
    document.getElementById('str-hint').textContent = '';
    setTimeout(function () {
      document.getElementById('str-filter-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    /* Routen per PHP-AJAX vorladen */
    preload(apiName);
  };

  /* ── PHP-AJAX Fetch (server-seitiger API-Call + WP-Transient) ── */
  var preloaded = {};
  function preload(kanton) {
    if (preloaded[kanton]) { S.routes = preloaded[kanton]; recount(); return; }
    fetch(AJAX_URL + '?action=str_routes&kanton=' + encodeURIComponent(kanton))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var routes = Array.isArray(data) ? data : [];
        preloaded[kanton] = routes;
        if (S.kanton === kanton) { S.routes = routes; recount(); }
      })
      .catch(function () {});
  }

  /* ── Suchen: Filter client-seitig auf geladenen Daten ── */
  window.strSearch = function () {
    if (!S.kanton || S.loading) return;
    var results = document.getElementById('str-results-section');
    var list    = document.getElementById('str-route-list');
    results.classList.add('str-visible');
    document.getElementById('str-results-title').textContent = S.kanton;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!preloaded[S.kanton]) {
      /* Noch nicht geladen → warten */
      list.innerHTML = '<div class="str-spinner"><div class="str-spinner-ring"></div></div>';
      S.loading = true;
      document.getElementById('str-search-btn').disabled = true;
      fetch(AJAX_URL + '?action=str_routes&kanton=' + encodeURIComponent(S.kanton))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var routes = Array.isArray(data) ? data : [];
          preloaded[S.kanton] = routes;
          S.routes = routes;
          S.loading = false;
          document.getElementById('str-search-btn').disabled = false;
          renderRoutes();
        })
        .catch(function () {
          S.loading = false;
          document.getElementById('str-search-btn').disabled = false;
          list.innerHTML = '<div class="str-empty"><div class="str-empty-icon">⚠️</div><h3>Fehler beim Laden</h3><p>Bitte versuche es erneut.</p></div>';
        });
    } else {
      renderRoutes();
    }
  };

  /* ── Rendern ── */
  function esc(s) {
    return s ? String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
  }
  function fmtKm(v)  { return v ? parseFloat(v).toFixed(1) + ' km' : null; }
  function fmtHm(v)  { return v ? '+' + Math.round(v) + ' hm' : null; }
  function fmtMin(m) {
    if (!m) return null;
    return m < 60 ? m + ' Min.' : Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60) + ' h';
  }
  function sacCls(sac) { var n = sacNum(sac); return 'str-tag-T' + Math.min(6, Math.max(1, n || 1)); }

  function renderRoutes() {
    var visible = filtered();
    var badge   = document.getElementById('str-results-badge');
    var list    = document.getElementById('str-route-list');

    badge.textContent   = visible.length + ' Route' + (visible.length !== 1 ? 'n' : '');
    badge.style.display = '';

    /* Schema.org JSON-LD */
    var old = document.getElementById('str-schema');
    if (old) old.remove();
    var sc = document.createElement('script');
    sc.id = 'str-schema'; sc.type = 'application/ld+json';
    sc.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ItemList',
      'name': 'Wanderrouten ' + S.kanton,
      'description': 'GPS-geführte Sagenrouten in ' + S.kanton,
      'numberOfItems': visible.length,
      'itemListElement': visible.slice(0, 50).map(function (r, i) {
        return {
          '@type': 'TouristAttraction', 'position': i + 1, 'name': r.name,
          'description': r.description ? r.description.replace(/<[^>]*>/g, '').substring(0, 160) : undefined,
        };
      }),
    });
    document.head.appendChild(sc);

    if (!visible.length) {
      list.innerHTML = '<div class="str-empty"><div class="str-empty-icon">🏔️</div><h3>Keine Routen für diesen Filter</h3><p>Passe Distanz, Höhenmeter oder Schwierigkeit an.</p></div>';
      return;
    }

    list.innerHTML = visible.map(function (r) {
      var sac  = r.sac && r.sac !== 'unbekannt' ? r.sac : null;
      var desc = r.description ? r.description.replace(/<[^>]*>/g, '').substring(0, 160) : '';
      var photo = r.photoUrl
        ? '<img src="' + esc(r.photoUrl) + '" alt="' + esc(r.name) + '" loading="lazy">'
        : '<div class="str-route-photo-ph">🏔️</div>';
      var tags = '<span class="str-tag str-tag-dist">📍 ' + (esc(fmtKm(r.distanceTagKm || r.distanceKm)) || '—') + '</span>';
      var hm = fmtHm(r.ascentM); if (hm) tags += '<span class="str-tag str-tag-asc">↑ ' + esc(hm) + '</span>';
      var tm = fmtMin(r.minutes); if (tm) tags += '<span class="str-tag str-tag-time">⏱ ' + esc(tm) + '</span>';
      if (sac) tags += '<span class="str-tag ' + sacCls(r.sac) + '">' + esc(sac) + '</span>';
      return '<div class="str-route-card" itemscope itemtype="https://schema.org/TouristAttraction">'
        + '<div class="str-route-photo">' + photo + '</div>'
        + '<div class="str-route-body">'
        + '<h3 class="str-route-name" itemprop="name">' + esc(r.name) + '</h3>'
        + '<div class="str-route-meta">' + tags + '</div>'
        + (desc ? '<p class="str-route-desc" itemprop="description">' + esc(desc) + '…</p>' : '')
        + '<a class="str-app-link" href="https://apps.apple.com/de/app/sagatrail/id6788260668" target="_blank" rel="noopener">→ In der SagaTrail-App öffnen</a>'
        + '</div></div>';
    }).join('');
  }
})();
</script>
