#!/usr/bin/env node
/**
 * Baut Route 4a Via Jacobi (Kreuzlingen – St. Meinrad) auf:
 * 1. Geometrien aller 15 Etappen zusammennähen
 * 2. Parent-Eintrag schweizmobil-nwn-4a anlegen
 * 3. saga_id aller 15 Etappen auf schweizmobil-nwn-4a setzen
 * 4. Etappen aktivieren (is_etappe=true)
 * 5. Auf Prod pushen
 */

const { execSync } = require('child_process');
const https = require('https');

const DB = process.env.DATABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PROD_URL = 'https://saga-trail.replit.app';

const STAGE_IDS = [
  'osm-11066545',  // E21 Kreuzlingen - Märstetten
  'osm-11066998',  // E22 Märstetten - Fischingen
  'osm-11068098',  // E23 Fischingen - Rapperswil
  'wiki-4-etappe-24', // E24 Rapperswil – Luzern
  'osm-11068585',  // E25 Luzern - Werthenstein
  'osm-11069480',  // E26 Werthenstein - Willisau
  'osm-11070133',  // E27 Willisau - Huttwil
  'osm-11070361',  // E28 Huttwil - Burgdorf
  'osm-11071257',  // E29 Burgdorf - Bern
  'osm-11071461',  // E30 Bern - Rüeggisberg
  'wiki-4-etappe-31', // E31 Rüeggisberg – Payerne
  'osm-11073284',  // E32 Fribourg - Payerne
  'osm-6090276',   // E33 Payerne - Moudon
  'osm-11064054',  // E34 Wattwil - Siebnen
  'osm-11064251',  // E35 Siebnen - Einsiedeln (St. Meinrad)
];

