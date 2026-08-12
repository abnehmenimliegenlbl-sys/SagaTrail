// GPS-Verifikation: Sagen mit "Muss GPS Verifiziert werden" prüfen.
// Claude extrahiert das konkrete benannte Objekt, Nominatim geokodiert es.
// Nur bei konkretem, plausiblem Treffer: lat/lng + koordinatenSicherheit="exakt" in der JSON.
// Resumierbar via /tmp/gps-verify-state.json (bereits geprüfte IDs werden übersprungen).
import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../src/lib/curatedSagas.json");
const STATE_PATH = "/tmp/gps-verify-state.json";
const LOG_PATH = "/tmp/gps-verify.log";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY fehlt"); process.exit(1); }

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf-8")) : { done: {} };
const log = (msg) => { const line = new Date().toISOString().slice(11, 19) + " " + msg; console.log(line); writeFileSync(LOG_PATH, line + "\n", { flag: "a" }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Konkrete Objektklassen, die als "exakt" gelten
const EXACT_CLASSES = {
  historic: null, // alle types (castle, ruins, monument, memorial, archaeological_site …)
  building: null,
  man_made: null,
  tourism: ["attraction", "viewpoint", "artwork"],
  amenity: ["place_of_worship", "monastery", "fountain"],
  natural: ["cave_entrance", "peak", "saddle", "spring", "rock", "stone", "cliff", "arch"],
  waterway: ["waterfall", "weir", "dam"],
  bridge: null,
  place: ["islet", "island"],
  leisure: ["park", "garden"],
};
function isExactHit(r) {
  const cls = r.category ?? r.class; // jsonv2 nennt das Feld "category"
  const types = EXACT_CLASSES[cls];
  if (types === undefined) return false;
  return types === null || types.includes(r.type);
}
const distKm = (a, b, c, d) => {
  const R = 6371, dLat = (c - a) * Math.PI / 180, dLng = (d - b) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function extractObject(saga) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content:
`Schweizer Saga: "${saga.title}" (Kanton ${saga.canton})
Bildmotiv: ${saga.bildmotiv ?? "-"}
Zusammenfassung: ${saga.summary?.slice(0, 800) ?? "-"}

Gibt es ein KONKRETES, heute noch existierendes und in OpenStreetMap auffindbares benanntes Objekt, an dem diese Saga spielt? (Burg, Schloss, Ruine, Kapelle, Kirche, Kloster, Brücke, Turm, Höhle, Wasserfall, Denkmal, Felsen, Berggipfel o.ä.)

Antworte NUR mit JSON:
{"objekt": "<exakter suchbarer Name, z.B. 'Schloss Hallwyl'>", "ort": "<Gemeinde/Ort>", "sicher": true/false}
oder {"objekt": null} wenn die Saga keinen konkreten heute auffindbaren Schauplatz hat.
"sicher" nur true, wenn du dir sicher bist, dass genau dieses Objekt der Schauplatz der Saga ist.` }],
    }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 150));
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { objekt: null };
}

async function geocode(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ch,li&limit=3&q=" + encodeURIComponent(query);
  const resp = await fetch(url, { headers: { "User-Agent": "SagaTrail-GPS-Verify/1.0 (admin tool)" } });
  if (!resp.ok) throw new Error("Nominatim " + resp.status);
  return resp.json();
}

function saveJson(sagas) {
  const tmp = JSON_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(sagas, null, 2), "utf-8");
  renameSync(tmp, JSON_PATH);
}
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state));

const sagas = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const pending = sagas.filter((s) => s.koordinatenSicherheit === "Muss GPS Verifiziert werden" && !state.done[s.id]);
log(`Start: ${pending.length} Sagen zu prüfen (${Object.keys(state.done).length} bereits erledigt)`);

let updated = 0, skipped = 0;
for (const saga of pending) {
  try {
    const ex = await extractObject(saga);
    if (!ex.objekt || !ex.sicher) {
      state.done[saga.id] = "kein-objekt"; saveState(); skipped++;
      log(`— ${saga.id}: kein sicheres Objekt (${ex.objekt ?? "null"})`);
      continue;
    }
    await sleep(1100);
    let hits = await geocode(`${ex.objekt}, ${ex.ort ?? saga.canton}`);
    if (!hits.length) { await sleep(1100); hits = await geocode(ex.objekt); }
    const hit = hits.find(isExactHit);
    if (!hit) {
      state.done[saga.id] = "kein-treffer"; saveState(); skipped++;
      log(`— ${saga.id}: '${ex.objekt}' kein konkreter OSM-Treffer (${hits.map((h) => (h.category ?? h.class) + "/" + h.type).join(", ") || "leer"})`);
      continue;
    }
    const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
    const d = saga.lat && saga.lng ? distKm(saga.lat, saga.lng, lat, lng) : 0;
    if (d > 30) {
      state.done[saga.id] = "zu-weit"; saveState(); skipped++;
      log(`— ${saga.id}: '${ex.objekt}' ${d.toFixed(1)}km entfernt — unplausibel, übersprungen`);
      continue;
    }
    const entry = sagas.find((s) => s.id === saga.id);
    entry.lat = Math.round(lat * 1e6) / 1e6;
    entry.lng = Math.round(lng * 1e6) / 1e6;
    entry.koordinatenSicherheit = "exakt";
    saveJson(sagas);
    state.done[saga.id] = "exakt"; saveState(); updated++;
    log(`✓ ${saga.id}: '${ex.objekt}' → ${entry.lat},${entry.lng} (${hit.class}/${hit.type}, ${d.toFixed(1)}km verschoben)`);
  } catch (err) {
    log(`! ${saga.id}: Fehler ${err.message} — wird beim nächsten Lauf erneut versucht`);
    await sleep(3000);
  }
}
log(`Fertig: ${updated} auf exakt gesetzt, ${skipped} bleiben zur manuellen Prüfung`);
