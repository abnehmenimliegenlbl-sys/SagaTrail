#!/usr/bin/env node
/*
 * Prüft POIs entlang der gespeicherten Routen und schreibt die daraus
 * abgeleiteten Themenwelten in external_routes.theme_keys.
 *
 * Sicherheits- und Lastschutz:
 *   - Standard: Dry-Run, maximal 25 Routen.
 *   - Schreiben nur mit --write und ROUTE_THEME_TARGET=development.
 *   - Eine POI-Abfrage gleichzeitig; identische BBoxes werden geteilt.
 *   - Leere Erstantworten werden mit Abstand erneut abgefragt, weil der
 *     API-POI-Cache den Overpass-Refresh im Hintergrund startet.
 *
 * Beispiele:
 *   POI_API_BASE_URL=http://127.0.0.1:5000 \
 *     node scripts/index_route_themes.cjs --canton=Aargau
 *
 *   ROUTE_THEME_TARGET=development POI_API_BASE_URL=http://127.0.0.1:5000 \
 *     node scripts/index_route_themes.cjs --canton=Aargau --write
 *
 *   ... node scripts/index_route_themes.cjs --all --write
 */

const path = require("node:path");
const { Client } = require(path.resolve(__dirname, "../lib/db/node_modules/pg"));

const THEME_KEYS = [
  "wasserwege",
  "burgen_ruinen_alte_wege",
  "gipfel_panorama",
  "geologie_eiszeit",
  "hoehlen_grotten",
  "wald_wildtiere",
  "alpen_landwirtschaft",
  "pilger_handelswege",
  "industriekultur",
  "familien_entdecker",
  "nacht_sterne",
  "flora_jahreszeiten",
  "bahn_seilbahn",
];

