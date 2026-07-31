// Stitcht RWN-Elternrouten aus ihren Etappen neu zusammen.
// Verarbeitet alle Parents mit geometry_version = -1 (warten auf Restitch).
//
// Fixes gegenüber v1:
//  - Beide Geometry-Formate (jsonb array UND json-as-string)
//  - Überspringt wenn nicht ALLE Etappen Geometrie haben
//  - Überschreibt distance_tag_km NICHT (SM-Werte bleiben erhalten)
//  - Setzt geometry_version = 5 nach erfolgreichem Stitch
//  - Etappen-Nummer-Sortierung vor Stitch
//
// Aufruf: node scripts/restitch_rwn_fix.cjs [--dry-run]
const { createRequire } = require("module");
const apiRequire = createRequire(require("path").resolve(__dirname, "../lib/db/package.json"));
const { Client } = apiRequire("pg");

const DRY_RUN = process.argv.includes("--dry-run");

const R = 6371;
function hav(a, b) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat/2)**2 +
    Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function norm(g) {
  // Handle both [{lat,lng}] and [[lat,lng]] formats
  return g.map(p => Array.isArray(p) ? [p[0], p[1]] : [p.lat ?? p[0], p.lng ?? p[1]]);
}

function etappenNr(name) {
  const m = name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function calcLen(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += hav(pts[i-1], pts[i]);
  return len;
}

// Parst Geometrie aus DB (unterstützt jsonb-array und jsonb-string)
function parseGeo(geoText) {
  if (!geoText) return null;
  try {
    const parsed = typeof geoText === 'string' ? JSON.parse(geoText) : geoText;
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    return norm(parsed);
  } catch {
    return null;
  }
}

// Stitch: Etappen in Reihenfolge zusammenketten, Richtung korrigieren
function stitch(segs) {
  let chain = segs[0].slice();
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i].slice();
    const end = chain[chain.length - 1];
    // Prüfe ob Segment umgekehrt werden muss
    if (hav(end, seg[seg.length - 1]) < hav(end, seg[0])) seg.reverse();
    chain = chain.concat(seg);
  }
  return chain;
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Alle Parents die auf Restitch warten
  const { rows: parents } = await c.query(`
    SELECT id, ref, name, distance_tag_km, distance_km
    FROM external_routes
    WHERE is_etappe = false
      AND geometry_version = -1
      AND ref ~ '^[0-9]+$'
    ORDER BY LPAD(ref, 4, '0')
  `);

  console.log(`${parents.length} Parents mit geometry_version=-1 gefunden.\n`);
  let fixed = 0, skipped = 0;

  for (const p of parents) {
    // Alle Etappen laden (mit und ohne Geometrie)
    const { rows: all } = await c.query(`
      SELECT id, name,
        CASE
          WHEN jsonb_typeof(geometry) = 'array'  THEN geometry::text
          WHEN jsonb_typeof(geometry) = 'string' THEN geometry#>>'{}'
          ELSE NULL
        END AS geo_text,
        distance_tag_km, distance_km
      FROM external_routes
      WHERE saga_id = $1 AND is_etappe = true
      ORDER BY name
    `, [p.id]);

    if (all.length === 0) {
      console.log(`SKIP   ref=${p.ref} ${p.id} — keine Etappen verlinkt`);
      skipped++; continue;
    }

    // Etappen mit und ohne Geometrie trennen
    const withGeo = all.filter(e => {
      const pts = parseGeo(e.geo_text);
      return pts && pts.length >= 2;
    });
    const withoutGeo = all.filter(e => !withGeo.includes(e));

    if (withoutGeo.length > 0) {
      const missing = withoutGeo.map(e => {
        const nr = etappenNr(e.name);
        return nr ? `E${nr}` : e.id;
      }).join(', ');
      console.log(`SKIP   ref=${p.ref} — ${withoutGeo.length}/${all.length} Etappen ohne Geo (${missing})`);
      skipped++; continue;
    }

    // Alle haben Geometrie — nach Etappen-Nummer sortieren
    const hasNrs = withGeo.every(e => etappenNr(e.name) !== null);
    let ordered = withGeo;
    if (hasNrs) {
      ordered = [...withGeo].sort((a, b) => etappenNr(a.name) - etappenNr(b.name));
    } else {
      console.log(`  WARN ref=${p.ref} — keine Etappen-Nummern in Namen, Reihenfolge ggf. falsch`);
    }

    const segs = ordered.map(e => parseGeo(e.geo_text)).filter(Boolean);
    if (segs.length === 0) { skipped++; continue; }

    let chain;
    try {
      chain = stitch(segs);
    } catch(e) {
      console.log(`SKIP   ref=${p.ref} ${p.id} — Stitch-Fehler: ${e.message}`);
      skipped++; continue;
    }

    const geoLen = calcLen(chain);
    const rounded = chain.map(([lat, lng]) => [
      Math.round(lat * 1e6) / 1e6,
      Math.round(lng * 1e6) / 1e6
    ]);

    // distance_tag_km NUR setzen wenn noch nicht manuell gesetzt
    const keepTagKm = p.distance_tag_km != null;

    console.log(`FIXED  ref=${p.ref} ${p.id.slice(0,32)} | ${all.length} Etappen | ` +
      `${geoLen.toFixed(0)} km (geo) | ` +
      `distance_tag_km: ${keepTagKm ? p.distance_tag_km + ' (behalten)' : 'nicht gesetzt → unverändert'}`);

    if (!DRY_RUN) {
      await c.query(
        `UPDATE external_routes
         SET geometry = $1::jsonb,
             geometry_version = 5,
             fetched_at = now()
         WHERE id = $2`,
        [JSON.stringify(rounded), p.id]
      );
    }
    fixed++;
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fertig: ${fixed} repariert, ${skipped} übersprungen.`);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
