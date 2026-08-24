#!/usr/bin/env -S pnpm exec tsx
/**
 * Importiert eindeutig als Wanderland-Lokalroute markierte fehlende Nummern
 * aus OSM. Nur der Entwicklungsbestand wird beschrieben.
 */
import { sql } from "../artifacts/api-server/node_modules/drizzle-orm/index.js";
import {
  db,
  externalRoutesTable,
} from "../artifacts/api-server/node_modules/@workspace/db/src/index.ts";
import {
  fetchRouteGeometries,
  runOverpass,
} from "../artifacts/api-server/src/lib/overpass";
import { reverseGeocode } from "../artifacts/api-server/src/lib/geocoding";
import { computeElevationStats } from "../artifacts/api-server/src/lib/elevation";
import { estimateMinutes, pathDistanceKm, rdpSimplify, type LatLng } from "../artifacts/api-server/src/lib/geo";
import { sacScaleToT } from "../artifacts/api-server/src/lib/swisstopoHiking";

const REFS = [
  121, 255, 257, 441, 442, 451, 485, 486, 566, 629, 631, 647, 651,
  678, 699, 757, 783, 792, 796, 804, 806, 811, 813, 816, 817, 819,
  821, 822, 823, 824, 827, 828, 832, 872, 888, 889, 894, 896, 902,
  929, 960, 969, 974, 975, 986, 990,
];

const log = console as any;
type TagRelation = {
  id: number;
  tags?: Record<string, string>;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
};

