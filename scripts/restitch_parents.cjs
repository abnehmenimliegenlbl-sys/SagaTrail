// Baut die Geometrie von SchweizMobil-Gesamtrouten aus ihren (sauberen)
// OSM-Etappen neu zusammen. Nur wenn das Ergebnis messbar besser ist als
// der bestehende Stand, wird geschrieben.
// Aufruf: node scripts/restitch_parents.cjs  (aus dem Workspace-Root)
//
// Fixes ggü. v1:
//   - Beide Geometrie-Formate werden gelesen: jsonb_typeof='array' UND 'string'
//     (pg-Treiber liefert JSONB-Strings als JS-String -> JSON.parse nötig)
//   - Coverage-Check: kein festes Obergrenzen-Verhältnis mehr; parent.distance_km
//     kann falsch sein (z.B. 41 statt 661 km). Untergrenze bleibt (60%), aber
//     wenn sumKm > parent_km gilt parent als veraltet und sumKm als Referenz.

const { createRequire } = require("module");
const path = require("path");
// pg über lib/db laden (dort ist pg als Dependency verfügbar)
const dbRequire = createRequire(path.resolve(__dirname, "../lib/db/package.json"));
const { Client } = dbRequire("pg");

const R = 6371;
function hav(a, b) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Geometrie parsen: JSONB-Array (bereits Array) oder JSONB-String (JSON.parse nötig) */
function parseGeom(raw) {
  if (!raw) return null;
  let g = raw;
  if (typeof g === "string") {
    try { g = JSON.parse(g); } catch { return null; }
  }
  if (!Array.isArray(g) || g.length < 2) return null;
  return g;
}

/** Punkte normalisieren: {lat,lng} oder [lat,lng] -> [lat,lng] */
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

  // Beide Geometrie-Typen ('array' und 'string') laden
  const { rows: parents } = await c.query(
    `SELECT id, name, distance_km, geometry FROM external_routes
     WHERE id LIKE 'schweizmobil-%'
       AND geometry IS NOT NULL
       AND jsonb_typeof(geometry) IN ('array', 'string')`
  );
  const { rows: allEtappen } = await c.query(
    `SELECT id, name, distance_km, geometry FROM external_routes
     WHERE name ~* '(Etappe|Étape|Etape|Tappa|Stage)\\s+\\d+'
       AND geometry IS NOT NULL
       AND jsonb_typeof(geometry) IN ('array', 'string')
       -- Keine schweizmobil-* Parent-Routen als Etappen behandeln
       -- (passiert wenn ihr Name fehlerhaft "Etappe X" enthält)
       AND id NOT LIKE 'schweizmobil-%'
       -- Keine wiki-* Routen mit nur 2 Punkten (Gerade Linie) — würde
       -- schlechte Geometrie einfrieren (#72)
       AND NOT (id LIKE 'wiki-%' AND jsonb_array_length(geometry) <= 2)`
  );

  console.log(`Parents geladen: ${parents.length}, Etappen geladen: ${allEtappen.length}`);

  let fixed = 0, skipped = 0, unchanged = 0;
  for (const p of parents) {
    const num = p.name.match(/^(\d+)\s/)?.[1];
    if (!num) { skipped++; continue; }

    const kids = allEtappen
      .filter((k) => new RegExp(`^${num}\\s`).test(k.name) && etappenNr(k.name) !== null)
      .map((k) => ({ ...k, nr: etappenNr(k.name) }))
      .sort((a, b) => a.nr - b.nr);
    if (kids.length < 2) { skipped++; continue; }

    // Etappen-Geometrien parsen — Kinder ohne gültige Geometrie überspringen
    const parsedKids = kids
      .map((k) => {
        const g = parseGeom(k.geometry);
        return g ? { ...k, parsedGeom: g } : null;
      })
      .filter(Boolean);
    if (parsedKids.length < 2) { skipped++; continue; }

    // Abdeckung prüfen:
    // Wenn parent.distance_km fehlt oder sumKm deutlich größer ist (parent-Wert veraltet),
    // verwenden wir sumKm als Referenz (kein harter Abbruch nach oben).
    const sumKm = parsedKids.reduce((s, k) => s + (k.distance_km || 0), 0);
    const parentKm = p.distance_km || 0;
    const refKm = parentKm > 0 && parentKm >= sumKm * 0.4 ? parentKm : sumKm;
    // Untergrenze: Etappen müssen mindestens 55% der Referenz abdecken
    if (sumKm < 0.55 * refKm) { skipped++; continue; }

    // Parent-Geometrie parsen (für Vergleich)
    const parentGeom = parseGeom(p.geometry);
    if (!parentGeom) { skipped++; continue; }

    // Etappen verketten, Orientierung per Endpunkt-Nähe
    let chain = null;
    let ok = true;
    for (const k of parsedKids) {
      let seg = norm(k.parsedGeom);
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
    if (!ok || !chain || chain.length < 2) { skipped++; continue; }

    const oldS = stats(norm(parentGeom));
    const newS = stats(chain);
    // Verbesserungskriterien: Max-Sprung min. 40% kleiner UND Länge nicht deutlich schlechter
    const oldErr = Math.abs(oldS.len - refKm);
    const newErr = Math.abs(newS.len - refKm);
    if (newS.maxGap < 0.6 * oldS.maxGap && newErr <= oldErr * 1.3) {
      await c.query(
        `UPDATE external_routes SET geometry = $1::jsonb, fetched_at = now() WHERE id = $2`,
        [
          JSON.stringify(
            chain.map(([lat, lng]) => [
              Math.round(lat * 1e6) / 1e6,
              Math.round(lng * 1e6) / 1e6,
            ])
          ),
          p.id,
        ]
      );
      console.log(
        `FIXED  ${p.id.slice(0, 30).padEnd(30)} | ${p.name.slice(0, 40).padEnd(40)} | maxGap ${oldS.maxGap.toFixed(1)}->${newS.maxGap.toFixed(1)} km | len ${oldS.len.toFixed(0)}->${newS.len.toFixed(0)} (ref ${refKm})`
      );
      fixed++;
    } else {
      unchanged++;
      if (oldS.maxGap > 3)
        console.log(
          `KEEP   ${p.id.slice(0, 30).padEnd(30)} | ${p.name.slice(0, 40).padEnd(40)} | alt maxGap ${oldS.maxGap.toFixed(1)} km, neu ${newS.maxGap.toFixed(1)} km (nicht besser)`
        );
    }
  }
  console.log(
    `\nFertig: ${fixed} repariert, ${unchanged} unveraendert, ${skipped} ohne passende Etappen.`
  );
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
