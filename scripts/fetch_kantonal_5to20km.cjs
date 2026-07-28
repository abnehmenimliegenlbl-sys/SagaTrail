// Holt pro Kanton OSM-Wanderrouten mit ~5-20km (bboxDiag 4-22km als Proxy)
// und fügt sie als K-Routen in external_routes ein. Crash-sicher:
// pro Kanton sofort einfügen + erledigte Kantone in Done-Datei merken.
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const CANTONS = {
  'Zürich': 'CH-ZH', 'Bern': 'CH-BE', 'Luzern': 'CH-LU', 'Uri': 'CH-UR',
  'Schwyz': 'CH-SZ', 'Obwalden': 'CH-OW', 'Nidwalden': 'CH-NW', 'Glarus': 'CH-GL',
  'Zug': 'CH-ZG', 'Freiburg': 'CH-FR', 'Solothurn': 'CH-SO', 'Basel-Stadt': 'CH-BS',
  'Basel-Landschaft': 'CH-BL', 'Schaffhausen': 'CH-SH',
  'Appenzell Ausserrhoden': 'CH-AR', 'Appenzell Innerrhoden': 'CH-AI',
  'St. Gallen': 'CH-SG', 'Graubünden': 'CH-GR', 'Aargau': 'CH-AG',
  'Thurgau': 'CH-TG', 'Tessin': 'CH-TI', 'Waadt': 'CH-VD', 'Wallis': 'CH-VS',
  'Neuenburg': 'CH-NE', 'Genf': 'CH-GE', 'Jura': 'CH-JU',
};

const DONE_FILE = __dirname + '/kantonal_done_cantons.json';

const existingIds = new Set(
  execSync(`psql "$DATABASE_URL" -t -A -c "SELECT id FROM external_routes"`)
    .toString().trim().split('\n').filter(Boolean)
);
const maxK = parseInt(
  execSync(`psql "$DATABASE_URL" -t -A -c "SELECT COALESCE(MAX(SUBSTRING(ref FROM 2)::int),0) FROM external_routes WHERE ref ~ '^K[0-9]+$'"`)
    .toString().trim(), 10) || 0;
console.log('Bestehende IDs:', existingIds.size);
console.log('Aktuelles Max-K:', maxK);

function haversineKm(a, b) {
  const R = 6371, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
function bboxDiag(bounds) {
  if (!bounds) return 0;
  return haversineKm([bounds.minlat, bounds.minlon], [bounds.maxlat, bounds.maxlon]);
}

const MIRRORS = [
  { hostname: 'maps.mail.ru', path: '/osm/tools/overpass/api/interpreter' },
  { hostname: 'overpass.kumi.systems', path: '/api/interpreter' },
  { hostname: 'overpass.openstreetmap.ru', path: '/api/interpreter' },
];

function overpassPost(query, mirrorIdx = 0) {
  const mirror = MIRRORS[mirrorIdx % MIRRORS.length];
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const opts = {
      hostname: mirror.hostname, path: mirror.path,
      method: 'POST', timeout: 90000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('JSON-Fehler: ' + d.slice(0,80))); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}

async function fetchCanton(canton, iso) {
  const query = `[out:json][timeout:55];area["ISO3166-2"="${iso}"]->.a;relation["route"="hiking"]["name"](area.a);out tags bb;`;
  for (let i = 0; i < MIRRORS.length; i++) {
    try {
      const j = await overpassPost(query, i);
      return j.elements || [];
    } catch(e) {
      if (i < MIRRORS.length - 1) {
        process.stdout.write(`(mirror ${i+1} failed, retry)... `);
        await new Promise(r => setTimeout(r, 15000));
      } else {
        console.error(`  ALLE Mirror failed für ${canton}: ${e.message}`);
        return null;
      }
    }
  }
  return null;
}

function loadDone() {
  try { return new Set(JSON.parse(fs.readFileSync(DONE_FILE, 'utf8'))); }
  catch { return new Set(); }
}
function saveDone(done) { fs.writeFileSync(DONE_FILE, JSON.stringify([...done])); }

function insertRows(allRows) {
  if (!allRows.length) return;
  const esc = v => typeof v === 'boolean' ? (v ? 'true' : 'false') : typeof v === 'number' ? v : '$$' + String(v).replace(/\$\$/g, '\\$\\$') + '$$';
  const sql = 'INSERT INTO external_routes (id,saga_id,canton,name,ref,distance_km,ascent_m,max_elevation_m,minutes,sac,terrain,lat,lng,geometry,geometry_version,source,featured) VALUES\n'
    + allRows.map(r => '(' + r.map(esc).join(',') + ')').join(',\n')
    + '\nON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, ref=EXCLUDED.ref, canton=EXCLUDED.canton;';
  fs.writeFileSync('/tmp/kantonal_insert.sql', sql);
  execSync(`psql "$DATABASE_URL" -f /tmp/kantonal_insert.sql`, { stdio: 'inherit' });
}

async function run() {
  let kCounter = maxK;
  const done = loadDone();

  for (const [canton, iso] of Object.entries(CANTONS)) {
    if (done.has(canton)) { console.log(`${canton}: bereits erledigt, übersprungen`); continue; }
    const allRows = [];
    process.stdout.write(`${canton}... `);
    const elements = await fetchCanton(canton, iso);
    if (elements === null) { console.log('übersprungen (alle Mirror down), nächster Lauf'); continue; }

    const candidates = elements.filter(e => {
      if (!e.tags?.name) return false;
      const id = 'osm-' + e.id;
      if (existingIds.has(id)) return false;
      const diag = bboxDiag(e.bounds);
      return diag >= 4 && diag <= 22;
    });
    candidates.sort((a, b) => bboxDiag(b.bounds) - bboxDiag(a.bounds));
    const take = candidates.slice(0, 300);
    console.log(`${elements.length} total → ${candidates.length} neu 5-20km → nehme ${take.length}`);

    for (const e of take) {
      const tags = e.tags;
      const name = (tags['name:de'] || tags.name || '')
        .replace(/\s*[-–]\s*Etappe\s+\S+.*/i, '')
        .replace(/^\d+[a-z]?[-– ]+/i, '')
        .trim();
      const from = tags.from || '';
      const to = tags.to || '';
      const fullName = from && to && from !== to ? `${name} ${from} - ${to}` : name;

      kCounter++;
      const ref = 'K' + kCounter;
      const id = 'osm-' + e.id;
      existingIds.add(id);
      allRows.push([id, id, canton, ref + ' ' + fullName, ref, 0, 0, 0, 0, 'unbekannt', 'Wanderweg', 0, 0, '[]', 0, 'OpenStreetMap · swisstopo', false]);
    }

    insertRows(allRows);
    done.add(canton);
    saveDone(done);
    console.log(`  → ${allRows.length} eingefügt (bis K${kCounter})`);
    await new Promise(r => setTimeout(r, 8000));
  }
  console.log('\nAlle Kantone durch. Max-K: K' + kCounter);
}
run().catch(console.error);
