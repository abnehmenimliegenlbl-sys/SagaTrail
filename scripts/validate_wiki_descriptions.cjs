// Validiert alle Wikipedia-Beschreibungen in external_routes nachtraeglich:
// Der Artikel-Titel (aus description_source) muss substanziell zum
// Routen-Basistitel passen (gleiche Regel wie im Server). Mismatches werden
// geleert, damit ein weiterer wiki-enrich-Lauf sie korrekt neu holt.
// Aufruf: node scripts/validate_wiki_descriptions.cjs [--dry]
const { createRequire } = require("module");
const apiRequire = createRequire(require("path").resolve(__dirname, "../lib/db/package.json"));
const { Client } = apiRequire("pg");

const dry = process.argv.includes("--dry");

function wikiBasisTitel(name) {
  const m = /^(\d{1,3})\s+(.+)$/.exec(name.trim());
  if (!m) return null;
  let rest = m[2];
  rest = rest.replace(/\s+(Etappe|Étape|Etape|Tappa|Stage)\s+\d+.*$/i, "");
  const strich = rest.search(/\s[-–]\s/);
  if (strich > 0) {
    rest = rest.slice(0, strich).trim();
    const worte = rest.split(/\s+/);
    if (worte.length > 2) rest = worte.slice(0, -1).join(" ");
  }
  rest = rest.trim();
  return rest.length >= 4 ? rest : m[2].trim();
}
const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const substanziell = (s) =>
  (s.split(" ").length >= 2 && s.length >= 10) ||
  (s.split(" ").length === 1 && s.length >= 8);
const enthaeltWort = (ganz, teil) => ` ${ganz} `.includes(` ${teil} `);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(
    `SELECT id, name, description_source FROM external_routes WHERE description IS NOT NULL`
  );
  let schlecht = 0;
  for (const r of rows) {
    const titel = wikiBasisTitel(r.name);
    const artikel = decodeURIComponent((r.description_source || "").split("/wiki/")[1] || "").replace(/_/g, " ");
    if (!titel || !artikel) continue;
    const suchNorm = norm(titel);
    const titelNorm = norm(artikel);
    const passt =
      (enthaeltWort(suchNorm, titelNorm) && substanziell(titelNorm)) ||
      (enthaeltWort(titelNorm, suchNorm) && substanziell(suchNorm)) ||
      titelNorm === suchNorm;
    if (!passt) {
      schlecht++;
      console.log(`MISMATCH ${r.id} | ${r.name.slice(0, 45)} | Artikel: ${artikel}`);
      if (!dry) {
        await c.query(
          `UPDATE external_routes SET description=NULL, description_source=NULL,
             photo_url = CASE WHEN photo_attribution='Bild: Wikimedia Commons' THEN NULL ELSE photo_url END,
             photo_attribution = CASE WHEN photo_attribution='Bild: Wikimedia Commons' THEN NULL ELSE photo_attribution END
           WHERE id=$1`,
          [r.id]
        );
      }
    }
  }
  console.log(`\n${rows.length} geprueft, ${schlecht} Mismatches${dry ? " (dry-run, nichts geaendert)" : " geleert"}.`);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
