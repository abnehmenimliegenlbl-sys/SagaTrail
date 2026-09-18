// Überträgt fertig angereicherte Routen aus der Dev-DB zum Prod-Server
// (POST /api/admin/routes/import, batches à 100).
// Aufruf: PROD_URL=https://... PROD_ADMIN_TOKEN=... node scripts/push_routes_to_prod.cjs [--dry]
const { Client } = require(require("path").resolve(__dirname, "../lib/db/node_modules/pg"));
const { mapRouteRow } = require("./route_sync_mapping.cjs");

const PROD_URL = process.env.PROD_URL;
const TOKEN = process.env.PROD_ADMIN_TOKEN;
const DRY = process.argv.includes("--dry");
if (!DRY && (!PROD_URL || !TOKEN)) {
  console.error("PROD_URL und PROD_ADMIN_TOKEN als Env-Variablen setzen (oder --dry).");
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Nur fertig angereicherte Routen übertragen
  const { rows } = await c.query(
    `SELECT id, saga_id, canton, cantons, name, ref, distance_km, distance_tag_km, ascent_m,
             max_elevation_m, minutes, sac, sac_source, schweizmobil_condition,
             schweizmobil_technique, terrain, family_friendly, child_friendly,
             dogs_allowed, wheelchair_accessible, wheelchair_accessible_source,
             wheelchair_accessible_checked_at, technical_difficulty, lat, lng, geometry,
            geometry_version, source, featured, photo_url, photo_attribution,
             route_type, is_etappe, description, description_source
     FROM external_routes WHERE geometry_version > 0 ORDER BY id`,
  );
  await c.end();
  console.log(`${rows.length} angereicherte Routen exportiert${DRY ? " (dry-run, kein Upload)" : ""}`);
  if (DRY) return;

  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100).map(mapRouteRow);
    const res = await fetch(`${PROD_URL.replace(/\/$/, "")}/api/admin/routes/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": TOKEN },
      body: JSON.stringify({ rows: batch }),
    });
    if (!res.ok) {
      console.error(`Batch ${i / 100 + 1} FEHLER ${res.status}: ${(await res.text()).slice(0, 200)}`);
      process.exit(1);
    }
    done += batch.length;
    process.stdout.write(`\r${done}/${rows.length} übertragen`);
  }
  console.log("\nFertig ✔");
})().catch((e) => { console.error(e.message); process.exit(1); });
