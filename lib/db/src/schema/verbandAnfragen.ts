import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type VerbandAnfrageStatus = "neu" | "in_bearbeitung" | "aktiv" | "abgelehnt";

/**
 * Eingehende Pilotpartnerschafts-Anfragen von Tourismusverbänden (sagatrail.ch/tourismusverband).
 * Nach Prüfung manuell in aktiv setzen; email wird später als Login-Basis genutzt.
 */
export const verbandAnfragenTable = pgTable("verband_anfragen", {
  id:                text("id").primaryKey(),
  verbandName:       text("verband_name").notNull(),
  email:             text("email").notNull(),
  kontaktName:       text("kontakt_name").notNull(),
  kontaktTelefon:    text("kontakt_telefon"),
  kantone:           text("kantone").notNull(), // comma-separated, z.B. "bern,zürich"
  status:            text("status").$type<VerbandAnfrageStatus>().notNull().default("neu"),
  contractSentAt:    timestamp("contract_sent_at", { withTimezone: true }),
  notizen:           text("notizen"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VerbandAnfrageRow = typeof verbandAnfragenTable.$inferSelect;
