import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * KI-generierte Sagen, die 1:1 zu einer dynamisch geladenen Wanderroute
 * (external_routes) gehoeren. Die Sage ist am realen Ort der Route verankert
 * (lat/lng) und wird einmalig via Anthropic erzeugt und dann gecacht. Die
 * Struktur spiegelt catalog_sagas, damit die Story-Erzeugung beide Quellen
 * gleich behandeln kann. `id` ist gleich der Routen-Id.
 */
export const routeSagasTable = pgTable("route_sagas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  canton: text("canton").notNull(),
  coreMotif: text("core_motif").notNull(),
  mood: text("mood").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isAnchorPlace: boolean("is_anchor_place").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRouteSagaSchema = createInsertSchema(routeSagasTable).omit({
  createdAt: true,
});
export type InsertRouteSaga = z.infer<typeof insertRouteSagaSchema>;
export type RouteSagaRow = typeof routeSagasTable.$inferSelect;
