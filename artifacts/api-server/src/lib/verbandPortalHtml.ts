export const VERBAND_PORTAL_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SagaTrail Verbandsportal</title>
<style>
:root{--red:#CC0000;--dark:#1a1a1a;--mid:#555;--light:#f7f6f4;--card:#fff;--border:#e5e5e5;--green:#2e7d52}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:var(--light);color:var(--dark);font-size:14px;min-height:100vh}
/* HEADER */
#hdr{background:var(--dark);color:#fff;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:52px}
#hdr h1{font-size:16px;font-weight:700;letter-spacing:.5px}
#hdr h1 span{color:var(--red)}
#hdr-right{display:flex;align-items:center;gap:12px;font-size:13px}
/* LOGIN */
#login-wrap{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 52px);padding:24px}
#login-box{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:36px 32px;max-width:420px;width:100%;text-align:center}
#login-box h2{font-size:20px;font-weight:800;margin-bottom:6px}
#login-box p{font-size:13px;color:var(--mid);margin-bottom:24px;line-height:1.55}
#login-box input{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:12px;outline:none}
#login-box input:focus{border-color:var(--red)}
/* TABS */
#tabs{background:#fff;border-bottom:2px solid var(--border);display:flex;padding:0 20px}
.tab-btn{padding:12px 18px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--mid);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s}
.tab-btn.active{color:var(--red);border-bottom-color:var(--red)}
/* CONTENT */
#content{max-width:1000px;margin:0 auto;padding:24px 20px}
.tab-pane{display:none}.tab-pane.active{display:block}
/* CARDS */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.card h2{font-size:15px;font-weight:700;margin-bottom:16px}
/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:opacity .15s}
.btn:hover{opacity:.82}
.btn-red{background:var(--red);color:#fff}
.btn-ghost{background:#f0eeeb;color:var(--dark)}
.btn-sm{padding:4px 10px;font-size:12px}
/* FORM */
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:560px){.form-row{grid-template-columns:1fr}}
.form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.form-group label{font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.4px}
.form-group input{padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit;outline:none}
.form-group input:focus{border-color:var(--red)}
/* STATS */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center}
.stat-card .num{font-size:32px;font-weight:800;color:var(--red);line-height:1}
.stat-card .lbl{font-size:12px;color:var(--mid);margin-top:4px}
.canton-block{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:12px}
.canton-block h3{font-size:14px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.canton-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.canton-stat{text-align:center}
.canton-stat .n{font-size:22px;font-weight:800;color:var(--red);line-height:1}
.canton-stat .l{font-size:11px;color:var(--mid);margin-top:3px}
.mini-table{width:100%;font-size:12px;border-collapse:collapse}
.mini-table th{text-align:left;padding:5px 8px;background:#f7f6f4;color:var(--mid);font-size:11px;font-weight:700;border-bottom:2px solid var(--border)}
.mini-table td{padding:5px 8px;border-bottom:1px solid var(--border)}
.mini-table tr:last-child td{border-bottom:none}
.lang-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.lang-pill{background:#f0eeeb;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600}
/* DATE PICKER */
.date-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px}
.date-row .form-group{margin-bottom:0}
/* MSG */
.msg{font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:14px}
.msg-ok{background:#e6f4ec;color:var(--green);border:1px solid #b3d9c2}
.msg-err{background:#fce8e8;color:var(--red);border:1px solid #f0b0b0}
.loading{color:var(--mid);font-size:13px;padding:20px;text-align:center}
.hint{font-size:12px;color:#aaa}
</style>
</head>
<body>

<div id="hdr">
  <h1>Saga<span>Trail</span> Verbandsportal</h1>
  <div id="hdr-right" style="display:none">
    <span id="hdr-name"></span>
    <button class="btn btn-ghost btn-sm" onclick="logout()">Abmelden</button>
  </div>
</div>

<!-- LOGIN -->
<div id="login-wrap">
  <div id="login-box">
    <h2>Anmelden</h2>
    <p>Gib deine E-Mail-Adresse ein. Du erhältst sofort einen Zugangs-Link.</p>
    <div id="login-msg"></div>
    <input id="login-email" type="email" placeholder="info@verband.ch" autocomplete="email"
           onkeydown="if(event.key==='Enter')doLogin()"/>
    <button class="btn btn-red" style="width:100%;justify-content:center;padding:11px" onclick="doLogin()">
      <span id="login-btn-text">Zugang anfordern</span>
    </button>
    <p class="hint" style="margin-top:16px">Der Link gilt 24 Stunden. Du wirst direkt angemeldet.</p>
  </div>
</div>

<!-- PORTAL (nach Login) -->
<div id="portal" style="display:none">
  <div id="tabs">
    <button class="tab-btn active" onclick="switchTab('dashboard',this)">&#128202; Dashboard</button>
    <button class="tab-btn" onclick="switchTab('daten',this)">&#9997;&#65039; Meine Daten</button>
  </div>

  <div id="content">

    <!-- DASHBOARD TAB -->
    <div id="tab-dashboard" class="tab-pane active">
      <div class="card">
        <h2>&#128202; Nutzungsstatistik</h2>
        <div class="date-row">
          <div class="form-group">
            <label>Von</label>
            <input type="date" id="stat-von" onchange="loadStats()"/>
          </div>
          <div class="form-group">
            <label>Bis</label>
            <input type="date" id="stat-bis" onchange="loadStats()"/>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="setRange(30)">Letzte 30 Tage</button>
          <button class="btn btn-ghost btn-sm" onclick="setRange(90)">Letzte 90 Tage</button>
          <button class="btn btn-ghost btn-sm" onclick="setRange(365)">Letzte 12 Monate</button>
        </div>
        <div id="stats-body"><p class="loading">Wird geladen…</p></div>
      </div>
    </div>

    <!-- MEINE DATEN TAB -->
    <div id="tab-daten" class="tab-pane">
      <div class="card" style="max-width:520px">
        <h2>&#9997;&#65039; Meine Kontaktdaten</h2>
        <div id="daten-msg"></div>
        <div class="form-group">
          <label>Verbandsname</label>
          <input id="d-name" type="text" disabled style="background:#f7f6f4;color:var(--mid)"/>
        </div>
        <div class="form-group">
          <label>E-Mail</label>
          <input id="d-email" type="email" disabled style="background:#f7f6f4;color:var(--mid)"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ansprechpartner</label>
            <input id="d-kontakt" type="text" placeholder="Vorname Nachname"/>
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input id="d-tel" type="tel" placeholder="+41 79 000 00 00"/>
          </div>
        </div>
        <div class="form-group">
          <label>Zuständige Kantone</label>
          <input id="d-kantone" type="text" disabled style="background:#f7f6f4;color:var(--mid)"/>
        </div>
        <button class="btn btn-red" onclick="saveDaten()">Speichern</button>
      </div>
    </div>

  </div>
</div>

<script>
var TOKEN = null;
var ME = null;

/* ─── INIT ─────────────────────────────────────────── */
(function(){
  var saved = sessionStorage.getItem('stv_token');
  if (saved) { TOKEN = saved; initPortal(); }
  // Default: letzte 90 Tage
  setRange(90, false);
})();

/* ─── LOGIN ─────────────────────────────────────────── */
function doLogin(){
  var email = document.getElementById('login-email').value.trim();
  if (!email) return;
  document.getElementById('login-btn-text').textContent = 'Wird gesendet…';
  document.getElementById('login-msg').innerHTML = '';

  fetch('/api/partner/portal/token', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email})
  })
  .then(function(r){ return r.json(); })
  .then(function(json){
    if (!json.ok){ throw new Error(json.error || 'Fehler'); }
    if (json.type !== 'verband'){
      showLoginMsg('Diese E-Mail ist kein Verbands-Account. Bitte nutze das <a href="/api/partner/portal">Partner-Portal</a>.', true);
      return;
    }
    TOKEN = json.token;
    sessionStorage.setItem('stv_token', TOKEN);
    showLoginMsg('Angemeldet als ' + json.name + '.', false);
    setTimeout(initPortal, 600);
  })
  .catch(function(e){ showLoginMsg(e.message, true); })
  .finally(function(){ document.getElementById('login-btn-text').textContent = 'Zugang anfordern'; });
}

function showLoginMsg(msg, isErr){
  var el = document.getElementById('login-msg');
  el.innerHTML = '<div class="msg ' + (isErr ? 'msg-err' : 'msg-ok') + '">' + msg + '</div>';
}

/* ─── PORTAL ─────────────────────────────────────────── */
function initPortal(){
  fetch('/api/verband/portal/me?token=' + encodeURIComponent(TOKEN))
  .then(function(r){
    if (!r.ok){ throw new Error('Ungültiger Token'); }
    return r.json();
  })
  .then(function(me){
    ME = me;
    document.getElementById('login-wrap').style.display = 'none';
    document.getElementById('portal').style.display = 'block';
    document.getElementById('hdr-right').style.display = 'flex';
    document.getElementById('hdr-name').textContent = me.name;
    fillDaten(me);
    loadStats();
  })
  .catch(function(){
    sessionStorage.removeItem('stv_token');
    TOKEN = null;
  });
}

function logout(){
  sessionStorage.removeItem('stv_token');
  TOKEN = null;
  location.reload();
}

function switchTab(name, btn){
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ─── MEINE DATEN ──────────────────────────────────── */
function fillDaten(me){
  document.getElementById('d-name').value    = me.name || '';
  document.getElementById('d-email').value   = me.email || '';
  document.getElementById('d-kontakt').value = me.kontaktName || '';
  document.getElementById('d-tel').value     = me.kontaktTelefon || '';
  document.getElementById('d-kantone').value = me.kantone || '';
}

function saveDaten(){
  var body = {
    kontaktName:    document.getElementById('d-kontakt').value.trim(),
    kontaktTelefon: document.getElementById('d-tel').value.trim(),
  };
  fetch('/api/verband/portal/me?token=' + encodeURIComponent(TOKEN), {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(r){ return r.json(); })
  .then(function(json){
    var el = document.getElementById('daten-msg');
    if (json.ok){
      el.innerHTML = '<div class="msg msg-ok">Gespeichert.</div>';
      ME = Object.assign(ME, body);
    } else {
      el.innerHTML = '<div class="msg msg-err">' + (json.error || 'Fehler') + '</div>';
    }
  });
}

/* ─── DASHBOARD ──────────────────────────────────────── */
function setRange(days, load){
  var now = new Date();
  var von = new Date(now.getTime() - days * 86400000);
  document.getElementById('stat-bis').value = now.toISOString().slice(0,10);
  document.getElementById('stat-von').value = von.toISOString().slice(0,10);
  if (load !== false && TOKEN) loadStats();
}

function loadStats(){
  if (!TOKEN) return;
  var von = document.getElementById('stat-von').value;
  var bis = document.getElementById('stat-bis').value;
  var url = '/api/verband/portal/stats?token=' + encodeURIComponent(TOKEN);
  if (von) url += '&von=' + encodeURIComponent(von);
  if (bis) url += '&bis=' + encodeURIComponent(bis);

  document.getElementById('stats-body').innerHTML = '<p class="loading">Wird geladen…</p>';

  fetch(url)
  .then(function(r){ return r.json(); })
  .then(function(json){
    renderStats(json);
  })
  .catch(function(e){
    document.getElementById('stats-body').innerHTML = '<p class="msg msg-err">Fehler: ' + e.message + '</p>';
  });
}

function renderStats(data){
  var body = document.getElementById('stats-body');
  if (!data.kantone || !data.kantone.length){
    body.innerHTML = '<p class="hint" style="padding:20px 0">Keine Wanderungen im gewählten Zeitraum in deinen Kantonen.</p>';
    return;
  }

  var html = '<div class="stat-grid">';
  html += '<div class="stat-card"><div class="num">' + data.totalWanderungen + '</div><div class="lbl">Wanderungen gesamt</div></div>';
  html += '<div class="stat-card"><div class="num">' + data.kantone.length + '</div><div class="lbl">Aktive Kantone</div></div>';

  // Global avg dauer
  var avgArr = data.kantone.filter(function(c){ return c.avgDauerMin !== null; });
  if (avgArr.length){
    var avgSum = avgArr.reduce(function(s,c){ return s + c.avgDauerMin; }, 0);
    html += '<div class="stat-card"><div class="num">' + Math.round(avgSum/avgArr.length) + ' Min</div><div class="lbl">&#216; Verweildauer</div></div>';
  }

  // Globale Top-Sprache
  var allLangs = {};
  data.kantone.forEach(function(c){
    Object.entries(c.nachSprache).forEach(function(entry){
      allLangs[entry[0]] = (allLangs[entry[0]] || 0) + entry[1];
    });
  });
  var sortedLangs = Object.entries(allLangs).sort(function(a,b){ return b[1]-a[1]; });
  if (sortedLangs.length){
    html += '<div class="stat-card"><div class="num">' + langLabel(sortedLangs[0][0]) + '</div><div class="lbl">Meistgenutzte Sprache</div></div>';
  }
  html += '</div>';

  // Pro Kanton
  data.kantone.forEach(function(c){
    html += '<div class="canton-block">';
    html += '<h3>&#127988;&#65039; ' + esc(c.canton) + '</h3>';
    html += '<div class="canton-stats-grid">';
    html += '<div class="canton-stat"><div class="n">' + c.wanderungen + '</div><div class="l">Wanderungen</div></div>';
    html += '<div class="canton-stat"><div class="n">' + (c.avgDauerMin !== null ? c.avgDauerMin + ' Min' : '–') + '</div><div class="l">&#216; Dauer</div></div>';
    html += '</div>';

    // Sprachen
    var langs = Object.entries(c.nachSprache).sort(function(a,b){ return b[1]-a[1]; });
    if (langs.length){
      html += '<div style="margin-bottom:12px"><div class="hint" style="margin-bottom:6px;font-weight:700">Sprachen</div><div class="lang-pills">';
      langs.forEach(function(e){ html += '<span class="lang-pill">' + langLabel(e[0]) + ' ' + e[1] + '</span>'; });
      html += '</div></div>';
    }

    // 2-Spalten: Sagen + Strecken
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    if (c.top3Sagen && c.top3Sagen.length){
      html += '<div><div class="hint" style="margin-bottom:6px;font-weight:700">Top 3 Sagen</div>';
      html += '<table class="mini-table"><thead><tr><th>#</th><th>Sage</th><th>Mal</th></tr></thead><tbody>';
      c.top3Sagen.forEach(function(s,i){ html += '<tr><td>' + (i+1) + '</td><td>' + esc(s.name) + '</td><td>' + s.count + '</td></tr>'; });
      html += '</tbody></table></div>';
    }
    if (c.top20Strecken && c.top20Strecken.length){
      html += '<div><div class="hint" style="margin-bottom:6px;font-weight:700">Top 20 Strecken</div>';
      html += '<table class="mini-table"><thead><tr><th>#</th><th>Strecke</th><th>Mal</th></tr></thead><tbody>';
      c.top20Strecken.slice(0,20).forEach(function(s,i){ html += '<tr><td>' + (i+1) + '</td><td>' + esc(s.name) + '</td><td>' + s.count + '</td></tr>'; });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    html += '</div>';
  });

  body.innerHTML = html;
}

function langLabel(code){
  var m = {de:'🇩🇪 DE',en:'🇬🇧 EN',fr:'🇫🇷 FR',it:'🇮🇹 IT',es:'🇪🇸 ES',pt:'🇵🇹 PT',ja:'🇯🇵 JA',zh:'🇨🇳 ZH'};
  return m[code] || code.toUpperCase();
}
function esc(s){ return String(s||'').replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
</script>
</body>
</html>`;
