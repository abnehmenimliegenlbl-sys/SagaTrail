import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const verbandTokensTable = pgTable("verband_tokens", {
  id:        text("id").primaryKey(),
  verbandId: text("verband_id").notNull(),
  token:     text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
