/**
 * GPS-Präzisierung: Alle Sagen mit koordinatenSicherheit="exakt" via Claude+Nominatim
 * auf den genauen OSM-Mittelpunkt setzen.
 * Resumierbar via /tmp/gps-refine-state.json.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../src/lib/curatedSagas.json");
const STATE_PATH = "/tmp/gps-refine-state.json";
const LOG_PATH = "/tmp/gps-refine.log";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY fehlt"); process.exit(1); }

const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, "utf-8"))
  : { done: {} };

const log = (msg) => {
  const line = new Date().toISOString().slice(11, 19) + " " + msg;
  console.log(line);
  writeFileSync(LOG_PATH, line + "\n", { flag: "a" });
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXACT_CLASSES = {
  historic: null,
  building: null,
  man_made: null,
  tourism: ["attraction", "viewpoint", "artwork", "alpine_hut", "chalet", "wilderness_hut"],
  amenity: ["place_of_worship", "monastery", "fountain", "townhall", "theatre"],
  natural: ["cave_entrance", "peak", "saddle", "spring", "rock", "stone", "cliff", "arch",
            "water", "glacier", "gorge", "valley", "wood"],
  waterway: ["waterfall", "weir", "dam", "river", "stream", "lake"],
  water: null,        // Seen, Weiher, Teiche
  bridge: null,
  place: ["islet", "island", "locality"],
  leisure: ["park", "garden", "nature_reserve"],
  landuse: ["meadow", "grass"],
  boundary: ["protected_area"],
};
function isExactHit(r) {
  const cls = r.category ?? r.class;
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
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Schweizer Sage: "${saga.title}" (Kanton ${saga.canton})
Bildmotiv: ${saga.bildmotiv ?? "-"}
Zusammenfassung: ${saga.summary?.slice(0, 600) ?? "-"}

Gibt es ein KONKRETES, heute noch existierendes und in OpenStreetMap auffindbares benanntes Objekt, an dem diese Saga spielt? (Burg, Schloss, Ruine, Kapelle, Kirche, Kloster, Brücke, Turm, Höhle, Wasserfall, Denkmal, Felsen, Berggipfel o.ä.)

Antworte NUR mit JSON:
{"objekt": "<exakter suchbarer Name, z.B. 'Schloss Hallwyl'>", "ort": "<Gemeinde/Ort>", "sicher": true/false}
oder {"objekt": null} wenn kein konkretes Objekt auffindbar.
"sicher" nur true wenn du sicher bist dass genau dieses Objekt der Schauplatz ist.`,
      }],
    }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 150));
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { objekt: null };
}

async function geocode(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ch,li&limit=5&q="
    + encodeURIComponent(query);
  const resp = await fetch(url, { headers: { "User-Agent": "SagaTrail-GPS-Refine/1.0" } });
  if (!resp.ok) throw new Error("Nominatim " + resp.status);
  return resp.json();
}

function saveJson(sagas) {
  const tmp = JSON_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(sagas, null, 2), "utf-8");
  renameSync(tmp, JSON_PATH);
}

async function main() {
  const sagas = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  const targets = sagas.filter((s) => s.koordinatenSicherheit === "exakt");
  log(`Starte GPS-Präzisierung: ${targets.length} exakt-Sagen`);

  let updated = 0;
  let noHit = 0;
  let skipped = 0;

  for (const saga of targets) {
    if (state.done[saga.id]) { skipped++; continue; }

    log(`[${saga.id}] "${saga.title}"`);
    try {
      const obj = await extractObject(saga);
      await sleep(1200); // Anthropic rate-limit

      if (!obj.objekt || !obj.sicher) {
        log(`  → kein konkretes Objekt erkannt`);
        state.done[saga.id] = "no-object";
        noHit++;
        writeFileSync(STATE_PATH, JSON.stringify(state));
        continue;
      }

      log(`  → suche "${obj.objekt}" bei ${obj.ort ?? "?"}`);
      const query = obj.ort ? `${obj.objekt}, ${obj.ort}, Schweiz` : `${obj.objekt}, Schweiz`;
      const results = await geocode(query);
      await sleep(1200); // Nominatim 1req/s

      const hit = results.find((r) => isExactHit(r));
      if (!hit) {
        log(`  → kein OSM-Treffer (${results.length} Ergebnisse, keine passende Klasse)`);
        state.done[saga.id] = "no-osm";
        noHit++;
        writeFileSync(STATE_PATH, JSON.stringify(state));
        continue;
      }

      const newLat = parseFloat(hit.lat);
      const newLng = parseFloat(hit.lon);
      const dist = distKm(saga.lat, saga.lng, newLat, newLng);

      if (dist > 10) {
        log(`  → OSM-Treffer zu weit weg (${dist.toFixed(1)} km) – übersprungen`);
        state.done[saga.id] = "too-far";
        noHit++;
        writeFileSync(STATE_PATH, JSON.stringify(state));
        continue;
      }

      // Koordinaten aktualisieren
      const idx = sagas.findIndex((s) => s.id === saga.id);
      if (idx !== -1) {
        const oldLat = sagas[idx].lat;
        const oldLng = sagas[idx].lng;
        sagas[idx].lat = newLat;
        sagas[idx].lng = newLng;
        log(`  ✓ ${oldLat}, ${oldLng} → ${newLat}, ${newLng} (${(dist * 1000).toFixed(0)} m Δ) via ${hit.display_name.slice(0, 60)}`);
        saveJson(sagas);
        updated++;
      }

      state.done[saga.id] = `updated:${newLat},${newLng}`;
      writeFileSync(STATE_PATH, JSON.stringify(state));

    } catch (e) {
      log(`  ✗ Fehler: ${e.message}`);
      await sleep(3000);
    }
  }

  log(`\nFertig: ${updated} aktualisiert, ${noHit} kein Treffer, ${skipped} bereits erledigt`);
}

main().catch((e) => { console.error(e); process.exit(1); });
