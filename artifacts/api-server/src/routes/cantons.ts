import { Router, type IRouter } from "express";
import { GetCantonRoutesResponse } from "@workspace/api-zod";
import type { ExternalRouteRow } from "@workspace/db";
import { loadCachedRoutes } from "../lib/routeService";
import { deriveSeason } from "../lib/season";
import { haversineM } from "../lib/geo";

const router: IRouter = Router();

// Kein Deckel — alle gefilterten Routen werden zurueckgegeben.
const RESULT_LIMIT = Infinity;

/**
 * Sortiert Treffer nach Relevanz, damit der RESULT_LIMIT-Deckel die
 * aussagekraeftigsten Routen behaelt: amtlich nummerierte Wanderland-Routen
 * (mit `ref`) zuerst, danach alphabetisch.
 */
/**
 * Sortier-Rangfolge:
 * 1. nationale Routen (1-stellige Nummer), 2. deren Etappen,
 * 3. regionale Routen (2-stellig), 4. deren Etappen,
 * 5. lokale Routen (3-stellig), 6. deren Etappen,
 * 7. kantonale Routen (K-Nummern), 8. Rest.
 * Innerhalb jeder Kategorie nach Routen-Nummer, Etappen zusätzlich
 * nach Etappen-Nummer.
 */
// Sortierschlüssel: [Kategorie, RoutenNr, IstEtappe, EtappenNr]
// Kategorie: 0=national, 1=regional, 2=lokal, 3=kantonal, 4=rest
// IstEtappe: 0=Hauptroute (kommt zuerst), 1=Etappe
// Ergibt: 1 Via Alpina → 1 Etappe 1 → 1 Etappe 2 → 5 Jura Höhenweg → 5 Etappe 1 → …
function sortSchluessel(row: ExternalRouteRow): [number, number, number, number, number] {
  const istEtappe = /\b(?:etappe|étape|etape|tappa)\b/i.test(row.name);
  const etappenNr = istEtappe
    ? parseInt(row.name.match(/\b(?:Etappe|Étape|Etape|Tappa)\s+(\d+)/i)?.[1] ?? "0", 10)
    : 0;

  // Kantonale K-Route: Name beginnt mit "K{n} {CC}" (z.B. "K4 AG Kulturweg")
  const kMatch = row.name.match(/^K(\d+)\s+[A-Z]{2}\b/);
  if (kMatch) {
    return [3, parseInt(kMatch[1], 10), istEtappe ? 1 : 0, etappenNr, 0];
  }

  // SchweizMobil-Routen: Nummer am Anfang des Namens bestimmt Kategorie (z.B. "4a" → national)
  // Suffix-Ordnung: kein Suffix = 0, "a" = 1, "b" = 2 … → "4" vor "4a"
  const numMatch = row.name.match(/^(\d{1,3})([a-z]?)\s/);
  if (numMatch) {
    const nr = parseInt(numMatch[1], 10);
    const numLen = nr.toString().length;
    const kat = numLen === 1 ? 0 : numLen === 2 ? 1 : 2;
    const suffixOrder = numMatch[2] ? numMatch[2].charCodeAt(0) - 96 : 0; // '' → 0, 'a' → 1
    return [kat, nr, istEtappe ? 1 : 0, etappenNr, suffixOrder];
  }

  return [4, 0, 0, 0, 0];
}

function byRelevance(a: ExternalRouteRow, b: ExternalRouteRow): number {
  const ka = sortSchluessel(a);
  const kb = sortSchluessel(b);
  for (let i = 0; i < 4; i++) {
    if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
  }
  // Gleicher Schlüssel: längste Route zuerst (Hauptroute vor kurzen Etappen ohne Label).
  if ((b.distanceKm ?? 0) !== (a.distanceKm ?? 0)) return (b.distanceKm ?? 0) - (a.distanceKm ?? 0);
  return a.name.localeCompare(b.name, "de");
}

