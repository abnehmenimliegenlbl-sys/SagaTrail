export const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SagaTrail – Wandern durch Schweizer Sagen</title>
<meta name="description" content="SagaTrail verbindet Wandern mit Schweizer Sagenwelt. GPS-geführte Touren mit echter Sagen-Narration in 26 Kantonen." />
<style>
:root{
  --red:#CC0000;
  --dark:#1a1a1a;
  --mid:#555;
  --light:#f7f6f4;
  --card:#fff;
  --border:#e5e5e5;
  --green:#2e7d52;
  --radius:12px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,'Segoe UI',sans-serif;background:var(--light);color:var(--dark);line-height:1.6;font-size:16px}
a{color:var(--red);text-decoration:none}
img{max-width:100%;display:block}

/* NAV */
nav{background:var(--dark);position:sticky;top:0;z-index:100;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.nav-logo{display:flex;align-items:center;gap:10px;color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px}
.nav-logo svg{flex-shrink:0}
.nav-logo span{color:var(--red)}
.nav-links{display:flex;align-items:center;gap:20px}
.nav-link{color:#ccc;font-size:14px;font-weight:500;transition:color .15s}
.nav-link:hover{color:#fff}
.nav-cta{background:var(--red);color:#fff !important;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;transition:opacity .15s}
.nav-cta:hover{opacity:.88}

/* HERO */
.hero{background:var(--red);color:#fff;padding:80px 24px 72px;text-align:center}
.hero h1{font-size:clamp(28px,5vw,54px);font-weight:800;line-height:1.15;color:#fff;max-width:700px;margin:0 auto 20px}
.hero h1 em{font-style:normal;opacity:.85}
.hero p{font-size:clamp(15px,2vw,20px);color:rgba(255,255,255,.88);max-width:560px;margin:0 auto 36px;line-height:1.6}
.hero-badges{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.badge-store{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.4);color:#fff;padding:11px 20px;border-radius:10px;font-size:14px;font-weight:600;transition:background .15s;text-decoration:none}
.badge-store:hover{background:rgba(255,255,255,.25)}
.badge-store svg{flex-shrink:0}
.hero-sub{margin-top:28px;font-size:13px;color:rgba(255,255,255,.6)}

/* FEATURES */
.section{padding:64px 24px}
.section-inner{max-width:1000px;margin:0 auto}
.section-label{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--red);margin-bottom:10px}
.section-title{font-size:clamp(22px,3.5vw,36px);font-weight:800;color:var(--dark);line-height:1.25;margin-bottom:14px}
.section-desc{font-size:16px;color:var(--mid);max-width:560px;line-height:1.7;margin-bottom:48px}
.features-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.feature-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px;transition:box-shadow .2s}
.feature-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
.feature-icon{font-size:32px;margin-bottom:14px;line-height:1}
.feature-title{font-size:17px;font-weight:700;color:var(--dark);margin-bottom:8px}
.feature-text{font-size:14px;color:var(--mid);line-height:1.6}

/* SAGAS SECTION */
.section-alt{background:var(--dark)}
.section-alt .section-label{color:#ff6b6b}
.section-alt .section-title{color:#fff}
.section-alt .section-desc{color:rgba(255,255,255,.65)}
.sagas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:8px}
.saga-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:var(--radius);padding:22px 18px}
.saga-card .canton{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:8px}
.saga-card .name{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}
.saga-card .desc{font-size:13px;color:rgba(255,255,255,.55);line-height:1.5}
.welcome-banner{background:rgba(204,0,0,.2);border:1px solid rgba(204,0,0,.4);border-radius:var(--radius);padding:24px 28px;margin-top:40px;display:flex;align-items:flex-start;gap:16px}
.welcome-banner-icon{font-size:28px;flex-shrink:0;margin-top:2px}
.welcome-banner-text h3{font-size:17px;font-weight:700;color:#fff;margin-bottom:6px}
.welcome-banner-text p{font-size:14px;color:rgba(255,255,255,.7);line-height:1.6}

/* PRICING */
.pricing-section{background:var(--light)}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.price-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--radius);padding:24px 20px;position:relative;transition:box-shadow .2s}
.price-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.09)}
.price-card.highlighted{border-color:var(--red);box-shadow:0 0 0 1px var(--red)}
.price-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--red);color:#fff;font-size:10px;font-weight:700;letter-spacing:.8px;padding:3px 12px;border-radius:20px;white-space:nowrap;text-transform:uppercase}
.price-name{font-size:15px;font-weight:700;color:var(--dark);margin-bottom:4px}
.price-amount{font-size:28px;font-weight:800;color:var(--dark);line-height:1.1;margin-bottom:2px}
.price-amount span{font-size:14px;font-weight:500;color:var(--mid)}
.price-sub{font-size:12px;color:var(--mid);margin-bottom:16px}
.price-saving{display:inline-block;background:#fce8e8;color:var(--red);font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:14px}
.price-features{list-style:none;padding:0;margin:0}
.price-features li{font-size:13px;color:var(--mid);padding:4px 0;display:flex;align-items:flex-start;gap:7px;border-top:1px solid var(--border)}
.price-features li:first-child{border-top:none;padding-top:0}
.price-features li::before{content:"✓";color:var(--green);font-weight:700;flex-shrink:0;margin-top:2px}

/* PARTNER TEASER */
.partner-teaser{background:var(--red);color:#fff;padding:64px 24px;text-align:center}
.partner-teaser .section-inner{max-width:700px}
.partner-teaser h2{font-size:clamp(22px,3.5vw,34px);font-weight:800;color:#fff;margin-bottom:14px}
.partner-teaser p{font-size:16px;color:rgba(255,255,255,.85);margin-bottom:32px;line-height:1.7}
.partner-packages{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:32px}
.partner-pkg{background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.35);border-radius:10px;padding:12px 20px;min-width:150px}
.partner-pkg .pkg-name{font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:4px}
.partner-pkg .pkg-price{font-size:20px;font-weight:800;color:#fff}
.partner-pkg .pkg-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
.btn-white{display:inline-block;background:#fff;color:var(--red);font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;transition:opacity .15s}
.btn-white:hover{opacity:.92}

/* HOW IT WORKS */
.how-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px}
.how-step{text-align:center;padding:8px 8px 0}
.how-num{width:44px;height:44px;background:var(--red);color:#fff;border-radius:50%;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.how-title{font-size:16px;font-weight:700;color:var(--dark);margin-bottom:8px}
.how-text{font-size:14px;color:var(--mid);line-height:1.6}

/* FOOTER */
footer{background:var(--dark);color:rgba(255,255,255,.5);padding:40px 24px;text-align:center;font-size:13px}
footer a{color:rgba(255,255,255,.6);text-decoration:none}
footer a:hover{color:#fff}
.footer-inner{max-width:800px;margin:0 auto}
.footer-logo{font-size:20px;font-weight:800;color:#fff;margin-bottom:16px}
.footer-logo span{color:var(--red)}
.footer-links{display:flex;justify-content:center;flex-wrap:wrap;gap:20px;margin-bottom:20px}
.footer-copy{font-size:12px;color:rgba(255,255,255,.3)}

/* RESPONSIVE */
@media(max-width:640px){
  nav{padding:0 16px}
  .hero{padding:56px 16px 52px}
  .section{padding:48px 16px}
  .welcome-banner{flex-direction:column;gap:10px}
  .partner-teaser{padding:48px 16px}
}
@media(max-width:480px){
  .nav-links .nav-link:not(.nav-cta){display:none}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <a class="nav-logo" href="/">
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="6" fill="#CC0000"/>
      <path d="M13 5L7 10.5V21h4.5v-5.5h3V21H19V10.5L13 5Z" fill="white"/>
    </svg>
    Saga<span>Trail</span>
  </a>
  <div class="nav-links">
    <a class="nav-link" href="#features">Features</a>
    <a class="nav-link" href="#preise">Preise</a>
    <a class="nav-link nav-cta" href="/partner">Für Partner</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <h1>Wandere durch die <em>Schweizer Sagenwelt</em></h1>
  <p>GPS-geführte Wanderungen mit echter Sagen-Narration. Entdecke Jahrhunderte alte Geschichten direkt an ihrem Ursprungsort – in 26 Kantonen.</p>
  <div class="hero-badges">
    <a class="badge-store" href="https://apps.apple.com/app/sagatrail" target="_blank">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      App Store
    </a>
    <a class="badge-store" href="https://play.google.com/store/apps/details?id=ch.sagatrail" target="_blank">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
      Google Play
    </a>
  </div>
  <p class="hero-sub">Kostenlos herunterladen · Willkommens-Sagen-Paket inklusive</p>
</section>

<!-- HOW IT WORKS -->
<section class="section">
  <div class="section-inner">
    <div class="section-label">So funktioniert's</div>
    <h2 class="section-title">In drei Schritten zur Sagenwanderung</h2>
    <div class="how-grid">
      <div class="how-step">
        <div class="how-num">1</div>
        <h3 class="how-title">Route wählen</h3>
        <p class="how-text">Wähle einen Kanton und entdecke Wanderrouten, die direkt an historischen Sagenorten vorbeiführen.</p>
      </div>
      <div class="how-step">
        <div class="how-num">2</div>
        <h3 class="how-title">Wandern & hören</h3>
        <p class="how-text">Der GPS-basierte Erzähler aktiviert sich automatisch, wenn du einen Sagenort erreichst – ganz ohne Tippen.</p>
      </div>
      <div class="how-step">
        <div class="how-num">3</div>
        <h3 class="how-title">Sagen entdecken</h3>
        <p class="how-text">Erfahre die alten Schweizer Sagen im Originalkontext – auf Deutsch, Französisch, Italienisch und mehr.</p>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="section" id="features" style="background:#fff;padding-top:0">
  <div class="section-inner">
    <div class="section-label">Features</div>
    <h2 class="section-title">Alles für deine Sagenwanderung</h2>
    <p class="section-desc">SagaTrail ist mehr als eine Wander-App – es ist ein lebendiges Archiv der Schweizer Sagenwelt, das du auf jedem Schritt begleitet.</p>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🗺</div>
        <h3 class="feature-title">GPS-Sagen-Navigation</h3>
        <p class="feature-text">Echtzeitortung führt dich entlang markierter Wanderwege direkt zu den Sagenorten – mit automatischer Wegbeschreibung.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎙</div>
        <h3 class="feature-title">Lebendige Narration</h3>
        <p class="feature-text">Hochwertige Text-to-Speech-Narration aktiviert sich automatisch am Sagenort. Hände frei, Augen auf die Natur.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🏔</div>
        <h3 class="feature-title">26 Kantone</h3>
        <p class="feature-text">Von Uri bis Genf, von Appenzell bis Basel – hunderte kuratierte Sagen aus allen Kantonen der Schweiz.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3 class="feature-title">Gruppentouren</h3>
        <p class="feature-text">Wandert gemeinsam und synchronisiert euren Fortschritt in Echtzeit. Perfekt für Schulklassen, Familien und Wandergruppen.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📦</div>
        <h3 class="feature-title">Sagen-Pakete</h3>
        <p class="feature-text">Lade Kantone für die Offline-Nutzung herunter. Sagen-Inhalte bleiben auch ohne Mobilnetz verfügbar.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🌍</div>
        <h3 class="feature-title">8 Sprachen</h3>
        <p class="feature-text">Die App und alle Sagentexte stehen auf Deutsch, Französisch, Italienisch, Englisch, Rätoromanisch und weiteren Sprachen bereit.</p>
      </div>
    </div>
  </div>
</section>

<!-- SAGAS SECTION -->
<section class="section section-alt" id="sagen">
  <div class="section-inner">
    <div class="section-label">Sagen-Pakete</div>
    <h2 class="section-title" style="color:#fff">Tausende Jahre Schweizer Geschichte</h2>
    <p class="section-desc">Jedes Kantonspaket enthält sorgfältig recherchierte, urheberrechtsfreie Sagen aus historischen Quellen.</p>
    <div class="sagas-grid">
      <div class="saga-card">
        <div class="canton">Kanton Bern</div>
        <div class="name">Der Lindwurm von Burgdorf</div>
        <div class="desc">Ein feuerspeiender Drache terrorisiert das Emmental, bis ein mutiger Ritter ihn zur Strecke bringt…</div>
      </div>
      <div class="saga-card">
        <div class="canton">Kanton Uri</div>
        <div class="name">Der Teufelsstein am Gotthard</div>
        <div class="desc">Der Teufel hilft beim Bau der Teufelsbrücke – verlangt dafür aber eine unheimliche Gegenleistung…</div>
      </div>
      <div class="saga-card">
        <div class="canton">Kanton Appenzell</div>
        <div class="name">Die Wildmannli im Alpstein</div>
        <div class="desc">Kleine, starke Wesen sollen in den Felsen des Alpsteins gelebt haben und den Sennen geholfen haben…</div>
      </div>
      <div class="saga-card">
        <div class="canton">Kanton Graubünden</div>
        <div class="name">Die Drachen vom Calanda</div>
        <div class="desc">Der Calanda-Berg soll einst von Drachen bewohnt gewesen sein, deren Überreste noch heute zu sehen sind…</div>
      </div>
    </div>
    <div class="welcome-banner">
      <div class="welcome-banner-icon">🎁</div>
      <div class="welcome-banner-text">
        <h3>Willkommens-Sagen-Paket</h3>
        <p>Neu angemeldete Nutzerinnen und Nutzer erhalten ihr erstes Sagen-Paket kostenlos – einfach auswählen und sofort loslegen, ohne Abo.</p>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="section pricing-section" id="preise">
  <div class="section-inner">
    <div class="section-label">Abonnements</div>
    <h2 class="section-title">Einfache, faire Preise</h2>
    <p class="section-desc">Alle Abos beinhalten unbeschränkten Zugang zu Sagen-Paketen, GPS-Narration und Gruppentouren. Jederzeit kündbar.</p>
    <div class="pricing-grid">

      <div class="price-card">
        <p class="price-name">Premium Monat</p>
        <p class="price-amount">CHF 6.95<span>/Mt.</span></p>
        <p class="price-sub">Monatlich kündbar</p>
        <span class="price-saving">Zum Ausprobieren</span>
        <ul class="price-features">
          <li>Alle 26 Kantone</li>
          <li>GPS-Narration</li>
          <li>Gruppentouren</li>
          <li>Offline-Pakete</li>
        </ul>
      </div>

      <div class="price-card highlighted">
        <span class="price-badge">Beliebteste Wahl</span>
        <p class="price-name">Premium Jahr</p>
        <p class="price-amount">CHF 49.90<span>/J.</span></p>
        <p class="price-sub">= CHF 4.16/Mt.</p>
        <span class="price-saving">40% gespart</span>
        <ul class="price-features">
          <li>Alle 26 Kantone</li>
          <li>GPS-Narration</li>
          <li>Gruppentouren</li>
          <li>Offline-Pakete</li>
        </ul>
      </div>

      <div class="price-card">
        <p class="price-name">Familie</p>
        <p class="price-amount">CHF 79.90<span>/J.</span></p>
        <p class="price-sub">Bis 6 Familienmitglieder</p>
        <span class="price-saving">35% gespart</span>
        <ul class="price-features">
          <li>6 Konten teilen</li>
          <li>Alle 26 Kantone</li>
          <li>GPS-Narration</li>
          <li>Gruppentouren</li>
        </ul>
      </div>

      <div class="price-card">
        <p class="price-name">Elite</p>
        <p class="price-amount">CHF 149.00<span>/J.</span></p>
        <p class="price-sub">Für echte Sagenkenner</p>
        <span class="price-saving">35% gespart</span>
        <ul class="price-features">
          <li>Alle Features</li>
          <li>Exklusive Elite-Sagen</li>
          <li>Herzfrequenz-Pausen</li>
          <li>Schrittzähler</li>
        </ul>
      </div>

      <div class="price-card">
        <p class="price-name">Elite Familie</p>
        <p class="price-amount">CHF 239.00<span>/J.</span></p>
        <p class="price-sub">Elite für 6 Mitglieder</p>
        <span class="price-saving">35% gespart</span>
        <ul class="price-features">
          <li>6 Elite-Konten</li>
          <li>Alle Elite-Features</li>
          <li>Geteilte Routen</li>
          <li>Familienstatistiken</li>
        </ul>
      </div>

    </div>
  </div>
</section>

<!-- PARTNER TEASER -->
<section class="partner-teaser">
  <div class="section-inner">
    <h2>Restaurants & Shops entlang der Sagenwege</h2>
    <p>Als SagaTrail-Partner erreichen Sie tausende aktive Wandernde direkt auf ihrer Route. Mit dem Premium-Paket werden Sie sogar live vom Erzähler empfohlen.</p>
    <div class="partner-packages">
      <div class="partner-pkg">
        <div class="pkg-name">Basic</div>
        <div class="pkg-price">CHF 99<span style="font-size:14px;font-weight:500">/J.</span></div>
        <div class="pkg-sub">oder 9.90/Mt.</div>
      </div>
      <div class="partner-pkg">
        <div class="pkg-name">Standard</div>
        <div class="pkg-price">CHF 199<span style="font-size:14px;font-weight:500">/J.</span></div>
        <div class="pkg-sub">oder 19.90/Mt.</div>
      </div>
      <div class="partner-pkg">
        <div class="pkg-name">Premium</div>
        <div class="pkg-price">CHF 499<span style="font-size:14px;font-weight:500">/J.</span></div>
        <div class="pkg-sub">inkl. Narrations-Erwähnung</div>
      </div>
    </div>
    <a class="btn-white" href="/partner">Jetzt Partner werden →</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-logo">Saga<span>Trail</span></div>
    <div class="footer-links">
      <a href="#features">Features</a>
      <a href="#preise">Preise</a>
      <a href="/partner">Für Partner</a>
      <a href="mailto:hallo@sagatrail.ch">Kontakt</a>
    </div>
    <p class="footer-copy">© 2025 SagaTrail · Entdecke die Schweiz durch ihre Sagen</p>
  </div>
</footer>

</body>
</html>`;
