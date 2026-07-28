// Baut die Geometrie von SchweizMobil-Gesamtrouten aus ihren (sauberen)
// OSM-Etappen neu zusammen. Nur wenn das Ergebnis messbar besser ist als
// der bestehende Stand, wird geschrieben.
// Aufruf: node scripts/restitch_parents.cjs  (aus artifacts/api-server heraus via pnpm node)
const { createRequire } = require("module");
const apiRequire = createRequire(require("path").resolve(__dirname, "../lib/db/package.json"));
const { Client } = apiRequire("pg");

const R = 6371;
function hav(a, b) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Punkte normalisieren: {lat,lng} oder [lat,lng] -> [lat,lng]
function norm(g) {
  return g.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]));
}
function stats(pts) {
  let len = 0, maxGap = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = hav(pts[i - 1], pts[i]);
    len += d;
    if (d > maxGap) maxGap = d;
  }
  return { len, maxGap };
}
function etappenNr(name) {
  const m = name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const { rows: parents } = await c.query(
    `SELECT id, name, distance_km, geometry FROM external_routes
     WHERE id LIKE 'schweizmobil-%' AND jsonb_typeof(geometry)='array'`
  );
  const { rows: allEtappen } = await c.query(
    `SELECT id, name, distance_km, geometry FROM external_routes
     WHERE name ~* '(Etappe|Étape|Etape|Tappa|Stage)\\s+\\d+' AND jsonb_typeof(geometry)='array'`
  );

  let fixed = 0, skipped = 0, unchanged = 0;
  for (const p of parents) {
    const num = p.name.match(/^(\d+)\s/)?.[1];
    if (!num) { skipped++; continue; }
    const kids = allEtappen
      .filter((k) => new RegExp(`^${num}\\s`).test(k.name) && etappenNr(k.name) !== null)
      .map((k) => ({ ...k, nr: etappenNr(k.name) }))
      .sort((a, b) => a.nr - b.nr);
    if (kids.length < 2) { skipped++; continue; }

    // Abdeckung pruefen: Etappen-km ~ Parent-km
    const sumKm = kids.reduce((s, k) => s + (k.distance_km || 0), 0);
    if (sumKm < 0.75 * p.distance_km || sumKm > 1.35 * p.distance_km) { skipped++; continue; }

    // Etappen verketten, Orientierung per Endpunkt-Naehe
    let chain = null;
    let ok = true;
    for (const k of kids) {
      let seg = norm(k.geometry);
      if (seg.length < 2) { ok = false; break; }
      if (!chain) {
        chain = seg.slice();
        continue;
      }
      const end = chain[chain.length - 1];
      const dStart = hav(end, seg[0]);
      const dEnd = hav(end, seg[seg.length - 1]);
      if (dEnd < dStart) seg = seg.slice().reverse();
      chain = chain.concat(seg);
    }
    if (!ok || !chain) { skipped++; continue; }

    const oldS = stats(norm(p.geometry));
    const newS = stats(chain);
    const oldErr = Math.abs(oldS.len - p.distance_km);
    const newErr = Math.abs(newS.len - p.distance_km);
    // Nur schreiben, wenn deutlich besser: Max-Sprung min. 40% kleiner UND Laenge nicht schlechter
    if (newS.maxGap < 0.6 * oldS.maxGap && newErr <= oldErr) {
      await c.query(
        `UPDATE external_routes SET geometry = $1::jsonb, fetched_at = now() WHERE id = $2`,
        [JSON.stringify(chain.map(([lat, lng]) => [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6])), p.id]
      );
      console.log(`FIXED  ${p.id} | ${p.name.slice(0, 45)} | maxGap ${oldS.maxGap.toFixed(1)}->${newS.maxGap.toFixed(1)} km | len ${oldS.len.toFixed(0)}->${newS.len.toFixed(0)} (soll ${p.distance_km})`);
      fixed++;
    } else {
      unchanged++;
      if (oldS.maxGap > 3)
        console.log(`KEEP   ${p.id} | ${p.name.slice(0, 45)} | alt maxGap ${oldS.maxGap.toFixed(1)} km, neu ${newS.maxGap.toFixed(1)} km (nicht besser)`);
    }
  }
  console.log(`\nFertig: ${fixed} repariert, ${unchanged} unveraendert, ${skipped} ohne passende Etappen.`);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
