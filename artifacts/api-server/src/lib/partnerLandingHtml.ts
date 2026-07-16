export const PARTNER_LANDING_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SagaTrail Partner – Ihr Betrieb auf der Wanderroute</title>
<meta name="description" content="Werden Sie SagaTrail-Partner und erreichen Sie tausende aktive Wandernde direkt auf ihrer Route. Drei Pakete ab CHF 99/Jahr." />
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

/* NAV */
nav{background:var(--dark);position:sticky;top:0;z-index:100;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.nav-logo{display:flex;align-items:center;gap:10px;color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px;text-decoration:none}
.nav-logo svg{flex-shrink:0}
.nav-logo span{color:var(--red)}
.nav-links{display:flex;align-items:center;gap:20px}
.nav-link{color:#ccc;font-size:14px;font-weight:500;transition:color .15s;text-decoration:none}
.nav-link:hover{color:#fff}
.nav-cta{background:var(--red);color:#fff !important;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;transition:opacity .15s}
.nav-cta:hover{opacity:.88}

/* HERO */
.hero{background:var(--dark);color:#fff;padding:80px 24px 72px;text-align:center}
.hero-label{display:inline-block;background:rgba(204,0,0,.25);border:1px solid rgba(204,0,0,.5);color:#ff7a7a;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:4px 14px;border-radius:20px;margin-bottom:20px}
.hero h1{font-size:clamp(26px,5vw,52px);font-weight:800;line-height:1.15;color:#fff;max-width:700px;margin:0 auto 20px}
.hero h1 em{font-style:normal;color:var(--red)}
.hero p{font-size:clamp(15px,2vw,19px);color:rgba(255,255,255,.75);max-width:560px;margin:0 auto 36px;line-height:1.65}
.hero-stats{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin-top:8px}
.hero-stat{text-align:center}
.hero-stat .num{font-size:28px;font-weight:800;color:#fff}
.hero-stat .lbl{font-size:12px;color:rgba(255,255,255,.5);margin-top:2px}

/* SECTION */
.section{padding:64px 24px}
.section-inner{max-width:960px;margin:0 auto}
.section-label{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--red);margin-bottom:10px}
.section-title{font-size:clamp(22px,3.5vw,36px);font-weight:800;color:var(--dark);line-height:1.25;margin-bottom:14px}
.section-desc{font-size:16px;color:var(--mid);max-width:560px;line-height:1.7;margin-bottom:48px}

/* BENEFITS */
.benefits-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.benefit-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px}
.benefit-icon{font-size:30px;margin-bottom:12px;line-height:1}
.benefit-title{font-size:16px;font-weight:700;color:var(--dark);margin-bottom:8px}
.benefit-text{font-size:14px;color:var(--mid);line-height:1.65}
.benefit-badge{display:inline-block;background:#fce8e8;color:var(--red);font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-top:8px}

/* PRICING */
.pricing-section{background:#fff}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.price-card{background:var(--light);border:2px solid var(--border);border-radius:var(--radius);padding:32px 28px;position:relative;transition:box-shadow .2s}
.price-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.09)}
.price-card.highlighted{background:var(--card);border-color:var(--red);box-shadow:0 0 0 1px var(--red)}
.price-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--red);color:#fff;font-size:10px;font-weight:700;letter-spacing:.8px;padding:4px 14px;border-radius:20px;white-space:nowrap;text-transform:uppercase}
.price-name{font-size:14px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--mid);margin-bottom:10px}
.price-amount{font-size:38px;font-weight:800;color:var(--dark);line-height:1;margin-bottom:4px}
.price-amount span{font-size:16px;font-weight:600;color:var(--mid)}
.price-alt{font-size:13px;color:var(--mid);margin-bottom:20px}
.price-divider{border:none;border-top:1px solid var(--border);margin:20px 0}
.price-features{list-style:none;padding:0;margin:0 0 24px}
.price-features li{font-size:14px;color:var(--dark);padding:7px 0;display:flex;align-items:flex-start;gap:9px;border-top:1px solid var(--border)}
.price-features li:first-child{border-top:none;padding-top:0}
.price-features li .check{color:var(--green);font-weight:700;flex-shrink:0;margin-top:1px}
.price-features li .x{color:#ccc;flex-shrink:0;margin-top:1px}
.price-features li.muted{color:var(--mid)}
.price-cta{display:block;text-align:center;padding:13px;border-radius:9px;font-size:15px;font-weight:700;transition:opacity .15s;cursor:pointer;text-decoration:none}
.price-cta-outline{border:2px solid var(--border);color:var(--dark);background:var(--card)}
.price-cta-outline:hover{border-color:var(--dark)}
.price-cta-primary{background:var(--red);color:#fff;border:2px solid var(--red)}
.price-cta-primary:hover{opacity:.88}

/* PROCESS */
.process-steps{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;counter-reset:step}
.process-step{counter-increment:step;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px 20px;position:relative}
.process-step::before{content:counter(step);position:absolute;top:16px;right:16px;width:28px;height:28px;background:var(--light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--mid)}
.process-icon{font-size:28px;margin-bottom:12px}
.process-title{font-size:15px;font-weight:700;color:var(--dark);margin-bottom:8px}
.process-text{font-size:13px;color:var(--mid);line-height:1.6}

/* FORM */
.form-section{background:var(--dark)}
.form-section .section-label{color:#ff7a7a}
.form-section .section-title{color:#fff}
.form-section .section-desc{color:rgba(255,255,255,.6)}
.form-card{background:var(--card);border-radius:var(--radius);padding:36px 32px;max-width:680px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-group{display:flex;flex-direction:column;gap:5px}
.form-group.full{grid-column:1/-1}
.form-group label{font-size:12px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.4px}
.form-group input,.form-group select,.form-group textarea{padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;width:100%;background:var(--light);color:var(--dark);transition:border-color .15s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--red);background:#fff}
.form-group textarea{min-height:80px;resize:vertical}
.form-section-title{font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.6px;margin:4px 0 2px;grid-column:1/-1;padding-top:12px;border-top:1px solid var(--border)}
.form-section-title:first-child{border-top:none;padding-top:0}
.paket-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;grid-column:1/-1}
.paket-option{border:2px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;transition:all .15s;position:relative}
.paket-option:hover{border-color:var(--mid)}
.paket-option input[type=radio]{position:absolute;opacity:0;width:0;height:0}
.paket-option.selected{border-color:var(--red);background:#fef5f5}
.paket-option .p-name{font-size:13px;font-weight:700;color:var(--dark);margin-bottom:3px}
.paket-option .p-price{font-size:18px;font-weight:800;color:var(--dark)}
.paket-option .p-price span{font-size:12px;font-weight:500;color:var(--mid)}
.paket-option .p-sub{font-size:11px;color:var(--mid);margin-top:2px}
.paket-option.selected .p-name{color:var(--red)}
.submit-row{display:flex;align-items:center;gap:16px;grid-column:1/-1;margin-top:4px}
.btn-submit{background:var(--red);color:#fff;border:none;border-radius:9px;padding:14px 32px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .15s;flex-shrink:0}
.btn-submit:hover{opacity:.88}
.btn-submit:disabled{opacity:.5;cursor:not-allowed}
#form-status{font-size:13px;color:var(--mid)}
#form-status.ok{color:var(--green)}
#form-status.err{color:var(--red)}

/* FOOTER */
footer{background:#111;color:rgba(255,255,255,.45);padding:40px 24px;text-align:center;font-size:13px}
footer a{color:rgba(255,255,255,.55);text-decoration:none}
footer a:hover{color:#fff}
.footer-inner{max-width:800px;margin:0 auto}
.footer-logo{font-size:20px;font-weight:800;color:#fff;margin-bottom:16px}
.footer-logo span{color:var(--red)}
.footer-links{display:flex;justify-content:center;flex-wrap:wrap;gap:20px;margin-bottom:20px}
.footer-copy{font-size:12px;color:rgba(255,255,255,.3)}

@media(max-width:640px){
  nav{padding:0 16px}
  .hero{padding:56px 16px 48px}
  .section{padding:48px 16px}
  .form-card{padding:24px 18px}
  .form-grid{grid-template-columns:1fr}
  .form-group.full{grid-column:1}
  .paket-grid{grid-template-columns:1fr}
  .submit-row{flex-direction:column;align-items:stretch}
  .hero-stats{gap:20px}
  .process-step::before{top:12px;right:12px}
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
    <a class="nav-link" href="/">App</a>
    <a class="nav-link" href="#preise">Pakete</a>
    <a class="nav-link nav-cta" href="#anfrage">Jetzt bewerben</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-label">SagaTrail Partner-Programm</div>
  <h1>Ihr Betrieb direkt auf der <em>Wanderroute</em></h1>
  <p>Tausende aktive Wandernde entdecken die Schweiz mit SagaTrail. Als Partner sind Sie genau dort präsent, wo Ihre Gäste gerade wandern – mit echtem Einkehranreiz.</p>
  <div class="hero-stats">
    <div class="hero-stat">
      <div class="num">26</div>
      <div class="lbl">Kantone</div>
    </div>
    <div class="hero-stat">
      <div class="num">500+</div>
      <div class="lbl">Wanderrouten</div>
    </div>
    <div class="hero-stat">
      <div class="num">8</div>
      <div class="lbl">Sprachen</div>
    </div>
  </div>
</section>

<!-- BENEFITS -->
<section class="section" style="background:#fff">
  <div class="section-inner">
    <div class="section-label">Was Sie erhalten</div>
    <h2 class="section-title">Sichtbarkeit direkt auf der Strecke</h2>
    <p class="section-desc">SagaTrail-Nutzer wandern bewusst und sind offen für Empfehlungen. Ihr Betrieb erscheint zur richtigen Zeit am richtigen Ort.</p>
    <div class="benefits-grid">
      <div class="benefit-card">
        <div class="benefit-icon">📍</div>
        <h3 class="benefit-title">App-Profil</h3>
        <p class="benefit-text">Ihr Betrieb erscheint auf der Wanderkarte als POI – mit Name, Kategorie, Foto und Beschreibung.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🎁</div>
        <h3 class="benefit-title">Angebots-Tipp</h3>
        <p class="benefit-text">Zeigen Sie Wandernden ein exklusives Angebot oder einen Rabatt – direkt sichtbar beim Antippen Ihres Eintrags.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">📊</div>
        <h3 class="benefit-title">Statistiken</h3>
        <p class="benefit-text">Sehen Sie, wie viele Wandernde Ihr Profil aufgerufen haben und wie oft Ihr Angebot angeklickt wurde.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🎙</div>
        <h3 class="benefit-title">Narrations-Erwähnung</h3>
        <p class="benefit-text">Im Premium-Paket erwähnt der Sagen-Erzähler Ihren Betrieb automatisch, wenn Wandernde in der Nähe sind.</p>
        <span class="benefit-badge">Nur Premium</span>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🗺</div>
        <h3 class="benefit-title">Kantonale Reichweite</h3>
        <p class="benefit-text">Aktivieren Sie Ihren Eintrag gezielt für Ihren Kanton oder mehrere Regionen – je nach Bedarf.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">✏️</div>
        <h3 class="benefit-title">Einfache Verwaltung</h3>
        <p class="benefit-text">Angebote und Profil jederzeit über ein einfaches Online-Portal aktualisieren – kein technisches Wissen nötig.</p>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="section pricing-section" id="preise">
  <div class="section-inner">
    <div class="section-label">Partnerpakete</div>
    <h2 class="section-title">Transparent und fair</h2>
    <p class="section-desc">Wählen Sie das Paket, das zu Ihrem Betrieb passt. Keine versteckten Kosten, keine Provisionen auf Umsätze.</p>
    <div class="pricing-grid">

      <!-- BASIC -->
      <div class="price-card">
        <p class="price-name">Basic</p>
        <p class="price-amount">CHF 99<span>/J.</span></p>
        <p class="price-alt">oder CHF 9.90 / Monat</p>
        <hr class="price-divider" />
        <ul class="price-features">
          <li><span class="check">✓</span> App-Profil mit Foto</li>
          <li><span class="check">✓</span> Karteneintrag</li>
          <li><span class="check">✓</span> Angebots-Tipp</li>
          <li><span class="check">✓</span> Aufruf-Statistiken</li>
          <li class="muted"><span class="x">—</span> Narrations-Erwähnung</li>
          <li class="muted"><span class="x">—</span> Angebot-Tipp-Statistiken</li>
        </ul>
        <a href="#anfrage" class="price-cta price-cta-outline" onclick="selectPaket('basic')">Basic wählen</a>
      </div>

      <!-- STANDARD -->
      <div class="price-card highlighted" id="card-standard">
        <span class="price-badge">Empfohlen</span>
        <p class="price-name">Standard</p>
        <p class="price-amount">CHF 199<span>/J.</span></p>
        <p class="price-alt">oder CHF 19.90 / Monat</p>
        <hr class="price-divider" />
        <ul class="price-features">
          <li><span class="check">✓</span> App-Profil mit Foto</li>
          <li><span class="check">✓</span> Karteneintrag (hervorgehoben)</li>
          <li><span class="check">✓</span> Angebots-Tipp</li>
          <li><span class="check">✓</span> Aufruf-Statistiken</li>
          <li><span class="check">✓</span> Angebot-Tipp-Statistiken</li>
          <li class="muted"><span class="x">—</span> Narrations-Erwähnung</li>
        </ul>
        <a href="#anfrage" class="price-cta price-cta-primary" onclick="selectPaket('standard')">Standard wählen</a>
      </div>

      <!-- PREMIUM -->
      <div class="price-card">
        <p class="price-name">Premium</p>
        <p class="price-amount">CHF 499<span>/J.</span></p>
        <p class="price-alt">Jährliche Abrechnung</p>
        <hr class="price-divider" />
        <ul class="price-features">
          <li><span class="check">✓</span> App-Profil mit Foto</li>
          <li><span class="check">✓</span> Karteneintrag (Premium-Hervorhebung)</li>
          <li><span class="check">✓</span> Angebots-Tipp</li>
          <li><span class="check">✓</span> Vollständige Statistiken</li>
          <li><span class="check">✓</span> <strong>Narrations-Erwähnung</strong></li>
          <li><span class="check">✓</span> Prioritäts-Support</li>
        </ul>
        <a href="#anfrage" class="price-cta price-cta-outline" onclick="selectPaket('premium')">Premium wählen</a>
      </div>

    </div>
  </div>
</section>

<!-- PROCESS -->
<section class="section" style="background:#fff">
  <div class="section-inner">
    <div class="section-label">Ablauf</div>
    <h2 class="section-title">In vier Schritten Partner werden</h2>
    <p class="section-desc" style="margin-bottom:36px">Von der Anfrage bis zum Karteneintrag dauert es in der Regel 2-3 Werktage.</p>
    <div class="process-steps">
      <div class="process-step">
        <div class="process-icon">📝</div>
        <h3 class="process-title">Anfrage stellen</h3>
        <p class="process-text">Füllen Sie das Formular unten aus. Kein Aufwand, keine Verbindlichkeit.</p>
      </div>
      <div class="process-step">
        <div class="process-icon">📞</div>
        <h3 class="process-title">Kurzes Gespräch</h3>
        <p class="process-text">Unser Team meldet sich, klärt Details und beantwortet Ihre Fragen.</p>
      </div>
      <div class="process-step">
        <div class="process-icon">✅</div>
        <h3 class="process-title">Profil einrichten</h3>
        <p class="process-text">Wir richten Ihren Eintrag ein und schalten ihn frei – Sie müssen nichts Technisches tun.</p>
      </div>
      <div class="process-step">
        <div class="process-icon">🚀</div>
        <h3 class="process-title">Wandernde erreichen</h3>
        <p class="process-text">Ihr Betrieb erscheint auf der SagaTrail-Karte und begeistert neue Gäste.</p>
      </div>
    </div>
  </div>
</section>

<!-- FORM -->
<section class="section form-section" id="anfrage">
  <div class="section-inner">
    <div class="section-label">Partneranfrage</div>
    <h2 class="section-title">Jetzt bewerben</h2>
    <p class="section-desc">Stellen Sie Ihre Anfrage – unverbindlich und kostenlos. Wir melden uns innert 2 Werktagen.</p>
    <div class="form-card">
      <form id="partner-form" onsubmit="submitAnfrage(event)">
        <div class="form-grid">

          <div class="form-section-title">Betrieb</div>

          <div class="form-group">
            <label for="f-name">Betriebsname *</label>
            <input id="f-name" type="text" placeholder="Restaurant Alpenblick" required />
          </div>
          <div class="form-group">
            <label for="f-kategorie">Kategorie *</label>
            <select id="f-kategorie" required>
              <option value="">Bitte wählen</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café / Bäckerei</option>
              <option value="souvenir">Souvenir / Shop</option>
              <option value="uebernachtung">Übernachtung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>
          <div class="form-group">
            <label for="f-kanton">Kanton *</label>
            <select id="f-kanton" required>
              <option value="">Bitte wählen</option>
              <option>Aargau</option><option>Appenzell Ausserrhoden</option>
              <option>Appenzell Innerrhoden</option><option>Basel-Landschaft</option>
              <option>Basel-Stadt</option><option>Bern</option><option>Fribourg</option>
              <option>Genf</option><option>Glarus</option><option>Graubünden</option>
              <option>Jura</option><option>Luzern</option><option>Neuenburg</option>
              <option>Nidwalden</option><option>Obwalden</option><option>Schaffhausen</option>
              <option>Schwyz</option><option>Solothurn</option><option>St. Gallen</option>
              <option>Tessin</option><option>Thurgau</option><option>Uri</option>
              <option>Waadt</option><option>Wallis</option><option>Zug</option>
              <option>Zürich</option>
            </select>
          </div>
          <div class="form-group">
            <label for="f-adresse">Adresse</label>
            <input id="f-adresse" type="text" placeholder="Hauptstrasse 12" />
          </div>
          <div class="form-group">
            <label for="f-plz">PLZ</label>
            <input id="f-plz" type="text" placeholder="3000" maxlength="10" />
          </div>
          <div class="form-group">
            <label for="f-ort">Ort</label>
            <input id="f-ort" type="text" placeholder="Bern" />
          </div>
          <div class="form-group full">
            <label for="f-website">Website</label>
            <input id="f-website" type="url" placeholder="https://www.ihrbetrieb.ch" />
          </div>
          <div class="form-group full">
            <label for="f-beschreibung">Kurzbeschreibung Ihres Betriebs</label>
            <textarea id="f-beschreibung" placeholder="Was macht Ihren Betrieb besonders? Was bieten Sie Wandernden?"></textarea>
          </div>
          <div class="form-group full">
            <label for="f-angebot">Angebot / Rabatt für SagaTrail-Nutzer (optional)</label>
            <textarea id="f-angebot" placeholder="z.B. 10% Rabatt auf alle Getränke für SagaTrail-Nutzer" style="min-height:60px"></textarea>
          </div>

          <div class="form-section-title">Partnerpaket</div>

          <div class="paket-grid" id="paket-grid">
            <label class="paket-option" id="opt-basic" onclick="selectPaket('basic')">
              <input type="radio" name="paket" value="basic" />
              <div class="p-name">Basic</div>
              <div class="p-price">CHF 99<span>/J.</span></div>
              <div class="p-sub">oder 9.90/Mt.</div>
            </label>
            <label class="paket-option selected" id="opt-standard" onclick="selectPaket('standard')">
              <input type="radio" name="paket" value="standard" checked />
              <div class="p-name">Standard</div>
              <div class="p-price">CHF 199<span>/J.</span></div>
              <div class="p-sub">oder 19.90/Mt.</div>
            </label>
            <label class="paket-option" id="opt-premium" onclick="selectPaket('premium')">
              <input type="radio" name="paket" value="premium" />
              <div class="p-name">Premium</div>
              <div class="p-price">CHF 499<span>/J.</span></div>
              <div class="p-sub">inkl. Narration</div>
            </label>
          </div>

          <div class="form-section-title">Kontaktperson</div>

          <div class="form-group">
            <label for="f-kname">Ihr Name *</label>
            <input id="f-kname" type="text" placeholder="Vorname Nachname" required />
          </div>
          <div class="form-group">
            <label for="f-email">E-Mail-Adresse *</label>
            <input id="f-email" type="email" placeholder="name@betrieb.ch" required />
          </div>
          <div class="form-group">
            <label for="f-tel">Telefon</label>
            <input id="f-tel" type="tel" placeholder="+41 79 123 45 67" />
          </div>

          <div class="submit-row">
            <button type="submit" class="btn-submit" id="submit-btn">Anfrage senden →</button>
            <span id="form-status"></span>
          </div>

        </div>
      </form>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-logo">Saga<span>Trail</span></div>
    <div class="footer-links">
      <a href="/">App herunterladen</a>
      <a href="#preise">Pakete</a>
      <a href="#anfrage">Anfrage stellen</a>
      <a href="mailto:partner@sagatrail.ch">partner@sagatrail.ch</a>
    </div>
    <p class="footer-copy">© 2025 SagaTrail · Partner-Programm Schweiz</p>
  </div>
</footer>

<script>
var selectedPaket = 'standard';

function selectPaket(paket) {
  selectedPaket = paket;
  ['basic','standard','premium'].forEach(function(p) {
    var el = document.getElementById('opt-' + p);
    if (el) el.classList.toggle('selected', p === paket);
    var radio = el && el.querySelector('input[type=radio]');
    if (radio) radio.checked = (p === paket);
  });
}

async function submitAnfrage(e) {
  e.preventDefault();
  var btn = document.getElementById('submit-btn');
  var status = document.getElementById('form-status');
  btn.disabled = true;
  status.textContent = 'Wird gesendet…';
  status.className = '';

  var website = document.getElementById('f-website').value.trim();
  var body = {
    betriebsName:   document.getElementById('f-name').value.trim(),
    kategorie:      document.getElementById('f-kategorie').value,
    canton:         document.getElementById('f-kanton').value,
    beschreibung:   document.getElementById('f-beschreibung').value.trim() || undefined,
    angebot:        document.getElementById('f-angebot').value.trim() || undefined,
    website:        website || undefined,
    adresse:        document.getElementById('f-adresse').value.trim() || undefined,
    plz:            document.getElementById('f-plz').value.trim() || undefined,
    ort:            document.getElementById('f-ort').value.trim() || undefined,
    kontaktName:    document.getElementById('f-kname').value.trim(),
    kontaktEmail:   document.getElementById('f-email').value.trim(),
    kontaktTelefon: document.getElementById('f-tel').value.trim() || undefined,
    paket:          selectedPaket,
  };

  try {
    var res = await fetch('/api/partner/anfrage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    status.textContent = '✓ Anfrage erhalten! Wir melden uns innert 2 Werktagen.';
    status.className = 'ok';
    document.getElementById('partner-form').reset();
    selectPaket('standard');
    btn.disabled = false;
  } catch (err) {
    status.textContent = 'Fehler: ' + err.message;
    status.className = 'err';
    btn.disabled = false;
  }
}
</script>
</body>
</html>`;
