import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Merkt sich, wann die Routen eines Kantons zuletzt aus OpenStreetMap geladen
 * wurden. Dient als Cache-Ablaufmarke (TTL), damit nicht bei jedem Aufruf neu
 * gegen Overpass/swisstopo abgefragt wird.
 */
export const cantonFetchesTable = pgTable("canton_fetches", {
  canton: text("canton").primaryKey(),
  routeCount: doublePrecision("route_count").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCantonFetchSchema = createInsertSchema(cantonFetchesTable).omit(
  { fetchedAt: true },
);
export type InsertCantonFetch = z.infer<typeof insertCantonFetchSchema>;
export type CantonFetchRow = typeof cantonFetchesTable.$inferSelect;
