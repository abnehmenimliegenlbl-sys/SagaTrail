import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Kategorie eines Partnerbetriebs entlang einer Route.
 */
export type PartnerKategorie =
  | "restaurant"
  | "cafe"
  | "souvenir"
  | "uebernachtung"
  | "sonstiges";

/**
 * Partnerbetriebe (Restaurants, Souvenirlaeden, ...) entlang der Routen, die
 * als Empfehlung/Anzeige in der App erscheinen. Werden ausschliesslich ueber
 * die Admin-Oberflaeche (/admin/partner) gepflegt, nie automatisch generiert.
 */
export const partnersTable = pgTable("partners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kategorie: text("kategorie").$type<PartnerKategorie>().notNull(),
  canton: text("canton").notNull(),
  beschreibung: text("beschreibung"),
  angebot: text("angebot"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  fotoUrl: text("foto_url"),
  aktivVon: timestamp("aktiv_von", { withTimezone: true }),
  aktivBis: timestamp("aktiv_bis", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  views: integer("views").notNull().default(0),
  offersTapped: integer("offers_tapped").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partnersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type PartnerRow = typeof partnersTable.$inferSelect;
