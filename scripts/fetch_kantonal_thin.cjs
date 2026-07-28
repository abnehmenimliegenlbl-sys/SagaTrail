// Erweiterter Lauf für dünn abgedeckte Kantone: 3-25km (bboxDiag 2.5-27km)
// via eigenen Infomaniak-Proxy (OVERPASS_PROXY_URL/TOKEN aus env), Mirror-Fallback.
// Crash-sicher: pro Kanton sofort einfügen + Done-Datei.
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const CANTONS = {
  'Schwyz': 'CH-SZ', 'Obwalden': 'CH-OW', 'Nidwalden': 'CH-NW', 'Zug': 'CH-ZG',
  'Basel-Stadt': 'CH-BS', 'Basel-Landschaft': 'CH-BL', 'Schaffhausen': 'CH-SH',
  'Appenzell Ausserrhoden': 'CH-AR', 'Appenzell Innerrhoden': 'CH-AI', 'Genf': 'CH-GE',
};

const DONE_FILE = __dirname + '/kantonal_thin_done.json';
const PROXY_URL = process.env.OVERPASS_PROXY_URL || '';
const PROXY_TOKEN = process.env.OVERPASS_PROXY_TOKEN || '';

const existingIds = new Set(
  execSync(`psql "$DATABASE_URL" -t -A -c "SELECT id FROM external_routes"`)
    .toString().trim().split('\n').filter(Boolean)
);
let kCounter = parseInt(
  execSync(`psql "$DATABASE_URL" -t -A -c "SELECT COALESCE(MAX(SUBSTRING(ref FROM 2)::int),0) FROM external_routes WHERE ref ~ '^K[0-9]+$'"`)
    .toString().trim(), 10) || 0;
console.log('Bestehende IDs:', existingIds.size, '| Max-K:', kCounter);

function haversineKm(a, b) {
  const R = 6371, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
const bboxDiag = b => b ? haversineKm([b.minlat, b.minlon], [b.maxlat, b.maxlon]) : 0;

const TARGETS = [
  ...(PROXY_URL ? [{ url: PROXY_URL, token: PROXY_TOKEN }] : []),
  { url: 'https://overpass.kumi.systems/api/interpreter' },
  { url: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter' },
];

function overpassPost(query, t) {
  const u = new URL(t.url);
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) };
    if (t.token) headers['X-Proxy-Token'] = t.token;
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', timeout: 120000, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0,80))); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}

async function fetchCanton(canton, iso) {
  const query = `[out:json][timeout:55];area["ISO3166-2"="${iso}"]->.a;relation["route"="hiking"]["name"](area.a);out tags bb;`;
  for (let versuch = 0; versuch < 6; versuch++) {
    const t = TARGETS[versuch % TARGETS.length];
    try {
      const j = await overpassPost(query, t);
      if (j.elements) return j.elements;
    } catch(e) {
      process.stdout.write(`(${new URL(t.url).hostname} fehlgeschlagen: ${e.message.slice(0,60)}) `);
    }
    await new Promise(r => setTimeout(r, 20000));
  }
  return null;
}

function insertRows(allRows) {
  if (!allRows.length) return;
  const esc = v => typeof v === 'boolean' ? (v ? 'true' : 'false') : typeof v === 'number' ? v : '$$' + String(v).replace(/\$\$/g, '\\$\\$') + '$$';
  const sql = 'INSERT INTO external_routes (id,saga_id,canton,name,ref,distance_km,ascent_m,max_elevation_m,minutes,sac,terrain,lat,lng,geometry,geometry_version,source,featured) VALUES\n'
    + allRows.map(r => '(' + r.map(esc).join(',') + ')').join(',\n')
    + '\nON CONFLICT (id) DO NOTHING;';
  fs.writeFileSync('/tmp/kantonal_thin_insert.sql', sql);
  execSync(`psql "$DATABASE_URL" -f /tmp/kantonal_thin_insert.sql`, { stdio: 'inherit' });
}

const loadDone = () => { try { return new Set(JSON.parse(fs.readFileSync(DONE_FILE, 'utf8'))); } catch { return new Set(); } };

async function run() {
  const done = loadDone();
  for (const [canton, iso] of Object.entries(CANTONS)) {
    if (done.has(canton)) { console.log(`${canton}: bereits erledigt`); continue; }
    process.stdout.write(`${canton}... `);
    const elements = await fetchCanton(canton, iso);
    if (elements === null) { console.log('übersprungen (alle Quellen down)'); continue; }

    const candidates = elements.filter(e => {
      if (!e.tags?.name) return false;
      if (existingIds.has('osm-' + e.id)) return false;
      const diag = bboxDiag(e.bounds);
      return diag >= 2.5 && diag <= 27;
    });
    candidates.sort((a, b) => bboxDiag(b.bounds) - bboxDiag(a.bounds));
    const take = candidates.slice(0, 300);
    console.log(`${elements.length} total → ${take.length} neu (3-25km)`);

    const allRows = [];
    for (const e of take) {
      const tags = e.tags;
      const name = (tags['name:de'] || tags.name || '')
        .replace(/\s*[-–]\s*Etappe\s+\S+.*/i, '')
        .replace(/^\d+[a-z]?[-– ]+/i, '')
        .trim();
      const from = tags.from || '', to = tags.to || '';
      const fullName = from && to && from !== to ? `${name} ${from} - ${to}` : name;
      kCounter++;
      const id = 'osm-' + e.id;
      existingIds.add(id);
      allRows.push([id, id, canton, 'K' + kCounter + ' ' + fullName, 'K' + kCounter, 0, 0, 0, 0, 'unbekannt', 'Wanderweg', 0, 0, '[]', 0, 'OpenStreetMap · swisstopo', false]);
    }
    insertRows(allRows);
    done.add(canton);
    fs.writeFileSync(DONE_FILE, JSON.stringify([...done]));
    console.log(`  → ${allRows.length} eingefügt (bis K${kCounter})`);
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log('Fertig. Max-K: K' + kCounter);
}
run().catch(e => { console.error(e); process.exit(1); });
