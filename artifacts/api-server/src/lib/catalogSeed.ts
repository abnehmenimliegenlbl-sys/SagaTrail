import { db, catalogRoutesTable, catalogSagasTable } from "@workspace/db";
import { CURATED_SAGAS } from "./curatedSagas";
import { PACKAGE_SAGAS } from "./curatedSagasPakete";
import { notInArray, sql } from "drizzle-orm";
import { logger } from "./logger";

const ALL_SAGAS = [...CURATED_SAGAS, ...PACKAGE_SAGAS];

/**
 * Befuellt den Katalog idempotent beim Serverstart. Der Katalog liefert nur noch
 * die kuratierten, gemeinfrei belegten Sagen. Wanderrouten sind KEIN Seed mehr —
 * sie werden ausschliesslich live pro Kanton aus den verbundenen Quellen
 * (OpenStreetMap + swisstopo) geladen (siehe routeService / external_routes).
 */
export async function seedCatalog(): Promise<void> {
  await db
    .insert(catalogSagasTable)
    .values(ALL_SAGAS)
    .onConflictDoUpdate({
      target: catalogSagasTable.id,
      set: {
        title: sql`excluded.title`,
        canton: sql`excluded.canton`,
        coreMotif: sql`excluded.core_motif`,
        bildmotiv: sql`excluded.bildmotiv`,
        mood: sql`excluded.mood`,
        summary: sql`excluded.summary`,
        summaries: sql`excluded.summaries`,
        altersstufenHinweis: sql`excluded.altersstufen_hinweis`,
        quelle: sql`excluded.quelle`,
        source: sql`excluded.source`,
        koordinatenSicherheit: sql`excluded.koordinaten_sicherheit`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        isAnchorPlace: sql`excluded.is_anchor_place`,
      },
    });

  // Verwaiste Alt-Sagen entfernen: Der Katalog enthaelt ausschliesslich
  // kuratierte, gemeinfrei belegte Sagen (frueher frei erfundene Eintraege
  // werden geloescht).
  await db.delete(catalogSagasTable).where(
    notInArray(
      catalogSagasTable.id,
      ALL_SAGAS.map((s) => s.id),
    ),
  );

  // Alt-Bestand an kuratierten Seed-Routen entfernen: Routen kommen jetzt
  // ausschliesslich live aus den verbundenen Quellen (OSM + swisstopo) und nicht
  // mehr aus einem gebuendelten Katalog-Seed.
  await db.delete(catalogRoutesTable);

  logger.info({ sagas: ALL_SAGAS.length, standalone: CURATED_SAGAS.length, pakete: PACKAGE_SAGAS.length }, "Katalog geseedet");
}
