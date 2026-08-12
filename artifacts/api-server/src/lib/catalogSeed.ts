import { db, catalogRoutesTable, catalogSagasTable } from "@workspace/db";
import { CURATED_SAGAS } from "./curatedSagas";
import { notInArray, sql } from "drizzle-orm";
import { logger } from "./logger";

const BATCH_SIZE = 20;

/**
 * Befuellt den Katalog idempotent beim Serverstart. Der Katalog liefert nur noch
 * die kuratierten, gemeinfrei belegten Sagen. Wanderrouten sind KEIN Seed mehr —
 * sie werden ausschliesslich live pro Kanton aus den verbundenen Quellen
 * (OpenStreetMap + swisstopo) geladen (siehe routeService / external_routes).
 *
 * Batched insert (BATCH_SIZE Zeilen pro Statement) um PostgreSQL-Limits bei
 * grossen Texten (summary + summaries in 8 Sprachen) zu vermeiden.
 */
/** Normalisiert einen Saga-Eintrag aus der JSON so dass alle NOT-NULL-Felder belegt sind. */
function normalizeForInsert(s: (typeof CURATED_SAGAS)[number]) {
  return {
    ...s,
    // mood ist NOT NULL in der DB; JSON-Einträge können es weglassen
    mood: (s as Record<string, unknown>).mood as string ?? "",
    // summaries: im JSON ein Objekt, in der DB TEXT (JSON-serialisiert)
    summaries:
      typeof s.summaries === "string"
        ? s.summaries
        : JSON.stringify(s.summaries ?? {}),
  };
}

export async function seedCatalog(): Promise<void> {
  const normalized = CURATED_SAGAS.map(normalizeForInsert);
  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE);
    await db
      .insert(catalogSagasTable)
      .values(batch)
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
  }

  // Verwaiste Alt-Sagen entfernen: Der Katalog enthaelt ausschliesslich
  // kuratierte, gemeinfrei belegte Sagen (frueher frei erfundene Eintraege
  // werden geloescht).
  await db.delete(catalogSagasTable).where(
    notInArray(
      catalogSagasTable.id,
      CURATED_SAGAS.map((s) => s.id),
    ),
  );

  // Alt-Bestand an kuratierten Seed-Routen entfernen: Routen kommen jetzt
  // ausschliesslich live aus den verbundenen Quellen (OSM + swisstopo) und nicht
  // mehr aus einem gebuendelten Katalog-Seed.
  await db.delete(catalogRoutesTable);

  logger.info({ sagas: CURATED_SAGAS.length }, "Katalog geseedet");
}
