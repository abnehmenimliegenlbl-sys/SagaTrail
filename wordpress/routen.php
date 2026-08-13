<?php
/**
 * SagaTrail Routen — WPCode PHP Snippet
 * Typ:  PHP Snippet
 * Seite: sagatrail.ch/routen
 *
 * Eine Seite — Kantonsauswahl + Routen + Filter.
 * Routen werden per JS von der API geladen (sessionStorage-Cache pro Kanton).
 * Schema.org TouristAttraction-Markup wird via JS in den <head> injiziert.
 */

$str_kantone = [
  'ag' => 'Aargau',             'ai' => 'App. Innerrhoden', 'ar' => 'App. Ausserrhoden',
  'be' => 'Bern',               'bl' => 'Basel-Landschaft', 'bs' => 'Basel-Stadt',
  'fr' => 'Fribourg',           'ge' => 'Genève',           'gl' => 'Glarus',
  'gr' => 'Graubünden',         'ju' => 'Jura',             'lu' => 'Luzern',
  'ne' => 'Neuchâtel',          'nw' => 'Nidwalden',        'ow' => 'Obwalden',
  'sg' => 'St. Gallen',         'sh' => 'Schaffhausen',     'so' => 'Solothurn',
  'sz' => 'Schwyz',             'tg' => 'Thurgau',          'ti' => 'Ticino',
  'ur' => 'Uri',                'vd' => 'Vaud',             'vs' => 'Valais',
  'zg' => 'Zug',                'zh' => 'Zürich',
];
$str_api = 'https://saga-trail.replit.app/api';
?>
<!-- ============================================================
     SAGATRAIL ROUTEN  |  WPCode PHP Snippet
     Seite: sagatrail.ch/routen
     ============================================================ -->

<style>
/* ===== RESET & BASIS ===== */
.str-wrap *, .str-wrap *::before, .str-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
.str-wrap {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
}
.str-wrap a { text-decoration: none; color: inherit; }

/* ===== FULL-WIDTH HELPER ===== */
.str-fw {
  width: 100vw;
  position: relative;
  left: 50%;
  margin-left: -50vw;
}
.str-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

/* ===== HERO ===== */
.str-hero {
  background: #CC0000;
  padding: 64px 0 56px;
  color: #fff;
}
.str-hero-label {
  display: inline-block;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 20px;
  padding: 5px 16px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.str-hero h1 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 16px;
  color: #fff;
}
.str-hero p {
  font-size: 1.1rem;
  max-width: 580px;
  opacity: 0.9;
  color: #fff;
}
.str-hero-stats {
  display: flex;
  gap: 36px;
  flex-wrap: wrap;
  margin-top: 36px;
  padding-top: 28px;
  border-top: 1px solid rgba(255,255,255,0.2);
}
.str-hero-stat strong { display: block; font-size: 1.8rem; font-weight: 800; color: #fff; line-height: 1; }
.str-hero-stat span   { font-size: 0.8rem; opacity: 0.75; color: #fff; }

/* ===== KANTONSAUSWAHL ===== */
.str-kanton-section { padding: 52px 0 40px; background: #f7f7f5; }
.str-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #CC0000;
  margin-bottom: 10px;
}
.str-section-title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 28px;
}
.str-kanton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}
.str-kanton-card {
  background: #fff;
  border: 1.5px solid #e8e8e6;
  border-radius: 12px;
  padding: 14px 10px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  user-select: none;
}
.str-kanton-card:hover {
  border-color: #CC0000;
  box-shadow: 0 4px 16px rgba(204,0,0,0.12);
  transform: translateY(-2px);
}
.str-kanton-card.str-active {
  border-color: #CC0000;
  background: #CC0000;
  color: #fff;
  box-shadow: 0 4px 16px rgba(204,0,0,0.25);
}
.str-kanton-abbr {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  display: block;
  line-height: 1;
  margin-bottom: 5px;
}
.str-kanton-name {
  font-size: 0.72rem;
  color: #666;
  line-height: 1.3;
}
.str-kanton-card.str-active .str-kanton-name { color: rgba(255,255,255,0.8); }

