import { boolean, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Berechtigte Community-Administratoren für das bestehende Magic-Link-Portal.
 * `communityId` bleibt beim Einrichten zunächst leer und wird beim ersten
 * Anlegen der Community gesetzt.
 */
export const communityAdminsTable = pgTable(
  "community_admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    active: boolean("active").notNull().default(true),
    communityId: uuid("community_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("community_admins_email_unique").on(table.email),
    unique("community_admins_community_unique").on(table.communityId),
    index("community_admins_active_idx").on(table.active),
  ],
);

export type CommunityAdminRow = typeof communityAdminsTable.$inferSelect;