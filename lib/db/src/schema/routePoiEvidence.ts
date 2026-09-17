import { doublePrecision, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Persistierter Beleg dafür, dass ein OSM-POI bei der letzten erfolgreichen
 * Overpass-Prüfung nahe an einer konkreten Route lag und ein Thema begründet.
 *
 * Die Tabelle ist absichtlich kein allgemeiner POI-Cache: Ein Eintrag gehört
 * immer zu Route + Themenbeleg. Dadurch kann ein erfolgreicher Refresh
 * veraltete oder nicht mehr vorhandene POIs atomar aus dem sichtbaren
 * Themenbestand entfernen, ohne andere Live-Kartensuchen zu beeinflussen.
 */
export const routePoiEvidenceTable = pgTable(
  "route_poi_evidence",
  {
    id: text("id").primaryKey(),
    routeId: text("route_id").notNull(),
    poiId: text("poi_id").notNull(),
    themeKey: text("theme_key").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    distanceKm: doublePrecision("distance_km").notNull(),
    source: text("source").notNull().default("OpenStreetMap"),
    sourceUrl: text("source_url").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    routePoiThemeUnique: uniqueIndex("route_poi_evidence_route_poi_theme_idx").on(
      table.routeId,
      table.poiId,
      table.themeKey,
    ),
  }),
);

export const insertRoutePoiEvidenceSchema = createInsertSchema(routePoiEvidenceTable);
export type InsertRoutePoiEvidence = z.infer<typeof insertRoutePoiEvidenceSchema>;
export type RoutePoiEvidenceRow = typeof routePoiEvidenceTable.$inferSelect;