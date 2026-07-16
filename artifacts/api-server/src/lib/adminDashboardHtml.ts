export const ADMIN_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SagaTrail Admin</title>
<style>
:root{--red:#CC0000;--dark:#1a1a1a;--mid:#555;--light:#f7f6f4;--card:#fff;--border:#e5e5e5;--green:#2e7d52;--orange:#d07000;--yellow:#b08800;--blue:#1a5fa8;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:var(--light);color:var(--dark);font-size:14px;min-height:100vh}
a{color:var(--red);text-decoration:none}
/* --- HEADER --- */
#header{background:var(--dark);color:#fff;padding:0 20px;display:flex;align-items:center;gap:16px;height:52px;position:sticky;top:0;z-index:100}
#header h1{font-size:16px;font-weight:700;letter-spacing:.5px;white-space:nowrap}
#header h1 span{color:var(--red)}
#tok-input{flex:1;max-width:280px;padding:6px 10px;border:1px solid #444;border-radius:6px;background:#2a2a2a;color:#fff;font-size:13px}
#tok-btn{padding:6px 14px;background:var(--red);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
#tok-status{font-size:12px;color:#aaa;white-space:nowrap}
/* --- TABS --- */
#tabs{background:#fff;border-bottom:2px solid var(--border);display:flex;padding:0 20px;gap:0}
.tab-btn{padding:12px 18px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--mid);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s}
.tab-btn.active{color:var(--red);border-bottom-color:var(--red)}
.tab-btn:hover:not(.active){color:var(--dark)}
/* --- CONTENT --- */
#content{padding:20px;max-width:1100px;margin:0 auto}
.tab-pane{display:none}.tab-pane.active{display:block}
/* --- CARDS --- */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.card h2{font-size:15px;margin-bottom:16px;color:var(--dark)}
/* --- STAT GRID --- */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center}
.stat-card .num{font-size:32px;font-weight:700;color:var(--red);line-height:1}
.stat-card .lbl{font-size:12px;color:var(--mid);margin-top:4px}
.stat-card .sub{font-size:11px;color:#aaa;margin-top:2px}
/* --- TABLE --- */
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;padding:8px 10px;background:#f0eeeb;color:var(--mid);font-size:12px;font-weight:600;white-space:nowrap;border-bottom:2px solid var(--border)}
.tbl td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:#fafaf8}
.tbl .mono{font-family:monospace;font-size:11px;color:var(--mid)}
/* --- BADGES --- */
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.badge-green{background:#e6f4ec;color:var(--green)}
.badge-red{background:#fce8e8;color:var(--red)}
.badge-orange{background:#fef3e2;color:var(--orange)}
.badge-yellow{background:#fefae0;color:var(--yellow)}
.badge-gray{background:#f0eeeb;color:var(--mid)}
.badge-blue{background:#e8f0fc;color:var(--blue)}
/* --- BUTTONS --- */
.btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;transition:opacity .15s}
.btn:hover{opacity:.82}
.btn-primary{background:var(--red);color:#fff}
.btn-ghost{background:#f0eeeb;color:var(--dark)}
.btn-danger{background:#fce8e8;color:var(--red)}
.btn-green{background:#e6f4ec;color:var(--green)}
.btn-orange{background:#fef3e2;color:var(--orange)}
.btn-sm{padding:3px 8px;font-size:11px}
/* --- FORM --- */
.form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.form-group{display:flex;flex-direction:column;gap:4px}
.form-group label{font-size:11px;font-weight:600;color:var(--mid)}
.form-group input,.form-group select,.form-group textarea{padding:7px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;width:100%}
.form-group textarea{min-height:60px;resize:vertical}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--red)}
.form-section-title{font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;grid-column:1/-1;border-top:1px solid var(--border);padding-top:10px}
.form-section-title:first-child{border-top:none;padding-top:0;margin-top:0}
/* --- PARTNER LIST --- */
.partner-row{border-bottom:1px solid var(--border);padding:12px 0}
.partner-row:last-child{border-bottom:none}
.partner-main{display:flex;align-items:flex-start;gap:12px}
.partner-foto{width:52px;height:52px;border-radius:8px;object-fit:cover;border:1px solid var(--border);flex-shrink:0}
.partner-foto-ph{width:52px;height:52px;border-radius:8px;background:#f0eeeb;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.partner-info{flex:1;min-width:0}
.partner-name{font-weight:700;font-size:14px}
.partner-meta{font-size:12px;color:var(--mid);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px}
.partner-stats{font-size:11px;color:#aaa;margin-top:3px}
.partner-actions{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;align-items:flex-start}
.partner-edit-form{display:none;margin-top:12px;padding:14px;background:#fafaf8;border-radius:8px;border:1px solid var(--border)}
.partner-edit-form.open{display:block}
/* --- STATUS BREAKDOWN --- */
.status-bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
/* --- MODALS --- */
#modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center}
#modal-overlay.open{display:flex}
#modal-box{background:#fff;border-radius:14px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto}
#modal-box h3{font-size:16px;margin-bottom:12px}
#modal-text{white-space:pre-wrap;font-family:monospace;font-size:12px;background:#f0eeeb;padding:12px;border-radius:8px;border:1px solid var(--border);max-height:260px;overflow-y:auto;user-select:all}
/* --- MISC --- */
.loading{color:var(--mid);font-size:13px;padding:20px;text-align:center}
.err{color:var(--red);font-size:13px;padding:8px 0}
.hint{font-size:12px;color:#aaa}
.sep{border:none;border-top:1px solid var(--border);margin:16px 0}
.full{grid-column:1/-1}
/* --- PUSH TIER BUTTONS --- */
.push-tier-btn{padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;background:#fff;color:var(--mid);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
.push-tier-btn:hover{border-color:var(--red);color:var(--red)}
.push-tier-btn.active{background:var(--red);color:#fff;border-color:var(--red)}
/* --- PUSH RESULT ROW --- */
.push-result-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.push-result-row:last-child{border-bottom:none}
/* --- PARTNER LOOKUP --- */
#np-lookup-wrap{grid-column:1/-1;background:#f7f5f2;border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:4px}
#np-lookup-wrap label{font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;display:block}
#np-lookup-input{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box}
#np-lookup-input:focus{outline:none;border-color:var(--red)}
#np-lookup-drop{position:absolute;top:100%;left:0;right:0;z-index:300;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:230px;overflow-y:auto;margin-top:3px}
.lookup-row{padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;line-height:1.4}
.lookup-row:last-child{border-bottom:none}
.lookup-row:hover{background:#f5f2ef}
.lookup-row strong{color:var(--dark)}
.lookup-row span{color:var(--mid);font-size:11px;margin-left:8px}
#np-lookup-hint{font-size:11px;color:#888;margin-top:6px;display:block}
</style>
</head>
<body>

<div id="header">
  <h1>Saga<span>Trail</span> Admin</h1>
  <input id="tok-input" type="password" placeholder="Admin-Token" autocomplete="off" />
  <button id="tok-btn" onclick="connect()">Verbinden</button>
  <button id="tok-forget" onclick="forgetToken()" style="display:none;background:#444;color:#ccc;border:1px solid #555;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">Abmelden</button>
  <span id="tok-status"></span>
</div>

<div id="tabs">
  <button class="tab-btn active" onclick="switchTab('overview',this)">&#128200; Übersicht</button>
  <button class="tab-btn" onclick="switchTab('users',this)">&#128101; Nutzer</button>
  <button class="tab-btn" onclick="switchTab('usage',this)">&#128290; Nutzungsdaten</button>
  <button class="tab-btn" onclick="switchTab('partner',this)">&#127968; Partner</button>
  <button class="tab-btn" onclick="switchTab('push',this)">&#128226; Push</button>
</div>

<div id="content">
  <!-- ÜBERSICHT -->
  <div id="tab-overview" class="tab-pane active">
    <div id="overview-body"><p class="loading">Token eingeben und verbinden...</p></div>
  </div>

  <!-- NUTZER -->
  <div id="tab-users" class="tab-pane">
    <div class="card" style="max-width:640px;margin-bottom:16px;border:1.5px solid #ffd6d6;background:#fff8f8">
      <h2 style="margin-bottom:6px;font-size:15px">&#9888;&#65039; Premium-Notfall-Reset</h2>
      <p class="hint" style="margin-bottom:12px">Setzt <strong>alle</strong> Nutzer auf Free zurück und sperrt den RC-Sync für 30 Tage. Nutzen wenn RC-Cache oder Sync-Loop Premium fälschlicherweise wieder aktiviert.</p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn" style="background:#CC0000;color:#fff;padding:8px 18px;font-size:13px" onclick="doResetAll()">&#128683; Alle auf Free zurücksetzen</button>
        <span id="reset-all-status" class="hint"></span>
      </div>
    </div>
    <div id="users-body"><p class="loading">Wird geladen...</p></div>
  </div>

  <!-- NUTZUNGSDATEN -->
  <div id="tab-usage" class="tab-pane">
    <div id="usage-body"><p class="loading">Wird geladen...</p></div>
  </div>

  <!-- PUSH -->
  <div id="tab-push" class="tab-pane">
    <div class="card" style="max-width:640px">
      <h2 style="margin-bottom:4px">&#128226; Push-Nachricht senden</h2>
      <p class="hint" style="margin-bottom:18px">Nachricht wird über Expo Push an alle Geräte mit aktivem Push-Token gesendet.</p>

      <!-- SEGMENT -->
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Empfänger</div>
        <div id="push-tier-btns" style="display:flex;flex-wrap:wrap;gap:6px">
          <button class="push-tier-btn active" data-tier="alle"        onclick="selectTier(this)">Alle</button>
          <button class="push-tier-btn"         data-tier="premium"     onclick="selectTier(this)">Premium</button>
          <button class="push-tier-btn"         data-tier="premium_family" onclick="selectTier(this)">Premium Family</button>
          <button class="push-tier-btn"         data-tier="elite"       onclick="selectTier(this)">Elite</button>
          <button class="push-tier-btn"         data-tier="elite_family" onclick="selectTier(this)">Elite Family</button>
        </div>
        <div id="push-tier-count" class="hint" style="margin-top:6px">Verbinden um Zielgrösse zu sehen</div>
      </div>

      <!-- TITEL -->
      <div class="form-group" style="margin-bottom:12px">
        <label>Titel <span style="color:var(--red)">*</span></label>
        <input id="push-title" type="text" maxlength="100" placeholder="z.B. Neue Sage entdeckt 🗻" oninput="updatePreview()" />
      </div>

      <!-- NACHRICHT -->
      <div class="form-group" style="margin-bottom:16px">
        <label>Nachricht <span style="color:var(--red)">*</span> <span id="push-body-len" class="hint" style="float:right">0 / 200</span></label>
        <textarea id="push-body" maxlength="200" rows="3" placeholder="z.B. Im Kanton Uri warten neue Wanderrouten auf dich…" oninput="updatePreview();updateBodyLen()" style="resize:vertical"></textarea>
      </div>

      <!-- VORSCHAU -->
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Vorschau</div>
        <div id="push-preview" style="background:#f0eeeb;border-radius:12px;padding:12px 14px;border:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
          <img src="data:image/png;base64,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" style="width:36px;height:36px;border-radius:8px;flex-shrink:0;object-fit:cover" />
          <div style="min-width:0">
            <div id="prev-title" style="font-weight:700;font-size:13px;color:#1a1a1a">Titel erscheint hier</div>
            <div id="prev-body"  style="font-size:12px;color:#555;margin-top:2px;line-height:1.4">Nachricht erscheint hier</div>
          </div>
        </div>
      </div>

      <!-- SEND -->
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary" id="push-send-btn" onclick="askPushConfirm()" style="padding:8px 20px;font-size:14px">&#128228; Jetzt senden</button>
        <span id="push-status" class="hint"></span>
      </div>
      <div id="push-confirm-row" style="display:none;margin-top:10px;padding:10px 14px;background:#fff8e1;border:1.5px solid #f0c040;border-radius:8px;font-size:13px">
        <span id="push-confirm-msg" style="font-weight:600"></span>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary" onclick="sendPushCampaign()" style="padding:5px 16px;font-size:13px">&#10003; Ja, senden</button>
          <button class="btn" onclick="cancelPushConfirm()" style="padding:5px 16px;font-size:13px">Abbrechen</button>
        </div>
      </div>
    </div>

    <!-- VERLAUF -->
    <div class="card" style="max-width:640px;margin-top:0">
      <h2 style="margin-bottom:12px">Letzte Sendungen</h2>
      <div id="push-history">
        <p class="hint">Noch keine Sendung in dieser Sitzung.</p>
      </div>
    </div>
  </div>

  <!-- PARTNER -->
  <div id="tab-partner" class="tab-pane">
    <div class="card">
      <h2>Neuer Partner anlegen</h2>
      <div class="form-grid" id="new-partner-form">
        <div id="np-lookup-wrap">
          <label>Vorhandenen Partner suchen &amp; Felder vorausf&#252;llen</label>
          <div style="position:relative">
            <input id="np-lookup-input" type="text" placeholder="Name oder E-Mail eingeben&#x2026;" oninput="lookupDebounce(this.value)" autocomplete="off" />
            <div id="np-lookup-drop" style="display:none"></div>
          </div>
          <span id="np-lookup-hint">Tipp: Felder werden vorausgef&#252;llt &#8211; du erstellst aber immer einen <strong>neuen</strong> Eintrag.</span>
        </div>
        <div class="form-group full"><span class="form-section-title">Basisdaten</span></div>
        <div class="form-group"><label>Name *</label><input id="np-name" type="text" /></div>
        <div class="form-group"><label>E-Mail (Portal-Login)</label><input id="np-email" type="email" /></div>
        <div class="form-group"><label>Kategorie *</label>
          <select id="np-kat"><option value="restaurant">Restaurant</option><option value="cafe">Café</option><option value="souvenir">Souvenir</option><option value="uebernachtung">Übernachtung</option><option value="sonstiges">Sonstiges</option></select>
        </div>
        <div class="form-group"><label>Kanton * (z.B. BE)</label><input id="np-canton" type="text" maxlength="2" style="text-transform:uppercase" /></div>
        <div class="form-group"><label>Breitengrad (lat) *</label><input id="np-lat" type="number" step="any" /></div>
        <div class="form-group"><label>Längengrad (lng) *</label><input id="np-lng" type="number" step="any" /></div>
        <div class="form-group full"><span class="form-section-title">App-Inhalte</span></div>
        <div class="form-group full"><label>Beschreibung</label><textarea id="np-beschr"></textarea></div>
        <div class="form-group full"><label>Angebot für SagaTrail-Nutzer</label><input id="np-angebot" type="text" /></div>
        <div class="form-group full"><label>Foto-URL</label><input id="np-foto" type="url" /></div>
        <div class="form-group full"><span class="form-section-title">Vertrag & Preise</span></div>
        <div class="form-group"><label>Paket</label>
          <select id="np-paket"><option value="">– wählen –</option><option value="basic">Basic (CHF 99/J. · 9.90/Mt.)</option><option value="standard">Standard (CHF 199/J. · 19.90/Mt.)</option><option value="premium">Premium (CHF 499/J.) – Wandererwähnung</option></select>
        </div>
        <div class="form-group"><label>Individueller Preis CHF/J.</label><input id="np-preis" type="number" min="0" placeholder="Leer = Paket-Preis" /></div>
        <div class="form-group"><label>Einführungspreis CHF/J.</label><input id="np-einfpreis" type="number" min="0" /></div>
        <div class="form-group"><label>Einführungspreis gültig bis</label><input id="np-einfbis" type="date" /></div>
        <div class="form-group"><label>Laufzeit Start</label><input id="np-lstart" type="date" /></div>
        <div class="form-group"><label>Laufzeit Ende</label><input id="np-lende" type="date" /></div>
        <div class="form-group full"><span class="form-section-title">Buchhaltung</span></div>
        <div class="form-group"><label>Zahlungsstatus</label>
          <select id="np-zstatus"><option value="ausstehend">Ausstehend</option><option value="bezahlt">Bezahlt</option><option value="mahnung1">Mahnung 1</option><option value="mahnung2">Mahnung 2</option><option value="gesperrt">Gesperrt</option></select>
        </div>
        <div class="form-group full"><label>Interne Notizen</label><textarea id="np-notizen"></textarea></div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;align-items:center">
        <button class="btn btn-primary" onclick="createPartner()">Partner anlegen</button>
        <span id="np-status" class="hint"></span>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 style="margin:0">Bestehende Partner</h2>
        <input id="p-search" type="text" placeholder="Suchen..." style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;width:180px" oninput="filterPartner(this.value)">
      </div>
      <div id="partner-liste"><p class="loading">Verbinde...</p></div>
    </div>
  </div>
</div>

<!-- MODAL -->
<div id="modal-overlay" onclick="closeModal()">
  <div id="modal-box" onclick="event.stopPropagation()">
    <h3 id="modal-title"></h3>
    <pre id="modal-text"></pre>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-primary" onclick="copyModal()">Kopieren</button>
      <button class="btn btn-ghost" onclick="closeModal()">Schliessen</button>
    </div>
  </div>
</div>

<script>
var _token = '';
var _partner = [];
var LS_KEY = 'sagatrail_admin_tok';

var _savedStatus = {msg: '', ok: undefined};
function token() { return _token || document.getElementById('tok-input').value; }
function setTokStatus(msg,ok) {
  _savedStatus = {msg: msg, ok: ok};
  _applyTokStatus(msg, ok);
}
function _applyTokStatus(msg, ok) {
  var el = document.getElementById('tok-status');
  el.textContent = msg;
  el.style.color = ok === false ? '#f88' : ok === true ? '#8d8' : '#aaa';
}
function forgetToken() {
  localStorage.removeItem(LS_KEY);
  _token = '';
  document.getElementById('tok-input').value = '';
  document.getElementById('tok-input').style.display = '';
  document.getElementById('tok-btn').style.display = '';
  document.getElementById('tok-forget').style.display = 'none';
  setTokStatus('Token gelöscht', undefined);
}

async function api(path, opts) {
  var res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type':'application/json', 'x-admin-token': token(), ...(opts && opts.headers) }
  });
  if (!res.ok) {
    var b = await res.json().catch(() => ({}));
    throw new Error(b.error || ('HTTP ' + res.status));
  }
  return res.status === 204 ? null : res.json();
}

async function connect() {
  _token = document.getElementById('tok-input').value;
  try {
    setTokStatus('Lade...', undefined);
    await Promise.all([loadOverview(), loadPartner(), loadPushStats()]);
    localStorage.setItem(LS_KEY, _token);
    document.getElementById('tok-input').style.display = 'none';
    document.getElementById('tok-btn').style.display = 'none';
    document.getElementById('tok-forget').style.display = '';
    setTokStatus('Verbunden \u2713', true);
  } catch(e) {
    setTokStatus('Fehler: ' + e.message, false);
  }
}

window.addEventListener('DOMContentLoaded', function() {
  window.addEventListener('offline', function() {
    _applyTokStatus('Getrennt \u2717', false);
  });
  window.addEventListener('online', function() {
    _applyTokStatus(_savedStatus.msg || 'Verbunden \u2713', _savedStatus.ok !== undefined ? _savedStatus.ok : true);
  });
  var saved = localStorage.getItem(LS_KEY);
  if (saved) {
    _token = saved;
    document.getElementById('tok-input').value = saved;
    document.getElementById('tok-input').style.display = 'none';
    document.getElementById('tok-btn').style.display = 'none';
    document.getElementById('tok-forget').style.display = '';
    setTokStatus('Lade...', undefined);
    Promise.all([loadOverview(), loadPartner(), loadPushStats()])
      .then(function() { setTokStatus('Verbunden \u2713', true); })
      .catch(function(e) {
        localStorage.removeItem(LS_KEY);
        _token = '';
        document.getElementById('tok-input').style.display = '';
        document.getElementById('tok-btn').style.display = '';
        document.getElementById('tok-forget').style.display = 'none';
        setTokStatus('Gespeichertes Token ungültig: ' + e.message, false);
      });
  } else {
    setTokStatus('Getrennt \u2717', false);
  }
});

function switchTab(name, btn) {
  document.querySelectorAll('.tab-pane').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(el){ el.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'users' && token()) loadUsers();
  if (name === 'usage' && token()) loadUsage();
  if (name === 'push'  && token()) loadPushStats();
}

/* ===================== ÜBERSICHT ===================== */
async function loadOverview() {
  if (!token()) return;
  try {
    var s = await api('/api/admin/stats');
    var premPct = s.users.total ? Math.round(s.users.premium / s.users.total * 100) : 0;
    var byStatus = s.partners.byStatus || {};
    var statusHtml = Object.entries(byStatus).map(function(e){ return '<span class="badge ' + zahlBadge(e[0]) + '">' + zahlLabel(e[0]) + ' ' + e[1] + '</span>'; }).join(' ');
    document.getElementById('overview-body').innerHTML =
      '<div class="stat-grid">' +
      statCard(s.users.total, 'Nutzer gesamt', s.users.freeHikeUsed + ' Gratis-Hike genutzt') +
      statCard(s.users.premium, 'Premium-Nutzer', premPct + '% aller Nutzer') +
      statCard(s.partners.active + ' / ' + s.partners.total, 'Aktive Partner', '') +
      statCard(s.hikes.total, 'Wanderungen', 'aus Nutzerprofilen') +
      '</div>' +
      '<div class="card"><h2>Partner nach Zahlungsstatus</h2><div class="status-bar">' + (statusHtml || '<span class="hint">Keine Partner</span>') + '</div></div>';
  } catch(e) {
    document.getElementById('overview-body').innerHTML = '<p class="err">' + esc(e.message) + '</p>';
  }
}

function statCard(num, lbl, sub) {
  return '<div class="stat-card"><div class="num">' + esc(String(num)) + '</div><div class="lbl">' + esc(lbl) + '</div>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>';
}

/* ===================== NUTZER ===================== */
async function doResetAll() {
  var el = document.getElementById('reset-all-status');
  if (!confirm('Wirklich ALLE Nutzer auf Free zurücksetzen? Der RC-Sync wird für 30 Tage gesperrt.')) return;
  el.textContent = 'Wird zurückgesetzt…';
  el.style.color = 'var(--mid)';
  try {
    var r = await api('/api/admin/reset-all', { method: 'POST' });
    el.textContent = '✓ ' + r.zurueckgesetzt + ' Nutzer zurückgesetzt (RC-Sync gesperrt bis +30 Tage)';
    el.style.color = 'green';
    loadUsers();
  } catch(e) {
    el.textContent = '✗ Fehler: ' + esc(e.message);
    el.style.color = 'var(--red)';
  }
}

async function loadUsers() {
  document.getElementById('users-body').innerHTML = '<p class="loading">Lade Nutzer...</p>';
  try {
    var users = await api('/api/admin/users');
    var html = '<div class="card"><table class="tbl"><thead><tr>' +
      '<th>Name</th><th>Kanton</th><th>Sprache</th><th>Archetype</th><th>Premium</th><th>Wanderungen</th><th>Erstellt</th></tr></thead><tbody>';
    users.forEach(function(u) {
      html += '<tr>' +
        '<td><div style="font-weight:600">' + esc(u.name) + '</div><div class="mono">' + esc(u.id.slice(0,14)) + '…</div></td>' +
        '<td>' + esc(u.homeCanton) + '</td>' +
        '<td>' + esc(u.language) + '</td>' +
        '<td>' + esc(u.archetype) + '</td>' +
        '<td>' + (u.premium ? '<span class="badge badge-green">Premium' + (u.premiumBis ? '<br><span style="font-size:10px;font-weight:400">' + fmtDate(u.premiumBis) + '</span>' : '') + '</span>' : '<span class="badge badge-gray">Free</span>') + '</td>' +
        '<td style="text-align:center">' + u.hikeCount + '</td>' +
        '<td class="mono">' + fmtDate(u.createdAt) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="hint" style="padding:8px">' + users.length + ' Nutzer total</p>';
    document.getElementById('users-body').innerHTML = html;
  } catch(e) {
    document.getElementById('users-body').innerHTML = '<p class="err">' + esc(e.message) + '</p>';
  }
}

/* ===================== NUTZUNGSDATEN ===================== */
async function loadUsage() {
  document.getElementById('usage-body').innerHTML = '<p class="loading">Lade Nutzungsdaten...</p>';
  try {
    var u = await api('/api/admin/usage');
    var rHtml = '<div class="card"><h2>&#128288; Meistgewanderte Routen</h2>' +
      (u.routes.length ? '<table class="tbl"><thead><tr><th>#</th><th>Route</th><th>Region</th><th>Wanderungen</th></tr></thead><tbody>' +
        u.routes.map(function(r,i){ return '<tr><td>' + (i+1) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.region) + '</td><td style="font-weight:700;color:var(--red)">' + r.count + '</td></tr>'; }).join('') +
        '</tbody></table>' : '<p class="hint">Noch keine Daten</p>') + '</div>';
    var sHtml = '<div class="card"><h2>&#128214; Beliebteste Sagen</h2>' +
      (u.sagas.length ? '<table class="tbl"><thead><tr><th>#</th><th>Sage</th><th>Kanton</th><th>Aufrufe</th></tr></thead><tbody>' +
        u.sagas.map(function(s,i){ return '<tr><td>' + (i+1) + '</td><td>' + esc(s.name) + '</td><td>' + esc(s.canton) + '</td><td style="font-weight:700;color:var(--red)">' + s.count + '</td></tr>'; }).join('') +
        '</tbody></table>' : '<p class="hint">Noch keine Daten</p>') + '</div>';
    document.getElementById('usage-body').innerHTML = rHtml + sHtml;
  } catch(e) {
    document.getElementById('usage-body').innerHTML = '<p class="err">' + esc(e.message) + '</p>';
  }
}

/* ===================== PARTNER LOOKUP ===================== */
var _lookupResults = [];
var _lookupTimer = null;
function lookupDebounce(val) {
  clearTimeout(_lookupTimer);
  var drop = document.getElementById('np-lookup-drop');
  if (val.length < 2) { drop.style.display = 'none'; return; }
  _lookupTimer = setTimeout(function() { doLookup(val); }, 320);
}
async function doLookup(q) {
  var drop = document.getElementById('np-lookup-drop');
  drop.innerHTML = '<div style="padding:9px 12px;font-size:12px;color:var(--mid)">Suche&#x2026;</div>';
  drop.style.display = '';
  try {
    var rows = await api('/api/admin/partner-lookup?q=' + encodeURIComponent(q), {method:'GET'});
    _lookupResults = rows;
    if (!rows.length) {
      drop.innerHTML = '<div style="padding:9px 12px;font-size:12px;color:var(--mid)">Kein Eintrag gefunden</div>';
      return;
    }
    drop.innerHTML = rows.map(function(p, i) {
      return '<div class="lookup-row" onclick="fillFromPartner(' + i + ')">' +
        '<strong>' + esc(p.name) + '</strong>' +
        '<span>' + esc(p.canton) + ' &middot; ' + esc(p.kategorie) + (p.email ? ' &middot; ' + esc(p.email) : '') + '</span>' +
        '</div>';
    }).join('');
  } catch(e) {
    drop.innerHTML = '<div style="padding:9px 12px;font-size:12px;color:var(--red)">Fehler: ' + esc(e.message) + '</div>';
  }
}
function fillFromPartner(idx) {
  var p = _lookupResults[idx];
  if (!p) return;
  function sv(id, val) { var el = document.getElementById(id); if (el) el.value = val != null ? String(val) : ''; }
  function fmtD(dt) { return dt ? new Date(dt).toISOString().split('T')[0] : ''; }
  sv('np-name', p.name);
  sv('np-email', p.email);
  sv('np-canton', p.canton);
  sv('np-lat', p.lat);
  sv('np-lng', p.lng);
  sv('np-beschr', p.beschreibung);
  sv('np-angebot', p.angebot);
  sv('np-foto', p.fotoUrl);
  sv('np-preis', p.preisChf);
  sv('np-einfpreis', p.einfuehrungspreisChf);
  sv('np-einfbis', fmtD(p.einfuehrungspreisGueltigBis));
  sv('np-lstart', fmtD(p.laufzeitStart));
  sv('np-lende', fmtD(p.laufzeitEnde));
  sv('np-notizen', p.notizenIntern);
  var kat = document.getElementById('np-kat'); if (kat) kat.value = p.kategorie || '';
  var pak = document.getElementById('np-paket'); if (pak) pak.value = p.paket || '';
  var zs = document.getElementById('np-zstatus'); if (zs) zs.value = p.zahlungsstatus || 'ausstehend';
  document.getElementById('np-lookup-drop').style.display = 'none';
  document.getElementById('np-lookup-input').value = p.name;
  document.getElementById('np-lookup-hint').innerHTML = '&#9989; Felder aus <strong>' + esc(p.name) + '</strong> &#252;bernommen &ndash; wird als <strong>neuer</strong> Eintrag gespeichert.';
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('#np-lookup-wrap')) {
    document.getElementById('np-lookup-drop').style.display = 'none';
  }
});

/* ===================== PUSH ===================== */
var _pushTier = 'alle';
var _pushStats = null;

function selectTier(btn) {
  document.querySelectorAll('.push-tier-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  _pushTier = btn.getAttribute('data-tier');
  updateTierCount();
}

function updateTierCount() {
  if (!_pushStats) { document.getElementById('push-tier-count').textContent = 'Verbinden um Zielgrösse zu sehen'; return; }
  var count = 0;
  if (_pushTier === 'alle') {
    count = _pushStats.totalWithToken;
  } else {
    var entry = _pushStats.byTier[_pushTier];
    count = entry ? entry.withToken : 0;
  }
  var total = _pushStats.totalWithToken;
  document.getElementById('push-tier-count').textContent = count + ' von ' + total + ' Geräten erhalten diese Nachricht';
}

async function loadPushStats() {
  if (!token()) return;
  try {
    _pushStats = await api('/api/admin/push/stats');
    updateTierCount();
  } catch(e) {
    document.getElementById('push-tier-count').textContent = 'Statistik nicht verfügbar';
  }
}

function updatePreview() {
  var t = document.getElementById('push-title').value || 'Titel erscheint hier';
  var b = document.getElementById('push-body').value || 'Nachricht erscheint hier';
  document.getElementById('prev-title').textContent = t;
  document.getElementById('prev-body').textContent = b;
}

function updateBodyLen() {
  var len = document.getElementById('push-body').value.length;
  document.getElementById('push-body-len').textContent = len + ' / 200';
}

function askPushConfirm() {
  var title = document.getElementById('push-title').value.trim();
  var body  = document.getElementById('push-body').value.trim();
  if (!title || !body) {
    document.getElementById('push-status').textContent = 'Titel und Nachricht sind Pflichtfelder.';
    return;
  }
  var tierLabel = {alle:'Alle', premium:'Premium', premium_family:'Premium Family', elite:'Elite', elite_family:'Elite Family'}[_pushTier] || _pushTier;
  document.getElementById('push-confirm-msg').textContent = 'Push an «' + tierLabel + '» senden? Titel: ' + title;
  document.getElementById('push-confirm-row').style.display = '';
  document.getElementById('push-send-btn').disabled = true;
}

function cancelPushConfirm() {
  document.getElementById('push-confirm-row').style.display = 'none';
  document.getElementById('push-send-btn').disabled = false;
}

async function sendPushCampaign() {
  var title = document.getElementById('push-title').value.trim();
  var body  = document.getElementById('push-body').value.trim();
  document.getElementById('push-confirm-row').style.display = 'none';

  var btn = document.getElementById('push-send-btn');
  var status = document.getElementById('push-status');
  btn.disabled = true;
  status.textContent = 'Sende…';
  status.style.color = '#aaa';

  var tierLabel = {alle:'Alle', premium:'Premium', premium_family:'Premium Family', elite:'Elite', elite_family:'Elite Family'}[_pushTier] || _pushTier;
  try {
    var result = await api('/api/admin/push', { method:'POST', body: JSON.stringify({ tier: _pushTier, title: title, body: body }) });
    status.textContent = '✓ Gesendet';
    status.style.color = 'var(--green)';
    appendPushHistory(tierLabel, title, body, result);
    await loadPushStats();
  } catch(e) {
    status.textContent = 'Fehler: ' + e.message;
    status.style.color = 'var(--red)';
  } finally {
    btn.disabled = false;
  }
}

function appendPushHistory(tierLabel, title, body, r) {
  var hist = document.getElementById('push-history');
  if (hist.querySelector('.hint')) hist.innerHTML = '';
  var now = new Date().toLocaleTimeString('de-CH', {hour:'2-digit', minute:'2-digit'});
  var row = document.createElement('div');
  row.className = 'push-result-row';
  row.innerHTML =
    '<div style="flex:1;min-width:0">' +
      '<div style="font-weight:600">' + esc(title) + ' <span class="badge badge-blue">' + esc(tierLabel) + '</span></div>' +
      '<div class="hint" style="margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(body) + '</div>' +
    '</div>' +
    '<div style="text-align:right;flex-shrink:0">' +
      '<div style="font-weight:700;color:var(--green)">' + (r.sent||0) + ' gesendet</div>' +
      (r.failed ? '<div style="color:var(--red);font-size:11px">' + r.failed + ' fehlgeschlagen</div>' : '') +
      '<div class="hint">' + now + '</div>' +
    '</div>' +
    (r.errors && r.errors.length ? '<div style="width:100%;margin-top:6px;padding:6px 8px;background:#fff4f4;border-radius:6px;font-size:11px;color:#8b0000;word-break:break-word">' + r.errors.slice(0,3).map(function(e){return esc(e)}).join('<br>') + '</div>' : '');
  hist.insertBefore(row, hist.firstChild);
}

/* ===================== PARTNER ===================== */
async function loadPartner() {
  if (!token()) return;
  try {
    _partner = await api('/api/admin/partner');
    renderPartner(_partner);
  } catch(e) {
    document.getElementById('partner-liste').innerHTML = '<p class="err">' + esc(e.message) + '</p>';
  }
}

function filterPartner(q) {
  var f = q.toLowerCase();
  var filtered = _partner.filter(function(p){ return !f || p.name.toLowerCase().includes(f) || (p.canton||'').toLowerCase().includes(f) || (p.email||'').toLowerCase().includes(f); });
  renderPartner(filtered);
}

function renderPartner(list) {
  var el = document.getElementById('partner-liste');
  if (!list.length) { el.innerHTML = '<p class="hint">Keine Partner gefunden.</p>'; return; }
  el.innerHTML = list.map(function(p){ return renderPartnerRow(p); }).join('');
}

function renderPartnerRow(p) {
  var foto = p.fotoUrl
    ? '<img class="partner-foto" src="' + esc(p.fotoUrl) + '" onerror="this.style.display=&quot;none&quot;">'
    : '<div class="partner-foto-ph">' + katEmoji(p.kategorie) + '</div>';
  var preis = currentPreis(p);
  var laufzeit = p.laufzeitStart ? (fmtDate(p.laufzeitStart) + ' – ' + (p.laufzeitEnde ? fmtDate(p.laufzeitEnde) : '∞')) : '–';
  return '<div class="partner-row" id="pr-' + p.id + '">' +
    '<div class="partner-main">' +
    foto +
    '<div class="partner-info">' +
    '<div class="partner-name">' + esc(p.name) + ' ' + (p.isActive ? '<span class="badge badge-green">aktiv</span>' : '<span class="badge badge-red">inaktiv</span>') + '</div>' +
    '<div class="partner-meta">' +
      '<span>' + katLabel(p.kategorie) + '</span>' +
      '<span>&#127988; ' + esc(p.canton) + '</span>' +
      (p.paket ? '<span class="badge badge-blue">' + esc(p.paket) + '</span>' : '') +
      (preis ? '<span style="font-weight:600">CHF ' + preis + '/J.</span>' : '') +
      '<span class="badge ' + zahlBadge(p.zahlungsstatus || 'ausstehend') + '">' + zahlLabel(p.zahlungsstatus || 'ausstehend') + '</span>' +
    '</div>' +
    '<div class="partner-stats">&#128065; ' + (p.views||0) + ' Aufrufe &nbsp;&#128722; ' + (p.offersTapped||0) + ' Tipps &nbsp; &#128336; ' + laufzeit + (p.email ? ' &nbsp;&#128231; ' + esc(p.email) : '') + '</div>' +
    (p.notizenIntern ? '<div style="font-size:11px;color:var(--mid);margin-top:2px">&#128172; ' + esc(p.notizenIntern) + '</div>' : '') +
    '</div>' +
    '<div class="partner-actions">' +
      '<button class="btn btn-ghost btn-sm" onclick="toggleEdit(&#39;' + p.id + '&#39;)">&#9998; Bearbeiten</button>' +
      '<button class="btn ' + (p.isActive?'btn-ghost':'btn-green') + ' btn-sm" onclick="toggleAktiv(&#39;' + p.id + '\\',' + !p.isActive + ')">' + (p.isActive?'Deaktivieren':'Aktivieren') + '</button>' +
      '<button class="btn btn-orange btn-sm" onclick="zeigeMahnung(&#39;' + p.id + '&#39;)">&#9993; Mahnung</button>' +
      (p.isActive ? '<button class="btn btn-danger btn-sm" onclick="beendePartnerschaft(&#39;' + p.id + '&#39;)">Beenden</button>' : '') +
      '<button class="btn btn-danger btn-sm" onclick="loeschePartner(&#39;' + p.id + '&#39;)">&#128465;</button>' +
    '</div>' +
    '</div>' +
    '<div class="partner-edit-form" id="ef-' + p.id + '">' + editFormHtml(p) + '</div>' +
    '</div>';
}

function editFormHtml(p) {
  var eib = p.einfuehrungspreisGueltigBis ? p.einfuehrungspreisGueltigBis.slice(0,10) : '';
  var ls = p.laufzeitStart ? p.laufzeitStart.slice(0,10) : '';
  var le = p.laufzeitEnde ? p.laufzeitEnde.slice(0,10) : '';
  return '<div class="form-grid">' +
    '<span class="form-section-title">Basisdaten</span>' +
    fg('Name *','<input id="ef-name-'+p.id+'" value="'+esc(p.name||'')+'" type="text">') +
    fg('E-Mail',  '<input id="ef-email-'+p.id+'" value="'+esc(p.email||'')+'" type="email">') +
    fg('Kategorie','<select id="ef-kat-'+p.id+'">' + katOptions(p.kategorie) + '</select>') +
    fg('Kanton',  '<input id="ef-canton-'+p.id+'" value="'+esc(p.canton||'')+'" maxlength="2" style="text-transform:uppercase">') +
    fg('Lat',     '<input id="ef-lat-'+p.id+'" value="'+(p.lat||'')+'" type="number" step="any">') +
    fg('Lng',     '<input id="ef-lng-'+p.id+'" value="'+(p.lng||'')+'" type="number" step="any">') +
    '<span class="form-section-title">App-Inhalte</span>' +
    fgFull('Beschreibung','<textarea id="ef-beschr-'+p.id+'">'+esc(p.beschreibung||'')+'</textarea>') +
    fgFull('Angebot','<input id="ef-angebot-'+p.id+'" value="'+esc(p.angebot||'')+'" type="text">') +
    fgFull('Foto-URL','<input id="ef-foto-'+p.id+'" value="'+esc(p.fotoUrl||'')+'" type="url">') +
    '<span class="form-section-title">Vertrag &amp; Preise</span>' +
    fg('Paket','<select id="ef-paket-'+p.id+'">' + paketOptions(p.paket) + '</select>') +
    fg('Preis CHF/J. (individuell)','<input id="ef-preis-'+p.id+'" value="'+(p.preisChf||'')+'" type="number" min="0" placeholder="Paket-Standard">') +
    fg('Einführungspreis CHF/J.','<input id="ef-einfpreis-'+p.id+'" value="'+(p.einfuehrungspreisChf||'')+'" type="number" min="0">') +
    fg('Einführungspreis gültig bis','<input id="ef-einfbis-'+p.id+'" value="'+eib+'" type="date">') +
    fg('Laufzeit Start','<input id="ef-lstart-'+p.id+'" value="'+ls+'" type="date">') +
    fg('Laufzeit Ende','<input id="ef-lende-'+p.id+'" value="'+le+'" type="date">') +
    '<span class="form-section-title">Buchhaltung</span>' +
    fg('Zahlungsstatus','<select id="ef-zstatus-'+p.id+'">' + zstatusOptions(p.zahlungsstatus||'ausstehend') + '</select>') +
    fgFull('Interne Notizen','<textarea id="ef-notizen-'+p.id+'">'+esc(p.notizenIntern||'')+'</textarea>') +
    '</div>' +
    '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
    '<button class="btn btn-primary" onclick="savePartner(&#39;'+p.id+'&#39;)">Speichern</button>' +
    '<button class="btn btn-ghost" onclick="toggleEdit(&#39;'+p.id+'&#39;)">Abbrechen</button>' +
    '<span id="ef-status-'+p.id+'" class="hint"></span>' +
    '</div>';
}

function fg(label, input) { return '<div class="form-group"><label>'+label+'</label>'+input+'</div>'; }
function fgFull(label, input) { return '<div class="form-group full"><label>'+label+'</label>'+input+'</div>'; }

function katOptions(sel) {
  return [['restaurant','Restaurant'],['cafe','Café'],['souvenir','Souvenir'],['uebernachtung','Übernachtung'],['sonstiges','Sonstiges']].map(function(o){
    return '<option value="'+o[0]+'"'+(sel===o[0]?' selected':'')+'>'+o[1]+'</option>';
  }).join('');
}
function paketOptions(sel) {
  return [['','– wählen –'],['basic','Basic (99/J.)'],['standard','Standard (199/J.)'],['premium','Premium (499/J.)']].map(function(o){
    return '<option value="'+o[0]+'"'+(sel===o[0]?' selected':'')+'>'+o[1]+'</option>';
  }).join('');
}
function zstatusOptions(sel) {
  return [['ausstehend','Ausstehend'],['bezahlt','Bezahlt'],['mahnung1','Mahnung 1'],['mahnung2','Mahnung 2'],['gesperrt','Gesperrt']].map(function(o){
    return '<option value="'+o[0]+'"'+(sel===o[0]?' selected':'')+'>'+o[1]+'</option>';
  }).join('');
}

function toggleEdit(id) {
  var el = document.getElementById('ef-' + id);
  el.classList.toggle('open');
}

async function savePartner(id) {
  var body = {
    name:      v('ef-name-'+id),
    email:     v('ef-email-'+id) || undefined,
    kategorie: v('ef-kat-'+id),
    canton:    v('ef-canton-'+id).toUpperCase(),
    lat:       parseFloat(v('ef-lat-'+id)),
    lng:       parseFloat(v('ef-lng-'+id)),
    beschreibung: v('ef-beschr-'+id) || undefined,
    angebot:   v('ef-angebot-'+id) || undefined,
    fotoUrl:   v('ef-foto-'+id) || undefined,
    paket:     v('ef-paket-'+id) || undefined,
    preisChf:  vNum('ef-preis-'+id),
    einfuehrungspreisChf: vNum('ef-einfpreis-'+id),
    einfuehrungspreisGueltigBis: vDate('ef-einfbis-'+id),
    zahlungsstatus: v('ef-zstatus-'+id),
    laufzeitStart: vDate('ef-lstart-'+id),
    laufzeitEnde:  vDate('ef-lende-'+id),
    notizenIntern: v('ef-notizen-'+id) || undefined,
  };
  document.getElementById('ef-status-'+id).textContent = 'Speichern...';
  try {
    await api('/api/admin/partner/' + id, { method:'PATCH', body: JSON.stringify(body) });
    document.getElementById('ef-status-'+id).textContent = 'Gespeichert ✓';
    await loadPartner();
    await loadOverview();
  } catch(e) {
    document.getElementById('ef-status-'+id).textContent = 'Fehler: ' + e.message;
  }
}

async function createPartner() {
  var einfbis = document.getElementById('np-einfbis').value;
  var ls = document.getElementById('np-lstart').value;
  var le = document.getElementById('np-lende').value;
  var body = {
    name:      document.getElementById('np-name').value.trim(),
    email:     document.getElementById('np-email').value.trim() || undefined,
    kategorie: document.getElementById('np-kat').value,
    canton:    document.getElementById('np-canton').value.trim().toUpperCase(),
    lat:       parseFloat(document.getElementById('np-lat').value),
    lng:       parseFloat(document.getElementById('np-lng').value),
    beschreibung: document.getElementById('np-beschr').value.trim() || undefined,
    angebot:   document.getElementById('np-angebot').value.trim() || undefined,
    fotoUrl:   document.getElementById('np-foto').value.trim() || undefined,
    paket:     document.getElementById('np-paket').value || undefined,
    preisChf:  parseInt(document.getElementById('np-preis').value) || undefined,
    einfuehrungspreisChf: parseInt(document.getElementById('np-einfpreis').value) || undefined,
    einfuehrungspreisGueltigBis: einfbis ? new Date(einfbis).toISOString() : undefined,
    zahlungsstatus: document.getElementById('np-zstatus').value,
    laufzeitStart: ls ? new Date(ls).toISOString() : undefined,
    laufzeitEnde:  le ? new Date(le).toISOString() : undefined,
    notizenIntern: document.getElementById('np-notizen').value.trim() || undefined,
    isActive: true,
  };
  if (!body.name || !body.canton || isNaN(body.lat) || isNaN(body.lng)) {
    document.getElementById('np-status').textContent = 'Name, Kanton, Lat und Lng sind Pflichtfelder.';
    return;
  }
  document.getElementById('np-status').textContent = 'Anlegen...';
  try {
    await api('/api/admin/partner', { method:'POST', body: JSON.stringify(body) });
    document.getElementById('np-status').textContent = 'Angelegt ✓';
    ['np-name','np-email','np-canton','np-lat','np-lng','np-beschr','np-angebot','np-foto','np-preis','np-einfpreis','np-einfbis','np-lstart','np-lende','np-notizen'].forEach(function(id){ document.getElementById(id).value=''; });
    await loadPartner();
    await loadOverview();
  } catch(e) {
    document.getElementById('np-status').textContent = 'Fehler: ' + e.message;
  }
}

async function toggleAktiv(id, val) {
  try {
    await api('/api/admin/partner/' + id, { method:'PATCH', body: JSON.stringify({ isActive: val }) });
    await loadPartner();
    await loadOverview();
  } catch(e) { alert('Fehler: ' + e.message); }
}

async function beendePartnerschaft(id) {
  if (!confirm('Partnerschaft wirklich beenden? (Partner wird deaktiviert, Laufzeit-Ende = heute)')) return;
  try {
    await api('/api/admin/partner/' + id, { method:'PATCH', body: JSON.stringify({ isActive: false, laufzeitEnde: new Date().toISOString() }) });
    await loadPartner();
    await loadOverview();
  } catch(e) { alert('Fehler: ' + e.message); }
}

async function loeschePartner(id) {
  if (!confirm('Partner wirklich dauerhaft löschen?')) return;
  try {
    await api('/api/admin/partner/' + id, { method:'DELETE' });
    await loadPartner();
    await loadOverview();
  } catch(e) { alert('Fehler: ' + e.message); }
}

function zeigeMahnung(id) {
  var p = _partner.find(function(x){ return x.id === id; });
  if (!p) return;
  var stufe = p.zahlungsstatus || 'ausstehend';
  var titel = 'Mahnung – ' + p.name;
  var preis = 'CHF ' + (currentPreis(p) || '–') + '.–';
  var text = mahnText(p.name, p.email || '(E-Mail nicht hinterlegt)', preis, stufe);
  document.getElementById('modal-title').textContent = titel;
  document.getElementById('modal-text').textContent = text;
  document.getElementById('modal-overlay').classList.add('open');
}

function mahnText(name, email, preis, stufe) {
  var datum = new Date().toLocaleDateString('de-CH');
  if (stufe === 'mahnung2') {
    return 'Betreff: Zweite Mahnung – SagaTrail Partnerschaft\\n\\nSehr geehrte Damen und Herren\\n\\nTrotz unserer ersten Zahlungserinnerung haben wir bis heute keinen Zahlungseingang für die SagaTrail Partnerschaft verbuchen können.\\n\\nOffener Betrag: ' + preis + '/Jahr\\nIhr Partner-Eintrag: ' + name + '\\n\\nWir bitten Sie dringend, den ausstehenden Betrag innert 10 Tagen zu begleichen. Andernfalls müssen wir Ihren Eintrag in der App deaktivieren.\\n\\nBitte melden Sie sich bei Fragen direkt unter info@sagatrail.ch.\\n\\nFreundliche Grüsse\\nRolf Koch\\nSagaTrail\\ninfo@sagatrail.ch\\n\\n– ' + datum;
  }
  if (stufe === 'gesperrt') {
    return 'Betreff: Partner-Eintrag deaktiviert – SagaTrail\\n\\nSehr geehrte Damen und Herren\\n\\nAufgrund des ausstehenden Jahresbeitrags wurde der SagaTrail-Eintrag für «' + name + '» vorübergehend deaktiviert.\\n\\nUm Ihren Eintrag wieder zu aktivieren, bitten wir Sie, den Betrag von ' + preis + ' umgehend zu begleichen und uns unter info@sagatrail.ch zu kontaktieren.\\n\\nFreundliche Grüsse\\nRolf Koch\\nSagaTrail\\ninfo@sagatrail.ch\\n\\n– ' + datum;
  }
  return 'Betreff: Zahlungserinnerung – SagaTrail Partnerschaft\\n\\nSehr geehrte Damen und Herren\\n\\nVielen Dank für Ihre Partnerschaft mit SagaTrail. Wir möchten Sie freundlich an den ausstehenden Jahresbeitrag erinnern.\\n\\nPartner-Eintrag: ' + name + '\\nJahresbeitrag: ' + preis + '\\n\\nBitte überweisen Sie den Betrag auf unser Konto (IBAN auf Rechnung). Bei bereits erfolgter Zahlung bitten wir Sie, diese Erinnerung zu ignorieren.\\n\\nBei Fragen steht Ihnen unser Team gerne zur Verfügung: info@sagatrail.ch\\n\\nFreundliche Grüsse\\nRolf Koch\\nSagaTrail\\ninfo@sagatrail.ch\\n\\n– ' + datum;
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function copyModal() {
  var t = document.getElementById('modal-text').textContent;
  navigator.clipboard.writeText(t).then(function(){ alert('Kopiert!'); }).catch(function(){ });
}

/* ===================== HELPERS ===================== */
function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function vNum(id) { var n = parseInt(v(id)); return isNaN(n) ? undefined : n; }
function vDate(id) { var s = v(id); return s ? new Date(s).toISOString() : undefined; }
function esc(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function fmtDate(s) { if (!s) return '–'; return new Date(s).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function currentPreis(p) {
  var now = new Date();
  if (p.einfuehrungspreisChf && p.einfuehrungspreisGueltigBis && new Date(p.einfuehrungspreisGueltigBis) > now) return p.einfuehrungspreisChf + ' (Einf.)';
  if (p.preisChf) return p.preisChf;
  if (p.paket === 'basic') return 99;
  if (p.paket === 'standard') return 199;
  if (p.paket === 'premium') return 499;
  return null;
}
function zahlBadge(s) { return {bezahlt:'badge-green',ausstehend:'badge-orange',mahnung1:'badge-yellow',mahnung2:'badge-red',gesperrt:'badge-red'}[s] || 'badge-gray'; }
function zahlLabel(s) { return {bezahlt:'✓ Bezahlt',ausstehend:'Ausstehend',mahnung1:'Mahnung 1',mahnung2:'Mahnung 2',gesperrt:'⛔ Gesperrt'}[s] || s; }
function katLabel(k) { return {restaurant:'🍽 Restaurant',cafe:'☕ Café',souvenir:'🎁 Souvenir',uebernachtung:'🏨 Übernachtung',sonstiges:'📌 Sonstiges'}[k] || k; }
function katEmoji(k) { return {restaurant:'🍽',cafe:'☕',souvenir:'🎁',uebernachtung:'🏨',sonstiges:'📌'}[k] || '🏢'; }
</script>
</body>
</html>`;
