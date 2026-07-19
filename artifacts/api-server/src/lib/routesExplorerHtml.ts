export const ROUTES_EXPLORER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Routen entdecken — SagaTrail</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --red:#CC0000;
  --dark:#1a1a1a;
  --mid:#555;
  --light:#f5f3f0;
  --card:#fff;
  --border:#e0ddd8;
}
html{scroll-behavior:smooth}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important;
  background:#fff !important;
  color:#1a1a1a !important;
  font-size:16px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
a{color:var(--red)!important;text-decoration:none}

/* ── NAV ── */
.st-nav{
  position:sticky;top:0;z-index:100;
  background:#fff;border-bottom:1px solid var(--border);
  padding:0 24px;height:56px;
  display:flex;align-items:center;justify-content:space-between;
}
.st-nav-logo{
  display:flex;align-items:center;gap:10px;
  font-weight:700 !important;font-size:18px !important;
  color:#1a1a1a !important;text-decoration:none !important;
}
.st-nav-links{display:flex;align-items:center;gap:20px}
.st-nav-links a{
  color:#555 !important;font-size:14px !important;
  font-weight:500 !important;text-decoration:none !important;
  transition:color .15s;
}
.st-nav-links a:hover,.st-nav-links a.active{color:var(--red)!important}

/* ── HERO ── */
.st-hero{background:var(--red);padding:44px 24px 36px;color:#fff}
.st-hero-inner{max-width:900px;margin:0 auto}
.st-hero-eyebrow{
  font-size:11px !important;font-weight:700 !important;
  text-transform:uppercase;letter-spacing:.12em;
  color:rgba(255,255,255,.75) !important;
  display:flex;align-items:center;gap:8px;margin-bottom:12px;
}
.st-hero-eyebrow::before{
  content:'';display:inline-block;width:8px;height:8px;
  background:rgba(255,255,255,.5);border-radius:50%;
}
.st-hero h1{
  font-size:clamp(28px,5vw,46px) !important;
  font-weight:800 !important;color:#fff !important;
  line-height:1.15 !important;margin:0 0 10px !important;
}
.st-hero p{
  font-size:16px !important;color:rgba(255,255,255,.88) !important;
  max-width:560px;margin:0 !important;line-height:1.6 !important;
}

/* ── MAIN ── */
.st-main{max-width:960px;margin:0 auto;padding:40px 24px 80px}

/* ── SECTION LABEL ── */
.sec-label{
  font-size:11px !important;font-weight:700 !important;
  text-transform:uppercase !important;letter-spacing:.12em !important;
  color:var(--red) !important;margin-bottom:14px !important;
}

/* ── CANTON GRID ── */
.canton-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
  gap:8px;margin-bottom:36px;
}
.canton-btn{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:12px 8px;
  background:#fff;border:2px solid var(--border);border-radius:12px;
  cursor:pointer;transition:all .15s;
  font-family:inherit;
}
.canton-btn:hover{
  border-color:var(--red);background:#fff5f5;
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(204,0,0,.12);
}
.canton-btn.active{
  border-color:var(--red);background:#fff0f0;
  box-shadow:0 4px 16px rgba(204,0,0,.2);
}
.canton-btn img{width:40px;height:40px;object-fit:contain}
.canton-placeholder{
  width:40px;height:40px;background:var(--light);border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-size:12px !important;font-weight:700 !important;color:#555 !important;
}
.canton-name{
  font-size:11px !important;font-weight:600 !important;
  color:#1a1a1a !important;text-align:center;line-height:1.3;
}
.canton-btn.active .canton-name{color:var(--red)!important}

/* ── FILTER PANEL ── */
#filter-panel{
  display:none;
  background:var(--light);border:1px solid var(--border);
  border-radius:16px;padding:22px 22px 4px;margin-bottom:32px;
}
#filter-panel.visible{display:block}

