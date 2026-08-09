import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

export const androidBetaTesterTable = pgTable("android_beta_testers", {
  id:              uuid("id").primaryKey().defaultRandom(),
  email:           text("email").notNull().unique(),
  name:            text("name"),
  /** true sobald die E-Mail im Play Console Tester-Track eingetragen wurde */
  addedToPlay:     boolean("added_to_play").notNull().default(false),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
