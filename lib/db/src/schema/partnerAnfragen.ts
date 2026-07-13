import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type PartnerAnfrageStatus =
  | "neu"
  | "in_bearbeitung"
  | "abgelehnt"
  | "aktiv";

export type PartnerAnfragePaket =
  | "basic"
  | "standard"
  | "premium";

/**
 * Eingehende Partnerschafts-Anfragen vom WordPress-Formular.
 * Werden nach Prüfung manuell in die partners-Tabelle übernommen.
 */
export const partnerAnfragenTable = pgTable("partner_anfragen", {
  id:             text("id").primaryKey(),
  betriebsName:   text("betriebs_name").notNull(),
  kategorie:      text("kategorie").notNull(),
  canton:         text("canton").notNull(),
  beschreibung:   text("beschreibung"),
  angebot:        text("angebot"),
  website:        text("website"),
  adresse:        text("adresse"),
  plz:            text("plz"),
  ort:            text("ort"),
  kontaktName:    text("kontakt_name").notNull(),
  kontaktEmail:   text("kontakt_email").notNull(),
  kontaktTelefon: text("kontakt_telefon"),
  paket:          text("paket").$type<PartnerAnfragePaket>().notNull().default("standard"),
  status:         text("status").$type<PartnerAnfrageStatus>().notNull().default("neu"),
  notizen:        text("notizen"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartnerAnfrageSchema = createInsertSchema(partnerAnfragenTable).omit({
  createdAt: true,
  updatedAt: true,
  status: true,
  notizen: true,
});
export type InsertPartnerAnfrage = z.infer<typeof insertPartnerAnfrageSchema>;
export type PartnerAnfrageRow = typeof partnerAnfragenTable.$inferSelect;
