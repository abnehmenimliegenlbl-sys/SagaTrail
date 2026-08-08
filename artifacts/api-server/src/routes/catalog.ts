import { Router, type IRouter } from "express";
import { db, catalogRoutesTable, catalogSagasTable, externalRoutesTable } from "@workspace/db";
import type { CatalogRouteRow, CatalogSagaRow } from "@workspace/db";
import { GetCatalogResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function toRoute(row: CatalogRouteRow & { photoUrl?: string | null; photoAttribution?: string | null }) {
  return {
    id: row.id,
    sagaId: row.sagaId,
    name: row.name,
    region: row.region,
    distanceKm: row.distanceKm,
    ascentM: row.ascentM,
    minutes: row.minutes,
    sac: row.sac,
    terrain: row.terrain,
    coordinates: { lat: row.lat, lng: row.lng },
    featured: row.featured,
    photoUrl: row.photoUrl ?? null,
    photoAttribution: row.photoAttribution ?? null,
  };
}

function toSaga(row: CatalogSagaRow) {
  return {
    id: row.id,
    title: row.title,
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
