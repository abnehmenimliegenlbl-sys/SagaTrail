import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Nutzerprofil, verknuepft mit der Clerk-Benutzer-ID (`id` = Clerk `userId`).
 * Ersetzt den rein lokalen AsyncStorage-Zustand als Quelle der Wahrheit;
 * das mobile Geraet spiegelt dieses Profil weiterhin offline in AsyncStorage.
 */
export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  archetype: text("archetype").notNull(),
  homeCanton: text("home_canton").notNull(),
  language: text("language").notNull(),
  ageTier: text("age_tier").notNull(),
  premium: boolean("premium").notNull().default(false),
  // Befristetes Premium (z. B. manuell freigeschaltet): aktiv solange in der Zukunft.
  premiumBis: timestamp("premium_bis", { withTimezone: true }),
  freeHikeUsed: boolean("free_hike_used").notNull().default(false),
  // Serverseitiger Abgleich des lokal auf dem Geraet gefuehrten Wanderverlaufs
  // und der Errungenschaften (siehe /me/progress/sync). Verhindert Datenverlust
  // bei Ab-/Anmelden oder Geraetewechsel, da AsyncStorage sonst die einzige Quelle war.
  hikeHistory: jsonb("hike_history").notNull().default([]),
  achievements: jsonb("achievements").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileRow = typeof profilesTable.$inferSelect;
