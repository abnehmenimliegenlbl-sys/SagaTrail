import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Kurzlebige Magic-Link-Tokens für Community-Administratoren.
 */
export const communityPortalTokensTable = pgTable("community_portal_tokens", {
  id: text("id").primaryKey(),
  communityAdminId: uuid("community_admin_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});