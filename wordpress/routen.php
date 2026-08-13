<?php
/**
 * SagaTrail Routen — WPCode PHP Snippet
 * Typ: PHP Snippet · Ort: Nur auf der Routen-Seite (oder Überall)
 *
 * Routen werden direkt vom Browser via fetch() geladen —
 * die API erlaubt CORS für sagatrail.ch explizit.
 */

/* ── Nur auf der Routen-Seite rendern ── */
if ( ! is_page( 'routen' ) ) return;

/* ════════════════════════════════════════════════════════════════
   SEO: Alle 26 Kantone server-seitig vorladen (parallel curl_multi)
   Ergebnis in WP-Option gecacht (6 h). Wird als verstecktes HTML
   + JSON-LD in die Seite eingebettet → Google sieht alle Routen
   ohne JS-Interaktion.
   ════════════════════════════════════════════════════════════════ */
if ( ! function_exists( 'str_fetch_all_routes' ) ) :
function str_fetch_all_routes( array $kantone ): array {
  $cache_key = 'str_all_routes_v2';
  $cached    = get_option( $cache_key );
  if ( $cached && isset( $cached['ts'] ) && time() - $cached['ts'] < 6 * 3600 ) {
    return $cached['data'];
  }

  $mh      = curl_multi_init();
  $handles = [];
  foreach ( $kantone as $k ) {
    $ch = curl_init( 'https://saga-trail.replit.app/api/cantons/' . rawurlencode( $k['api'] ) . '/routes' );
    curl_setopt_array( $ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 20,
      CURLOPT_SSL_VERIFYPEER => true,
    ] );
    curl_multi_add_handle( $mh, $ch );
    $handles[ $k['api'] ] = $ch;
  }
  $active = null;
  do { curl_multi_exec( $mh, $active ); curl_multi_select( $mh ); } while ( $active > 0 );

  $all = [];
  foreach ( $handles as $kanton => $ch ) {
    $body       = curl_multi_getcontent( $ch );
    $data       = json_decode( $body, true );
    $all[ $kanton ] = is_array( $data ) ? $data : [];
    curl_multi_remove_handle( $mh, $ch );
    curl_close( $ch );
  }
  curl_multi_close( $mh );

  update_option( $cache_key, [ 'ts' => time(), 'data' => $all ], false );
  return $all;
}
endif;

/* ── Kantondaten ── */
$str_wp = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
$str_kantone = [
  [ 'api' => 'Aargau',                 'code' => 'AG', 'svg' => 'Wappen_Aargau_matt.svg' ],
  [ 'api' => 'Appenzell Ausserrhoden', 'code' => 'AR', 'svg' => 'Wappen_Appenzell_Ausserrhoden_matt.svg' ],
  [ 'api' => 'Appenzell Innerrhoden',  'code' => 'AI', 'svg' => 'Wappen_Appenzell_Innerrhoden_matt.svg' ],
  [ 'api' => 'Basel-Landschaft',       'code' => 'BL', 'svg' => 'Coat_of_arms_of_Kanton_Basel-Landschaft.svg' ],
  [ 'api' => 'Basel-Stadt',            'code' => 'BS', 'svg' => 'Wappen_Basel-Stadt_matt.svg' ],
  [ 'api' => 'Bern',                   'code' => 'BE', 'svg' => 'Wappen_Bern_matt.svg' ],
  [ 'api' => 'Freiburg',               'code' => 'FR', 'svg' => 'Wappen_Freiburg_matt.svg' ],
  [ 'api' => 'Genf',                   'code' => 'GE', 'svg' => 'Wappen_Genf_matt.svg' ],
  [ 'api' => 'Glarus',                 'code' => 'GL', 'svg' => 'Wappen_Glarus_matt.svg' ],
  [ 'api' => 'Graubünden',             'code' => 'GR', 'svg' => 'Wappen_Graub%C3%BCnden_matt.svg' ],
  [ 'api' => 'Jura',                   'code' => 'JU', 'svg' => 'Wappen_Jura_matt.svg' ],
  [ 'api' => 'Luzern',                 'code' => 'LU', 'svg' => 'Wappen_Luzern_matt.svg' ],
  [ 'api' => 'Neuenburg',              'code' => 'NE', 'svg' => 'Wappen_Neuenburg_matt.svg' ],
  [ 'api' => 'Nidwalden',              'code' => 'NW', 'svg' => 'Wappen_Nidwalden_matt.svg' ],
  [ 'api' => 'Obwalden',               'code' => 'OW', 'svg' => 'Wappen_Obwalden_matt.svg' ],
  [ 'api' => 'Schaffhausen',           'code' => 'SH', 'svg' => 'Wappen_Schaffhausen_matt.svg' ],
  [ 'api' => 'Schwyz',                 'code' => 'SZ', 'svg' => 'Wappen_Schwyz_matt.svg' ],
  [ 'api' => 'Solothurn',              'code' => 'SO', 'svg' => 'Wappen_Solothurn_matt.svg' ],
  [ 'api' => 'St. Gallen',             'code' => 'SG', 'svg' => 'Coat_of_arms_of_canton_of_St._Gallen.svg' ],
  [ 'api' => 'Tessin',                 'code' => 'TI', 'svg' => 'Wappen_Tessin_matt.svg' ],
  [ 'api' => 'Thurgau',                'code' => 'TG', 'svg' => 'Wappen_Thurgau_matt.svg' ],
  [ 'api' => 'Uri',                    'code' => 'UR', 'svg' => 'Wappen_Uri_matt.svg' ],
  [ 'api' => 'Waadt',                  'code' => 'VD', 'svg' => 'Wappen_Waadt_matt.svg' ],
  [ 'api' => 'Wallis',                 'code' => 'VS', 'svg' => 'Wappen_Wallis_matt.svg' ],
  [ 'api' => 'Zug',                    'code' => 'ZG', 'svg' => 'Wappen_Zug_matt.svg' ],
  [ 'api' => 'Zürich',                 'code' => 'ZH', 'svg' => 'Wappen_Z%C3%BCrich_matt.svg' ],
];

