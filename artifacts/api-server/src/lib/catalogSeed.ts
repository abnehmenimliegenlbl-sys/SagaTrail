import { db, catalogRoutesTable, catalogSagasTable } from "@workspace/db";
import {
  CURATED_SAGA_REPLACEMENT_IDS,
  CURATED_SAGAS,
} from "./curatedSagas";
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
  const rawSummaries = (s as Record<string, unknown>).summaries;
  return {
    ...s,
    // mood ist NOT NULL in der DB; JSON-Einträge können es weglassen
    mood: (s as Record<string, unknown>).mood as string ?? "",
    // summaries bleibt als JSON-Objekt für die jsonb-Spalte erhalten.
    summaries: (typeof rawSummaries === "string"
      ? JSON.parse(rawSummaries)
      : rawSummaries ?? {}) as typeof s.summaries,
  };
}

export async function seedCatalog(): Promise<void> {
  const normalized = CURATED_SAGAS.map(normalizeForInsert);
  const replacementIds = sql.join(
    CURATED_SAGA_REPLACEMENT_IDS.map((id) => sql`${id}`),
    sql`, `,
  );
  const isContentReplacement = sql`${catalogSagasTable.id} IN (${replacementIds})`;
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
          // Koordinaten und Sicherheitsstatus sind redaktionelle Laufzeitdaten.
          // Nicht aus dem Bundle überschreiben: Admin-Verifizierungen müssen
          // einen Server-Neustart und ein erneutes Seeding überleben.
          // Eine ausdrücklich ersetzte Sage ist die Ausnahme: Ihre neuen
          // Ortsdaten und das neue Foto gehören zum neuen redaktionellen Inhalt.
          lat: sql`CASE WHEN ${isContentReplacement} THEN excluded.lat ELSE ${catalogSagasTable.lat} END`,
          lng: sql`CASE WHEN ${isContentReplacement} THEN excluded.lng ELSE ${catalogSagasTable.lng} END`,
          koordinatenSicherheit: sql`CASE WHEN ${isContentReplacement} THEN excluded.koordinaten_sicherheit ELSE ${catalogSagasTable.koordinatenSicherheit} END`,
          fotoUrl: sql`CASE WHEN ${isContentReplacement} THEN excluded.foto_url ELSE ${catalogSagasTable.fotoUrl} END`,
          fotoAttribution: sql`CASE WHEN ${isContentReplacement} THEN excluded.foto_attribution ELSE ${catalogSagasTable.fotoAttribution} END`,
          isAnchorPlace: sql`CASE WHEN ${isContentReplacement} THEN excluded.is_anchor_place ELSE ${catalogSagasTable.isAnchorPlace} END`,
          ortName: sql`CASE WHEN ${isContentReplacement} THEN excluded.ort_name ELSE ${catalogSagasTable.ortName} END`,
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
