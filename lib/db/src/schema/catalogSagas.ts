import { boolean, doublePrecision, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Katalog-Tabelle der Sagen (Metadaten). Die eigentliche kapitelweise
 * Erzaehlung wird nicht hier, sondern in `stories` gecacht. Koordinaten sind
 * optional, da nicht jede Sage einen exakten Ankerort besitzt.
 */
export const catalogSagasTable = pgTable("catalog_sagas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  canton: text("canton").notNull(),
  coreMotif: text("core_motif").notNull(),
  mood: text("mood").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isAnchorPlace: boolean("is_anchor_place").notNull().default(false),
});

export const insertCatalogSagaSchema = createInsertSchema(catalogSagasTable);
export type InsertCatalogSaga = z.infer<typeof insertCatalogSagaSchema>;
export type CatalogSagaRow = typeof catalogSagasTable.$inferSelect;
