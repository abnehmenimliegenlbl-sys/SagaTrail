#!/usr/bin/env node
// Einmaliges Sync-Script: Dev external_routes → Prod API
// Usage: node scripts/sync-routes-to-prod.mjs
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PROD_API = "https://api.sagatrail.ch/api/admin/routes/bulk-insert";
const BATCH = 100;

if (!DB_URL) { console.error("DATABASE_URL fehlt"); process.exit(1); }
if (!ADMIN_TOKEN) { console.error("ADMIN_TOKEN fehlt"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

const { rows: [{ n }] } = await client.query("SELECT COUNT(*)::int as n FROM external_routes");
console.log(`Dev-Routen total: ${n}`);

let inserted = 0;
let errors = 0;

for (let offset = 0; offset < n; offset += BATCH) {
  const { rows } = await client.query(
    `SELECT id, saga_id, canton, cantons, name, ref,
            distance_km, distance_tag_km, ascent_m, max_elevation_m, minutes,
            sac, terrain, lat, lng, geometry, geometry_version,
            source, featured, photo_url, photo_attribution,
            route_type, is_etappe, description, description_source
     FROM external_routes
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [BATCH, offset]
  );

  const resp = await fetch(PROD_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
    },
    body: JSON.stringify(rows),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Batch ${offset}–${offset + rows.length} FEHLER ${resp.status}: ${text.slice(0, 200)}`);
    errors++;
  } else {
    const json = await resp.json();
    inserted += json.inserted ?? rows.length;
    process.stdout.write(`\r${inserted}/${n} eingespielt...`);
  }
}

await client.end();
console.log(`\nFertig: ${inserted} Routen eingespielt, ${errors} Fehler`);
