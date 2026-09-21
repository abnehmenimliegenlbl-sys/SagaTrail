import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { meetupsTable } from "./meetups";

export const meetupPhotoSubmissionsTable = pgTable(
  "meetup_photo_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id").notNull(),
    objectPath: text("object_path").notNull(),
    contentType: text("content_type").notNull().default("image/jpeg"),
    rightsConsentVersion: text("rights_consent_version").notNull(),
    rightsConsentAt: timestamp("rights_consent_at", { withTimezone: true }).notNull().defaultNow(),
    depictedPeopleConsentVersion: text("depicted_people_consent_version").notNull(),
    depictedPeopleConsentAt: timestamp("depicted_people_consent_at", { withTimezone: true }).notNull().defaultNow(),
    selectedAt: timestamp("selected_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("meetup_photo_submissions_meetup_created_idx").on(table.meetupId, table.createdAt),
    index("meetup_photo_submissions_uploader_idx").on(table.uploaderId, table.createdAt),
    check("meetup_photo_submissions_type_check", sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp')`),
  ],
);

export type MeetupPhotoSubmissionRow = typeof meetupPhotoSubmissionsTable.$inferSelect;