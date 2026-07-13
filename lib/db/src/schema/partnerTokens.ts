import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Magic-Link-Tokens fuer das Partner-Self-Service-Portal.
 * 24h gueltig; erlaubt dem Partner eigene Stammdaten und Statistiken
 * einzusehen sowie Foto-URL / Beschreibung zu bearbeiten.
 */
export const partnerTokensTable = pgTable("partner_tokens", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerTokenRow = typeof partnerTokensTable.$inferSelect;
