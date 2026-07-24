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
#hdr-logo{width:32px;height:32px;border-radius:6px;object-fit:contain;background:#fff;border:1px solid rgba(255,255,255,.2)}
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
.form-group input,.form-group textarea{padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit;outline:none;width:100%}
.form-group input:focus,.form-group textarea:focus{border-color:var(--red)}
.form-group input:disabled,.form-group textarea:disabled{background:#f7f6f4;color:var(--mid);cursor:default}
.form-group textarea{min-height:80px;resize:vertical}
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
/* LOGO UPLOAD */
#logo-dropzone{border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:border-color .15s;position:relative;overflow:hidden;background:#fafaf9;margin-bottom:12px}
#logo-dropzone:hover,#logo-dropzone.drag{border-color:var(--red)}
#logo-dropzone p{font-size:12px;color:var(--mid);margin-top:6px}
#logo-file-input{display:none}
#logo-preview-wrap{display:flex;align-items:center;gap:16px;margin-bottom:16px}
#logo-preview{width:80px;height:80px;object-fit:contain;border-radius:8px;border:1px solid var(--border);background:#f0eeeb;display:none}
#logo-placeholder{width:80px;height:80px;border-radius:8px;border:1px solid var(--border);background:#f0eeeb;display:flex;align-items:center;justify-content:center;font-size:28px}
</style>
</head>
<body>

<div id="hdr">
  <h1>Saga<span>Trail</span> Verbandsportal</h1>
  <div id="hdr-right" style="display:none">
    <img id="hdr-logo" style="display:none" alt="Logo"/>
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
    <p class="hint" style="margin-top:16px">Der Link gilt 24 Stunden.</p>
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
          <button class="btn btn-ghost btn-sm" onclick="setRange(30)">30 Tage</button>
          <button class="btn btn-ghost btn-sm" onclick="setRange(90)">90 Tage</button>
          <button class="btn btn-ghost btn-sm" onclick="setRange(365)">12 Monate</button>
        </div>
        <div id="stats-body"><p class="loading">Wird geladen…</p></div>
      </div>
    </div>

    <!-- MEINE DATEN TAB -->
    <div id="tab-daten" class="tab-pane">

      <!-- LOGO -->
      <div class="card" style="max-width:520px">
        <h2>&#127758; Verbandslogo</h2>
        <div id="daten-logo-msg"></div>
        <div id="logo-preview-wrap">
          <div id="logo-placeholder">&#127758;</div>
          <img id="logo-preview" alt="Logo"/>
          <div style="font-size:12px;color:var(--mid);line-height:1.6">
            JPEG, PNG oder WebP<br>Empfohlen: quadratisch, mind. 400×400 px
          </div>
        </div>
        <div id="logo-dropzone" onclick="document.getElementById('logo-file-input').click()"
             ondragover="event.preventDefault();this.classList.add('drag')"
             ondragleave="this.classList.remove('drag')"
             ondrop="handleLogoDrop(event)">
          <div style="font-size:28px">&#128444;&#65039;</div>
          <p>Logo hier ablegen oder klicken zum Auswählen</p>
        </div>
        <input type="file" id="logo-file-input" accept="image/jpeg,image/png,image/webp"
               onchange="handleLogoFile(this.files[0])"/>
        <div id="logo-upload-progress" style="display:none;font-size:12px;color:var(--mid);margin-top:6px">Wird hochgeladen…</div>
      </div>

      <!-- KONTAKTDATEN -->
      <div class="card" style="max-width:520px">
        <h2>&#9997;&#65039; Kontaktdaten</h2>
        <div id="daten-msg"></div>

        <div class="form-group">
          <label>Verbandsname</label>
          <input id="d-name" type="text" placeholder="Tourismusverband Musterland"/>
        </div>
        <div class="form-group">
          <label>E-Mail</label>
          <input id="d-email" type="email" disabled/>
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
          <label>Zuständige Kantone <span style="font-weight:400;text-transform:none">(wird vom Admin gesetzt)</span></label>
          <input id="d-kantone" type="text" disabled/>
        </div>
        <div class="form-group">
          <label>Interne Notizen</label>
          <textarea id="d-notizen" placeholder="Anmerkungen, Hinweise, interne Infos…"></textarea>
        </div>

        <button class="btn btn-red" onclick="saveDaten()">Speichern</button>
      </div>

    </div><!-- /tab-daten -->

  </div>
</div>

<script>
var TOKEN = null;
var ME = null;
var BASE = '';

/* ─── INIT ─────────────────────────────────────────── */
(function(){
  // Token aus URL-Parameter (Magic-Link)
  var p = new URLSearchParams(location.search);
  var urlToken = p.get('token');
  if (urlToken) {
    TOKEN = urlToken;
    sessionStorage.setItem('stv_token', TOKEN);
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    initPortal();
    return;
  }
  // Gespeicherter Token
  var saved = sessionStorage.getItem('stv_token');
  if (saved) { TOKEN = saved; initPortal(); return; }
  // Default-Zeitraum setzen
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
    body: JSON.stringify({email: email})
  })
  .then(function(r){ return r.json(); })
  .then(function(json){
    if (!json.ok){ throw new Error(json.error || 'Fehler'); }
    if (json.type !== 'verband'){
      showLoginMsg('Diese E-Mail ist kein Verbands-Account. Bitte nutze das <a href="/portal" style="color:var(--red)">Partner-Portal</a>.', true);
      return;
    }
    TOKEN = json.token;
    sessionStorage.setItem('stv_token', TOKEN);
    showLoginMsg('Angemeldet.', false);
    setTimeout(initPortal, 500);
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
    if (me.logoUrl) {
      var hdrLogo = document.getElementById('hdr-logo');
      hdrLogo.src = me.logoUrl;
      hdrLogo.style.display = 'block';
    }
    fillDaten(me);
    setRange(90, false);
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
  document.getElementById('d-notizen').value = me.notizen || '';
  if (me.logoUrl) {
    document.getElementById('logo-preview').src = me.logoUrl;
    document.getElementById('logo-preview').style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
  }
}

function saveDaten(){
  var body = {
    name:           document.getElementById('d-name').value.trim(),
    kontaktName:    document.getElementById('d-kontakt').value.trim(),
    kontaktTelefon: document.getElementById('d-tel').value.trim(),
    notizen:        document.getElementById('d-notizen').value.trim(),
  };
  var msgEl = document.getElementById('daten-msg');
  msgEl.innerHTML = '';
  fetch('/api/verband/portal/me?token=' + encodeURIComponent(TOKEN), {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(r){ return r.json(); })
  .then(function(json){
    if (json.ok){
      msgEl.innerHTML = '<div class="msg msg-ok">&#10003; Gespeichert.</div>';
      ME = Object.assign(ME, body);
      document.getElementById('hdr-name').textContent = body.name || ME.name;
    } else {
      msgEl.innerHTML = '<div class="msg msg-err">' + esc(json.error || 'Fehler') + '</div>';
    }
    setTimeout(function(){ msgEl.innerHTML = ''; }, 3000);
  });
}

/* ─── LOGO UPLOAD ──────────────────────────────────── */
function handleLogoDrop(e){
  e.preventDefault();
  document.getElementById('logo-dropzone').classList.remove('drag');
  var file = e.dataTransfer.files[0];
  if (file) handleLogoFile(file);
}

function handleLogoFile(file){
  if (!file || !file.type.startsWith('image/')) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    var img = new Image();
    img.onload = function(){
      var MAX = 800;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX){
        var ratio = Math.min(MAX/w, MAX/h);
        w = Math.round(w*ratio); h = Math.round(h*ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var base64 = canvas.toDataURL('image/jpeg', 0.88);
      showLogoPreview(base64);
      uploadLogo(base64);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function showLogoPreview(src){
  var preview = document.getElementById('logo-preview');
  preview.src = src;
  preview.style.display = 'block';
  document.getElementById('logo-placeholder').style.display = 'none';
  var hdrLogo = document.getElementById('hdr-logo');
  hdrLogo.src = src;
  hdrLogo.style.display = 'block';
}

function uploadLogo(base64){
  var prog = document.getElementById('logo-upload-progress');
  var msgEl = document.getElementById('daten-logo-msg');
  prog.style.display = 'block';
  msgEl.innerHTML = '';
  fetch('/api/verband/portal/upload-logo?token=' + encodeURIComponent(TOKEN), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ logoBase64: base64 })
  })
  .then(function(r){ return r.json(); })
  .then(function(json){
    prog.style.display = 'none';
    if (json.ok){
      msgEl.innerHTML = '<div class="msg msg-ok">&#10003; Logo gespeichert.</div>';
      if (ME) ME.logoUrl = json.logoUrl;
    } else {
      msgEl.innerHTML = '<div class="msg msg-err">' + esc(json.error || 'Upload fehlgeschlagen') + '</div>';
    }
    setTimeout(function(){ msgEl.innerHTML = ''; }, 3000);
  })
  .catch(function(){
    prog.style.display = 'none';
    msgEl.innerHTML = '<div class="msg msg-err">Verbindungsfehler beim Upload.</div>';
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
  .then(function(json){ renderStats(json); })
  .catch(function(e){
    document.getElementById('stats-body').innerHTML = '<p class="msg msg-err">Fehler: ' + esc(e.message) + '</p>';
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

  var avgArr = data.kantone.filter(function(c){ return c.avgDauerMin !== null; });
  if (avgArr.length){
    var avgSum = avgArr.reduce(function(s,c){ return s + c.avgDauerMin; }, 0);
    html += '<div class="stat-card"><div class="num">' + Math.round(avgSum/avgArr.length) + '&#x202F;Min</div><div class="lbl">&#216; Verweildauer</div></div>';
  }

  var allLangs = {};
  data.kantone.forEach(function(c){
    Object.entries(c.nachSprache).forEach(function(e){ allLangs[e[0]] = (allLangs[e[0]] || 0) + e[1]; });
  });
  var sortedLangs = Object.entries(allLangs).sort(function(a,b){ return b[1]-a[1]; });
  if (sortedLangs.length){
    html += '<div class="stat-card"><div class="num">' + langLabel(sortedLangs[0][0]) + '</div><div class="lbl">Meistgenutzte Sprache</div></div>';
  }
  html += '</div>';

  data.kantone.forEach(function(c){
    html += '<div class="canton-block">';
    html += '<h3>&#127988;&#65039; ' + esc(c.canton) + '</h3>';
    html += '<div class="canton-stats-grid">';
    html += '<div class="canton-stat"><div class="n">' + c.wanderungen + '</div><div class="l">Wanderungen</div></div>';
    html += '<div class="canton-stat"><div class="n">' + (c.avgDauerMin !== null ? c.avgDauerMin + '&#x202F;Min' : '–') + '</div><div class="l">&#216; Dauer</div></div>';
    html += '</div>';

    var langs = Object.entries(c.nachSprache).sort(function(a,b){ return b[1]-a[1]; });
    if (langs.length){
      html += '<div style="margin-bottom:12px"><div class="hint" style="margin-bottom:6px;font-weight:700">Sprachen</div><div class="lang-pills">';
      langs.forEach(function(e){ html += '<span class="lang-pill">' + langLabel(e[0]) + ' ' + e[1] + '</span>'; });
      html += '</div></div>';
    }

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
    html += '</div></div>';
  });

  body.innerHTML = html;
}

var LANG_LABELS = {de:'&#127465;&#127466; DE',gsw:'&#127464;&#127469; GSW',en:'&#127468;&#127463; EN',fr:'&#127467;&#127479; FR',it:'&#127470;&#127481; IT',es:'&#127466;&#127480; ES',pt:'&#127477;&#127481; PT',zh:'&#127464;&#127475; ZH'};
function langLabel(code){ return LANG_LABELS[code] || code.toUpperCase(); }
function esc(s){ return String(s||'').replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
</script>
</body>
</html>`;