/* ===== FILTER ===== */
.str-filter-bar {
  background: #fff;
  border-bottom: 1px solid #e8e8e6;
  padding: 16px 0;
  display: none;
}
.str-filter-bar.str-visible { display: block; }
.str-filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.str-filter-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
  min-width: 80px;
}
.str-filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.str-chip {
  border: 1.5px solid #ddd;
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  color: #444;
  transition: all 0.12s;
  white-space: nowrap;
}
.str-chip:hover   { border-color: #CC0000; color: #CC0000; }
.str-chip.str-on  { background: #CC0000; border-color: #CC0000; color: #fff; }
.str-filter-count { margin-left: auto; font-size: 0.82rem; color: #888; white-space: nowrap; }
@media (max-width: 640px) {
  .str-filter-row { gap: 10px; }
  .str-filter-count { width: 100%; }
}

/* ===== ROUTEN-ERGEBNISSE ===== */
.str-results-section { padding: 40px 0 64px; background: #f7f7f5; min-height: 200px; }
.str-results-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 24px;
}
.str-results-title { font-size: 1.4rem; font-weight: 800; color: #1a1a1a; }
.str-results-count {
  font-size: 0.82rem;
  background: #CC0000;
  color: #fff;
  border-radius: 20px;
  padding: 2px 10px;
  font-weight: 600;
}
.str-route-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.str-route-card {
  background: #fff;
  border: 1.5px solid #e8e8e6;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  transition: box-shadow 0.15s, transform 0.15s;
}
.str-route-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.str-route-photo {
  width: 120px;
  min-width: 120px;
  background: #e8e8e6;
  overflow: hidden;
  flex-shrink: 0;
}
.str-route-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.str-route-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f0ee 0%, #e4e4e2 100%);
  font-size: 2rem;
}
.str-route-body {
  padding: 16px 20px;
  flex: 1;
  min-width: 0;
}
.str-route-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  line-height: 1.3;
}
.str-route-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  align-items: center;
}
.str-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
}
.str-badge-dist  { background: #f0f0f0; color: #444; }
.str-badge-asc   { background: #eef4fb; color: #2563eb; }
.str-badge-time  { background: #f0fdf4; color: #15803d; }
.str-badge-T1    { background: #dcfce7; color: #15803d; }
.str-badge-T2    { background: #d1fae5; color: #059669; }
.str-badge-T3    { background: #fff7ed; color: #ea580c; }
.str-badge-T4    { background: #fee2e2; color: #dc2626; }
.str-badge-T5    { background: #fef2f2; color: #991b1b; }
.str-badge-T6    { background: #1a1a1a; color: #fff; }
.str-route-desc {
  font-size: 0.85rem;
  color: #555;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.str-route-app-link {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #CC0000;
}
.str-route-app-link:hover { opacity: 0.8; }
@media (max-width: 560px) {
  .str-route-photo { width: 90px; min-width: 90px; }
  .str-route-body { padding: 12px 14px; }
}

/* ===== ZUSTÄNDE ===== */
.str-empty {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}
.str-empty-icon { font-size: 3rem; margin-bottom: 16px; }
.str-empty h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: #444; }
.str-spinner {
  text-align: center;
  padding: 60px 20px;
}
.str-spinner-ring {
  display: inline-block;
  width: 40px; height: 40px;
  border: 3px solid #e8e8e6;
  border-top-color: #CC0000;
  border-radius: 50%;
  animation: str-spin 0.7s linear infinite;
}
@keyframes str-spin { to { transform: rotate(360deg); } }

/* ===== APP CTA ===== */
.str-cta-section { background: #1a1a1a; padding: 56px 0; }
.str-cta-section h2 { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; color: #fff; margin-bottom: 10px; }
.str-cta-section p  { color: rgba(255,255,255,0.7); margin-bottom: 28px; }
.str-cta-btns { display: flex; gap: 14px; flex-wrap: wrap; }
.str-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 10px; font-weight: 700; font-size: 0.9rem;
  background: #CC0000; color: #fff; transition: opacity 0.15s;
}
.str-cta-btn:hover { opacity: 0.88; }
.str-cta-btn-outline {
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.3);
  color: #fff;
}
</style>

<div class="str-wrap" id="str-root">

  <!-- ═══ HERO ═══ -->
  <div class="str-fw str-hero">
    <div class="str-inner">
      <span class="str-hero-label">🇨🇭 Schweizer Wanderrouten</span>
      <h1>Sagenrouten in allen 26 Kantonen</h1>
      <p>GPS-geführte Wanderungen auf den Spuren alter Schweizer Sagen — von T1 bis T5, Frühling bis Herbst.</p>
      <div class="str-hero-stats">
        <div class="str-hero-stat"><strong>200+</strong><span>Wanderrouten</span></div>
        <div class="str-hero-stat"><strong>26</strong><span>Kantone</span></div>
        <div class="str-hero-stat"><strong>100+</strong><span>Schweizer Sagen</span></div>
      </div>
    </div>
  </div>

  <!-- ═══ KANTONSAUSWAHL ═══ -->
  <div class="str-fw str-kanton-section">
    <div class="str-inner">
      <div class="str-section-label">Kanton wählen</div>
      <h2 class="str-section-title">Wo möchtest du wandern?</h2>
      <div class="str-kanton-grid" id="str-kanton-grid">
        <?php foreach ($str_kantone as $code => $name): ?>
        <div class="str-kanton-card"
             data-kanton="<?php echo esc_attr($code); ?>"
             onclick="strSelectKanton('<?php echo esc_js($code); ?>')">
          <span class="str-kanton-abbr"><?php echo esc_html(strtoupper($code)); ?></span>
          <span class="str-kanton-name"><?php echo esc_html($name); ?></span>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <!-- ═══ FILTER ═══ -->
  <div class="str-fw str-filter-bar" id="str-filter-bar">
    <div class="str-inner">
      <div class="str-filter-row">
        <span class="str-filter-label">Distanz</span>
        <div class="str-filter-chips" id="str-dist-chips">
          <span class="str-chip str-on" data-min="0"  data-max="9999" onclick="strSetDist(this,0,9999)">Alle</span>
          <span class="str-chip"        data-min="0"  data-max="10"   onclick="strSetDist(this,0,10)">bis 10 km</span>
          <span class="str-chip"        data-min="10" data-max="20"   onclick="strSetDist(this,10,20)">10–20 km</span>
          <span class="str-chip"        data-min="20" data-max="30"   onclick="strSetDist(this,20,30)">20–30 km</span>
          <span class="str-chip"        data-min="30" data-max="9999" onclick="strSetDist(this,30,9999)">30+ km</span>
        </div>
      </div>
      <div class="str-filter-row" style="margin-top:10px;">
        <span class="str-filter-label">Schwierigkeit</span>
        <div class="str-filter-chips" id="str-sac-chips">
          <span class="str-chip str-on" data-sac="0" onclick="strSetSac(this,0)">Alle</span>
          <span class="str-chip"        data-sac="1" onclick="strSetSac(this,1)">T1</span>
          <span class="str-chip"        data-sac="2" onclick="strSetSac(this,2)">T2</span>
          <span class="str-chip"        data-sac="3" onclick="strSetSac(this,3)">T3</span>
          <span class="str-chip"        data-sac="4" onclick="strSetSac(this,4)">T4</span>
          <span class="str-chip"        data-sac="5" onclick="strSetSac(this,5)">T5+</span>
        </div>
        <span class="str-filter-count" id="str-filter-count"></span>
      </div>
    </div>
  </div>

  <!-- ═══ ROUTEN-LISTE ═══ -->
  <div class="str-fw str-results-section" id="str-results-section" style="display:none;">
    <div class="str-inner">
      <div class="str-results-header">
        <h2 class="str-results-title" id="str-results-title">Routen</h2>
        <span class="str-results-count" id="str-results-count" style="display:none;"></span>
      </div>
      <div id="str-route-list"></div>
    </div>
  </div>

  <!-- ═══ APP CTA ═══ -->
  <div class="str-fw str-cta-section">
    <div class="str-inner">
      <h2>Starte deine Sagenwanderung</h2>
      <p>GPS-Navigation, Audio-Erzählungen und Entscheidungen unterwegs — kostenlos in der App.</p>
      <div class="str-cta-btns">
        <a href="https://apps.apple.com/app/id6744444594" class="str-cta-btn" target="_blank" rel="noopener">
          🍎 &nbsp;App Store
        </a>
        <a href="https://play.google.com/store/apps/details?id=com.inster.sagatrail" class="str-cta-btn str-cta-btn-outline" target="_blank" rel="noopener">
          ▶ &nbsp;Google Play
        </a>
      </div>
    </div>
  </div>

</div><!-- .str-wrap -->

<script>
(function() {
  var API = '<?php echo esc_js($str_api); ?>';
  var cache = {}; /* sessionStorage-Fallback für ältere Browser */

  /* ─── Zustand ─── */
  var state = {
    kanton: null,
    kantonName: null,
    routes: [],      /* alle Routen des gewählten Kantons */
    distMin: 0,
    distMax: 9999,
    sacMin: 0,       /* 0 = alle */
  };

  /* ─── Hilfsfunktionen ─── */
  function sacNum(sac) {
    if (!sac) return 0;
    var m = /T\s*([1-6])/i.exec(sac);
    return m ? parseInt(m[1], 10) : 0;
  }

  function fmtDist(km) {
    if (!km && km !== 0) return '—';
    return parseFloat(km).toFixed(1) + ' km';
  }

  function fmtAsc(m) {
    if (!m && m !== 0) return null;
    return '+' + Math.round(m) + ' hm';
  }

  function fmtTime(min) {
    if (!min) return null;
    if (min < 60) return min + ' Min.';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ' h';
  }

  function sacBadgeClass(sac) {
    var n = sacNum(sac);
    if (n >= 6) return 'str-badge-T6';
    if (n >= 5) return 'str-badge-T5';
    if (n >= 4) return 'str-badge-T4';
    if (n >= 3) return 'str-badge-T3';
    if (n >= 2) return 'str-badge-T2';
    return 'str-badge-T1';
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Filter ─── */
  function applyFilter() {
    return state.routes.filter(function(r) {
      var km = parseFloat(r.distanceTagKm || r.distanceKm || 0);
      if (km < state.distMin || km > state.distMax) return false;
      if (state.sacMin > 0) {
        var n = sacNum(r.sac);
        if (state.sacMin === 5) { if (n < 5) return false; }
        else { if (n !== state.sacMin) return false; }
      }
      return true;
    });
  }

  /* ─── Rendern ─── */
  function renderRoutes() {
    var visible = applyFilter();
    var list = document.getElementById('str-route-list');
    var cnt  = document.getElementById('str-results-count');
    var filterCnt = document.getElementById('str-filter-count');

    cnt.textContent = visible.length + ' Route' + (visible.length !== 1 ? 'n' : '');
    cnt.style.display = visible.length > 0 ? '' : 'none';
    filterCnt.textContent = visible.length + ' von ' + state.routes.length + ' Routen';

    if (visible.length === 0) {
      list.innerHTML = '<div class="str-empty"><div class="str-empty-icon">🏔️</div><h3>Keine Routen für diesen Filter</h3><p>Passe die Distanz oder Schwierigkeit an.</p></div>';
      return;
    }

    /* Schema.org JSON-LD */
    var schemaItems = visible.slice(0, 50).map(function(r, i) {
      return {
        '@type': 'TouristAttraction',
        'position': i + 1,
        'name': r.name,
        'description': r.description || undefined,
        'url': 'https://sagatrail.ch/routen',
        'geo': r.coordinates ? {
          '@type': 'GeoCoordinates',
          'latitude':  r.coordinates.lat,
          'longitude': r.coordinates.lng
        } : undefined,
        'touristType': 'Wanderer'
      };
    });
    var existing = document.getElementById('str-schema-ld');
    if (existing) existing.remove();
    var script = document.createElement('script');
    script.id   = 'str-schema-ld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Wanderrouten ' + (state.kantonName || ''),
      'description': 'GPS-geführte Sagenrouten in ' + (state.kantonName || 'der Schweiz'),
      'numberOfItems': visible.length,
      'itemListElement': schemaItems
    });
    document.head.appendChild(script);

    /* HTML */
    var html = visible.map(function(r) {
      var sac   = r.sac && r.sac !== 'unbekannt' ? r.sac : null;
      var asc   = fmtAsc(r.ascentM);
      var time  = fmtTime(r.minutes);
      var desc  = r.description ? r.description.replace(/<[^>]*>/g, '') : '';

      var photoHtml = r.photoUrl
        ? '<img src="' + esc(r.photoUrl) + '" alt="' + esc(r.name) + '" loading="lazy">'
        : '<div class="str-route-photo-placeholder">🏔️</div>';

      var badges = '<span class="str-badge str-badge-dist">📍 ' + esc(fmtDist(r.distanceTagKm || r.distanceKm)) + '</span>';
      if (asc)  badges += '<span class="str-badge str-badge-asc">↑ ' + esc(asc) + '</span>';
      if (time) badges += '<span class="str-badge str-badge-time">⏱ ' + esc(time) + '</span>';
      if (sac)  badges += '<span class="str-badge ' + sacBadgeClass(r.sac) + '">' + esc(sac) + '</span>';

      return '<div class="str-route-card" itemscope itemtype="https://schema.org/TouristAttraction">'
        + '<div class="str-route-photo">' + photoHtml + '</div>'
        + '<div class="str-route-body">'
        +   '<h3 class="str-route-name" itemprop="name">' + esc(r.name) + '</h3>'
        +   '<div class="str-route-meta">' + badges + '</div>'
        + (desc ? '<p class="str-route-desc" itemprop="description">' + esc(desc.substring(0, 180)) + '…</p>' : '')
        +   '<a class="str-route-app-link" href="https://apps.apple.com/app/id6744444594" target="_blank" rel="noopener">'
        +     '→ In der SagaTrail-App öffnen'
        +   '</a>'
        + '</div>'
        + '</div>';
    }).join('');

    list.innerHTML = html;
  }

  /* ─── Laden ─── */
  function loadRoutes(kanton) {
    var list = document.getElementById('str-route-list');
    list.innerHTML = '<div class="str-spinner"><div class="str-spinner-ring"></div></div>';

    /* sessionStorage-Cache */
    try {
      var cached = sessionStorage.getItem('str_' + kanton);
      if (cached) {
        state.routes = JSON.parse(cached);
        renderRoutes();
        return;
      }
    } catch(e) {}

    fetch(API + '/cantons/' + encodeURIComponent(kanton) + '/routes')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        state.routes = Array.isArray(data) ? data : (data.routes || []);
        try { sessionStorage.setItem('str_' + kanton, JSON.stringify(state.routes)); } catch(e) {}
        renderRoutes();
      })
      .catch(function() {
        list.innerHTML = '<div class="str-empty"><div class="str-empty-icon">⚠️</div><h3>Routen konnten nicht geladen werden</h3><p>Bitte später nochmals versuchen.</p></div>';
      });
  }

  /* ─── API ─── */
  window.strSelectKanton = function(kanton) {
    var kantone = <?php echo json_encode($str_kantone); ?>;

    /* Karte markieren */
    document.querySelectorAll('.str-kanton-card').forEach(function(el) {
      el.classList.toggle('str-active', el.dataset.kanton === kanton);
    });

    /* Filter zurücksetzen */
    state.distMin = 0; state.distMax = 9999; state.sacMin = 0;
    document.querySelectorAll('#str-dist-chips .str-chip').forEach(function(c,i) { c.classList.toggle('str-on', i===0); });
    document.querySelectorAll('#str-sac-chips  .str-chip').forEach(function(c,i) { c.classList.toggle('str-on', i===0); });

    state.kanton     = kanton;
    state.kantonName = kantone[kanton] || kanton.toUpperCase();

    document.getElementById('str-results-title').textContent = 'Routen in ' + state.kantonName;
    document.getElementById('str-filter-bar').classList.add('str-visible');
    document.getElementById('str-results-section').style.display = '';

    /* Zur Ergebnisliste scrollen */
    setTimeout(function() {
      document.getElementById('str-results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    loadRoutes(kanton);
  };

  window.strSetDist = function(el, min, max) {
    state.distMin = min; state.distMax = max;
    document.querySelectorAll('#str-dist-chips .str-chip').forEach(function(c) { c.classList.remove('str-on'); });
    el.classList.add('str-on');
    renderRoutes();
  };

  window.strSetSac = function(el, sac) {
    state.sacMin = sac;
    document.querySelectorAll('#str-sac-chips .str-chip').forEach(function(c) { c.classList.remove('str-on'); });
    el.classList.add('str-on');
    renderRoutes();
  };
})();
</script>
