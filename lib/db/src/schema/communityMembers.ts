import { pgTable, timestamp, unique, uuid, text } from "drizzle-orm/pg-core";
import { communitiesTable } from "./communities";

export const communityMembersTable = pgTable(
  "community_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communitiesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("community_members_community_user_unique").on(table.communityId, table.userId),
  ],
);

export type CommunityMemberRow = typeof communityMembersTable.$inferSelect;