.filter-header{
  display:flex;align-items:center;gap:10px;
  margin-bottom:20px;padding-bottom:14px;
  border-bottom:1px solid var(--border);
}
.filter-icon{
  width:34px;height:34px;background:var(--red);
  border-radius:8px;display:flex;align-items:center;justify-content:center;
}
.filter-title{font-size:15px !important;font-weight:700 !important;color:#1a1a1a !important}

/* ── DUAL RANGE ── */
.filter-group{margin-bottom:20px}
.filter-group-head{
  display:flex;justify-content:space-between;align-items:baseline;
  margin-bottom:10px;
}
.filter-lbl{font-size:14px !important;font-weight:600 !important;color:#1a1a1a !important}
.filter-val{font-size:13px !important;font-weight:600 !important;color:var(--red)!important}

.range-wrap{position:relative;height:40px;margin:0 4px}
.range-track{
  position:absolute;top:50%;left:0;right:0;
  height:4px;background:#d8d4ce;border-radius:2px;
  transform:translateY(-50%);pointer-events:none;
}
.range-progress{
  position:absolute;height:100%;
  background:var(--red);border-radius:2px;
}

/* Both range inputs overlap on the same track */
.range-wrap input[type=range]{
  position:absolute;top:50%;left:0;
  transform:translateY(-50%);
  width:100%;height:4px;margin:0;
  background:transparent;
  appearance:none;-webkit-appearance:none;
  pointer-events:none;
}
.range-wrap input[type=range].r-min{z-index:3}
.range-wrap input[type=range].r-max{z-index:4}

/* Swiss-cross thumb — webkit */
.range-wrap input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;
  width:28px;height:28px;border-radius:50%;
  background-color:var(--red);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='8.5' y='3.5' width='3' height='13' fill='white'/%3E%3Crect x='3.5' y='8.5' width='13' height='3' fill='white'/%3E%3C/svg%3E");
  background-size:65%;background-repeat:no-repeat;background-position:center;
  border:2.5px solid #fff;
  box-shadow:0 2px 8px rgba(204,0,0,.4);
  pointer-events:all;cursor:pointer;
}
/* Swiss-cross thumb — firefox */
.range-wrap input[type=range]::-moz-range-thumb{
  width:28px;height:28px;border-radius:50%;
  background-color:var(--red);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='8.5' y='3.5' width='3' height='13' fill='white'/%3E%3Crect x='3.5' y='8.5' width='13' height='3' fill='white'/%3E%3C/svg%3E");
  background-size:65%;background-repeat:no-repeat;background-position:center;
  border:2.5px solid #fff;
  box-shadow:0 2px 8px rgba(204,0,0,.4);
  pointer-events:all;cursor:pointer;
}

/* ── TOGGLES ── */
.filter-divider{height:1px;background:var(--border);margin:8px 0 4px}
.toggle-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 0;border-bottom:1px solid var(--border);
}
.toggle-row:last-of-type{border-bottom:none;margin-bottom:8px}
.toggle-lbl{font-size:14px !important;font-weight:500 !important;color:#1a1a1a !important}
.toggle-sw{position:relative;width:50px;height:28px;flex-shrink:0}
.toggle-sw input{opacity:0;width:0;height:0;position:absolute}
.toggle-knob{
  position:absolute;inset:0;
  background:#ccc;border-radius:28px;cursor:pointer;transition:background .2s;
}
.toggle-knob::before{
  content:'';position:absolute;
  width:22px;height:22px;left:3px;top:3px;
  background:#fff;border-radius:50%;
  transition:transform .2s;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}
.toggle-sw input:checked+.toggle-knob{background:var(--red)}
.toggle-sw input:checked+.toggle-knob::before{transform:translateX(22px)}

/* ── SEARCH BUTTON ── */
.search-btn{
  width:100%;padding:15px;
  background:var(--red);color:#fff !important;
  border:none;border-radius:12px;
  font-size:14px !important;font-weight:700 !important;
  letter-spacing:.07em;text-transform:uppercase;
  cursor:pointer;margin:16px 0 22px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  transition:opacity .15s,transform .1s;
  font-family:inherit;
}
.search-btn:hover{opacity:.9;transform:translateY(-1px)}
.search-btn:active{transform:translateY(0)}
.search-btn:disabled{opacity:.5;cursor:not-allowed}

/* ── STATUS + RESULTS ── */
.result-status{
  font-size:14px !important;color:#555 !important;
  margin-bottom:18px;min-height:18px;
}
.routes-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(272px,1fr));
  gap:18px;
}

