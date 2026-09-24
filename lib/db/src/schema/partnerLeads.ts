import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Einheitliche Lead-Tabelle – ersetzt WP-MySQL als primäre Quelle.
 * quelle: 'leads' = OSM/WP sagatrail_partner_leads
 *         'orgs'  = WP organisationen (Verbände/Vereine)
 *         'osm'   = direkt aus OSM-Suche (Admin-Dashboard)
 */
export const partnerLeadsTable = pgTable("partner_leads", {
  id:        uuid("id").primaryKey().defaultRandom(),
  quelle:    text("quelle").notNull().default("leads"),   // 'leads' | 'orgs' | 'osm'
  osmId:     text("osm_id"),            // natürlicher Key für leads/osm
  name:      text("name").notNull(),
  email:     text("email"),
  kanton:    text("kanton").notNull().default(""),
  sprache:   text("sprache").notNull().default("DE"),
  route:     text("route").notNull().default(""),
  typ:       text("typ").notNull().default(""),
  kategorie: text("kategorie"),
  satz:      text("satz"),              // anschreiben_satz (aus orgs)
  adresse:   text("adresse"),
  telefon:   text("telefon"),
  website:   text("website"),
  routeId:   text("route_id"),
  lat:       real("lat"),
  lng:       real("lng"),
  tier:      text("tier"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_pl_quelle_osm")
    .on(table.quelle, table.osmId)
    .where(sql`${table.osmId} IS NOT NULL`),
  uniqueIndex("idx_pl_orgs_email")
    .on(table.email)
    .where(sql`${table.quelle} = 'orgs' AND ${table.email} IS NOT NULL`),
  index("idx_pl_kanton").on(table.kanton),
  index("idx_pl_quelle").on(table.quelle),
]);