/** Parst Geometrie aus dem DB-Feld: korrekte JSONB-Arrays kommen direkt durch,
 *  historisch doppelt-codierte JSON-Strings werden on-the-fly geparst. */
function parseGeometry(raw: unknown): number[][] | undefined {
  if (Array.isArray(raw)) return raw as number[][];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as number[][]; } catch { return undefined; }
  }
  return undefined;
}

/** Formatiert km deutsch: "20,3" bzw. "19" ohne unnötige Dezimalstelle. */
function fmtKm(km: number): string {
  const gerundet = Math.round(km * 10) / 10;
  return Number.isInteger(gerundet) ? String(gerundet) : String(gerundet).replace(".", ",");
}

/** Formatiert Minuten als Stundenangabe: 361 → "6", 390 → "6½". */
function fmtStunden(minuten: number): string {
  const halbe = Math.round(minuten / 30);
  const h = Math.floor(halbe / 2);
  return halbe % 2 === 1 ? `${h}½` : String(h);
}

/** Parst "19", "20,3", "20.3" zu einer Zahl. */
function parseZahl(s: string): number {
  return Number(s.replace(",", "."));
}

/**
 * Gleicht Zahlenangaben im kuratierten Beschreibungstext an die amtlichen
 * Werte an (Distanz, Dauer, Höhenmeter). Ersetzt NUR Werte, die nahe am
 * amtlichen Gesamtwert liegen (Toleranz) — Zwischenangaben wie "nach 5 km
 * erreicht man…" bleiben unangetastet.
 */
function harmonisiereBeschreibung(
  text: string,
  distanzKm: number | null,
  minuten: number | null,
  aufstiegM: number | null,
): string {
  let out = text;
  if (distanzKm != null && distanzKm > 0) {
    out = out.replace(
      /(\d+(?:[.,]\d+)?)(\s*(?:km\b|Kilometer))/g,
      (ganz, zahl: string, einheit: string) => {
        const wert = parseZahl(zahl);
        return wert >= distanzKm * 0.7 && wert <= distanzKm * 1.3
          ? `${fmtKm(distanzKm)}${einheit}`
          : ganz;
      },
    );
  }
  if (minuten != null && minuten > 0) {
    const stundenAmtlich = minuten / 60;
    out = out.replace(
      /(\d+(?:[.,]\d+)?)(?:\s*(?:bis|[–-])\s*(\d+(?:[.,]\d+)?))?(\s*(?:Stunden\b|Std\.?))/g,
      (ganz, von: string, bis: string | undefined, einheit: string) => {
        if (bis) {
          // Zeitspanne ("4 bis 5 Stunden"): bewusste Unschärfe erhalten.
          // Liegt der amtliche Wert innerhalb der Spanne → unangetastet lassen;
          // nur wenn er klar draussen liegt → durch Punktwert ersetzen.
          const lo = parseZahl(von);
          const hi = parseZahl(bis);
          if (stundenAmtlich >= lo && stundenAmtlich <= hi) return ganz;
          const mitte = (lo + hi) / 2;
          return mitte >= stundenAmtlich * 0.6 && mitte <= stundenAmtlich * 1.4
            ? `${fmtStunden(minuten)}${einheit}`
            : ganz;
        }
        const wert = parseZahl(von);
        return wert >= stundenAmtlich * 0.6 && wert <= stundenAmtlich * 1.4
          ? `${fmtStunden(minuten)}${einheit}`
          : ganz;
      },
    );
  }
  if (aufstiegM != null && aufstiegM > 0) {
    out = out.replace(
      /(\d+)(\s*(?:Höhenmeter|Hm\b|hm\b))/g,
      (ganz, zahl: string, einheit: string) => {
        const wert = Number(zahl);
        return wert >= aufstiegM * 0.6 && wert <= aufstiegM * 1.4
          ? `${aufstiegM}${einheit}`
          : ganz;
      },
    );
  }
  return out;
}