/* ── Alle Routen laden (gecacht) ── */
$str_all_routes = str_fetch_all_routes( $str_kantone );

/* ── JSON-LD: alle Routen als TouristAttraction-ItemList ── */
$ld_items = [];
$ld_i     = 1;
foreach ( $str_all_routes as $kanton => $routes ) {
  foreach ( $routes as $r ) {
    $ld_items[] = array_filter( [
      '@type'       => 'TouristAttraction',
      'position'    => $ld_i++,
      'name'        => $r['name'] ?? null,
      'description' => isset( $r['description'] )
        ? wp_strip_all_tags( $r['description'] )
        : null,
      'url'         => 'https://apps.apple.com/de/app/sagatrail/id6788260668',
      'touristType' => 'Wanderer',
      'geo'         => isset( $r['startLat'], $r['startLng'] ) ? [
        '@type'     => 'GeoCoordinates',
        'latitude'  => $r['startLat'],
        'longitude' => $r['startLng'],
      ] : null,
      'containedInPlace' => [ '@type' => 'AdministrativeArea', 'name' => $kanton . ', Schweiz' ],
    ] );
    if ( $ld_i > 500 ) break 2; /* Limit für JSON-LD-Grösse */
  }
}
echo '<script type="application/ld+json">' . wp_json_encode( [
  '@context'        => 'https://schema.org',
  '@type'           => 'ItemList',
  'name'            => 'SagaTrail – Wanderrouten Schweiz',
  'description'     => 'GPS-geführte Sagenwanderungen in allen 26 Schweizer Kantonen.',
  'numberOfItems'   => count( $ld_items ),
  'itemListElement' => $ld_items,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>';
?>
<style>
.str-wrap*,.str-wrap *::before,.str-wrap *::after{box-sizing:border-box;margin:0;padding:0}
.str-wrap{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6}
.str-fw{width:100vw;position:relative;left:50%;margin-left:-50vw}
.str-inner{max-width:1100px;margin:0 auto;padding:0 24px}

/* Hero */
.str-hero{background:#CC0000;padding:64px 0 52px;color:#fff}
.str-hero-badge{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 16px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px;color:#fff}
.str-hero h1{font-size:clamp(1.9rem,5vw,3rem);font-weight:800;line-height:1.1;margin-bottom:14px;color:#fff}
.str-hero p{font-size:1.05rem;max-width:560px;opacity:.9;color:#fff}
.str-hero-stats{display:flex;gap:36px;flex-wrap:wrap;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,.2)}
.str-hero-stat strong{display:block;font-size:1.8rem;font-weight:800;color:#fff;line-height:1}
.str-hero-stat span{font-size:.8rem;opacity:.75;color:#fff}

/* Abschnitt */
.str-section-label{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#CC0000;margin-bottom:8px}
.str-section-title{font-size:clamp(1.3rem,2.5vw,1.9rem);font-weight:800;margin-bottom:24px}

/* Kanton-Grid */
.str-kanton-section{padding:48px 0 36px;background:#f7f7f5}
.str-kanton-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:9px}
.str-kanton-card{background:#fff;border:1.5px solid #e8e8e6;border-radius:14px;padding:14px 8px 11px;text-align:center;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .12s;user-select:none}
.str-kanton-card:hover{border-color:#CC0000;box-shadow:0 4px 14px rgba(204,0,0,.12);transform:translateY(-2px)}
.str-kanton-card.str-active{border-color:#CC0000;background:#CC0000}
.str-kanton-wappen{width:48px;height:48px;margin:0 auto 7px;display:flex;align-items:center;justify-content:center}
.str-kanton-wappen img{width:48px;height:48px;object-fit:contain;border-radius:3px}
.str-kanton-code{font-size:.78rem;font-weight:800;letter-spacing:.08em;color:#1a1a1a}
.str-kanton-name{font-size:.66rem;color:#777;line-height:1.25;margin-top:2px}
.str-kanton-card.str-active .str-kanton-code,
.str-kanton-card.str-active .str-kanton-name{color:#fff}
.str-kanton-card.str-active .str-kanton-wappen img{filter:brightness(0) invert(1)}

/* Filter */
.str-filter-section{background:#f7f7f5;padding-bottom:8px;display:none}
.str-filter-section.str-visible{display:block}
.str-filter-card{background:#fff;border:1.5px solid #e8e8e6;border-radius:16px;padding:20px 20px 8px;margin-bottom:16px}
.str-filter-header{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #f0f0ee}
.str-filter-icon{width:34px;height:34px;background:#CC0000;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.str-filter-icon svg{width:18px;height:18px}
.str-filter-title-text{font-size:1rem;font-weight:700;color:#1a1a1a}
.str-filter-row{margin-bottom:20px}
.str-filter-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.str-filter-row-label{font-size:.9rem;font-weight:600;color:#1a1a1a}
.str-filter-row-val{font-size:.82rem;font-weight:600;color:#CC0000}

/* ── Custom Dual-Range (keine overlapping inputs) ── */
.str-dual-range{position:relative;height:36px;display:flex;align-items:center;user-select:none}
.str-range-track{position:absolute;left:0;right:0;height:4px;background:#e0e0e0;border-radius:2px}
.str-range-fill{position:absolute;height:4px;background:#CC0000;border-radius:2px;left:0;width:100%}
.str-thumb{
  position:absolute;top:50%;transform:translate(-50%,-50%);
  width:30px;height:30px;border-radius:50%;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23CC0000'/%3E%3Crect x='16.5' y='8' width='7' height='24' rx='1.5' fill='white'/%3E%3Crect x='8' y='16.5' width='24' height='7' rx='1.5' fill='white'/%3E%3C/svg%3E") center/cover no-repeat;
  cursor:pointer;touch-action:none;
  box-shadow:0 2px 8px rgba(204,0,0,.35);
  transition:transform .1s;z-index:2
}
.str-thumb:hover,.str-thumb.str-dragging{transform:translate(-50%,-50%) scale(1.12)}

/* Toggle */
.str-toggle-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid #f0f0ee}
.str-toggle-label{font-size:.9rem;font-weight:500;color:#1a1a1a}
.str-toggle{position:relative;width:48px;height:28px;background:#ddd;border-radius:14px;cursor:pointer;transition:background .2s;flex-shrink:0}
.str-toggle.str-on{background:#CC0000}
.str-toggle::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .2s}
.str-toggle.str-on::after{transform:translateX(20px)}

/* Suchen-Button */
.str-search-btn{width:100%;padding:16px;background:#CC0000;color:#fff;border:none;border-radius:12px;font-size:.85rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin:8px 0 14px;transition:opacity .15s,transform .1s;display:flex;align-items:center;justify-content:center;gap:8px}
.str-search-btn:hover{opacity:.88;transform:translateY(-1px)}
.str-search-btn:active{transform:translateY(0);opacity:.8}
.str-search-btn:disabled{opacity:.5;cursor:default}
.str-route-count-hint{font-size:.82rem;color:#888;margin-bottom:20px}

/* Ergebnisse */
.str-results-section{padding:8px 0 64px;background:#f7f7f5;display:none}
.str-results-section.str-visible{display:block}
.str-results-header{display:flex;align-items:baseline;gap:12px;margin-bottom:20px}
.str-results-title{font-size:1.3rem;font-weight:800;color:#1a1a1a}
.str-results-badge{background:#CC0000;color:#fff;border-radius:20px;padding:2px 10px;font-size:.78rem;font-weight:700;display:none}
.str-route-list{display:flex;flex-direction:column;gap:0}
/* ── App-Style RouteCard ── */
.str-route-card{position:relative;height:200px;border-radius:18px;overflow:hidden;cursor:pointer;margin-bottom:14px;box-shadow:0 6px 18px rgba(0,0,0,.22),0 1px 4px rgba(0,0,0,.14)}
.str-rc-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.str-rc-img-ph{position:absolute;inset:0;background:linear-gradient(135deg,#2a2a28,#1a1a18);display:flex;align-items:center;justify-content:center;font-size:3rem}
.str-rc-attr{position:absolute;top:8px;right:10px;max-width:70%;background:rgba(8,10,12,.58);border-radius:6px;padding:3px 6px;font-size:11px;color:rgba(255,255,255,.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.str-rc-content{position:absolute;left:16px;right:16px;bottom:40px}
.str-rc-bar{position:absolute;left:0;right:0;bottom:0;height:28px;background:rgba(227,6,19,.55);display:flex;align-items:center;justify-content:center;padding:0 10px;font-size:12px;font-weight:600;color:#fff;letter-spacing:.3px;text-shadow:0 1px 2px rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* ── Wegweiser (Schweizer Wanderwegschild) ── */
.str-ww{display:flex;flex-direction:row;align-items:center;align-self:flex-start;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
.str-ww-body{display:flex;flex-direction:row;align-items:center;background:rgba(255,204,0,.55);padding-left:6px;padding-right:8px;gap:8px;overflow:hidden}
.str-ww-green{background:#7FB73F;padding:5px 5px 4px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;flex-shrink:0}
.str-ww-kat{color:#141412;font-size:7px;line-height:8.5px;font-weight:700;font-style:italic;white-space:pre-line}
.str-ww-numrow{display:flex;flex-direction:row;align-items:flex-end;justify-content:space-between;width:100%}
/* Schweizer Flagge */
.str-ww-flag{width:11px;height:11px;background:#C42526;transform:rotate(-8deg);position:relative;margin-bottom:3px;flex-shrink:0}
.str-ww-fh,.str-ww-fv{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff}
.str-ww-fh{width:62%;height:20%}
.str-ww-fv{width:20%;height:62%}
/* Kantonswappen im grünen Feld */
.str-ww-wp{width:12px;height:12px;object-fit:contain;margin-bottom:3px;flex-shrink:0}
.str-ww-wp-lg{width:16px;height:16px;object-fit:contain;margin-bottom:2px}
/* Nummer */
.str-ww-num{color:#fff;font-size:27px;line-height:28px;font-weight:900;font-style:italic;margin-left:auto}
.str-ww-num-sm{color:#fff;font-size:14px;line-height:16px;font-weight:900;font-style:italic;margin-left:auto}
/* Wegweiser Text */
.str-ww-text{display:flex;flex-direction:column;min-width:0;flex:1}
.str-ww-titel{color:#fff;font-size:19px;line-height:22px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.str-ww-zeile{color:#fff;font-size:12px;line-height:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Pfeilspitze — via clip-path inline generiert, kein eigenes CSS nötig */
/* Modal Tags */
.str-tag{display:inline-flex;align-items:center;gap:3px;border-radius:6px;padding:2px 7px;font-size:.72rem;font-weight:600;white-space:nowrap}
.str-tag-dist{background:#f0f0f0;color:#444}
.str-tag-asc{background:#eef3fb;color:#2563eb}
.str-tag-time{background:#f0fdf4;color:#16a34a}
.str-tag-T1{background:#dcfce7;color:#15803d}
.str-tag-T2{background:#d1fae5;color:#059669}
.str-tag-T3{background:#fff7ed;color:#ea580c}
.str-tag-T4{background:#fee2e2;color:#dc2626}
.str-tag-T5{background:#fef2f2;color:#991b1b}
.str-tag-T6{background:#1a1a1a;color:#fff}
/* ── Route-Modal ── */
.str-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .22s;pointer-events:none}
.str-modal-backdrop.str-open{opacity:1;pointer-events:auto}
@media(min-width:640px){.str-modal-backdrop{align-items:center}}
.str-modal{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:720px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;transform:translateY(40px);transition:transform .26s cubic-bezier(.22,1,.36,1)}
@media(min-width:640px){.str-modal{border-radius:20px;transform:scale(.96);max-height:88vh;box-shadow:0 24px 60px rgba(0,0,0,.22)}}
.str-modal-backdrop.str-open .str-modal{transform:translateY(0) scale(1)}
.str-modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #f0f0ee;flex-shrink:0}
.str-modal-title{font-size:1.05rem;font-weight:800;color:#1a1a1a;line-height:1.3;padding-right:12px}
.str-modal-close{width:32px;height:32px;border:none;background:#f0f0ee;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#444;transition:background .15s;line-height:1}
.str-modal-close:hover{background:#e0e0e0}
.str-modal-map{flex-shrink:0;height:260px;background:#e8ede8;position:relative}
@media(min-width:640px){.str-modal-map{height:320px}}
#str-map{width:100%;height:100%}
.str-modal-body{overflow-y:auto;padding:16px 20px 28px;flex:1}
.str-modal-tags{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.str-modal-desc{font-size:.88rem;color:#555;line-height:1.65;margin-bottom:18px}
.str-modal-cta{display:flex;align-items:center;justify-content:center;gap:10px;background:#CC0000;color:#fff;border:none;border-radius:12px;padding:14px 20px;font-size:.88rem;font-weight:700;cursor:pointer;text-decoration:none;width:100%}
.str-modal-cta:hover{opacity:.88}
.str-spinner{text-align:center;padding:60px 20px}
.str-spinner-ring{display:inline-block;width:40px;height:40px;border:3px solid #e8e8e6;border-top-color:#CC0000;border-radius:50%;animation:str-spin .7s linear infinite}
@keyframes str-spin{to{transform:rotate(360deg)}}
.str-empty{text-align:center;padding:50px 20px}
.str-empty-icon{font-size:2.8rem;margin-bottom:14px}
.str-empty h3{font-size:1rem;font-weight:700;margin-bottom:6px;color:#444}
.str-empty p{font-size:.85rem;color:#888}
.str-cta{background:#1a1a1a;padding:52px 0}
.str-cta h2{font-size:clamp(1.3rem,2.5vw,1.9rem);font-weight:800;color:#fff;margin-bottom:10px}
.str-cta p{color:rgba(255,255,255,.65);margin-bottom:24px}
.str-cta-btns{display:flex;gap:12px;flex-wrap:wrap}
.str-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:10px;font-weight:700;font-size:.88rem;background:#CC0000;color:#fff;text-decoration:none;transition:opacity .15s}
.str-cta-btn:hover{opacity:.85}
.str-cta-btn-out{background:transparent;border:1.5px solid rgba(255,255,255,.28)}
@media(max-width:560px){
  .str-route-photo{width:88px;min-width:88px}
  .str-route-body{padding:11px 12px}
  .str-kanton-grid{grid-template-columns:repeat(auto-fill,minmax(94px,1fr));gap:6px}
  .str-kanton-wappen,.str-kanton-wappen img{width:38px;height:38px}
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
    <div class="str-kanton-grid">
      <?php foreach ( $str_kantone as $k ) : ?>
      <div class="str-kanton-card"
           data-api="<?php echo esc_attr( $k['api'] ); ?>"
           onclick="strSelectKanton('<?php echo esc_js( $k['api'] ); ?>',this)">
        <div class="str-kanton-wappen">
          <img src="<?php echo esc_url( $str_wp . $k['svg'] ); ?>"
               alt="Wappen <?php echo esc_attr( $k['api'] ); ?>"
               loading="lazy" onerror="this.style.display='none'">
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
        <div class="str-dual-range" id="str-dist-range">
          <div class="str-range-track"><div class="str-range-fill" id="str-dist-fill"></div></div>
          <div class="str-thumb" id="str-dist-lo"></div>
          <div class="str-thumb" id="str-dist-hi"></div>
        </div>
      </div>

      <!-- Höhenmeter -->
      <div class="str-filter-row">
        <div class="str-filter-row-head">
          <span class="str-filter-row-label">Höhenmeter</span>
          <span class="str-filter-row-val" id="str-asc-val">0 hm – 3000+ hm</span>
        </div>
        <div class="str-dual-range" id="str-asc-range">
          <div class="str-range-track"><div class="str-range-fill" id="str-asc-fill"></div></div>
          <div class="str-thumb" id="str-asc-lo"></div>
          <div class="str-thumb" id="str-asc-hi"></div>
        </div>
      </div>

      <!-- Schwierigkeit -->
      <div class="str-filter-row" style="margin-bottom:4px">
        <div class="str-filter-row-head">
          <span class="str-filter-row-label">Schwierigkeit</span>
          <span class="str-filter-row-val" id="str-sac-val">T1 – T6</span>
        </div>
        <div class="str-dual-range" id="str-sac-range">
          <div class="str-range-track"><div class="str-range-fill" id="str-sac-fill"></div></div>
          <div class="str-thumb" id="str-sac-lo"></div>
          <div class="str-thumb" id="str-sac-hi"></div>
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

<!-- Route-Modal -->
<div class="str-modal-backdrop" id="str-modal-backdrop" onclick="strCloseModal(event)">
  <div class="str-modal" role="dialog" aria-modal="true">
    <div class="str-modal-head">
      <h2 class="str-modal-title" id="str-modal-title"></h2>
      <button class="str-modal-close" onclick="strCloseModal()" aria-label="Schliessen">✕</button>
    </div>
    <div class="str-modal-map"><div id="str-map"></div></div>
    <div class="str-modal-body">
      <div class="str-modal-tags" id="str-modal-tags"></div>
      <p class="str-modal-desc" id="str-modal-desc"></p>
      <a id="str-modal-cta" class="str-modal-cta" href="https://apps.apple.com/de/app/sagatrail/id6788260668" target="_blank" rel="noopener">
        🍎 &nbsp;In der SagaTrail-App öffnen
      </a>
    </div>
  </div>
</div>

<!-- SEO: Alle Routen als crawlbares HTML (für Google, ohne JS-Interaktion) -->
<div id="str-seo" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">
  <h2>Wanderrouten in der Schweiz nach Kanton</h2>
  <?php foreach ( $str_all_routes as $kanton => $routes ) : if ( empty( $routes ) ) continue; ?>
  <section>
    <h3>Wanderrouten <?php echo esc_html( $kanton ); ?> (<?php echo count( $routes ); ?> Routen)</h3>
    <ul>
      <?php foreach ( array_slice( $routes, 0, 40 ) as $r ) :
        $km  = $r['distanceTagKm'] ?? $r['distanceKm'] ?? null;
        $hm  = $r['ascentM'] ?? null;
        $sac = $r['sac'] ?? null;
        $desc = isset( $r['description'] ) ? wp_strip_all_tags( $r['description'] ) : '';
      ?>
      <li>
        <strong><?php echo esc_html( $r['name'] ?? '' ); ?></strong>
        <?php if ( $km )  echo ' · ' . esc_html( round( (float) $km, 1 ) ) . ' km'; ?>
        <?php if ( $hm )  echo ' · +' . esc_html( (int) $hm ) . ' hm'; ?>
        <?php if ( $sac ) echo ' · ' . esc_html( $sac ); ?>
        <?php if ( $desc ) echo ' — ' . esc_html( mb_substr( $desc, 0, 140 ) ) . '…'; ?>
      </li>
      <?php endforeach; ?>
    </ul>
  </section>
  <?php endforeach; ?>
</div>

</div><!-- .str-wrap -->

<script>
(function(){
'use strict';

/* ── Kanton→Wappen-URL (PHP-generiert) ── */
var STR_WAPPEN=<?php
  $jw=[];
  foreach($str_kantone as $k){ $jw[$k['api']]='https://commons.wikimedia.org/wiki/Special:FilePath/'.$k['svg']; }
  echo wp_json_encode($jw,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
?>;

/* ── State ── */
var S={kanton:null,kantonWappen:null,routes:[],distLo:0,distHi:50,ascLo:0,ascHi:3000,sacLo:1,sacHi:6,gj:false,loading:false};
var cache={};

/* ══════════════════════════════════════
   CUSTOM DUAL-RANGE SLIDER
   Zwei unabhängige Div-Thumbs — kein
   overlapping-input-Problem möglich.
   ══════════════════════════════════════ */
function initSlider(opts){
  /* opts: {wrapId, loId, hiId, fillId, min, max, initLo, initHi, step, onUpdate} */
  var wrap=document.getElementById(opts.wrapId);
  var tLo =document.getElementById(opts.loId);
  var tHi =document.getElementById(opts.hiId);
  var fill=document.getElementById(opts.fillId);
  var mn=opts.min, mx=opts.max, step=opts.step;
  var vLo=opts.initLo, vHi=opts.initHi;

  function snap(v){ return Math.round(Math.max(mn,Math.min(mx,v))/step)*step; }
  function pct(v){ return (v-mn)/(mx-mn)*100; }

  function render(){
    tLo.style.left=pct(vLo)+'%';
    tHi.style.left=pct(vHi)+'%';
    fill.style.left=pct(vLo)+'%';
    fill.style.width=(pct(vHi)-pct(vLo))+'%';
    opts.onUpdate(vLo,vHi);
  }

  function drag(thumb,isLo){
    function move(cx){
      var rect=wrap.getBoundingClientRect();
      var v=snap(mn+(cx-rect.left)/rect.width*(mx-mn));
      if(isLo){ vLo=Math.min(v,vHi); } else { vHi=Math.max(v,vLo); }
      render();
    }
    /* mouse */
    thumb.addEventListener('mousedown',function(e){
      e.preventDefault();
      thumb.classList.add('str-dragging');
      function mm(e){move(e.clientX);}
      function mu(){thumb.classList.remove('str-dragging');document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
      document.addEventListener('mousemove',mm);
      document.addEventListener('mouseup',mu);
    });
    /* touch */
    thumb.addEventListener('touchstart',function(e){
      e.preventDefault();
      thumb.classList.add('str-dragging');
      function tm(e){if(e.touches[0])move(e.touches[0].clientX);}
      function te(){thumb.classList.remove('str-dragging');document.removeEventListener('touchmove',tm);document.removeEventListener('touchend',te);}
      document.addEventListener('touchmove',tm,{passive:false});
      document.addEventListener('touchend',te);
    },{passive:false});
  }

  drag(tLo,true);
  drag(tHi,false);
  render();
}

/* ── Slider initialisieren ── */
initSlider({wrapId:'str-dist-range',loId:'str-dist-lo',hiId:'str-dist-hi',fillId:'str-dist-fill',
  min:0,max:50,initLo:0,initHi:50,step:1,
  onUpdate:function(lo,hi){S.distLo=lo;S.distHi=hi;document.getElementById('str-dist-val').textContent=lo+' km – '+(hi>=50?'50+ km':hi+' km');recount();}});

initSlider({wrapId:'str-asc-range',loId:'str-asc-lo',hiId:'str-asc-hi',fillId:'str-asc-fill',
  min:0,max:3000,initLo:0,initHi:3000,step:50,
  onUpdate:function(lo,hi){S.ascLo=lo;S.ascHi=hi;document.getElementById('str-asc-val').textContent=lo+' hm – '+(hi>=3000?'3000+ hm':hi+' hm');recount();}});

initSlider({wrapId:'str-sac-range',loId:'str-sac-lo',hiId:'str-sac-hi',fillId:'str-sac-fill',
  min:1,max:6,initLo:1,initHi:6,step:1,
  onUpdate:function(lo,hi){S.sacLo=lo;S.sacHi=hi;document.getElementById('str-sac-val').textContent='T'+lo+' – T'+hi;recount();}});

/* ── Toggle ── */
window.strToggleGj=function(){
  S.gj=!S.gj;
  var el=document.getElementById('str-toggle-gj');
  el.classList.toggle('str-on',S.gj);
  el.setAttribute('aria-checked',S.gj?'true':'false');
  recount();
};

/* ── Filter ── */
function sacNum(s){if(!s)return 0;var m=/T\s*([1-6])/i.exec(s);return m?parseInt(m[1],10):0;}
function filtered(){
  return S.routes.filter(function(r){
    var km=parseFloat(r.distanceTagKm||r.distanceKm||0);
    var hm=parseInt(r.ascentM||0,10);
    var sac=sacNum(r.sac);
    if(km<S.distLo)return false;
    if(S.distHi<50&&km>S.distHi)return false;
    if(hm<S.ascLo)return false;
    if(S.ascHi<3000&&hm>S.ascHi)return false;
    if(sac&&(sac<S.sacLo||sac>S.sacHi))return false;
    if(S.gj&&r.season!=='ganzjaehrig')return false;
    return true;
  });
}
function recount(){
  if(!S.routes.length)return;
  var n=filtered().length;
  document.getElementById('str-hint').textContent=n+' Route'+(n!==1?'n':'')+' gefunden. Danach folgt die passende Sage.';
}

/* ══════════════════════════════════════════════════════════
   parseRouteName — Port der TS-Logik aus Wegweiser.tsx
   ══════════════════════════════════════════════════════════ */
function parseRouteName(name){
  var rest=name.trim(), nummer=null, kategorie=null;
  var k=rest.match(/^K(\d+)\s+(?:([A-Z]{2})\s+)?(.*)$/);
  if(k){ nummer=k[1]; kategorie=k[2]||null; rest=k[3]; }
  else {
    var m=rest.match(/^(\d{1,3}[a-z]?)\s+(.*)$/);
    if(m){
      nummer=m[1];
      var nl=parseInt(m[1],10).toString().length;
      kategorie=nl===1?'Wanderland national':nl===2?'Wanderland regional':'Wanderland lokal';
      rest=m[2];
    }
  }
  var es=rest.match(/^(Etappe\s+(\d+))\s*[:\s]\s*(.+?)\s*[-–]\s*(.+)$/i);
  if(es&&!nummer) return {nummer:es[2],kategorie:null,titel:es[1],etappe:null,strecke:es[3].trim()+' – '+es[4].trim()};
  var e=rest.match(/^(.*?)\s+((?:Etappe|Étape|Etape|Tappa)\s+\d+[a-z]?)\s*(.*)$/i);
  if(e){
    var t=e[1].trim(), sr=e[3]?e[3].trim():null;
    var ov=t.match(/^(.+?)\s+([^-–\s][^-–]*\s[-–]\s.+)$/);
    if(ov&&ov[1].trim().length>=3)t=ov[1].trim();
    return {nummer:nummer,kategorie:kategorie,titel:t,etappe:e[2],strecke:sr};
  }
  var s=rest.match(/^(.+)\s+([^-–]+\s[-–]\s.+)$/);
  if(s&&s[1].length>=3){
    var t=s[1].trim();
    var iv=t.match(/^(.+?)\s+([^-–\s][^-–]*\s[-–]\s.+)$/);
    if(iv&&iv[1].trim().length>=3)t=iv[1].trim();
    return {nummer:nummer,kategorie:kategorie,titel:t,etappe:null,strecke:s[2].trim()};
  }
  return {nummer:nummer,kategorie:kategorie,titel:rest,etappe:null,strecke:null};
}

/* ══════════════════════════════════════════════════════════
   makeWegweiser — HTML-Äquivalent des RN-Wegweiser
   ══════════════════════════════════════════════════════════ */
function makeWegweiser(name,sac,wpUrl){
  var d=parseRouteName(name);
  var h=54, sw=Math.round(h*0.55); // kompakt
  /* Pfeilfarbe */
  var sacN=sacNum(sac);
  var balken=sacN>=5?'#005EB8':sacN>=3?'#E30613':null;
  var tipClr=balken?'rgba(255,255,255,0.55)':'rgba(255,204,0,0.55)';
  /* Grünes Feld */
  var green='';
  if(d.nummer){
    if(d.kategorie&&d.kategorie.length===2){
      /* Kantonal: Wappen + "K{n}-{code}" */
      green=(wpUrl?'<img class="str-ww-wp-lg" src="'+esc(wpUrl)+'" alt="">':'')
        +'<span class="str-ww-num-sm">K'+esc(d.nummer)+'-'+esc(d.kategorie)+'</span>';
    } else {
      /* National / Regional / Lokal — kein Kategorie-Text */
      var emblem='';
      if(d.kategorie==='Wanderland national'){
        emblem='<div class="str-ww-flag"><div class="str-ww-fh"></div><div class="str-ww-fv"></div></div>';
      } else if(wpUrl&&d.kategorie!=='Wanderland lokal'){
        emblem='<img class="str-ww-wp" src="'+esc(wpUrl)+'" alt="">';
      }
      green='<div class="str-ww-numrow" style="height:100%">'+emblem+'<span class="str-ww-num">'+esc(d.nummer)+'</span></div>';
    }
  }
  /* Beschriftung */
  var txt='<span class="str-ww-titel">'+esc(d.titel)+'</span>';
  if(d.etappe) txt+='<span class="str-ww-zeile">'+esc(d.etappe)+'</span>';
  if(d.strecke) txt+='<span class="str-ww-zeile">'+esc(d.strecke)+'</span>';
  /* Pfeilspitze via clip-path — so kann der Balken absolut positioniert werden */
  var bh=Math.round(h*0.18);
  var tip='<div style="width:'+sw+'px;height:'+h+'px;flex-shrink:0;position:relative;'
    +'clip-path:polygon(0 0,100% 50%,0 100%)">'
    +'<div style="position:absolute;inset:0;background:'+tipClr+'"></div>'
    +(balken?'<div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:'+bh+'px;background:'+balken+'"></div>':'')
    +'</div>';
  return '<div class="str-ww" style="height:'+h+'px">'
    +'<div class="str-ww-body" style="height:'+h+'px">'
    +(d.nummer?'<div class="str-ww-green" style="min-width:'+(h-8)+'px;height:'+(h-8)+'px;padding:5px 7px 4px">'+green+'</div>':'')
    +'<div class="str-ww-text">'+txt+'</div>'
    +'</div>'
    +tip
    +'</div>';
}

/* ── Kanton wählen ── */
window.strSelectKanton=function(api,el){
  document.querySelectorAll('.str-kanton-card').forEach(function(c){c.classList.remove('str-active');});
  el.classList.add('str-active');
  S.kanton=api; S.kantonWappen=STR_WAPPEN[api]||null; S.routes=[];
  document.getElementById('str-filter-title').textContent=api;
  document.getElementById('str-filter-section').classList.add('str-visible');
  document.getElementById('str-results-section').classList.remove('str-visible');
  document.getElementById('str-hint').textContent='';
  setTimeout(function(){document.getElementById('str-filter-section').scrollIntoView({behavior:'smooth',block:'start'});},80);
  preload(api);
};

/* ── REST-API Fetch (server-seitig, WP-Transient-Cache) ── */
function preload(kanton){
  if(cache[kanton]){S.routes=cache[kanton];recount();return;}
  fetch('https://saga-trail.replit.app/api/cantons/'+encodeURIComponent(kanton)+'/routes')
    .then(function(r){return r.json();})
    .then(function(d){cache[kanton]=Array.isArray(d)?d:[];if(S.kanton===kanton){S.routes=cache[kanton];recount();}})
    .catch(function(){});
}

/* ── Suchen ── */
window.strSearch=function(){
  if(!S.kanton||S.loading)return;
  var res=document.getElementById('str-results-section');
  var list=document.getElementById('str-route-list');
  res.classList.add('str-visible');
  document.getElementById('str-results-title').textContent=S.kanton;
  res.scrollIntoView({behavior:'smooth',block:'start'});
  if(!cache[S.kanton]){
    list.innerHTML='<div class="str-spinner"><div class="str-spinner-ring"></div></div>';
    S.loading=true;
    document.getElementById('str-search-btn').disabled=true;
    fetch('https://saga-trail.replit.app/api/cantons/'+encodeURIComponent(S.kanton)+'/routes')
      .then(function(r){return r.json();})
      .then(function(d){
        cache[S.kanton]=Array.isArray(d)?d:[];
        S.routes=cache[S.kanton];
        S.loading=false;
        document.getElementById('str-search-btn').disabled=false;
        renderRoutes();
      })
      .catch(function(){
        S.loading=false;
        document.getElementById('str-search-btn').disabled=false;
        list.innerHTML='<div class="str-empty"><div class="str-empty-icon">⚠️</div><h3>Fehler beim Laden</h3><p>Bitte versuche es erneut.</p></div>';
      });
  }else{renderRoutes();}
};

/* ── Rendern ── */
function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
function fmtKm(v){return v?parseFloat(v).toFixed(1)+' km':null;}
function fmtHm(v){return v?'+'+Math.round(v)+' hm':null;}
function fmtMin(m){if(!m)return null;return m<60?m+' Min.':Math.floor(m/60)+':'+(m%60<10?'0':'')+(m%60)+' h';}
function sacCls(s){var n=sacNum(s);return 'str-tag-T'+Math.min(6,Math.max(1,n||1));}

var _strRouteIndex=[];

function renderRoutes(){
  var vis=filtered();
  _strRouteIndex=vis;
  var badge=document.getElementById('str-results-badge');
  var list=document.getElementById('str-route-list');
  badge.textContent=vis.length+' Route'+(vis.length!==1?'n':'');
  badge.style.display='';
  /* Schema.org */
  var old=document.getElementById('str-schema');if(old)old.remove();
  var sc=document.createElement('script');sc.id='str-schema';sc.type='application/ld+json';
  sc.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList','name':'Wanderrouten '+S.kanton,'numberOfItems':vis.length,
    'itemListElement':vis.slice(0,50).map(function(r,i){return{'@type':'TouristAttraction','position':i+1,'name':r.name};})});
  document.head.appendChild(sc);
  if(!vis.length){
    list.innerHTML='<div class="str-empty"><div class="str-empty-icon">🏔️</div><h3>Keine Routen für diesen Filter</h3><p>Passe Distanz, Höhenmeter oder Schwierigkeit an.</p></div>';
    return;
  }
  list.innerHTML=vis.map(function(r,i){
    var sac=r.sac&&r.sac!=='unbekannt'?r.sac:null;
    var km=r.distanceTagKm||r.distanceKm;
    var mins=r.minutes||0, h2=Math.floor(mins/60), m2=mins%60;
    var season=r.season==='ganzjaehrig'?'Ganzjährig':r.season==='nur_sommer'?'Nur Sommer':r.season==='eher_sommer'?'Eher Sommer':'';
    var bar=[
      sac||'SAC unbekannt',
      km?parseFloat(km).toFixed(1)+' km':null,
      r.ascentM?'+'+Math.round(r.ascentM)+' hm':null,
      mins?(h2+':'+(m2<10?'0':'')+m2+' h'):null,
      season||null
    ].filter(Boolean).join(' · ');
    var photo=r.photoUrl
      ?'<img class="str-rc-img" src="'+esc(r.photoUrl)+'" alt="'+esc(r.name)+'" loading="lazy">'
      :'<div class="str-rc-img-ph">🏔️</div>';
    return '<div class="str-route-card" onclick="strOpenRoute('+i+')" role="button" tabindex="0">'
      +photo
      +'<div class="str-rc-content">'+makeWegweiser(r.name,r.sac,S.kantonWappen)+'</div>'
      +'<div class="str-rc-bar">'+esc(bar)+'</div>'
      +'</div>';
  }).join('');
}

/* ══════════════════════════════════════
   ROUTE-MODAL mit Leaflet-Karte
   ══════════════════════════════════════ */
var _leafletReady=false;
var _leafletLoading=false;
var _leafletCallbacks=[];
var _strMap=null;
var _strPolyline=null;

function loadLeaflet(cb){
  if(_leafletReady){cb();return;}
  _leafletCallbacks.push(cb);
  if(_leafletLoading)return;
  _leafletLoading=true;
  var lnk=document.createElement('link');
  lnk.rel='stylesheet';lnk.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(lnk);
  var scr=document.createElement('script');
  scr.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  scr.onload=function(){
    _leafletReady=true;
    _leafletCallbacks.forEach(function(fn){fn();});
    _leafletCallbacks=[];
  };
  document.head.appendChild(scr);
}

function latLng(pt){
  /* Geometry-Punkte sind {lat,lng} ODER [lat,lng] */
  if(Array.isArray(pt))return[pt[0],pt[1]];
  return[pt.lat,pt.lng];
}

window.strOpenRoute=function(idx){
  var r=_strRouteIndex[idx];
  if(!r)return;
  /* Meta */
  document.getElementById('str-modal-title').textContent=r.name||'Route';
  /* Tags */
  var tags='';
  var km=fmtKm(r.distanceTagKm||r.distanceKm);
  if(km)tags+='<span class="str-tag str-tag-dist">📍 '+esc(km)+'</span>';
  var hm=fmtHm(r.ascentM);if(hm)tags+='<span class="str-tag str-tag-asc">↑ '+esc(hm)+'</span>';
  var tm=fmtMin(r.minutes);if(tm)tags+='<span class="str-tag str-tag-time">⏱ '+esc(tm)+'</span>';
  var sac=r.sac&&r.sac!=='unbekannt'?r.sac:null;
  if(sac)tags+='<span class="str-tag '+sacCls(r.sac)+'">'+esc(sac)+'</span>';
  document.getElementById('str-modal-tags').innerHTML=tags;
  /* Beschreibung */
  var desc=r.description?r.description.replace(/<[^>]*>/g,''):'';
  document.getElementById('str-modal-desc').textContent=desc||'';
  document.getElementById('str-modal-desc').style.display=desc?'':'none';
  /* Backdrop öffnen */
  var bd=document.getElementById('str-modal-backdrop');
  bd.classList.add('str-open');
  document.body.style.overflow='hidden';
  /* Karte initialisieren (lazy) */
  loadLeaflet(function(){
    var pts=[];
    if(r.geometry&&r.geometry.length>1){
      pts=r.geometry.map(latLng);
    } else if(r.startLat&&r.startLng){
      pts=[[r.startLat,r.startLng]];
    }
    var mapEl=document.getElementById('str-map');
    if(!_strMap){
      _strMap=L.map(mapEl,{zoomControl:true,attributionControl:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom:19
      }).addTo(_strMap);
    } else {
      if(_strPolyline){_strMap.removeLayer(_strPolyline);_strPolyline=null;}
      mapEl.style.display='block';
    }
    /* Kurz warten bis Modal sichtbar, dann Leaflet-Größe korrigieren */
    setTimeout(function(){
      _strMap.invalidateSize();
      if(pts.length>1){
        _strPolyline=L.polyline(pts,{color:'#CC0000',weight:4,opacity:.85}).addTo(_strMap);
        _strMap.fitBounds(_strPolyline.getBounds(),{padding:[24,24]});
      } else if(pts.length===1){
        _strMap.setView(pts[0],13);
        L.circleMarker(pts[0],{radius:8,color:'#CC0000',fillColor:'#CC0000',fillOpacity:1}).addTo(_strMap);
      } else {
        /* Schweiz-Übersicht als Fallback */
        _strMap.setView([46.8,8.2],8);
      }
    },80);
  });
};

window.strCloseModal=function(e){
  if(e&&e.target!==document.getElementById('str-modal-backdrop'))return;
  document.getElementById('str-modal-backdrop').classList.remove('str-open');
  document.body.style.overflow='';
};
document.addEventListener('keydown',function(e){if(e.key==='Escape')window.strCloseModal();});

})();
</script>
