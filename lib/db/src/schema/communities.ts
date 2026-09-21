import { boolean, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const communitiesTable = pgTable(
  "communities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    administratorName: text("administrator_name").notNull(),
    language: text("language").notNull().default("de"),
    coverImageUrl: text("cover_image_url"),
    facebookGroupUrl: text("facebook_group_url"),
    announcement: text("announcement"),
    inviteCode: text("invite_code").notNull(),
    appStoreUrl: text("app_store_url").notNull(),
    playStoreUrl: text("play_store_url").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("communities_slug_unique").on(table.slug),
    unique("communities_invite_code_unique").on(table.inviteCode),
    index("communities_active_idx").on(table.active),
  ],
);

export type CommunityRow = typeof communitiesTable.$inferSelect;