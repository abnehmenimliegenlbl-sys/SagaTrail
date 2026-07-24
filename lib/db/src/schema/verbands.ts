import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Tourismusverband-Accounts für das Verbandsportal.
 * Wird vom Admin manuell angelegt (analog zu partnersTable).
 * Login via Magic-Link / Token (verbandTokensTable).
 */
export const verbandsTable = pgTable("verbands", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  email:          text("email").notNull().unique(),
  kontaktName:    text("kontakt_name").notNull(),
  kontaktTelefon: text("kontakt_telefon"),
  /** Kommagetrennte Kantone (Vollnamen), z.B. "Bern,Freiburg" oder "alle" */
  kantone:        text("kantone").notNull(),
  isActive:       boolean("is_active").notNull().default(true),
  notizen:        text("notizen"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VerbandRow = typeof verbandsTable.$inferSelect;
