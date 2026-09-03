import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Kurzlebige, vom Wandernden bewusst gestartete Sicherheitsfreigabe.
 * Der eigentliche Token wird nie gespeichert — nur sein SHA-256-Hash.
 * So bleibt ein Datenbank-Leak für bestehende Freigabelinks nutzlos.
 */
export const safetySharesTable = pgTable("safety_shares", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  ownerId: text("owner_id").notNull(),
  routeName: text("route_name").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  latestLat: doublePrecision("latest_lat"),
  latestLng: doublePrecision("latest_lng"),
  latestAccuracy: doublePrecision("latest_accuracy"),
  latestUpdatedAt: timestamp("latest_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SafetyShareRow = typeof safetySharesTable.$inferSelect;