function toRoute(row: ExternalRouteRow) {
  return {
    id: row.id,
    sagaId: row.sagaId,
    name: row.name,
    ref: row.ref ?? null,
    network: row.routeType ?? null,
    region: row.canton,
    distanceKm: row.distanceKm,
    distanceTagKm: row.distanceTagKm ?? row.distanceKm,
    ascentM: row.ascentM,
    maxElevationM: row.maxElevationM,
    season: deriveSeason(row.maxElevationM, row.sac),
    minutes: row.minutes,
    sac: row.sac,
    sacSource: row.sacSource,
    schweizMobilCondition: row.schweizMobilCondition,
    schweizMobilTechnique: row.schweizMobilTechnique,
    terrain: row.terrain,
    familyFriendly: row.familyFriendly ?? null,
    childFriendly: row.childFriendly ?? null,
    dogsAllowed: row.dogsAllowed ?? null,
    wheelchairAccessible: row.wheelchairAccessible ?? null,
    technicalDifficulty: row.technicalDifficulty ?? null,
    coordinates: { lat: row.lat, lng: row.lng },
    geometry: parseGeometry(row.geometry),
    featured: row.featured,
    photoUrl: row.photoUrl ?? null,
    photoAttribution: row.photoAttribution ?? null,
    description: row.description
      ? harmonisiereBeschreibung(
          row.description,
          row.distanceTagKm ?? row.distanceKm,
          row.minutes,
          row.ascentM,
        )
      : null,
    descriptionSource: row.descriptionSource ?? null,
  };
}

/** Liest den SAC-Grad (T1–T6) aus einem Routen-Feld; null bei "unbekannt". */
function sacStufe(sac: string): number | null {
  const m = /T\s*([1-6])/i.exec(sac);
  return m ? Number(m[1]) : null;
}

/** Liest eine optionale numerische Query-Grenze; null bei fehlend/ungueltig. */
function numParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Liest einen optionalen Boolean-Query-Parameter; null bei fehlend/ungueltig. */
function boolParam(value: unknown): boolean | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return null;
  return raw === "true" || raw === "1";
}

interface RouteFilter {
  distMin: number | null;
  distMax: number | null;
  ascMin: number | null;
  ascMax: number | null;
  diffMin: number | null;
  diffMax: number | null;
  ganzjaehrigNur: boolean | null;
  nearLat: number | null;
  nearLng: number | null;
  familyFriendly: boolean | null;
  childFriendly: boolean | null;
  dogsAllowed: boolean | null;
  wheelchairAccessible: boolean | null;
}

/**
 * Grenzt die Routen anhand der Filter ein. Distanz- und Hoehenmeter-Grenzen sind
 * nach oben offen, wenn keine Obergrenze uebergeben wird. Sobald eine
 * Schwierigkeitsgrenze gesetzt ist, entfallen Routen mit unbekanntem SAC-Grad.
 */
function applyFilter(row: ExternalRouteRow, f: RouteFilter): boolean {
  if (f.distMin !== null && row.distanceKm < f.distMin) return false;
  if (f.distMax !== null && row.distanceKm > f.distMax) return false;
  if (f.ascMin !== null && row.ascentM < f.ascMin) return false;
  if (f.ascMax !== null && row.ascentM > f.ascMax) return false;
  if (f.diffMin !== null || f.diffMax !== null) {
    const stufe = sacStufe(row.sac);
    if (stufe === null) return false; // unbekannter Grad bei aktivem Filter raus
    if (f.diffMin !== null && stufe < f.diffMin) return false;
    if (f.diffMax !== null && stufe > f.diffMax) return false;
  }
  if (f.ganzjaehrigNur === true) {
    const season = deriveSeason(row.maxElevationM, row.sac);
    if (season !== "ganzjaehrig") return false;
  }
  if (f.familyFriendly === true && row.familyFriendly !== true) return false;
  if (f.childFriendly === true && row.childFriendly !== true) return false;
  if (f.dogsAllowed === true && row.dogsAllowed !== true) return false;
  if (f.wheelchairAccessible === true && row.wheelchairAccessible !== true) return false;
  return true;
}

