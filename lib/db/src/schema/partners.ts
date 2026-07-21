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

export type PartnerKategorie =
  | "restaurant"
  | "cafe"
  | "souvenir"
  | "uebernachtung"
  | "sac_huette"
  | "sonstiges";

export type Zahlungsstatus =
  | "ausstehend"
  | "bezahlt"
  | "mahnung1"
  | "mahnung2"
  | "gesperrt";

export const PAKET_PREISE: Record<string, { jahr: number; monat: number }> = {
  basic:    { jahr:  99, monat:   990 },
  standard: { jahr: 199, monat: 1990 },
  premium:  { jahr: 499, monat:    0 },
};

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
  telefon: text("telefon"),
  websiteUrl: text("website_url"),
  email: text("email"),
  paket: text("paket"),
  preisChf: integer("preis_chf"),
  einfuehrungspreisChf: integer("einfuehrungspreis_chf"),
  einfuehrungspreisGueltigBis: timestamp("einfuehrungspreis_gueltig_bis", { withTimezone: true }),
  zahlungsstatus: text("zahlungsstatus").$type<Zahlungsstatus>().default("ausstehend"),
  laufzeitStart: timestamp("laufzeit_start", { withTimezone: true }),
  laufzeitEnde: timestamp("laufzeit_ende", { withTimezone: true }),
  notizenIntern: text("notizen_intern"),
  oeffnungszeiten: text("oeffnungszeiten"),
  reservierungUrl: text("reservierung_url"),
  aktivVon: timestamp("aktiv_von", { withTimezone: true }),
  aktivBis: timestamp("aktiv_bis", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  views: integer("views").notNull().default(0),
  offersTapped: integer("offers_tapped").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partnersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type PartnerRow = typeof partnersTable.$inferSelect;
