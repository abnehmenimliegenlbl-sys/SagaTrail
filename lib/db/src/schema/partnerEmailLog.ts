import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Jede versendete (oder fehlgeschlagene) E-Mail einer Kampagne. */
export const partnerEmailLogTable = pgTable("partner_email_log", {
  id:            uuid("id").primaryKey().defaultRandom(),
  campaignId:    uuid("campaign_id").notNull(),
  subject:       text("subject").notNull(),
  email:         text("email").notNull(),
  recipientName: text("recipient_name"),
  status:        text("status").notNull(), // 'ok' | 'fail'
  error:         text("error"),
  sentAt:        timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

/** E-Mail-Adressen die sich abgemeldet haben. */
export const partnerEmailBlocklistTable = pgTable("partner_email_blocklist", {
  id:        uuid("id").primaryKey().defaultRandom(),
  email:     text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
