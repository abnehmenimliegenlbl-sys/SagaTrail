import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cache fuer real existierende Wanderrouten, die dynamisch aus OpenStreetMap
 * (Overpass) je Kanton geladen und mit amtlichen swisstopo-Hoehendaten
 * angereichert werden. `geometry` haelt einen ausgeduennten Wegverlauf
 * ([lat, lng]-Paare) fuer spaetere Kartendarstellung. Pro Route wird 1:1 eine
 * KI-Sage erzeugt; deshalb ist `sagaId` gleich der Routen-Id.
 */
export const externalRoutesTable = pgTable("external_routes", {
  id: text("id").primaryKey(),
  sagaId: text("saga_id").notNull(),
  canton: text("canton").notNull(),
  name: text("name").notNull(),
  ref: text("ref"),
  distanceKm: doublePrecision("distance_km").notNull(),
  ascentM: doublePrecision("ascent_m").notNull(),
  minutes: doublePrecision("minutes").notNull(),
  sac: text("sac").notNull().default("unbekannt"),
  terrain: text("terrain").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  geometry: jsonb("geometry").notNull(),
  source: text("source").notNull(),
  featured: boolean("featured").notNull().default(false),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertExternalRouteSchema = createInsertSchema(externalRoutesTable);
export type InsertExternalRoute = z.infer<typeof insertExternalRouteSchema>;
export type ExternalRouteRow = typeof externalRoutesTable.$inferSelect;
