import { boolean, doublePrecision, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Katalog-Tabelle der Wanderrouten. Spiegelt die HikingRoute-Struktur der App;
 * der Server ist die verbindliche Quelle, die App faellt offline auf Seed-Daten
 * zurueck. Koordinaten sind der Ausgangspunkt und Kartenmittelpunkt.
 */
export const catalogRoutesTable = pgTable("catalog_routes", {
  id: text("id").primaryKey(),
  sagaId: text("saga_id").notNull(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  ascentM: doublePrecision("ascent_m").notNull(),
  maxElevationM: doublePrecision("max_elevation_m").notNull().default(0),
  minutes: doublePrecision("minutes").notNull(),
  sac: text("sac").notNull(),
  terrain: text("terrain").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  featured: boolean("featured").notNull().default(false),
});

export const insertCatalogRouteSchema = createInsertSchema(catalogRoutesTable);
export type InsertCatalogRoute = z.infer<typeof insertCatalogRouteSchema>;
export type CatalogRouteRow = typeof catalogRoutesTable.$inferSelect;