router.get("/cantons/:canton/routes", async (req, res): Promise<void> => {
  const canton = Array.isArray(req.params.canton)
    ? req.params.canton[0]
    : req.params.canton;
  const filter: RouteFilter = {
    distMin: numParam(req.query.distMin),
    distMax: numParam(req.query.distMax),
    ascMin: numParam(req.query.ascMin),
    ascMax: numParam(req.query.ascMax),
    diffMin: numParam(req.query.diffMin),
    diffMax: numParam(req.query.diffMax),
    ganzjaehrigNur: boolParam(req.query.ganzjaehrigNur),
    nearLat: numParam(req.query.nearLat),
    nearLng: numParam(req.query.nearLng),
    familyFriendly: boolParam(req.query.familyFriendly),
    childFriendly: boolParam(req.query.childFriendly),
    dogsAllowed: boolParam(req.query.dogsAllowed),
    wheelchairAccessible: boolParam(req.query.wheelchairAccessible),
  };
  try {
    const rawRows = await loadCachedRoutes(canton);
    const userPos =
      filter.nearLat !== null && filter.nearLng !== null
        ? { lat: filter.nearLat, lng: filter.nearLng }
        : null;

    // Deduplizierung: schweizmobil-* Zeilen entfernen wenn eine osm-* Route mit exakt
    // gleichem Namen existiert (beide sind dasselbe Wanderweg-Netz, aber die osm-Zeile
    // hat die angereicherte Geometrie und soll die schweizmobil-Zeile ersetzen).
    const osmNames = new Set(rawRows.filter((r) => r.id.startsWith("osm-")).map((r) => r.name));
    const rows = rawRows.filter(
      (r) => !r.id.startsWith("schweizmobil-") || !osmNames.has(r.name),
    );

    // Etappen-Labels für Routen mit gleichem ref UND gleichem Namen (kein "Etappe" drin):
    // z.B. 4× "60 Via Rhenana" in Aargau → "60 Via Rhenana Etappe 1" … "Etappe 4"
    // Sortierung innerhalb der Gruppe: längste zuerst (= Hauptetappe = Etappe 1).
    const refGroups = new Map<string, ExternalRouteRow[]>();
    for (const row of rows) {
      if (!row.ref) continue;
      const key = `${row.ref}::${row.name}`;
      if (!/etappe|étape|tappa/i.test(row.name)) {
        if (!refGroups.has(key)) refGroups.set(key, []);
        refGroups.get(key)!.push(row);
      }
    }
    const etappenNames = new Map<string, string>();
    for (const group of refGroups.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => b.distanceKm - a.distanceKm);
      group.forEach((row, i) => etappenNames.set(row.id, `${row.name} Etappe ${i + 1}`));
    }

    // Etappen-Labels VOR dem Sort anwenden damit sortSchluessel "Etappe N" sieht.
    const rowsMitLabels = rows.map((row) =>
      etappenNames.has(row.id) ? { ...row, name: etappenNames.get(row.id)! } : row,
    );

    const matched = rowsMitLabels
      .filter((row) => applyFilter(row, filter))
      .sort(userPos
        ? (a, b) =>
            haversineM({ lat: a.lat, lng: a.lng }, userPos) -
            haversineM({ lat: b.lat, lng: b.lng }, userPos)
        : byRelevance)
      .slice(0, RESULT_LIMIT);
    res.json(GetCantonRoutesResponse.parse(matched.map(toRoute)));
  } catch (err) {
    req.log.error({ err, canton }, "Kanton-Routen konnten nicht geladen werden");
    res.status(502).json({ error: "Routen konnten nicht geladen werden" });
  }
});

export default router;
