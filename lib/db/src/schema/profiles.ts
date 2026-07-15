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
  // Admin-Reset-Sperre: solange in der Zukunft, ignoriert /me/premium/sync ein
  // aktives RevenueCat-Abo bewusst, damit ein manueller Dev-Reset (premium=false)
  // nicht sofort durch den naechsten Client-Sync wieder ueberschrieben wird.
  premiumSyncLockedUntil: timestamp("premium_sync_locked_until", { withTimezone: true }),
  freeHikeUsed: boolean("free_hike_used").notNull().default(false),
  // Serverseitiger Abgleich des lokal auf dem Geraet gefuehrten Wanderverlaufs
  // und der Errungenschaften (siehe /me/progress/sync). Verhindert Datenverlust
  // bei Ab-/Anmelden oder Geraetewechsel, da AsyncStorage sonst die einzige Quelle war.
  hikeHistory: jsonb("hike_history").notNull().default([]),
  achievements: jsonb("achievements").notNull().default([]),
  // Freigeschaltete Kantonspack-Slugs (z. B. ["uri", "bern"]). Wird vom
  // Server beim Claim befuellt statt ueber einen RevenueCat-Entitlement-Grant,
  // da der RC-Connector-Key nur Lesezugriff hat.
  purchasedPacks: text("purchased_packs").array().notNull().default([]),
  // Expo-Push-Token des Geraets (null = nicht registriert oder widerrufen).
  // Wird beim App-Start gesetzt und fuer Gruppen-Push-Benachrichtigungen verwendet.
  pushToken: text("push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileRow = typeof profilesTable.$inferSelect;
