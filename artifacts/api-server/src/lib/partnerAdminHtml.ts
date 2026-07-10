/**
 * Statische, selbststaendige Admin-Seite zur Pflege der Partnerbetriebe.
 * Kein Framework noetig: einfaches Vanilla-JS-Formular, das das Token nur im
 * Browser-Speicher (nicht persistiert) haelt und direkt gegen
 * /api/admin/partner spricht.
 */
export const PARTNER_ADMIN_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SagaTrail Partner-Verwaltung</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 860px; margin: 0 auto; padding: 24px 16px 80px; background: #f6f3ec; color: #2b2620; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  p.hint { color: #6b6255; font-size: 13px; margin-top: 0; }
  .card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  label { display: block; font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d8d0c2; border-radius: 8px; font-size: 14px; font-family: inherit; }
  textarea { resize: vertical; min-height: 60px; }
  .row { display: flex; gap: 12px; }
  .row > div { flex: 1; }
  button { cursor: pointer; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; }
  button.primary { background: #2f6e4f; color: #fff; }
  button.danger { background: #b23b3b; color: #fff; }
  button.ghost { background: transparent; color: #6b6255; }
  .partner { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 0; border-top: 1px solid #eee2d0; }
  .partner:first-child { border-top: none; }
  .partner .meta { color: #6b6255; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eee2d0; font-size: 11px; margin-left: 6px; }
  .badge.inactive { background: #f0d9d9; color: #8a3a3a; }
  #status { font-size: 13px; margin-top: 8px; min-height: 18px; }
  #status.error { color: #b23b3b; }
  #status.ok { color: #2f6e4f; }
</style>
</head>
<body>
  <h1>Partner-Verwaltung</h1>
  <p class="hint">Interner Bereich &ndash; nicht Teil der App. Token wird nur im Browser gehalten.</p>

  <div class="card">
    <label for="token">Admin-Token</label>
    <input id="token" type="password" placeholder="x-admin-token" autocomplete="off" />
    <div style="margin-top:8px"><button class="primary" onclick="ladePartner()">Anmelden &amp; laden</button></div>
    <div id="status"></div>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0">Neuer Partner</h2>
    <label>Name</label>
    <input id="f-name" type="text" />
    <div class="row">
      <div>
        <label>Kategorie</label>
        <select id="f-kategorie">
          <option value="restaurant">Restaurant</option>
          <option value="cafe">Café</option>
          <option value="souvenir">Souvenir</option>
          <option value="uebernachtung">Übernachtung</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </div>
      <div>
        <label>Kanton (Kürzel, z.B. BE)</label>
        <input id="f-canton" type="text" maxlength="2" style="text-transform:uppercase" />
      </div>
    </div>
    <div class="row">
      <div>
        <label>Breitengrad (lat)</label>
        <input id="f-lat" type="number" step="any" />
      </div>
      <div>
        <label>Längengrad (lng)</label>
        <input id="f-lng" type="number" step="any" />
      </div>
    </div>
    <label>Beschreibung</label>
    <textarea id="f-beschreibung"></textarea>
    <label>Angebot / Rabatt</label>
    <textarea id="f-angebot" placeholder="z.B. 10% Rabatt für SagaTrail-Nutzer"></textarea>
    <div style="margin-top:12px"><button class="primary" onclick="erstellePartner()">Partner anlegen</button></div>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0">Bestehende Partner</h2>
    <div id="liste"></div>
  </div>

<script>
function token() { return document.getElementById('token').value; }
function setStatus(msg, ok) {
  const el = document.getElementById('status');
  el.textContent = msg || '';
  el.className = ok === undefined ? '' : (ok ? 'ok' : 'error');
}

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token(), ...(options && options.headers) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || ('HTTP ' + res.status));
  }
  return res.status === 204 ? null : res.json();
}

async function ladePartner() {
  try {
    setStatus('Lade...');
    const partner = await api('/api/admin/partner');
    renderListe(partner);
    setStatus('Angemeldet, ' + partner.length + ' Partner geladen.', true);
  } catch (err) {
    setStatus(err.message, false);
  }
}

function renderListe(partner) {
  const el = document.getElementById('liste');
  if (!partner.length) { el.innerHTML = '<p class="hint">Noch keine Partner angelegt.</p>'; return; }
  el.innerHTML = partner.map(p => \`
    <div class="partner">
      <div>
        <strong>\${escapeHtml(p.name)}</strong>
        <span class="badge\${p.isActive ? '' : ' inactive'}">\${p.isActive ? 'aktiv' : 'inaktiv'}</span>
        <div class="meta">\${escapeHtml(p.kategorie)} · \${escapeHtml(p.canton)} · \${p.lat.toFixed(4)}, \${p.lng.toFixed(4)}</div>
        \${p.angebot ? '<div class="meta">' + escapeHtml(p.angebot) + '</div>' : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="ghost" onclick="toggleAktiv('\${p.id}', \${!p.isActive})">\${p.isActive ? 'Deaktivieren' : 'Aktivieren'}</button>
        <button class="danger" onclick="loeschePartner('\${p.id}')">Löschen</button>
      </div>
    </div>
  \`).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function erstellePartner() {
  try {
    const body = {
      name: document.getElementById('f-name').value.trim(),
      kategorie: document.getElementById('f-kategorie').value,
      canton: document.getElementById('f-canton').value.trim().toUpperCase(),
      lat: parseFloat(document.getElementById('f-lat').value),
      lng: parseFloat(document.getElementById('f-lng').value),
      beschreibung: document.getElementById('f-beschreibung').value.trim() || undefined,
      angebot: document.getElementById('f-angebot').value.trim() || undefined,
      isActive: true,
    };
    if (!body.name || !body.canton || Number.isNaN(body.lat) || Number.isNaN(body.lng)) {
      setStatus('Bitte Name, Kanton, lat und lng ausfüllen.', false);
      return;
    }
    await api('/api/admin/partner', { method: 'POST', body: JSON.stringify(body) });
    setStatus('Partner angelegt.', true);
    ['f-name','f-canton','f-lat','f-lng','f-beschreibung','f-angebot'].forEach(id => document.getElementById(id).value = '');
    await ladePartner();
  } catch (err) {
    setStatus(err.message, false);
  }
}

async function toggleAktiv(id, isActive) {
  try {
    await api('/api/admin/partner/' + id, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    await ladePartner();
  } catch (err) {
    setStatus(err.message, false);
  }
}

async function loeschePartner(id) {
  if (!confirm('Diesen Partner wirklich löschen?')) return;
  try {
    await api('/api/admin/partner/' + id, { method: 'DELETE' });
    await ladePartner();
  } catch (err) {
    setStatus(err.message, false);
  }
}
</script>
</body>
</html>`;
