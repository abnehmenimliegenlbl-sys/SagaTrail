import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const mediaContactsTable = pgTable("media_contacts", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  typ:       text("typ").notNull().default(""),
  kanton:    text("kanton").notNull().default(""),
  active:    boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});