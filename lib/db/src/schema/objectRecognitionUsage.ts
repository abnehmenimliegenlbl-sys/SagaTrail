import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/**
 * Tageszaehler fuer die serverseitige Premium-Objekterkennung.
 * Der zusammengesetzte Schluessel verhindert einen separaten Zaehlereintrag
 * pro Geraet und erlaubt ein atomares Limit pro User und Kalendertag.
 */
export const objectRecognitionUsageTable = pgTable(
  "object_recognition_usage",
  {
    userId: text("user_id").notNull(),
    usageDate: date("usage_date").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.usageDate] })],
);

export type ObjectRecognitionUsageRow = typeof objectRecognitionUsageTable.$inferSelect;