async function fetchDirectOsmGeometry(osmId: number) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(`https://api.openstreetmap.org/api/0.6/relation/${osmId}/full`);
    if (response.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  if (!response?.ok) throw new Error(`OSM API HTTP ${response?.status ?? "unbekannt"}`);
  const xml = await response.text();
  const nodes = new Map<number, LatLng>();
  for (const match of xml.matchAll(/<node\b[^>]*\bid="(\d+)"[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*\/>/g)) {
    nodes.set(Number(match[1]), { lat: Number(match[2]), lng: Number(match[3]) });
  }
  const ways = new Map<number, number[]>();
  for (const match of xml.matchAll(/<way\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
    ways.set(Number(match[1]), [...match[2].matchAll(/<nd\b[^>]*\bref="(\d+)"/g)].map((m) => Number(m[1])));
  }
  const relationBody = xml.match(/<relation\b[\s\S]*?<\/relation>/)?.[0] ?? "";
  const wayRefs = [...relationBody.matchAll(/<member\b[^>]*\btype="way"[^>]*\bref="(\d+)"/g)].map((m) => Number(m[1]));
  const points: LatLng[] = [];
  for (const wayRef of wayRefs) {
    const wayPoints = (ways.get(wayRef) ?? []).map((node) => nodes.get(node)).filter(Boolean) as LatLng[];
    if (wayPoints.length < 2) continue;
    if (points.length && Math.hypot(points.at(-1)!.lat - wayPoints[0]!.lat, points.at(-1)!.lng - wayPoints[0]!.lng) >
      Math.hypot(points.at(-1)!.lat - wayPoints.at(-1)!.lat, points.at(-1)!.lng - wayPoints.at(-1)!.lng)) {
      wayPoints.reverse();
    }
    points.push(...(points.length ? wayPoints.slice(1) : wayPoints));
  }
  const tag = (key: string) => relationBody.match(new RegExp(`<tag\\b[^>]*\\bk="${key}"[^>]*\\bv="([^"]+)"`))?.[1];
  return {
    osmId,
    id: `osm-${osmId}`,
    points,
    name: tag("name") ?? "",
    ref: tag("ref") ?? "",
    network: tag("network") ?? "lwn",
    sac: tag("sac_scale") ?? null,
    distanceTagKm: tag("distance") ? Number(tag("distance")) : null,
    ascentTagM: tag("ascent") ? Number(tag("ascent")) : null,
  };
}

function sqlJson(value: unknown) {
  return sql`${JSON.stringify(value)}::jsonb`;
}

const metadata: Record<number, { name: string; from: string; to: string }> = {
  121: { name: "Tour de l'Argentine", from: "Solalex", to: "Solalex" },
  257: { name: "Wysswasser Weg", from: "Fiesch Bahnhof", to: "Fieschertal (Dorfplatz Bushaltestelle)" },
  442: { name: "Oeschigässli-Kander-Rundweg", from: "Kandersteg, Bahnhof", to: "Kandersteg, Bahnhof" },
  485: { name: "Tüfelschlucht-Belchen-Weg", from: "Hägendorf", to: "Olten" },
  631: { name: "La Via del Mercato", from: "Camedo", to: "Intragna" },
  651: { name: "Circuito Dongio-Motto", from: "Dongio Municipio", to: "Dongio" },
  783: { name: "Prätschli-Eichhörnliweg", from: "Prätschli Bushaltestelle", to: "Arosa Bahnhof" },
  811: { name: "Senda Val Trupchun", from: "S-chanf, Parc Naziunal", to: "S-chanf, Parc Naziunal" },
  817: { name: "Elm-Höhenweg", from: "Elm", to: "Elm" },
  821: { name: "Holzflue-Rundweg", from: "Ennenda (Aeugsten)", to: "Ennenda (Aeugsten)" },
  823: { name: "Ahornen-Rundweg", from: "Obersee", to: "Obersee" },
  827: { name: "Gratweg Stoos", from: "Stoos (Klingenstock)", to: "Stoos (Fronalpstock)" },
  832: { name: "Karstspur Silberen", from: "Pragelpass", to: "Pragelpass" },
  872: { name: "Tüfelschilen-Schauenberg Weg", from: "Kollbrunn", to: "Elgg" },
  889: { name: "Grüningen-Greifensee-Weg", from: "Grüningen", to: "Greifensee" },
  896: { name: "Rheinfall Rundweg", from: "Dachsen", to: "Dachsen" },
  969: { name: "Klangweg", from: "Sellamatt Bergstation", to: "Iltios Bergstation Standseilbahn" },
  974: { name: "Bendern-Schaan-Weg", from: "Bendern", to: "Schaan" },
  975: { name: "Vaduz-Balzers-Weg", from: "Vaduz", to: "Balzers" },
  451: { name: "Chemin Tiergart-Plain Fayen", from: "Vicques", to: "Corban" },
  566: { name: "Felsenweg Bürgenstock", from: "Bürgenstock", to: "Bürgenstock" },
  631: { name: "La Via del Mercato", from: "Camedo", to: "Intragna" },
  699: { name: "Panyer Rundweg", from: "Pany, Schwimmbad", to: "Pany, Schwimmbad" },
  796: { name: "Via Panoramica Val Bregaglia", from: "Casaccia", to: "Soglio" },
  804: { name: "Senda Muottas da Schlarigna", from: "Pontresina", to: "St. Moritz (Bad)" },
  806: { name: "Aussichtsweg Morteratschgletscher", from: "Pontresina (Morteratsch Bahnhof)", to: "Pontresina (Morteratsch Bahnhof)" },
  811: { name: "Senda Val Trupchun", from: "S-chanf, Parc Naziunal", to: "S-chanf, Parc Naziunal" },
  817: { name: "Elm-Höhenweg", from: "Elm", to: "Elm" },
  819: { name: "Weissenberge-Rundweg", from: "Matt (Weissenberge)", to: "Matt (Weissenberge)" },
  821: { name: "Holzflue-Rundweg", from: "Ennenda (Aeugsten)", to: "Ennenda (Aeugsten)" },
  828: { name: "Goldauer Bergsturzspur", from: "Goldau", to: "Goldau" },
  827: { name: "Gratweg Stoos", from: "Stoos (Klingenstock)", to: "Stoos (Fronalpstock)" },
  896: { name: "Rheinfall Rundweg", from: "Dachsen", to: "Dachsen" },
  813: { name: "Kinderpfad Champlönch", from: "Zernez (Champlönch)", to: "Zernez (Il Fuorn)" },
  823: { name: "Ahornen-Rundweg", from: "Obersee", to: "Obersee" },
  889: { name: "Grüningen-Greifensee-Weg", from: "Grüningen", to: "Greifensee" },
  822: { name: "Schabziger Höhenweg", from: "Filzbach, Habergschwänd", to: "Mollis, Oberruestel" },
  888: { name: "Lützelsee Rundweg", from: "Hombrechtikon Post", to: "Hombrechtikon Post" },
  629: { name: "Sentiero etnografico Revöira", from: "Lavertezzo", to: "Lavertezzo" },
  872: { name: "Tüfelschilen-Schauenberg Weg", from: "Kollbrunn", to: "Elgg" },
  485: { name: "Tüfelschlucht-Belchen-Weg", from: "Hägendorf", to: "Olten" },
  929: { name: "Hasenbodenweg", from: "Amden, Niederschlag", to: "Amden, Dorf" },
  974: { name: "Bendern-Schaan-Weg", from: "Bendern", to: "Schaan" },
  975: { name: "Vaduz-Balzers-Weg", from: "Vaduz", to: "Balzers" },
  894: { name: "Wädenswiler Seeuferweg", from: "Horgen (Schiff)", to: "Wädenswil" },
  783: { name: "Prätschli-Eichhörnliweg", from: "Prätschli Bushaltestelle", to: "Arosa Bahnhof" },
  651: { name: "Circuito Dongio-Motto", from: "Dongio Municipio", to: "Dongio" },
  442: { name: "Oeschigässli-Kander-Rundweg", from: "Kandersteg, Bahnhof", to: "Kandersteg, Bahnhof" },
  257: { name: "Wysswasser Weg", from: "Fiesch Bahnhof", to: "Fieschertal (Dorfplatz Bushaltestelle)" },
  647: { name: "Circuito di Lodano", from: "Lodano", to: "Maggia Centro" },
  441: { name: "Wageti-Rundweg", from: "Kandersteg Bahnhof", to: "Kandersteg Bahnhof" },
  255: { name: "Chemin du Grand Bisse de Vex", from: "Les-Mayens-de Sion", to: "Les-Mayens-de Sion" },
  824: { name: "Linth-Uferweg", from: "Schwanden GL Bahnhof", to: "Netstal Bahnhof" },
  969: { name: "Klangweg", from: "Sellamatt Bergstation", to: "Iltios Bergstation Standseilbahn" },
  986: { name: "Kaien-St.-Anton-Weg", from: "Kaien", to: "St. Anton" },
};

const RELATION_IDS: Record<number, number> = {
  827: 161418, 896: 1702853, 813: 2442021, 451: 2571358, 757: 3252502,
  823: 9765379, 889: 10777178, 822: 11347309, 817: 12341910, 819: 12359767,
  888: 12364855, 821: 12377816, 832: 12416958, 629: 12798604, 872: 14192345,
  121: 14312322, 796: 14414965, 811: 14651642, 485: 15737433, 929: 15971661,
  974: 16404866, 975: 16413593, 894: 17354494, 783: 17439990, 651: 17773101,
  442: 17823761, 257: 19729973, 647: 19730227, 441: 19730919, 255: 19734329,
  631: 19762876, 824: 19789318, 969: 19828753, 986: 19828843,
};

async function main() {
  const byRef = new Map<number, TagRelation>(
    Object.entries(RELATION_IDS).map(([ref, id]) => [Number(ref), { id, tags: { ref } }]),
  );
  const missing = REFS.filter((ref) => !byRef.has(ref));
  if (missing.length) console.warn("Noch nicht als offizielle Relation aufgelöst:", missing.join(", "));

  const ids = [...byRef.values()].map((r) => r.id);
  const geometries: Awaited<ReturnType<typeof fetchRouteGeometries>> = [];
  for (const id of ids) {
    try {
      const direct = await fetchDirectOsmGeometry(id);
      if (direct.points.length >= 2) geometries.push(direct as any);
    } catch (directError) {
      const ref = Number([...byRef.entries()].find(([, r]) => r.id === id)?.[0]);
      console.warn(`Direkter OSM-Abruf für Route ${ref} fehlgeschlagen: ${String(directError)}`);
    }
  }
  const geometryByOsmId = new Map(geometries.map((r) => [r.osmId, r]));
  const cantonCache = new Map<string, string | null>();
  let inserted = 0;
  const unresolved: number[] = [];

  for (const relation of byRef.values()) {
    const tags = relation.tags ?? {};
    const ref = Number(tags.ref);
    const route = geometryByOsmId.get(relation.id);
    if (!route || route.points.length < 2) {
      console.warn(`Route ${ref}: keine brauchbare Geometrie (${route?.points.length ?? 0} Punkte)`);
      unresolved.push(ref);
      continue;
    }
    const start = route.points[0]!;
    const cantonKey = `${start.lat.toFixed(2)},${start.lng.toFixed(2)}`;
    let canton = cantonCache.get(cantonKey);
    if (canton === undefined) {
      const geo = await reverseGeocode(start.lat, start.lng, log);
      canton = geo.canton ?? null;
      cantonCache.set(cantonKey, canton);
    }
    if (!canton) {
      console.warn(`Route ${ref}: Kanton für Startpunkt ${start.lat},${start.lng} nicht ermittelt`);
      unresolved.push(ref);
      continue;
    }

    const known = metadata[ref];
    const name = known?.name ?? tags["name:de"] ?? tags.name;
    const from = known?.from ?? tags.from;
    const to = known?.to ?? tags.to;
    if (!name || !from || !to) {
      console.warn(`Route ${ref}: offizielle Orts-/Namensdaten fehlen, übersprungen`);
      unresolved.push(ref);
      continue;
    }

    const geomKm = Math.round(pathDistanceKm(route.points) * 10) / 10;
    const distanceTagKm = route.distanceTagKm != null ? Math.round(route.distanceTagKm * 10) / 10 : null;
    const elevation = route.ascentTagM == null ? await computeElevationStats(route.points, log) : null;
    const ascentM = route.ascentTagM ?? elevation?.ascentM ?? 0;
    const geometry = rdpSimplify(route.points, 5, 500).map((p: LatLng) => [p.lat, p.lng] as [number, number]);
    const id = `osm-${relation.id}`;
    const formattedName = `${ref} ${name} ${from} - ${to}`;

    await db.insert(externalRoutesTable).values({
      id,
      sagaId: id,
      canton,
      name: formattedName,
      ref: String(ref),
      distanceKm: geomKm,
      distanceTagKm,
      ascentM,
      maxElevationM: elevation?.maxElevationM ?? 0,
      minutes: estimateMinutes(distanceTagKm ?? geomKm, ascentM),
      sac: sacScaleToT(route.sac) ?? "unbekannt",
      terrain: "Wanderweg",
      lat: start.lat,
      lng: start.lng,
      geometry: sqlJson(geometry) as any,
      geometryVersion: 1,
      source: "SchweizMobil · OSM",
      featured: false,
      photoUrl: null,
      photoAttribution: null,
      routeType: "lwn",
      isEtappe: false,
    }).onConflictDoUpdate({
      target: externalRoutesTable.id,
      set: {
        name: sql`excluded.name`,
        canton: sql`excluded.canton`,
        distanceKm: sql`excluded.distance_km`,
        distanceTagKm: sql`excluded.distance_tag_km`,
        ascentM: sql`excluded.ascent_m`,
        maxElevationM: sql`excluded.max_elevation_m`,
        minutes: sql`excluded.minutes`,
        sac: sql`excluded.sac`,
        terrain: sql`excluded.terrain`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        geometry: sql`excluded.geometry`,
        geometryVersion: sql`excluded.geometry_version`,
        source: sql`excluded.source`,
        ref: sql`excluded.ref`,
        routeType: sql`excluded.route_type`,
        isEtappe: sql`excluded.is_etappe`,
        fetchedAt: new Date(),
      },
    }).execute();
    inserted++;
    console.log(`OK ${ref} ${canton} ${formattedName} (${geomKm} km)`);
  }
  console.log(JSON.stringify({ inserted, unresolved: [...new Set(unresolved)].sort((a, b) => a - b) }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});