/* ── ROUTE CARD ── */
.route-card{
  background:#fff;border:1px solid var(--border);
  border-radius:14px;overflow:hidden;
  transition:transform .15s,box-shadow .15s;
}
.route-card:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(0,0,0,.1);
}
.route-img{width:100%;height:176px;object-fit:cover;display:block}
.route-img-ph{
  width:100%;height:176px;
  background:linear-gradient(135deg,#ebe7df 0%,#f5f3ef 100%);
  display:flex;align-items:center;justify-content:center;
}
.route-body{padding:14px 16px 16px}
.route-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.badge{
  display:inline-flex;align-items:center;
  padding:3px 9px;border-radius:20px;
  font-size:11px !important;font-weight:700 !important;letter-spacing:.04em;
}
.b-sac{background:#fce8e8;color:var(--red)!important}
.b-green{background:#e6f4ec;color:#2e7d52!important}
.b-orange{background:#fef3e2;color:#c46800!important}
.b-blue{background:#e8f0fc;color:#1a5fa8!important}
.b-gray{background:#f0eeeb;color:#555!important}
.b-star{background:#fff8e6;color:#b8935a!important;border:1px solid #e8d5a0}
.route-name{
  font-size:16px !important;font-weight:700 !important;
  color:#1a1a1a !important;line-height:1.3 !important;margin-bottom:8px !important;
}
.route-meta{
  display:flex;gap:12px;flex-wrap:wrap;
  font-size:13px !important;color:#555 !important;
}
.route-meta span{color:#555 !important;display:flex;align-items:center;gap:3px}

/* ── SPINNER / EMPTY ── */
.spinner-wrap{display:flex;justify-content:center;padding:56px 0}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{
  width:34px;height:34px;
  border:3px solid var(--border);border-top-color:var(--red);
  border-radius:50%;animation:spin .7s linear infinite;
}
.empty-box{text-align:center;padding:60px 20px;color:#555}
.empty-box svg{opacity:.3;margin-bottom:14px}
.empty-box h3{font-size:17px !important;color:#1a1a1a !important;margin-bottom:6px !important}
.empty-box p{font-size:14px !important;color:#555 !important}

/* ── APP BANNER ── */
.app-banner{
  background:var(--red);border-radius:16px;
  padding:32px 24px;margin-top:48px;text-align:center;
}
.app-banner h2{
  font-size:21px !important;font-weight:800 !important;
  color:#fff !important;margin-bottom:8px !important;
}
.app-banner p{
  font-size:15px !important;color:rgba(255,255,255,.88) !important;
  margin-bottom:22px !important;
}
.store-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.store-btn{
  display:inline-flex;align-items:center;gap:10px;
  padding:11px 20px;
  background:rgba(0,0,0,.18);border:1.5px solid rgba(255,255,255,.35);
  border-radius:10px;color:#fff !important;
  font-size:14px !important;font-weight:600 !important;
  text-decoration:none !important;transition:background .15s;
}
.store-btn:hover{background:rgba(0,0,0,.3)}
.store-small{font-size:10px !important;opacity:.8;display:block;line-height:1.2}

/* ── FOOTER ── */
.st-footer{
  border-top:1px solid var(--border);
  padding:28px 24px;text-align:center;
  max-width:960px;margin:0 auto;
}
.st-footer p{font-size:13px !important;color:#555 !important}

/* ── RESPONSIVE ── */
@media(max-width:640px){
  .canton-grid{grid-template-columns:repeat(3,1fr);gap:6px}
  .canton-btn{padding:10px 6px}
  .canton-btn img,.canton-placeholder{width:32px;height:32px}
  .canton-name{font-size:10px !important}
  .routes-grid{grid-template-columns:1fr}
  .st-hero{padding:28px 16px 24px}
  .st-main{padding:24px 16px 60px}
  .app-banner{padding:24px 16px}
}
@media(max-width:400px){
  .canton-grid{grid-template-columns:repeat(3,1fr)}
  .st-nav-links a:not(.nav-home){display:none}
}
</style>
</head>
<body>

<!-- NAV -->
<nav class="st-nav">
  <a href="https://sagatrail.ch" class="st-nav-logo">
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <polygon points="16,3 28,28 4,28" fill="#CC0000"/>
      <polygon points="16,9 24,28 8,28" fill="#aa0000"/>
      <path d="M13.5 12 L16 7 L18.5 12" fill="#d4a843"/>
    </svg>
    SagaTrail
  </a>
  <div class="st-nav-links">
    <a href="https://sagatrail.ch" class="nav-home">Home</a>
  </div>
</nav>

<!-- HERO -->
<div class="st-hero">
  <div class="st-hero-inner">
    <div class="st-hero-eyebrow">Schweizer Sagenweg-App</div>
    <h1>Routen entdecken</h1>
    <p>Alle Wanderrouten der SagaTrail-App — wähle einen Kanton und filtere nach Distanz, Schwierigkeit und Saison.</p>
  </div>
</div>

<!-- MAIN -->
<div class="st-main">

  <!-- KANTON-AUSWAHL -->
  <div class="sec-label">Kanton wählen</div>
  <div class="canton-grid" id="canton-grid"></div>

  <!-- FILTER PANEL -->
  <div id="filter-panel">
    <div class="filter-header">
      <div class="filter-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      </div>
      <span class="filter-title">Filter</span>
    </div>

    <!-- Distanz -->
    <div class="filter-group">
      <div class="filter-group-head">
        <span class="filter-lbl">Distanz</span>
        <span class="filter-val" id="lbl-dist">0 km – 50+ km</span>
      </div>
      <div class="range-wrap">
        <div class="range-track"><div class="range-progress" id="prog-dist"></div></div>
        <input type="range" class="r-min" id="dist-min" min="0" max="50" value="0" step="1">
        <input type="range" class="r-max" id="dist-max" min="0" max="50" value="50" step="1">
      </div>
    </div>

    <!-- Höhenmeter -->
    <div class="filter-group">
      <div class="filter-group-head">
        <span class="filter-lbl">Höhenmeter</span>
        <span class="filter-val" id="lbl-hm">0 hm – 3000+ hm</span>
      </div>
      <div class="range-wrap">
        <div class="range-track"><div class="range-progress" id="prog-hm"></div></div>
        <input type="range" class="r-min" id="hm-min" min="0" max="3000" value="0" step="100">
        <input type="range" class="r-max" id="hm-max" min="0" max="3000" value="3000" step="100">
      </div>
    </div>

    <!-- Schwierigkeit -->
    <div class="filter-group">
      <div class="filter-group-head">
        <span class="filter-lbl">Schwierigkeit</span>
        <span class="filter-val" id="lbl-diff">T1 – T6</span>
      </div>
      <div class="range-wrap">
        <div class="range-track"><div class="range-progress" id="prog-diff"></div></div>
        <input type="range" class="r-min" id="diff-min" min="1" max="6" value="1" step="1">
        <input type="range" class="r-max" id="diff-max" min="1" max="6" value="6" step="1">
      </div>
    </div>

    <div class="filter-divider"></div>

    <div class="toggle-row">
      <span class="toggle-lbl">Nur ganzjährige Routen</span>
      <label class="toggle-sw">
        <input type="checkbox" id="tog-ganzjaehrig">
        <span class="toggle-knob"></span>
      </label>
    </div>

    <button class="search-btn" id="search-btn" onclick="doSearch()">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      Passende Routen suchen
    </button>
  </div>

  <!-- ERGEBNISSE -->
  <div id="result-status" class="result-status"></div>
  <div id="routes-out"></div>

  <!-- APP BANNER (versteckt bis Ergebnisse da) -->
  <div class="app-banner" id="app-banner" style="display:none">
    <h2>Diese Routen mit Audio-Erzählung erleben?</h2>
    <p>Lade die SagaTrail-App herunter — GPS-getriggerte Sagennarration in 8 Sprachen, direkt am Schauplatz.</p>
    <div class="store-btns">
      <a href="https://apps.apple.com/ch/app/sagatrail/id6745218145" class="store-btn" target="_blank" rel="noopener">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        <div><span class="store-small">Laden im</span>App Store</div>
      </a>
      <a href="https://play.google.com/store/apps/details?id=ch.sagatrail.app" class="store-btn" target="_blank" rel="noopener">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
        <div><span class="store-small">Jetzt bei</span>Google Play</div>
      </a>
    </div>
  </div>

</div>

<footer class="st-footer">
  <p>© 2025 SagaTrail &mdash; <a href="https://sagatrail.ch">sagatrail.ch</a></p>
</footer>

<script>
// ── KANTONE ──────────────────────────────────────────────────
const CANTONS = [
  {name:'Aargau',             code:'ag'},
  {name:'Appenzell Ausserrhoden', code:'ar'},
  {name:'Appenzell Innerrhoden',  code:'ai'},
  {name:'Basel-Landschaft',   code:'bl'},
  {name:'Basel-Stadt',        code:'bs'},
  {name:'Bern',               code:'be'},
  {name:'Freiburg',           code:'fr'},
  {name:'Genf',               code:'ge'},
  {name:'Glarus',             code:'gl'},
  {name:'Graubünden',         code:'gr'},
  {name:'Jura',               code:'ju'},
  {name:'Luzern',             code:'lu'},
  {name:'Neuenburg',          code:'ne'},
  {name:'Nidwalden',          code:'nw'},
  {name:'Obwalden',           code:'ow'},
  {name:'Schaffhausen',       code:'sh'},
  {name:'Schwyz',             code:'sz'},
  {name:'Solothurn',          code:'so'},
  {name:'St. Gallen',         code:'sg'},
  {name:'Tessin',             code:'ti'},
  {name:'Thurgau',            code:'tg'},
  {name:'Uri',                code:'ur'},
  {name:'Waadt',              code:'vd'},
  {name:'Wallis',             code:'vs'},
  {name:'Zug',                code:'zg'},
  {name:'Zürich',             code:'zh'},
];
const WAPPEN = 'https://raw.githubusercontent.com/nzzdev/ch-canton-symbols/master/symbols/13x13/';

let selCanton = null;

function buildCantons() {
  const grid = document.getElementById('canton-grid');
  grid.innerHTML = CANTONS.map(c => \`
    <button class="canton-btn" data-name="\${c.name}" onclick="pickCanton(this,'\${c.name}')">
      <img src="\${WAPPEN}\${c.code}.svg" alt="\${c.name}" width="40" height="40"
           onerror="this.outerHTML='<div class=canton-placeholder>\${c.code.toUpperCase()}</div>'">
      <span class="canton-name">\${c.name}</span>
    </button>\`).join('');
}

function pickCanton(btn, name) {
  selCanton = name;
  document.querySelectorAll('.canton-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('filter-panel').classList.add('visible');
  document.getElementById('routes-out').innerHTML = '';
  document.getElementById('result-status').textContent = '';
  document.getElementById('app-banner').style.display = 'none';
  // Scroll filter into view on mobile
  setTimeout(() => document.getElementById('filter-panel')
    .scrollIntoView({behavior:'smooth',block:'nearest'}), 80);
}

// ── DUAL-RANGE SLIDERS ───────────────────────────────────────
function initRange(minId, maxId, progId, lblId, fmt) {
  const lo = document.getElementById(minId);
  const hi = document.getElementById(maxId);
  const prog = document.getElementById(progId);
  const lbl  = document.getElementById(lblId);
  const MN = +lo.min, MX = +lo.max;

  function pct(v){ return ((v - MN) / (MX - MN)) * 100; }
  function sync(){
    if (+lo.value > +hi.value) lo.value = hi.value;
    if (+hi.value < +lo.value) hi.value = lo.value;
    prog.style.left  = pct(+lo.value) + '%';
    prog.style.width = (pct(+hi.value) - pct(+lo.value)) + '%';
    lbl.textContent  = fmt(+lo.value, +hi.value);
    // Push the thumb that's closer to its end to the front
    lo.style.zIndex = +lo.value > MX * 0.8 ? '5' : '3';
  }
  lo.addEventListener('input', sync);
  hi.addEventListener('input', sync);
  sync();
}

function initSliders(){
  initRange('dist-min','dist-max','prog-dist','lbl-dist',
    (a,b)=> a+' km – '+(b>=50?'50+ km':b+' km'));
  initRange('hm-min','hm-max','prog-hm','lbl-hm',
    (a,b)=> a+' hm – '+(b>=3000?'3000+ hm':b+' hm'));
  initRange('diff-min','diff-max','prog-diff','lbl-diff',
    (a,b)=> 'T'+a+' – T'+b);
}

// ── SUCHE ────────────────────────────────────────────────────
async function doSearch(){
  if (!selCanton) return;
  const btn = document.getElementById('search-btn');
  const out  = document.getElementById('routes-out');
  const stat = document.getElementById('result-status');

  const dMin = +document.getElementById('dist-min').value;
  const dMax = +document.getElementById('dist-max').value;
  const hMin = +document.getElementById('hm-min').value;
  const hMax = +document.getElementById('hm-max').value;
  const fMin = +document.getElementById('diff-min').value;
  const fMax = +document.getElementById('diff-max').value;
  const ganz = document.getElementById('tog-ganzjaehrig').checked;

  const q = new URLSearchParams();
  if (dMin > 0)   q.set('distMin', dMin);
  if (dMax < 50)  q.set('distMax', dMax);
  if (hMin > 0)   q.set('ascMin', hMin);
  if (hMax < 3000)q.set('ascMax', hMax);
  if (fMin > 1)   q.set('diffMin', fMin);
  if (fMax < 6)   q.set('diffMax', fMax);
  if (ganz)       q.set('ganzjaehrigNur', 'true');

  const url = '/api/cantons/' + encodeURIComponent(selCanton) + '/routes?' + q;

  out.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  stat.textContent = '';
  btn.disabled = true;
  document.getElementById('app-banner').style.display = 'none';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const routes = await res.json();
    btn.disabled = false;

    if (!Array.isArray(routes) || routes.length === 0){
      stat.textContent = 'Keine Routen für diese Filtereinstellungen gefunden.';
      out.innerHTML = emptyHtml('Keine Routen gefunden','Versuche, die Filter zu erweitern.');
      return;
    }
    stat.textContent = routes.length + (routes.length===1?' Route gefunden':' Routen gefunden') + '.';
    out.innerHTML = '<div class="routes-grid">'+routes.map(cardHtml).join('')+'</div>';
    document.getElementById('app-banner').style.display = 'block';
    out.scrollIntoView({behavior:'smooth',block:'start'});
  } catch(e){
    btn.disabled = false;
    stat.textContent = '';
    out.innerHTML = emptyHtml('Verbindung fehlgeschlagen','Bitte versuche es später nochmals.');
  }
}

// ── CARD RENDERING ───────────────────────────────────────────
const PH_SVG = \`<div class="route-img-ph">
  <svg width="72" height="54" viewBox="0 0 72 54" fill="none">
    <polygon points="0,50 20,18 36,38 52,14 72,50" fill="#ddd"/>
    <polygon points="20,18 28,32 12,32" fill="#bbb"/>
    <polygon points="52,14 60,28 44,28" fill="#bbb"/>
  </svg></div>\`;

function sacBadge(sac){
  if(!sac||sac==='unknown') return '';
  const m=/T\s*([1-6])/i.exec(sac); if(!m) return '';
  return \`<span class="badge b-sac">SAC \${sac.replace(/\s+/g,'')}</span>\`;
}
function seasonBadge(s){
  if(!s) return '';
  if(s==='ganzjaehrig') return '<span class="badge b-green">Ganzjährig</span>';
  if(s==='sommer')      return '<span class="badge b-orange">Sommer</span>';
  if(s==='alpin'||s==='hochalpin') return '<span class="badge b-blue">Alpin</span>';
  return \`<span class="badge b-gray">\${s}</span>\`;
}
function fmtTime(min){
  if(!min) return '';
  const h=Math.floor(min/60), m=min%60;
  return h>0 ? h+':'+(m<10?'0':'')+m+' h' : m+' min';
}
function cardHtml(r){
  const img = r.photoUrl
    ? \`<img class="route-img" src="\${r.photoUrl}" alt="\${r.name}"
         onerror="this.outerHTML=window.__sagaPH;this.onerror=null">\`
    : PH_SVG;
  const km   = r.distanceKm ? (Math.round(r.distanceKm*10)/10)+' km' : '';
  const hm   = r.ascentM    ? r.ascentM+' hm' : '';
  const zeit = fmtTime(r.minutes);
  return \`<div class="route-card">
    \${img}
    <div class="route-body">
      <div class="route-badges">
        \${sacBadge(r.sac)}\${seasonBadge(r.season)}
        \${r.featured?'<span class="badge b-star">★ Featured</span>':''}
      </div>
      <div class="route-name">\${r.name}</div>
      <div class="route-meta">
        \${km  ?'<span>📏 '+km+'</span>'  :''}
        \${hm  ?'<span>⛰️ '+hm+'</span>' :''}
        \${zeit?'<span>⏱️ '+zeit+'</span>':''}
      </div>
    </div>
  </div>\`;
}
// Expose placeholder on window so onerror attributes can access it
window.__sagaPH = PH_SVG.replace(/"/g,"'");

function emptyHtml(title, sub){
  return \`<div class="empty-box">
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="28" stroke="#ccc" stroke-width="2"/>
      <path d="M30 18v14M30 38v2" stroke="#ccc" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <h3>\${title}</h3><p>\${sub}</p>
  </div>\`;
}

// ── INIT ─────────────────────────────────────────────────────
buildCantons();
initSliders();
</script>
</body>
</html>`;
