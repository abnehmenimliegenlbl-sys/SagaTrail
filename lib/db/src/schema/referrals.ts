import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Verfolgt Einladungsbeziehungen zwischen Nutzern.
 * Ein Eintrag entsteht, wenn ein neuer Nutzer den Einladungscode
 * eines bestehenden Nutzers einlöst (POST /referrals/claim).
 * Status wechselt zu "rewarded", sobald der Eingeladene Premium kauft.
 */
export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  inviterId: text("inviter_id").notNull(),
  inviteeId: text("invitee_id").notNull().unique(), // ein Code pro Eingeladenen
  status: text("status").notNull().default("pending"), // pending | rewarded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rewardedAt: timestamp("rewarded_at", { withTimezone: true }),
});

export type ReferralRow = typeof referralsTable.$inferSelect;
