import { jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cache fuer KI-generierte Sagen-Erzaehlungen. Ein Eintrag pro Kombination aus
 * Sage, Archetyp, Alterstufe und Sprache. `chapters` haelt die fertige
 * Kapitelstruktur (inkl. Entscheidungen) als JSON. So wird pro Variante nur
 * einmal ein Anthropic-Aufruf noetig.
 */
export const storiesTable = pgTable(
  "stories",
  {
    id: serial("id").primaryKey(),
    sagaId: text("saga_id").notNull(),
    archetype: text("archetype").notNull(),
    ageTier: text("age_tier").notNull(),
    lang: text("lang").notNull(),
    chapters: jsonb("chapters").notNull(),
    source: text("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("stories_variant_unique").on(t.sagaId, t.archetype, t.ageTier, t.lang)],
);

export const insertStorySchema = createInsertSchema(storiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStory = z.infer<typeof insertStorySchema>;
export type StoryRow = typeof storiesTable.$inferSelect;