const OVERPASS_DELAY_MS = Number(process.env.ROUTE_THEME_DELAY_MS || 3000);
const RETRY_DELAY_MS = Number(process.env.ROUTE_THEME_RETRY_DELAY_MS || 15000);
const MAX_RETRIES = Number(process.env.ROUTE_THEME_RETRIES || 4);
const DEFAULT_LIMIT = Number(process.env.ROUTE_THEME_BATCH_SIZE || 25);
const POI_API_BASE_URL = (process.env.POI_API_BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const WRITE = process.argv.includes("--write");
const ALL = process.argv.includes("--all");
const CANTON = valueAfter("--canton");
const LIMIT = ALL ? Number.MAX_SAFE_INTEGER : numberAfter("--limit", DEFAULT_LIMIT);
const OFFSET = numberAfter("--offset", 0);

function valueAfter(flag) {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return exact ? exact.slice(flag.length + 1) : undefined;
}

function numberAfter(flag, fallback) {
  const value = valueAfter(flag);
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} muss eine nichtnegative ganze Zahl sein.`);
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asGeometry(raw) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => {
      if (Array.isArray(point)) return { lat: Number(point[0]), lng: Number(point[1]) };
      if (point && typeof point === "object") return { lat: Number(point.lat), lng: Number(point.lng) };
      return null;
    })
    .filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function routeBbox(route) {
  const geometry = asGeometry(route.geometry);
  const points = geometry.length > 1
    ? geometry
    : [{ lat: Number(route.lat), lng: Number(route.lng) }];
  const valid = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (valid.length === 0) return null;
  const south = Math.min(...valid.map((point) => point.lat));
  const north = Math.max(...valid.map((point) => point.lat));
  const west = Math.min(...valid.map((point) => point.lng));
  const east = Math.max(...valid.map((point) => point.lng));
  const centerLat = (south + north) / 2;
  const latPad = 2 / 111;
  const lngPad = 2 / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);
  return { south: south - latPad, west: west - lngPad, north: north + latPad, east: east + lngPad };
}

function bboxKey(bbox) {
  return [bbox.south, bbox.west, bbox.north, bbox.east].map((value) => value.toFixed(4)).join(",");
}

function distanceToSegmentKm(point, a, b) {
  const radius = 6371;
  const radians = Math.PI / 180;
  const cosLat = Math.cos(point.lat * radians);
  const ax = (a.lng - point.lng) * radians * cosLat * radius;
  const ay = (a.lat - point.lat) * radians * radius;
  const bx = (b.lng - point.lng) * radians * cosLat * radius;
  const by = (b.lat - point.lat) * radians * radius;
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function onRouteCorridor(pois, geometry, maxKm = 2) {
  if (geometry.length < 2) return [];
  return pois.filter((poi) => {
    const point = { lat: Number(poi.lat), lng: Number(poi.lng) };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
    for (let index = 1; index < geometry.length; index += 1) {
      if (distanceToSegmentKm(point, geometry[index - 1], geometry[index]) <= maxKm) return true;
    }
    return false;
  });
}

function hasKind(poi, ...kinds) {
  return kinds.includes(poi.kind);
}

function deriveThemes(pois, route) {
  const tags = new Set();
  for (const poi of pois) {
    const kind = poi.kind || "";
    if ([
      "natural=water", "natural=waterfall", "natural=spring", "natural=gorge",
      "waterway=waterfall", "waterway=river", "waterway=stream",
    ].includes(kind)) tags.add("wasserwege");
    if ([
      "historic=castle", "historic=ruins", "historic=fort",
      "historic=archaeological_site", "historic=roman_road",
      "historic=roman_villa", "historic=roman_building", "historic=battlefield",
      "historic=bridge",
    ].includes(kind)) tags.add("burgen_ruinen_alte_wege");
    if (hasKind(poi, "natural=peak", "natural=saddle", "tourism=viewpoint")) {
      tags.add("gipfel_panorama");
    }
    if (kind.startsWith("geological=") ||
        hasKind(poi, "natural=rock", "natural=glacier")) {
      tags.add("geologie_eiszeit");
    }
    if (hasKind(
      poi,
      "natural=arch", "natural=cave", "natural=cave_entrance",
      "natural=rock_shelter", "man_made=adit",
    )) tags.add("hoehlen_grotten");
    if (hasKind(poi, "natural=wood", "natural=wetland", "tourism=wildlife_hide")) {
      tags.add("wald_wildtiere");
    }
    if (hasKind(
      poi, "tourism=alpine_hut", "amenity=shelter", "shop=cheese",
      "farm=Alp", "landuse=meadow", "landuse=pasture",
    )) tags.add("alpen_landwirtschaft");
    if (hasKind(
      poi, "route=pilgrimage", "historic=church", "historic=wayside_cross",
      "historic=wayside_shrine", "historic=milestone", "historic=boundary_stone",
    )) tags.add("pilger_handelswege");
    if ([
      "man_made=watermill", "man_made=windmill", "man_made=works", "man_made=quarry",
    ].includes(kind)) tags.add("industriekultur");
    if (route.family_friendly === true ||
        hasKind(poi, "amenity=playground", "amenity=picnic_site", "amenity=toilets")) {
      tags.add("familien_entdecker");
    }
    if (hasKind(poi, "amenity=observatory", "tourism=observatory")) tags.add("nacht_sterne");
    if (hasKind(
      poi, "natural=tree", "natural=wetland", "landuse=orchard",
      "landuse=vineyard", "natural=heath",
    )) tags.add("flora_jahreszeiten");
    if (hasKind(
      poi, "railway=station", "railway=halt", "railway=tram_stop",
      "highway=bus_stop", "aerialway=station", "amenity=ferry_terminal",
    )) tags.add("bahn_seilbahn");
  }
  return THEME_KEYS.filter((key) => tags.has(key));
}

const poiCache = new Map();
async function fetchPois(bbox) {
  const key = bboxKey(bbox);
  const cached = poiCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const query = new URLSearchParams({
      south: String(bbox.south),
      west: String(bbox.west),
      north: String(bbox.north),
      east: String(bbox.east),
    });
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await fetch(`${POI_API_BASE_URL}/api/routes/pois?${query}`);
      if (!response.ok) throw new Error(`POI API ${response.status}: ${await response.text()}`);
      const pois = await response.json();
      if (Array.isArray(pois) && pois.length > 0) return pois;
      if (attempt < MAX_RETRIES) {
        console.log(`  BBox ${key}: noch leer, Versuch ${attempt + 1}/${MAX_RETRIES} nach ${RETRY_DELAY_MS / 1000}s`);
        await sleep(RETRY_DELAY_MS);
      }
    }
    return [];
  })();
  poiCache.set(key, request);
  try {
    return await request;
  } catch (error) {
    poiCache.delete(key);
    throw error;
  }
}

async function main() {
  if (WRITE && process.env.ROUTE_THEME_TARGET !== "development") {
    throw new Error(
      "Schreiben ist nur mit ROUTE_THEME_TARGET=development erlaubt; kein Produktionsschreiben.",
    );
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL fehlt.");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (WRITE) {
      await client.query(
        "ALTER TABLE external_routes ADD COLUMN IF NOT EXISTS theme_keys text[] NOT NULL DEFAULT '{}'",
      );
    }

    const params = [];
    const where = ["geometry_version >= 1"];
    if (CANTON) {
      params.push(CANTON);
      where.push(`canton = $${params.length}`);
    }
    params.push(LIMIT);
    const limitParam = `$${params.length}`;
    params.push(OFFSET);
    const offsetParam = `$${params.length}`;
    const result = await client.query(
      `SELECT id, canton, name, family_friendly, lat, lng, geometry
       FROM external_routes
       WHERE ${where.join(" AND ")}
       ORDER BY canton, id
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );
    console.log(`${result.rows.length} Routen geladen${CANTON ? ` für ${CANTON}` : ""}.`);
    console.log(WRITE ? "Schreibmodus: development-Datenbank" : "Dry-Run: keine Datenbankänderungen");

    let indexed = 0;
    let skipped = 0;
    for (const route of result.rows) {
      const bbox = routeBbox(route);
      const geometry = asGeometry(route.geometry);
      if (!bbox || geometry.length < 2) {
        skipped += 1;
        console.log(`[${indexed + skipped}/${result.rows.length}] ${route.id}: übersprungen (keine brauchbare Geometrie)`);
        continue;
      }

      try {
        const pois = await fetchPois(bbox);
        const themes = deriveThemes(onRouteCorridor(pois, geometry), route);
        if (WRITE) {
          await client.query(
            "UPDATE external_routes SET theme_keys = $1::text[] WHERE id = $2",
            [themes, route.id],
          );
        }
        indexed += 1;
        console.log(
          `[${indexed + skipped}/${result.rows.length}] ${route.canton} · ${route.name}: ` +
          `${themes.length ? themes.join(", ") : "keine Themen"} (${pois.length} POIs)`,
        );
      } catch (error) {
        console.error(`[FEHLER] ${route.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(OVERPASS_DELAY_MS);
    }

    console.log(`Fertig: ${indexed} geprüft, ${skipped} übersprungen, ${poiCache.size} eindeutige BBoxes.`);
    if (!WRITE) console.log("Für Datenbankwrites erneut mit --write und ROUTE_THEME_TARGET=development starten.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});