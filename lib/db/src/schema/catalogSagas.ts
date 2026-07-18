import { boolean, doublePrecision, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

/**
 * Genauigkeit der Ortszuordnung einer Sage:
 * - "exakt": Die Quelle nennt einen konkreten, real existierenden Ort.
 * - "ungefaehr": Region/Tal ist belegt, aber kein punktgenauer Ort.
 * - "nicht_lokalisierbar": Die Sage laesst sich keinem realen Ort zuordnen.
 */
export type KoordinatenSicherheit = "exakt" | "ungefaehr" | "nicht_lokalisierbar";

/**
 * Eine pro Zielsprache eigenstaendig verfasste Zusammenfassung. `reviewEmpfohlen`
 * markiert Sprachen, deren Qualitaet noch geprueft werden sollte (die
 * Zusammenfassung wird trotzdem ausgeliefert, nicht weggelassen).
 */
export interface LocalizedSummary {
  text: string;
  title?: string;
  reviewEmpfohlen: boolean;
}

/**
 * Vollstaendige, stichprobenartig ueberpruefbare Quellenangabe. Die
 * `fundstelleUrl` darf auf eine Sammelseite verweisen, muss aber nachvollziehbar
 * sein. Es werden ausschliesslich gemeinfreie historische Sagensammlungen
 * verwendet.
 */
export interface SagaQuelle {
  autor: string;
  werk: string;
  jahr: string;
  fundstelleUrl: string;
}

/**
 * Katalog-Tabelle der kuratierten, gemeinfrei belegten Sagen. Die App liest
 * ausschliesslich aus diesen recherchierten Eintraegen; frei erfundene Sagen
 * gibt es nicht mehr. Die kapitelweise Erzaehlung wird weiterhin in `stories`
 * gecacht. Koordinaten sind optional und nur gesetzt, wenn die Quelle die Sage
 * einem realen Ort zuordnet.
 */
export const catalogSagasTable = pgTable("catalog_sagas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  canton: text("canton").notNull(),
  coreMotif: text("core_motif").notNull(),
  // Konkreter, fotografierbarer Suchbegriff fuer das Sagenbild (z. B.
  // "Vogel Gryff Basel", "Braunbär"), unabhaengig vom Handlungsort.
  bildmotiv: text("bildmotiv"),
  mood: text("mood").notNull(),
  // Deutsche Kurzfassung; dient als Anzeige-Default und Fallback.
  summary: text("summary").notNull(),
  // Pro Sprache eigenstaendig verfasste Zusammenfassungen (inkl. Deutsch).
  summaries: jsonb("summaries")
    .$type<Record<string, LocalizedSummary>>()
    .notNull()
    .default({}),
  // Kurze Regieanweisung, welche Stellen fuer juengeres Publikum abgemildert
  // werden sollten (keine drei separaten Textversionen).
  altersstufenHinweis: text("altersstufen_hinweis"),
  // Strukturierte Quellenangabe (gemeinfreie historische Sammlung).
  quelle: jsonb("quelle").$type<SagaQuelle>(),
  // Menschlich lesbare Kurz-Quelle (aus `quelle` abgeleitet, Abwaertskompat.).
  source: text("source").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  koordinatenSicherheit: text("koordinaten_sicherheit")
    .$type<KoordinatenSicherheit>()
    .notNull()
    .default("nicht_lokalisierbar"),
  isAnchorPlace: boolean("is_anchor_place").notNull().default(false),
  // Gecachtes Foto aus Wikimedia Commons (Motiv-Suche via bildmotiv).
  // Wird beim ersten erfolgreichen /sagas/photo-Aufruf persistent gesetzt
  // und danach direkt in der Katalog-Antwort mitgeliefert (kein Extra-Request).
  fotoUrl: text("foto_url"),
  fotoAttribution: text("foto_attribution"),
});

export const insertCatalogSagaSchema = createInsertSchema(catalogSagasTable);
// Drizzle-Insert-Typ: behaelt die per $type verengten Union-Typen (z. B.
// koordinatenSicherheit), die aus dem zod-abgeleiteten Typ verloren gingen.
export type InsertCatalogSaga = typeof catalogSagasTable.$inferInsert;
export type CatalogSagaRow = typeof catalogSagasTable.$inferSelect;