function psql(query) {
  return execSync(`psql "${DB}" -t -A -c "${query.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

function psqlFile(file) {
  return execSync(`psql "${DB}" -t -A -f ${file}`, { encoding: 'utf8' }).trim();
}

function haversine(a, b) {
  const R = 6371, dLat = (b[0]-a[0]) * Math.PI/180, dLng = (b[1]-a[1]) * Math.PI/180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function bridge(from, to, n) {
  const pts = [];
  for (let i = 1; i <= n; i++) pts.push([from[0]+(to[0]-from[0])*i/n, from[1]+(to[1]-from[1])*i/n]);
  return pts;
}

async function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'saga-trail.replit.app',
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let text = '';
      res.on('data', d => text += d);
      res.on('end', () => resolve({ status: res.statusCode, body: text }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Fetch all stage geometries
  console.log('Loading stage geometries...');
  const idList = STAGE_IDS.map(id => `'${id}'`).join(',');
  const rows = psql(`
    SELECT id,
      CASE WHEN jsonb_typeof(geometry) = 'array' THEN geometry
           ELSE (geometry#>>'{}')::jsonb END as geom
    FROM external_routes
    WHERE id IN (${idList})
  `);

  const geomMap = {};
  for (const row of rows.split('\n')) {
    if (!row.trim()) continue;
    const pipeIdx = row.indexOf('|');
    const id = row.slice(0, pipeIdx);
    const geomStr = row.slice(pipeIdx + 1);
    if (!geomStr || geomStr === '' || geomStr === 'null') {
      console.warn(`  ${id}: no geometry`);
      continue;
    }
    try {
      geomMap[id] = JSON.parse(geomStr);
      console.log(`  ${id}: ${geomMap[id].length} pts`);
    } catch(e) {
      console.error(`  ${id}: parse error: ${e.message}`);
    }
  }

  // 2. Stitch in stage order with bridges
  console.log('\nStitching...');
  const allPts = [];
  for (let i = 0; i < STAGE_IDS.length; i++) {
    const id = STAGE_IDS[i];
    const pts = geomMap[id];
    if (!pts || pts.length === 0) { console.warn(`  Skipping ${id} (no geometry)`); continue; }

    if (allPts.length > 0) {
      const prev = allPts[allPts.length - 1];
      const gap = haversine(prev, pts[0]);
      if (gap > 0.05) {
        const n = Math.max(3, Math.round(gap * 2));
        allPts.push(...bridge(prev, pts[0], n));
        console.log(`  E${i+21}: bridged ${gap.toFixed(2)} km`);
      }
    }
    allPts.push(...pts);
  }

  let totalKm = 0;
  for (let i = 1; i < allPts.length; i++) totalKm += haversine(allPts[i-1], allPts[i]);
  console.log(`\nTotal: ${allPts.length} pts, ${totalKm.toFixed(1)} km`);

  const geomJson = JSON.stringify(allPts);
  const distTagKm = Math.round(totalKm);

  // Sum ascent_m from all stages
  const ascentRow = psql(`
    SELECT COALESCE(SUM(ascent_m), 0)::int FROM external_routes
    WHERE id IN (${idList})
  `);
  const totalAscentM = parseInt(ascentRow) || 0;
  console.log(`Total ascent: ${totalAscentM} m`);

  // 3. Insert/update parent route — clone Route 4 parent, override key fields
  console.log('\nCreating parent route schweizmobil-nwn-4a...');
  const escapedGeom = geomJson.replace(/'/g, "''");
  // Use explicit column list matching the schema
  psql(`
    INSERT INTO external_routes
      (id, saga_id, canton, name, ref, distance_km, ascent_m, max_elevation_m,
       minutes, sac, terrain, lat, lng, geometry, geometry_version, source,
       featured, fetched_at, photo_url, photo_attribution, cantons,
       description, description_source, distance_tag_km, route_type, is_etappe)
    SELECT
      'schweizmobil-nwn-4a',
      'schweizmobil-nwn-4a',
      'Thurgau',
      '4a Via Jacobi Kreuzlingen - Einsiedeln (St. Meinrad)',
      '4a',
      ${Math.round(totalKm)},
      ${totalAscentM},
      0,
      minutes, sac, terrain, lat, lng,
      '${escapedGeom}'::jsonb,
      1,
      'wiki',
      false, NOW(), NULL, NULL, ARRAY[]::text[],
      NULL, NULL,
      ${distTagKm},
      'nwn',
      false
    FROM external_routes WHERE id = 'osm-2927471'
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      distance_km = EXCLUDED.distance_km,
      distance_tag_km = EXCLUDED.distance_tag_km,
      ascent_m = EXCLUDED.ascent_m,
      geometry = EXCLUDED.geometry
  `);

  // 4. Update all 15 stages: set saga_id + activate
  console.log('Activating stages and setting saga_id...');
  psql(`
    UPDATE external_routes
    SET saga_id = 'schweizmobil-nwn-4a', is_etappe = true
    WHERE id IN (${idList})
  `);

  // Verify
  const count = psql(`SELECT COUNT(*) FROM external_routes WHERE saga_id = 'schweizmobil-nwn-4a' AND is_etappe = true`);
  console.log(`Active stages with new saga_id: ${count}`);

  // 5. Push to prod
  console.log('\nFetching rows for prod push...');
  const payload = JSON.parse(execSync(`psql "${DB}" -t -A -c "
    SELECT json_agg(r) FROM (
      SELECT id, saga_id, canton, name, ref,
             distance_km::float, ascent_m::float, max_elevation_m::float, minutes::float,
             sac, terrain, lat::float, lng::float, geometry, geometry_version,
             source, featured, photo_url, photo_attribution, cantons, description,
             description_source, distance_tag_km::float, route_type, is_etappe
      FROM external_routes
      WHERE id IN ('schweizmobil-nwn-4a',${idList})
    ) r
  "`, { encoding: 'utf8' }).trim());

  console.log(`Pushing ${payload.length} rows to prod...`);
  const res = await postJson('/api/admin/routes/bulk-insert?upsert=true', payload);
  console.log(`Prod response: ${res.status} ${res.body}`);
}

main().catch(e => { console.error(e); process.exit(1); });
