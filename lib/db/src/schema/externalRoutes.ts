import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cache fuer real existierende Wanderrouten, die dynamisch aus OpenStreetMap
 * (Overpass) je Kanton geladen und mit amtlichen swisstopo-Hoehendaten
 * angereichert werden. `geometry` haelt einen ausgeduennten Wegverlauf
 * ([lat, lng]-Paare) fuer spaetere Kartendarstellung. Pro Route wird 1:1 eine
 * KI-Sage erzeugt; deshalb ist `sagaId` gleich der Routen-Id.
 */
export const externalRoutesTable = pgTable("external_routes", {
  id: text("id").primaryKey(),
  sagaId: text("saga_id").notNull(),
  canton: text("canton").notNull(),
  // Alle durchquerten Kantone (inkl. Startkanton) — fuer Multi-Kanton-Filter.
  // Leeres Array = noch nicht ermittelt (Backfill via Enrich-Cron).
  cantons: text("cantons").array().notNull().default([]),
  name: text("name").notNull(),
  ref: text("ref"),
  distanceKm: doublePrecision("distance_km").notNull(),
  // Amtliche Distanz aus dem OSM-Relation-Tag `distance` (SchweizMobil-Wert).
  // Null = kein Tag gesetzt (OSM-Kantonsrouten haben oft keinen Tag).
  // Wird im roten Balken (Kantonsliste) angezeigt; distanceKm bleibt die
  // aus der Geometrie berechnete Strecke (weisse Kachel, Navigation).
  distanceTagKm: doublePrecision("distance_tag_km"),
  ascentM: doublePrecision("ascent_m").notNull(),
  maxElevationM: doublePrecision("max_elevation_m").notNull().default(0),
  minutes: doublePrecision("minutes").notNull(),
  sac: text("sac").notNull().default("unbekannt"),
  // Herkunft der SAC-Angabe: exakter OSM-Tag, amtliche swissTLM3D-Ableitung,
  // oder unbekannt/noch nicht klassifiziert. SchweizMobil-Kategorien stehen
  // bewusst in den beiden separaten Feldern darunter und werden nicht in SAC
  // umgerechnet.
  sacSource: text("sac_source").notNull().default("unknown"),
  schweizMobilCondition: text("schweizmobil_condition"),
  schweizMobilTechnique: text("schweizmobil_technique"),
  terrain: text("terrain").notNull(),
  // Eignungswerte: redaktionelle Angaben haben Vorrang; der API-Filter darf
  // für fehlende Werte konservative technische Empfehlungen ergänzen.
  // NULL bedeutet weiterhin unbekannt und darf nicht als "nein" interpretiert werden.
  familyFriendly: boolean("family_friendly"),
  childFriendly: boolean("child_friendly"),
  dogsAllowed: boolean("dogs_allowed"),
  wheelchairAccessible: boolean("wheelchair_accessible"),
  technicalDifficulty: text("technical_difficulty"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  geometry: jsonb("geometry").notNull(),
  // Version des Verkettungs-Algorithmus, mit dem `geometry` erzeugt wurde.
  // Aeltere Versionen gelten als abgelaufen und werden neu geladen (z.B. nach
  // der Korrektur der Zickzack-Verkettung).
  geometryVersion: doublePrecision("geometry_version").notNull().default(1),
  source: text("source").notNull(),
  featured: boolean("featured").notNull().default(false),
  photoUrl: text("photo_url"),
  photoAttribution: text("photo_attribution"),
  // Routentyp: nwn | rwn | lwn | kantonal
  routeType: text("route_type"),
  // Ist diese Route eine Etappe einer Gesamtroute?
  isEtappe: boolean("is_etappe").notNull().default(false),
  // Kurzbeschreibung aus Wikipedia (de) fuer amtliche Wanderland-Routen 1-999
  // (Etappen erben den Artikel der Gesamtroute). Null = noch nicht geholt.
  description: text("description"),
  // Quell-URL des Wikipedia-Artikels zur Beschreibung.
  descriptionSource: text("description_source"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertExternalRouteSchema = createInsertSchema(externalRoutesTable);
export type InsertExternalRoute = z.infer<typeof insertExternalRouteSchema>;
export type ExternalRouteRow = typeof externalRoutesTable.$inferSelect;
