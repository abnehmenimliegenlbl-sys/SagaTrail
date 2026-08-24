#!/usr/bin/env node
/**
 * Importiert die regionale SchweizMobil-Route 28:
 * Freiburger Saane-Weg, Rossens – Fribourg – Düdingen.
 *
 * Die Geometrie kommt vom öffentlich angebotenen Saane-Trails-GPX von
 * Freiburg Tourismus. Die offiziellen SchweizMobil-Distanzen und
 * Höhenmeter werden als route metadata übernommen.
 *
 * Nur Entwicklungsdaten werden verändert. Kein Prod-Push.
 */

const { execFileSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DB = process.env.DATABASE_URL;
const GPX_URL = "https://fribourg.ch/en/wp-json/UFT/v1/gpx/413782";
const PARENT_ID = "schweizmobil-rwn-28";
const STAGE_1_ID = "schweizmobil-rwn-28-etappe-1";
const STAGE_2_ID = "schweizmobil-rwn-28-etappe-2";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "SagaTrail/1.0" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`GPX HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function parseGpx(xml) {
  const points = [];
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  let match;
  while ((match = re.exec(xml))) {
    points.push([Number(match[1]), Number(match[2])]);
  }
  if (points.length < 3) throw new Error("GPX enthält zu wenige Trackpunkte");
  return points;
}

function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestPointIndex(points, target) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const distance = haversineKm(points[i], target);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

function pathKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function runSql(sql) {
  const file = path.join(os.tmpdir(), `route28-${process.pid}.sql`);
  fs.writeFileSync(file, sql);
  try {
    return execFileSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-f", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

async function main() {
  if (!DB) throw new Error("DATABASE_URL fehlt");
  const points = parseGpx(await fetchText(GPX_URL));
  // Fribourg/Les Charmettes liegt am offiziellen Etappenwechsel.
  const split = nearestPointIndex(points, [46.806, 7.161]);
  const stage1 = points.slice(0, split + 1);
  const stage2 = points.slice(split);
  if (stage1.length < 2 || stage2.length < 2) throw new Error("Etappen-Split ungültig");

  const parentGeometry = points;
  const parentKm = pathKm(parentGeometry);
  console.log(`GPX: ${points.length} Punkte, ${parentKm.toFixed(1)} km`);
  console.log(`Split: ${stage1.length}/${stage2.length} Punkte`);

  const rows = [
    {
      id: PARENT_ID,
      sagaId: PARENT_ID,
      canton: "Freiburg",
      name: "28 Freiburger Saane-Weg Rossens - Fribourg - Düdingen, Staumauer/Camping",
      ref: "28",
      distanceKm: 39,
      ascentM: 1040,
      minutes: 635,
      geometry: parentGeometry,
      isEtappe: false,
    },
    {
      id: STAGE_1_ID,
      sagaId: PARENT_ID,
      canton: "Freiburg",
      name: "28 Freiburger Saane-Weg Etappe 1 Rossens - Fribourg",
      ref: "28",
      distanceKm: 17,
      ascentM: 480,
      minutes: 285,
      geometry: stage1,
      isEtappe: true,
    },
    {
      id: STAGE_2_ID,
      sagaId: PARENT_ID,
      canton: "Freiburg",
      name: "28 Freiburger Saane-Weg Etappe 2 Fribourg - Düdingen, Staumauer/Camping",
      ref: "28",
      distanceKm: 21,
      ascentM: 560,
      minutes: 350,
      geometry: stage2,
      isEtappe: true,
    },
  ];

  const values = rows.map((r) => `(
    ${sqlString(r.id)}, ${sqlString(r.sagaId)}, ${sqlString(r.canton)},
    ${sqlString(r.name)}, ${sqlString(r.ref)}, ${r.distanceKm}, ${r.ascentM}, 0,
    ${r.minutes}, 'T1', 'Wanderweg',
    ${r.geometry[0][0]}, ${r.geometry[0][1]}, ${sqlJson(r.geometry)}, 1,
    ${sqlString("Freiburg Tourismus · SchweizMobil Route 28")}, false, NOW(),
    NULL, NULL, ARRAY[]::text[], NULL, NULL, ${r.distanceKm},
    'rwn', ${r.isEtappe}
  )`).join(",\n");

  runSql(`
    INSERT INTO external_routes
      (id, saga_id, canton, name, ref, distance_km, ascent_m, max_elevation_m,
       minutes, sac, terrain, lat, lng, geometry, geometry_version, source,
       featured, fetched_at, photo_url, photo_attribution, cantons,
       description, description_source, distance_tag_km, route_type, is_etappe)
    VALUES ${values}
    ON CONFLICT (id) DO UPDATE SET
      saga_id = EXCLUDED.saga_id,
      canton = EXCLUDED.canton,
      name = EXCLUDED.name,
      ref = EXCLUDED.ref,
      distance_km = EXCLUDED.distance_km,
      ascent_m = EXCLUDED.ascent_m,
      minutes = EXCLUDED.minutes,
      geometry = EXCLUDED.geometry,
      geometry_version = EXCLUDED.geometry_version,
      source = EXCLUDED.source,
      distance_tag_km = EXCLUDED.distance_tag_km,
      route_type = EXCLUDED.route_type,
      is_etappe = EXCLUDED.is_etappe,
      fetched_at = NOW();

    SELECT id, name, distance_km, ascent_m, jsonb_array_length(geometry) AS points
    FROM external_routes
    WHERE id IN (${rows.map((r) => sqlString(r.id)).join(", ")})
    ORDER BY id;
  `);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});