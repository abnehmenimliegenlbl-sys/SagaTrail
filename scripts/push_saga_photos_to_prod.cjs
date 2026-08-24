// Überträgt lokale, bereits geprüfte Saga-Fotos nach Production.
// Aufruf: PROD_URL=https://... node scripts/push_saga_photos_to_prod.cjs [--dry]
const path = require("path");
const { Client } = require(path.resolve(__dirname, "../lib/db/node_modules/pg"));

const PROD_URL = process.env.PROD_URL;
const TOKEN = process.env.PROD_ADMIN_TOKEN;
const DRY = process.argv.includes("--dry");

if (!DRY && (!PROD_URL || !TOKEN)) {
  console.error("PROD_URL und PROD_ADMIN_TOKEN müssen gesetzt sein (oder --dry verwenden).");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, foto_url, foto_attribution
    FROM catalog_sagas
    WHERE foto_url IS NOT NULL
    ORDER BY id
  `);
  await client.end();

  const payload = rows.map((row) => ({
    id: row.id,
    fotoUrl: row.foto_url,
    fotoAttribution: row.foto_attribution,
  }));
  console.log(`${payload.length} lokale Saga-Fotos gefunden${DRY ? " (dry-run)" : ""}`);
  if (DRY) return;

  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < payload.length; i += 100) {
    const batch = payload.slice(i, i + 100);
    const response = await fetch(`${PROD_URL.replace(/\/$/, "")}/api/admin/sagas/photos/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": TOKEN,
      },
      body: JSON.stringify(batch),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      console.error(`Batch ${i / 100 + 1} fehlgeschlagen (${response.status})`, body);
      process.exit(1);
    }
    updated += Number(body.updated || 0);
    skipped += Number(body.skipped || 0);
    console.log(`Batch ${i / 100 + 1}: ${body.updated} aktualisiert, ${body.skipped} übersprungen`);
  }
  console.log(`Fertig: ${updated} aktualisiert, ${skipped} übersprungen`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});