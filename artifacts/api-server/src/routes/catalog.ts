import { Router, type IRouter } from "express";
import { db, catalogRoutesTable, catalogSagasTable, externalRoutesTable } from "@workspace/db";
import type { CatalogRouteRow, CatalogSagaRow } from "@workspace/db";
import { GetCatalogResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function toRoute(row: CatalogRouteRow & {
  photoUrl?: string | null;
  photoAttribution?: string | null;
  sacSource?: string | null;
  schweizMobilCondition?: string | null;
  schweizMobilTechnique?: string | null;
}) {
  return {
    id: row.id,
    sagaId: row.sagaId,
    name: row.name,
    region: row.region,
    distanceKm: row.distanceKm,
    ascentM: row.ascentM,
    minutes: row.minutes,
    sac: row.sac,
    sacSource: row.sacSource ?? null,
    schweizMobilCondition: row.schweizMobilCondition ?? null,
    schweizMobilTechnique: row.schweizMobilTechnique ?? null,
    terrain: row.terrain,
    coordinates: { lat: row.lat, lng: row.lng },
    featured: row.featured,
    photoUrl: row.photoUrl ?? null,
    photoAttribution: row.photoAttribution ?? null,
  };
}

function toSaga(row: CatalogSagaRow) {
  const cleanTitle = (title: string): string => {
    let cleaned = title.trim();
    while (/\([^()]*\)/.test(cleaned)) {
      cleaned = cleaned.replace(/\s*\([^()]*\)/g, "");
    }
    return cleaned.replace(/\s{2,}/g, " ").trim() || title.trim();
  };

  return {
    id: row.id,
    title: cleanTitle(row.title),
    canton: row.canton,
    coreMotif: row.coreMotif,
    bildmotiv: row.bildmotiv ?? undefined,
    mood: row.mood,
    summary: row.summary,
    summaries: row.summaries,
    altersstufenHinweis: row.altersstufenHinweis ?? undefined,
    quelle: row.quelle ?? undefined,
    source: row.source,
    coordinates:
      row.lat != null && row.lng != null
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    koordinatenSicherheit: row.koordinatenSicherheit,
    isAnchorPlace: row.isAnchorPlace,
    fotoUrl: row.fotoUrl ?? null,
    fotoAttribution: row.fotoAttribution ?? null,
  };
}

router.get("/catalog", async (_req, res): Promise<void> => {
  const [routeRows, sagaRows] = await Promise.all([
    db
      .select({
        id: catalogRoutesTable.id,
        sagaId: catalogRoutesTable.sagaId,
        name: catalogRoutesTable.name,
        region: catalogRoutesTable.region,
        distanceKm: catalogRoutesTable.distanceKm,
        ascentM: catalogRoutesTable.ascentM,
        maxElevationM: catalogRoutesTable.maxElevationM,
        minutes: catalogRoutesTable.minutes,
        sac: catalogRoutesTable.sac,
        terrain: catalogRoutesTable.terrain,
        lat: catalogRoutesTable.lat,
        lng: catalogRoutesTable.lng,
        featured: catalogRoutesTable.featured,
        photoUrl: externalRoutesTable.photoUrl,
        photoAttribution: externalRoutesTable.photoAttribution,
        sacSource: externalRoutesTable.sacSource,
        schweizMobilCondition: externalRoutesTable.schweizMobilCondition,
        schweizMobilTechnique: externalRoutesTable.schweizMobilTechnique,
      })
      .from(catalogRoutesTable)
      .leftJoin(externalRoutesTable, eq(catalogRoutesTable.id, externalRoutesTable.id)),
    db.select().from(catalogSagasTable),
  ]);

  const routes = routeRows.map(toRoute);
  const sagas = sagaRows.map(toSaga);

  // Kantone alphabetisch, mit Anzahl Routen — der Einstieg beginnt kantonsweise.
  const counts = new Map<string, number>();
  for (const r of routes) {
    counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }
  const cantons = Array.from(counts.entries())
    .map(([canton, routeCount]) => ({ canton, routeCount }))
    .sort((a, b) => a.canton.localeCompare(b.canton, "de"));

  res.json(GetCatalogResponse.parse({ cantons, routes, sagas }));
});

export default router;
