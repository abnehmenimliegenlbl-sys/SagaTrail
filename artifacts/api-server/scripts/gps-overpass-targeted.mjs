/**
 * Gezielte Overpass-Abfragen für die verbliebenen "exakt"-Sagen
 * + Herabstufen auf "Ort identifiziert" für abstrakte Sagen ohne festen POI.
 */
import { readFileSync, writeFileSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../src/lib/curatedSagas.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── 1. Abstrakte Sagen: von "exakt" auf "Ort identifiziert" herabstufen ───
const DOWNGRADE = [
  "das-huhn-von-st-alban",                    // St. Alban-Tal allgemein
  "der-teufel-vom-gotthardpass",              // Der Pass selbst, kein konkretes Bauwerk
  "der-knabe-erz-hlt-s-dem-ofen-luze",       // Schwibbogen-Viertel, nicht exakt
  "die-rose-von-mariastein-eine-weihnachtliche-legende-solo", // Kloster-Gelände allgemein
  "der-kaiser-und-die-schlange-zuer",         // Zürich allgemein
  "das-goldene-tor-zuer",                     // Kloten-Umgebung, nicht lokalisierbar
  "der-ritter-von-lasarraz-neuen",            // Burg existiert, aber vom User bereits manuell gesetzt
];

// ─── 2. Gezielte Overpass-Abfragen ───────────────────────────────────────
// Format: [sagaId, overpassQuery, maxDistKm]
const OVERPASS_TARGETS = [
  // Appenzell / Ostschweiz
  ["der-teufel-auf-dem-sitz-schwellbrunn",
   `[out:json][timeout:10];(node["name"~"Sitz",i]["natural"~"peak|saddle"](47.2,9.1,47.5,9.4);way["name"~"Sitz",i]["natural"~"peak|saddle"](47.2,9.1,47.5,9.4););out center;`, 5],

  // Basel
  ["der-basilisk-im-gerberbrunn",
   `[out:json][timeout:10];(node["name"~"Gerberbrunn|Gerberbrunnen"](47.50,7.55,47.60,7.65););out center;`, 3],
  ["das-gespenst-im-basler-rathaus",
   `[out:json][timeout:10];(node["amenity"="townhall"]["name"~"Rathaus"](47.54,7.55,47.58,7.62);way["amenity"="townhall"]["name"~"Rathaus"](47.54,7.55,47.58,7.62););out center;`, 2],

  // Freiburg / Schwarzsee
  ["das-gespenst-im-totenried-von-duedingen",
   `[out:json][timeout:10];(node["name"~"Totenried"](46.8,7.1,47.0,7.4);way["name"~"Totenried"](46.8,7.1,47.0,7.4););out center;`, 5],

  // Salève (Frankreich — kein CH-Filter)
  ["die-riesen-vom-saleve",
   `[out:json][timeout:10];(relation["name"~"Salève|Saleve"](46.0,6.0,46.3,6.3);way["name"~"Salève|Saleve"]["natural"="ridge"](46.0,6.0,46.3,6.3););out center;`, 20],

  // Genfer See
  ["das-geheimnis-der-steine-von-niton",
   `[out:json][timeout:10];(node["name"~"Niton|Pierre.*Niton"](46.1,6.0,46.3,6.3);way["name"~"Niton|Pierre.*Niton"](46.1,6.0,46.3,6.3););out center;`, 5],

  // Martinsloch (Glarus)
  ["das-martinsloch-und-der-kampf-um-die-grenze-elm",
   `[out:json][timeout:10];(node["name"~"Martinsloch"](46.9,9.0,47.1,9.3);way["name"~"Martinsloch"](46.9,9.0,47.1,9.3););out center;`, 5],

  // Brünigpass
  ["das-maennlein-vom-bruenig",
   `[out:json][timeout:10];(node["name"~"Brünig|Brunig"]["natural"~"saddle|pass"](46.7,7.9,46.9,8.2);way["name"~"Brünig|Brunig"]["natural"~"saddle|pass"](46.7,7.9,46.9,8.2););out center;`, 5],

  // Pont du Diable, Saint-Ursanne (Jura)
  ["der-teufel-an-der-bruecke-saint-ursanne",
   `[out:json][timeout:10];(way["bridge"="yes"]["name"~"Diable|Saint-Ursanne"](47.3,7.1,47.4,7.2);way["man_made"="bridge"]["name"~"Diable"](47.3,7.1,47.4,7.2);node["name"~"Pont.*Diable"](47.3,7.1,47.4,7.2););out center;`, 3],

  // Grotte Milandre (Bonfol, Jura)
  ["die-fee-der-grotte-von-milandre-bonfol",
   `[out:json][timeout:10];(node["name"~"Milandre"](47.4,7.1,47.6,7.4);way["name"~"Milandre"](47.4,7.1,47.6,7.4););out center;`, 5],

  // Schloss Rosenburg, Stans (NW)
  ["die-weisse-frau-von-schloss-rosenburg-stans",
   `[out:json][timeout:10];(node["name"~"Rosenburg"]["historic"](46.9,8.3,47.1,8.5);way["name"~"Rosenburg"]["historic"](46.9,8.3,47.1,8.5););out center;`, 5],

  // Monte Generoso (TI/IT-Grenze)
  ["der-riese-vom-monte-generoso",
   `[out:json][timeout:10];(node["name"~"Monte Generoso"]["natural"="peak"](45.8,8.9,46.0,9.1););out center;`, 5],

  // Lac de Joux
  ["das-ungeheuer-vom-lac-de-joux",
   `[out:json][timeout:10];(relation["name"~"Lac de Joux"]["natural"="water"](46.5,6.2,46.7,6.4);way["name"~"Lac de Joux"]["natural"="water"](46.5,6.2,46.7,6.4););out center;`, 5],

  // Heilige Verena (Verenaschlucht, Solothurn)
  ["die-legende-der-heiligen-verena",
   `[out:json][timeout:10];(node["name"~"Verena"]["tourism"~"attraction|viewpoint"](47.2,7.4,47.3,7.6);way["name"~"Verena"]["natural"="gorge"](47.2,7.4,47.3,7.6);node["name"~"Verenaschlucht"](47.2,7.4,47.3,7.6););out center;`, 5],

  // Balmfluh (SO/JU)
  ["der-balmrys-der-riese-von-balm",
   `[out:json][timeout:10];(node["name"~"Balmfluh|Balm"](47.2,7.4,47.4,7.8);way["name"~"Balmfluh|Balm"]["natural"](47.2,7.4,47.4,7.8););out center;`, 5],

  // Diessenhofen (TG)
  ["die-totenprozession-von-diessenhofen",
   `[out:json][timeout:10];(way["name"~"Rheintor|Untertor"]["historic"](47.6,8.6,47.8,8.8);node["name"~"Rheintor"]["historic"](47.6,8.6,47.8,8.8););out center;`, 5],

  // Ruine Alt-Falkenstein (SO)
  ["das-goldene-kegelspiel-auf-der-ruine-alt-falkenstein",
   `[out:json][timeout:10];(node["name"~"Alt-Falkenstein|Falkenstein"]["historic"](47.3,7.7,47.5,7.9);way["name"~"Alt-Falkenstein|Falkenstein"]["historic"](47.3,7.7,47.5,7.9););out center;`, 5],

  // Turmhof Steckborn (TG)
  ["das-gespenst-von-schloss-steckborn-turmhof",
   `[out:json][timeout:10];(node["name"~"Turmhof|Steckborn"]["historic"](47.6,8.9,47.8,9.0);way["name"~"Turmhof|Steckborn"]["historic"](47.6,8.9,47.8,9.0););out center;`, 3],

  // Schleifenberg / Hexenturm Liestal
  ["das-hexen-kaethi-vom-schleifenberg-liestal",
   `[out:json][timeout:10];(node["name"~"Hexenturm|Schleifenberg"](47.4,7.7,47.6,7.9);way["name"~"Hexenturm|Schleifenberg"](47.4,7.7,47.6,7.9););out center;`, 5],

  // Kloster Rheinau (SH)
  ["die-gr-ndung-des-klosters-rheinau-scha",
   `[out:json][timeout:10];(node["name"~"Kloster Rheinau"](47.6,8.5,47.8,8.7);way["name"~"Kloster Rheinau"](47.6,8.5,47.8,8.7);relation["name"~"Kloster Rheinau"](47.6,8.5,47.8,8.7););out center;`, 3],

  // Abtei St. Gallen (Stadt, nicht 36km entfernt)
  ["die-st-galler-m-nche-erbeten-wein-st_g",
   `[out:json][timeout:10];(way["name"~"Kathedrale|Stiftskirche|Stiftsbibliothek"]["historic"](47.4,9.3,47.5,9.5);node["name"~"Kathedrale St.Gallen"](47.4,9.3,47.5,9.5););out center;`, 3],

  // Zuger Burg
  ["die-frau-von-der-zuger-burg-zug",
   `[out:json][timeout:10];(node["name"~"Zyt|Burg|Turm"]["historic"](47.1,8.4,47.2,8.6);way["name"~"Zuger Burg|Zytturm"](47.1,8.4,47.2,8.6););out center;`, 3],

  // Kloster Heiligkreuz (Cham, ZG)
  ["das-elende-kreuz-zug",
   `[out:json][timeout:10];(node["name"~"Heiligkreuz|Heilig Kreuz"](47.1,8.4,47.2,8.6);way["name"~"Heiligkreuz|Heilig Kreuz"](47.1,8.4,47.2,8.6););out center;`, 5],

  // Altstadtkapelle Zug
  ["die-altstadtmadonna-zug",
   `[out:json][timeout:10];(node["amenity"="place_of_worship"]["name"~"Madonna|Kapelle|Altstadtkapelle"](47.1,8.4,47.2,8.6);way["amenity"="place_of_worship"]["name"~"Madonna|Kapelle|Altstadtkapelle"](47.1,8.4,47.2,8.6););out center;`, 2],

  // Vrenelis Gärtli (Glärnisch, GL)
  ["vrenelis-g-rtli-glar",
   `[out:json][timeout:10];(node["name"~"Vrenelisgärtli|Vreneli"]["natural"="peak"](46.9,8.9,47.1,9.2););out center;`, 5],

  // Burg Schwendi (AI)
  ["der-vogt-auf-schwendi-appen",
   `[out:json][timeout:10];(node["name"~"Schwendi"]["historic"](47.3,9.3,47.5,9.6);way["name"~"Schwendi"]["historic"](47.3,9.3,47.5,9.6););out center;`, 5],
];

const distKm = (a, b, c, d) => {
  const R = 6371, dLat = (c - a) * Math.PI / 180, dLng = (d - b) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function overpass(query) {
  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SagaTrail-GPS/1.0" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!resp.ok) throw new Error("Overpass " + resp.status);
  return resp.json();
}

function extractCenter(el) {
  if (el.type === "node") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function saveJson(sagas) {
  const tmp = JSON_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(sagas, null, 2), "utf-8");
  renameSync(tmp, JSON_PATH);
}

async function main() {
  const sagas = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  const byId = Object.fromEntries(sagas.map((s, i) => [s.id, i]));

  let updated = 0;
  let downgraded = 0;

  // ── Herabstufen abstrakte Sagen ──────────────────────────────────────────
  for (const id of DOWNGRADE) {
    const idx = byId[id];
    if (idx === undefined) { console.log(`[skip] ${id} nicht gefunden`); continue; }
    const old = sagas[idx].koordinatenSicherheit;
    if (old === "exakt") {
      sagas[idx].koordinatenSicherheit = "Ort identifiziert";
      console.log(`[↓ herabgestuft] ${sagas[idx].title}`);
      downgraded++;
    }
  }
  saveJson(sagas);

  // ── Gezielte Overpass-Abfragen ────────────────────────────────────────────
  for (const [id, query, maxKm] of OVERPASS_TARGETS) {
    const idx = byId[id];
    if (idx === undefined) { console.log(`[skip] ${id} nicht gefunden`); continue; }
    const saga = sagas[idx];
    process.stdout.write(`[${saga.title.slice(0, 45)}] `);
    try {
      const data = await overpass(query);
      await sleep(1500);
      const elements = data.elements ?? [];
      if (!elements.length) { console.log("→ kein Overpass-Treffer"); continue; }
      const el = elements[0];
      const center = extractCenter(el);
      if (!center) { console.log("→ kein center"); continue; }
      const dist = distKm(saga.lat, saga.lng, center.lat, center.lon);
      if (dist > maxKm) { console.log(`→ zu weit (${dist.toFixed(1)} km)`); continue; }
      const name = el.tags?.name ?? "?";
      sagas[idx].lat = center.lat;
      sagas[idx].lng = center.lon;
      console.log(`✓ ${(dist * 1000).toFixed(0)} m Δ → ${center.lat.toFixed(6)}, ${center.lon.toFixed(6)} (${name.slice(0, 40)})`);
      saveJson(sagas);
      updated++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      await sleep(3000);
    }
  }

  console.log(`\nFertig: ${updated} aktualisiert, ${downgraded} herabgestuft`);
}

main().catch((e) => { console.error(e); process.exit(1); });
