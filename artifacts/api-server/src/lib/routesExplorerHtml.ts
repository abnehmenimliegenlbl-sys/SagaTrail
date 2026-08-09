export const ROUTES_EXPLORER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Routen entdecken — SagaTrail</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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
  -webkit-overflow-scrolling:touch;
  overflow-y:scroll;
}
a{color:var(--red)!important;text-decoration:none}

/* ── NAV ── */
.st-nav{display:none}

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

/* ── ROUTE CARD (Wegweiser-Design) ── */
.route-card{
  position:relative;border-radius:16px;overflow:hidden;
  height:210px;background:#2a2a2a;
  cursor:pointer;
  transition:transform .15s,box-shadow .15s;
  display:flex;flex-direction:column;justify-content:flex-end;
}
.route-card:hover{
  transform:translateY(-3px);
  box-shadow:0 12px 32px rgba(0,0,0,.22);
}
/* Vollbild-Foto */
.rc-img{
  position:absolute;inset:0;
  width:100%;height:100%;object-fit:cover;
  display:block;
}
.rc-ph{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#3a3530 0%,#1e1b18 100%);
  display:flex;align-items:center;justify-content:center;
}
/* Dunkles Gradient über das Foto */
.rc-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to bottom,
    rgba(0,0,0,0) 15%,
    rgba(0,0,0,.45) 50%,
    rgba(0,0,0,.82) 75%,
    rgba(0,0,0,.92) 100%);
}
/* Inhalt-Wrapper (über Gradient) */
.rc-content{
  position:relative;z-index:2;
  padding:10px 13px 7px;
}
/* ── Wegweiser ── */
.ww{
  display:inline-flex;align-items:stretch;
  height:50px;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.55));
  margin-bottom:8px;
}
.ww-label{
  background:#2d5c27;
  padding:4px 7px;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  font-size:6.5px !important;font-weight:800 !important;
  text-transform:uppercase;letter-spacing:.05em;
  color:#fff !important;line-height:1.35;
  min-width:42px;border-radius:3px 0 0 3px;
}
.ww-flag{font-size:13px;margin-bottom:2px;line-height:1}
.ww-arrow{
  /* clip-path erzeugt die Pfeilspitze rechts */
  clip-path:polygon(0 0,calc(100% - 13px) 0,100% 50%,calc(100% - 13px) 100%,0 100%);
  padding:6px 22px 6px 11px;
  display:flex;align-items:center;justify-content:center;
  min-width:54px;
  /* Farbe = Schwierigkeit; Default gelb (T1) */
  background:#4a9c4a;
  transition:background .2s;
}
.ww-arrow.sac-t1{background:#4a9c4a}
.ww-arrow.sac-t2{background:#8ab22a}
.ww-arrow.sac-t3{background:#d4a000}
.ww-arrow.sac-t4{background:#d46400}
.ww-arrow.sac-t5{background:#c42828}
.ww-arrow.sac-t6{background:#7a1080}
.ww-arrow.sac-none{background:#888}
.ww-num{
  font-size:1.45rem !important;font-weight:900 !important;
  color:#fff !important;line-height:1;letter-spacing:-.02em;
}
/* Routenname + Etappe/Von-Bis */
.rc-name{
  font-size:15px !important;font-weight:800 !important;
  color:#fff !important;line-height:1.25 !important;
  margin-bottom:2px !important;
  text-shadow:0 1px 4px rgba(0,0,0,.6);
}
.rc-sub{
  font-size:11.5px !important;color:rgba(255,255,255,.8) !important;
  line-height:1.3 !important;margin-bottom:0 !important;
  text-shadow:0 1px 3px rgba(0,0,0,.5);
}
/* Stats-Leiste unten (rot) */
.rc-stats{
  position:relative;z-index:2;
  background:rgba(180,0,0,.88);
  padding:5px 13px;
  font-size:11px !important;font-weight:700 !important;
  color:#fff !important;letter-spacing:.03em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
/* Fotocredit */
.rc-attr{
  position:absolute;top:7px;right:9px;z-index:3;
  font-size:9px !important;color:rgba(255,255,255,.6) !important;
  pointer-events:none;
}
/* ── BADGE (für Drawer) ── */
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

/* ── ROUTE DRAWER ── */
.drawer-overlay{
  display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,.45);backdrop-filter:blur(2px);
  align-items:flex-end;justify-content:center;
}
.drawer-overlay.open{display:flex}
.drawer-panel{
  background:#fff;width:100%;max-width:640px;
  border-radius:20px 20px 0 0;
  max-height:88vh;overflow-y:auto;
  animation:slideUp .25s ease;
}
@media(min-width:640px){
  .drawer-overlay{align-items:center}
  .drawer-panel{border-radius:20px;max-height:85vh;margin:16px}
}
@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}
.drawer-photo{display:none}
.drawer-map-wrap{position:relative;height:320px;border-radius:20px 20px 0 0;overflow:hidden}
.drawer-map{width:100%;height:100%}
.leaflet-container{font-family:inherit}
.drawer-photo-ph{
  width:100%;height:220px;border-radius:20px 20px 0 0;
  background:linear-gradient(135deg,#ebe7df,#f5f3ef);
  display:flex;align-items:center;justify-content:center;
}
.drawer-body{padding:20px 22px 32px}
.drawer-close{
  position:absolute;top:14px;right:14px;
  width:34px;height:34px;border-radius:50%;
  background:rgba(0,0,0,.35);border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;
}
.drawer-photo-wrap{position:relative}
.drawer-title{
  font-size:21px !important;font-weight:800 !important;
  color:#1a1a1a !important;line-height:1.25 !important;margin-bottom:4px !important;
}
.drawer-region{font-size:13px !important;color:#888 !important;margin-bottom:14px !important}
.drawer-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.drawer-stats{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
  gap:10px;margin-bottom:18px;
}
.drawer-stat{
  background:#f5f3f0;border-radius:12px;padding:12px 14px;
}
.drawer-stat-val{font-size:18px !important;font-weight:700 !important;color:#1a1a1a !important}
.drawer-stat-lbl{font-size:11px !important;color:#888 !important;margin-top:2px !important}
.drawer-terrain{
  font-size:13px !important;color:#555 !important;
  background:#f9f8f6;border-radius:10px;padding:12px 14px;margin-bottom:18px;
}
.drawer-attr{font-size:11px !important;color:#aaa !important;margin-bottom:18px !important;line-height:1.4 !important}
.drawer-cta{
  display:block;width:100%;padding:15px;
  background:var(--red);color:#fff !important;
  border:none;border-radius:12px;cursor:pointer;
  font-size:16px !important;font-weight:700 !important;text-align:center;
  text-decoration:none;
}
.drawer-cta:hover{background:#b30000}
.drawer-close-bottom{
  display:none;width:100%;margin-top:12px;
  padding:13px;background:#f0eeeb;border:none;border-radius:12px;
  font-size:15px !important;font-weight:700 !important;color:#333 !important;
  cursor:pointer;
}
@media(max-width:600px){
  .drawer-close-bottom{display:block}
}
.route-card{cursor:pointer}

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

/* ── HERO APP STORE BUTTON ── */
.hero-store-btn{
  display:inline-flex;align-items:center;gap:10px;
  margin-top:22px;
  padding:11px 20px;
  background:rgba(0,0,0,.22);border:1.5px solid rgba(255,255,255,.4);
  border-radius:10px;color:#fff !important;
  font-size:14px !important;font-weight:600 !important;
  text-decoration:none !important;transition:background .15s;
}
.hero-store-btn:hover{background:rgba(0,0,0,.35)!important}
.hero-store-small{font-size:10px !important;opacity:.8;display:block;line-height:1.2}

/* ── CARD APP STORE BUTTON ── */
.card-appstore-btn{
  display:flex;align-items:center;justify-content:center;gap:7px;
  margin-top:12px;padding:9px 14px;
  background:#fff;border:1.5px solid #000;border-radius:8px;
  color:#000 !important;font-size:12px !important;font-weight:600 !important;
  text-decoration:none !important;transition:opacity .15s;
}
.card-appstore-btn:hover{opacity:.75!important}

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
}
</style>
</head>
<body>

<!-- MENU SPACER -->
<div style="height:68px;background:#fff;width:100%"></div>

<!-- HERO -->
<div class="st-hero">
  <div class="st-hero-inner">
    <div class="st-hero-eyebrow">Schweizer Sagenweg-App</div>
    <h1>Routen entdecken</h1>
    <p>Alle Wanderrouten der SagaTrail-App — wähle einen Kanton und filtere nach Distanz, Schwierigkeit und Saison.</p>
    <a href="https://apps.apple.com/de/app/sagatrail/id6788260668" class="hero-store-btn" target="_blank" rel="noopener">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      <div><span class="hero-store-small">Laden im</span>App Store</div>
    </a>
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
      <a href="https://apps.apple.com/de/app/sagatrail/id6788260668" class="store-btn" target="_blank" rel="noopener">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        <div><span class="store-small">Laden im</span>App Store</div>
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
  document.getElementById('app-banner').style.display = 'none';
  // Sofort suchen — kein extra Tipp auf den Suchen-Button nötig
  doSearch();
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
    if(window.__initLazyPhotos) window.__initLazyPhotos();
    document.getElementById('app-banner').style.display = 'block';
  } catch(e){
    btn.disabled = false;
    stat.textContent = '';
    out.innerHTML = emptyHtml('Verbindung fehlgeschlagen','Bitte versuche es später nochmals.');
  }
}

// ── WEGWEISER HELPERS ────────────────────────────────────────
// Parst den Routennamen in Teile:
//   displayName  = Routenname ohne Nummer-Prefix und ohne Von/Bis
//   etappe       = "Etappe X" (falls vorhanden)
//   vonBis       = "Von – Bis" oder leer
// Verwendet r.ref / r.network direkt (aus API), parsed Name nur als Fallback.
function parseRoute(name, ref, network){
  let num = ref ? String(ref) : '';
  let type = '';
  if(network){
    if(network==='nwn'||network==='iwn') type='national';
    else if(network==='rwn') type='regional';
    else if(network==='lwn') type='lokal';
    else type='kantonal';
  }

  // Führende Nummer aus Name entfernen → rest
  let rest = name;
  // K-Route: "K4 AG Name…"
  let m = /^K\\d+\\s+[A-Z]{2}\\s+(.+)$/.exec(name);
  if(m){ rest = m[1]; if(!num) num = (name.match(/^K(\\d+)/)||[])[1]||''; if(!type) type='kantonal'; }
  else {
    // Nummerierte Route: "3 Name…"
    m = /^(\\d+)\\s+(.+)$/.exec(name);
    if(m){ rest = m[2]; if(!num) { const n=+m[1]; num=String(n); if(!type) type=n<=9?'national':n<=99?'regional':'lokal'; } }
  }

  // Etappe: "Name Etappe X Von - Bis"
  m = /^(.*?)\\s+Etappe\\s+(\\d+)\\s+(.+)$/i.exec(rest);
  if(m){
    const fromTo = m[3].trim();
    // fromTo = "Trogen - Appenzell" oder "Trogen – Appenzell"
    return { num, type, displayName: m[1].trim(), etappe:'Etappe '+m[2], vonBis: fromTo };
  }

  // Kein Etappe → Von/Bis nach erstem " - " oder " – " mit Leerzeichen
  m = /^(.+?)\\s{1,2}[-–]\\s{1,2}(.+)$/.exec(rest);
  if(m){
    const displayName = m[1].trim();
    const vonBis      = displayName + ' – ' + m[2].trim();
    return { num, type, displayName, etappe:'', vonBis };
  }

  return { num, type, displayName: rest, etappe:'', vonBis:'' };
}

function sacArrowClass(sac){
  if(!sac||sac==='unknown') return 'sac-none';
  const m=/T\\s*([1-6])/i.exec(sac); if(!m) return 'sac-none';
  return 'sac-t'+m[1];
}
function typLabel(type){
  if(type==='national')  return 'national';
  if(type==='regional')  return 'regional';
  if(type==='lokal')     return 'lokal';
  if(type==='kantonal')  return 'kantonal';
  return '';
}

function wegweiserHtml(num, type, sac){
  if(!num) return '';
  const lbl = typLabel(type);
  return \`<div class="ww">
    <div class="ww-label">
      <div class="ww-flag">&#127464;&#127469;</div>
      <div>Wanderland</div>
      \${lbl ? \`<div>\${lbl}</div>\` : ''}
    </div>
    <div class="ww-arrow \${sacArrowClass(sac)}">
      <span class="ww-num">\${num}</span>
    </div>
  </div>\`;
}

function sacBadge(sac){
  if(!sac||sac==='unknown') return '';
  const m=/T\\s*([1-6])/i.exec(sac); if(!m) return '';
  return \`<span class="badge b-sac">SAC \${sac.replace(/\\s+/g,'')}</span>\`;
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
function seasonLabel(s){
  if(!s) return '';
  if(s==='ganzjaehrig') return 'Ganzjährig';
  if(s==='sommer')      return 'Nur Sommer';
  if(s==='alpin')       return 'Alpin';
  if(s==='hochalpin')   return 'Hochalpin';
  return s;
}

// route store: id → full route object (on window so onclick attrs can reach it)
window.__routeStore = {};

const PH_SVG_INNER = \`<svg width="48" height="36" viewBox="0 0 72 54" fill="none">
  <polygon points="0,50 20,18 36,38 52,14 72,50" fill="#444"/>
  <polygon points="20,18 28,32 12,32" fill="#555"/>
  <polygon points="52,14 60,28 44,28" fill="#555"/>
</svg>\`;

function cardHtml(r){
  window.__routeStore[r.id] = r;
  const rid  = r.id.replace(/['"]/g,'');
  const p    = parseRoute(r.name, r.ref, r.network);

  const km   = r.distanceTagKm
    ? (Math.round(r.distanceTagKm*10)/10)+' km'
    : r.distanceKm ? (Math.round(r.distanceKm*10)/10)+' km' : '';
  const hm   = r.ascentM ? r.ascentM+' hm' : '';
  const zeit = fmtTime(r.minutes);
  const seas = seasonLabel(r.season);

  const statsArr = [r.sac&&r.sac!=='unknown'?r.sac.replace(/\\s+/g,''):'', km, hm, zeit, seas].filter(Boolean);
  const statsLine = statsArr.join(' · ');

  // Subline: Etappe + vonBis
  const subParts = [p.etappe, p.vonBis].filter(Boolean);
  const subLine  = subParts.join(' · ');

  // Foto (DB-URL sofort, sonst lazy)
  const imgEl = r.photoUrl
    ? \`<img class="rc-img" src="\${r.photoUrl}" alt="\${esc(p.displayName)}" loading="lazy"
           onerror="this.style.display='none';this.onerror=null">\`
    : \`<div class="rc-img route-img-lazy rc-ph"
           data-lat="\${r.coordinates?.lat}" data-lng="\${r.coordinates?.lng}"
           data-id="\${rid}" data-name="\${encodeURIComponent(r.name)}">\${PH_SVG_INNER}</div>\`;

  const attr = r.photoAttribution
    ? \`<div class="rc-attr">\${r.photoAttribution.replace(/<[^>]+>/g,'').substring(0,60)}</div>\`
    : '';

  return \`<div class="route-card" onclick="openDrawer(window.__routeStore['\${rid}'])" role="button" tabindex="0"
    onkeydown="if(event.key==='Enter')openDrawer(window.__routeStore['\${rid}'])">
    \${imgEl}
    \${attr}
    <div class="rc-overlay"></div>
    <div class="rc-content">
      \${wegweiserHtml(p.num, p.type, r.sac)}
      <div class="rc-name">\${esc(p.displayName)}</div>
      \${subLine ? \`<div class="rc-sub">\${esc(subLine)}</div>\` : ''}
    </div>
    <div class="rc-stats">\${esc(statsLine)||'&nbsp;'}</div>
  </div>\`;
}

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Expose placeholder on window so onerror attributes can access it
window.__sagaPH = \`<div class="route-img-ph">\${PH_SVG_INNER}</div>\`;

// ── LAZY PHOTO LOADER ─────────────────────────────────────────
// Karten ohne DB-Foto (route-img-lazy): per IntersectionObserver sichtbar
// werden → /api/routes/photo aufrufen → Foto anzeigen (Server schreibt in DB).
(function(){
  const fetching = new Set();
  const obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      const el = e.target;
      const id = el.dataset.id;
      if(fetching.has(id)) return;
      fetching.add(id);
      obs.unobserve(el);
      const lat  = el.dataset.lat;
      const lng  = el.dataset.lng;
      const name = el.dataset.name;
      const url  = '/api/routes/photo?lat='+lat+'&lng='+lng
                  +'&routeId=osm-'+id+'&routeName='+name;
      fetch(url)
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          if(!data || !data.photoUrl) return;
          const img = document.createElement('img');
          img.className = 'rc-img';
          img.alt = decodeURIComponent(name);
          img.loading = 'lazy';
          img.onerror = function(){ this.style.display='none'; };
          img.src = data.photoUrl;
          el.replaceWith(img);
        })
        .catch(function(){ fetching.delete(id); });
    });
  }, { rootMargin: '200px' });

  // Neue Karten beobachten (wird nach jedem Render aufgerufen)
  window.__initLazyPhotos = function(){
    document.querySelectorAll('.route-img-lazy').forEach(function(el){
      obs.observe(el);
    });
  };
})();

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
// Auto-Kanton aus URL-Parameter
(function(){
  const p = new URLSearchParams(location.search).get('canton');
  if(!p) return;
  const btn = Array.from(document.querySelectorAll('.canton-btn')).find(function(b){ return b.dataset.name===p; });
  if(btn) setTimeout(function(){ btn.click(); }, 100);
})();
// inject drawer HTML
document.body.insertAdjacentHTML('beforeend',
  '<div id="drawer-overlay" class="drawer-overlay"><div id="drawer-panel" class="drawer-panel"></div></div>'
);
// ── DRAWER ───────────────────────────────────────────────────
const overlay = document.getElementById('drawer-overlay');
const panel   = document.getElementById('drawer-panel');

let _map = null;

function openDrawer(r) {
  const km   = r.distanceKm ? (Math.round(r.distanceKm*10)/10)+' km' : null;
  const hm   = r.ascentM    ? r.ascentM+' hm'   : null;
  const zeit = r.minutes    ? fmtTime(r.minutes) : null;
  const elev = r.maxElevationM ? r.maxElevationM+' m' : null;

  function stat(val, lbl) {
    if(!val) return '';
    return \`<div class="drawer-stat">
      <div class="drawer-stat-val">\${val}</div>
      <div class="drawer-stat-lbl">\${lbl}</div>
    </div>\`;
  }

  const dp = parseRoute(r.name, r.ref, r.network);
  const subParts2 = [dp.etappe, dp.vonBis].filter(Boolean);

  panel.innerHTML = \`
    <div class="drawer-map-wrap">
      <div id="drawer-map" class="drawer-map"></div>
      <button class="drawer-close" onclick="closeDrawer()" aria-label="Schliessen">✕</button>
      \${dp.num ? \`<div style="position:absolute;bottom:14px;left:14px;z-index:500">\${wegweiserHtml(dp.num,dp.type,r.sac)}</div>\` : ''}
    </div>
    <div class="drawer-body">
      <div class="drawer-title">\${dp.displayName || r.name}</div>
      \${subParts2.length ? \`<div class="drawer-region">🗺️ \${subParts2.join(' · ')}</div>\` : r.region ? \`<div class="drawer-region">📍 \${r.region}</div>\` : ''}
      <div class="drawer-badges">
        \${sacBadge(r.sac)}\${seasonBadge(r.season)}
        \${r.featured ? '<span class="badge b-star">★ Featured</span>' : ''}
      </div>
      <div class="drawer-stats">
        \${stat(km,   'Distanz')}
        \${stat(hm,   'Höhenmeter')}
        \${stat(zeit, 'Gehzeit')}
        \${stat(elev, 'Max. Höhe')}
      </div>
      \${r.description ? \`<div class="drawer-terrain" style="line-height:1.6;font-size:14px !important;color:#333 !important">\${r.description}</div>\` : r.terrain ? \`<div class="drawer-terrain">🗺️ \${r.terrain}</div>\` : ''}
      <a class="drawer-cta" href="https://apps.apple.com/de/app/sagatrail/id6788260668" target="_blank" rel="noopener">
        Diese Route in der App erleben →
      </a>
      <button class="drawer-close-bottom" onclick="closeDrawer()">✕ Schliessen</button>
    </div>\`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Karte initialisieren nachdem der DOM sichtbar ist
  setTimeout(function() {
    if(_map){ _map.remove(); _map = null; }
    _map = L.map('drawer-map', {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true
    });
    L.tileLayer(
      'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg',
      {
        maxZoom: 18,
        attribution: '© <a href="https://www.swisstopo.admin.ch" target="_blank">swisstopo</a>',
        tileSize: 256
      }
    ).addTo(_map);

    const coords = Object.values(r.geometry || {});
    if(coords.length > 0){
      const poly = L.polyline(coords, {color:'#CC0000', weight:4, opacity:0.9}).addTo(_map);
      // Startpunkt markieren
      L.circleMarker(coords[0], {
        radius:7, fillColor:'#CC0000', color:'#fff',
        weight:2, fillOpacity:1
      }).addTo(_map);
      _map.fitBounds(poly.getBounds(), {padding:[20,20]});
    } else if(r.coordinates){
      _map.setView([r.coordinates.lat, r.coordinates.lng], 13);
    }
    _map.invalidateSize();
  }, 60);
}

function closeDrawer() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if(_map){ _map.remove(); _map = null; }
}

overlay.addEventListener('click', function(e) {
  if(e.target === overlay) closeDrawer();
});

document.addEventListener('keydown', function(e) {
  if(e.key === 'Escape') closeDrawer();
});

window.__sagaPhLg = \`<div class="drawer-photo-ph"><svg width="80" height="60" viewBox="0 0 72 54" fill="none"><polygon points="0,50 20,18 36,38 52,14 72,50" fill="#ddd"/><polygon points="20,18 28,32 12,32" fill="#bbb"/><polygon points="52,14 60,28 44,28" fill="#bbb"/></svg></div>\`;

</script>
</body>
</html>`;
