import { Router, type IRouter } from "express";
import { GetPoisResponse, GetPoisQueryParams } from "@workspace/api-zod";
import { z } from "zod";
import type { EnrichedPoi } from "../lib/routeService";
import { getPois, getPoiDetail } from "../lib/routeService";

const router: IRouter = Router();

function toPoi(p: EnrichedPoi) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    wiki: p.wiki ?? undefined,
    wikipediaTag: p.wikipediaTag ?? undefined,
    wikidataTag: p.wikidataTag ?? undefined,
    osmContext: p.osmContext ?? undefined,
  };
}

// Historische/touristische Orte in einem Kartenausschnitt (ohne Wikipedia-
// Anreicherung — die erfolgt on-demand via /routes/poi-detail).
router.get("/routes/pois", async (req, res): Promise<void> => {
  const parsed = GetPoisQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Bounding Box" });
    return;
  }
  const { south, west, north, east } = parsed.data;
  try {
    // Express kann anhand alter If-None-Match/If-Modified-Since-Header noch
    // vor dem JSON-Body auf 304 wechseln. Für Live-POIs ist diese Antwort
    // unbrauchbar, weil React Native den leeren 304-Body als Fehler behandelt.
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    const pois = await getPois({ south, west, north, east }, req.log);
    // Der mobile Client braucht bei jeder Live-Abfrage den vollständigen
    // POI-Body. Eine zwischengeschaltete 304-Antwort enthält keinen JSON-Body
    // und lässt die POI-Liste in React Native fälschlich leer erscheinen.
    res.set("Cache-Control", "no-store");
    res.json(GetPoisResponse.parse(pois.map(toPoi)));
  } catch (err) {
    req.log.error({ err }, "POIs konnten nicht geladen werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

const GetPoiDetailQueryParams = z.object({
  name: z.string().min(1),
  kind: z.string().min(1),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  wikipediaTag: z.string().optional(),
  wikidataTag: z.string().optional(),
});

// On-demand-Anreicherung eines einzelnen POI: wird aufgerufen wenn der Nutzer
// den POI-Bereich oeffnet, nicht beim initialen Karten-Laden.
router.get("/routes/poi-detail", async (req, res): Promise<void> => {
  const parsed = GetPoiDetailQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Parameter" });
    return;
  }
  try {
    const wiki = await getPoiDetail(parsed.data, req.log);
    res.json({ wiki: wiki ?? null });
  } catch (err) {
    req.log.error({ err }, "POI-Detail-Anreicherung fehlgeschlagen");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
