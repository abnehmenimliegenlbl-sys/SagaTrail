import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, gte, inArray, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  db,
  groupHikeCompletionsTable,
  meetupBlocksTable,
  meetupNotificationOutboxTable,
  meetupParticipantsTable,
  meetupReportsTable,
  meetupsTable,
  profilesTable,
} from "@workspace/db";

const router: IRouter = Router();

// Kept in lockstep with artifacts/mobile/lib/rank.ts.  Meetup rank data is
// computed only from the server's group-completion ledger.
const RANK_THRESHOLDS = [0, 30, 60, 100, 150, 220, 300, 400, 550, 750] as const;
const POINTS_PER_SAGA = 10;
const POINTS_PER_HIKE = 15;
const GROUP_HIKE_MILESTONES = [1, 3, 5, 10, 15, 20] as const;

function rankLevel(completedCount: number): number {
  const earnedMilestoneCount = GROUP_HIKE_MILESTONES
    .filter((threshold) => completedCount >= threshold)
    .length;
  const points = completedCount * POINTS_PER_HIKE + earnedMilestoneCount * POINTS_PER_SAGA;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= RANK_THRESHOLDS[i]) return i;
  }
  return 0;
}

function groupAchievements(completedCount: number): Array<{
  id: string;
  threshold: number;
  title: string;
}> {
  return GROUP_HIKE_MILESTONES
    .filter((threshold) => completedCount >= threshold)
    .map((threshold) => ({
      id: `group_hikes_${threshold}`,
      threshold,
      title: `${threshold}. Gruppenwanderung`,
    }));
}

const CreateMeetupSchema = z.object({
  routeId: z.string().trim().min(1).max(180),
  routeName: z.string().trim().min(1).max(180),
  canton: z.string().trim().min(1).max(80),
  startsAt: z.string().datetime({ offset: true }),
  maxParticipants: z.number().int().min(2).max(30).default(8),
  pace: z.enum(["gemuetlich", "normal", "sportlich"]).default("gemuetlich"),
  note: z.string().trim().max(500).nullable().optional(),
});
const ReportMeetupSchema = z.object({
  reason: z.enum(["safety", "harassment", "spam", "other"]),
  reportedUserId: z.string().trim().min(1).optional(),
  note: z.string().trim().max(500).optional(),
});
const CancelMeetupSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});
const MeetupMessageSchema = z.object({
  messageText: z.string().trim().min(1).max(500),
});
const MeetupAttendanceSchema = z.object({
  status: z.enum(["confirmed", "delayed", "arrived"]),
  delayMinutes: z.number().int().min(5).max(180).nullable().optional(),
}).superRefine((value, context) => {
  if (value.status === "delayed" && value.delayMinutes == null) {
    context.addIssue({ code: "custom", path: ["delayMinutes"], message: "Verspätungsdauer erforderlich" });
  }
  if (value.status !== "delayed" && value.delayMinutes != null) {
    context.addIssue({ code: "custom", path: ["delayMinutes"], message: "Verspätungsdauer nur bei Verspätung erlaubt" });
  }
});

function requireUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return null;
  }
  return userId;
}

function parseFrom(value: unknown): Date {
  if (typeof value !== "string") return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const month = now.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 13 && age <= 120 ? age : null;
}

async function profileNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ id: profilesTable.id, name: profilesTable.name })
    .from(profilesTable)
    .where(inArray(profilesTable.id, ids));
  return new Map(rows.map((row) => [row.id, row.name]));
}

function shapeMeetup(
  row: typeof meetupsTable.$inferSelect,
  participantCount: number,
  organizerName: string,
  joined: boolean,
  isOrganizer = false,
  includePrivateStatus = false,
) {
  return {
    id: row.id,
    routeId: row.routeId,
    routeName: row.routeName,
    canton: row.canton,
    startsAt: row.startsAt.toISOString(),
    maxParticipants: row.maxParticipants,
    participantCount,
    pace: row.pace,
    note: row.note,
    organizerName,
    joined,
    status: row.status,
    ...(includePrivateStatus
      ? {
          cancellationReason: row.cancellationReason,
          cancelledAt: row.cancelledAt?.toISOString() ?? null,
        }
      : {}),
    isOrganizer,
  };
}

async function cancelMeetupForOrganizer(
  meetupId: string,
  organizerId: string,
  cancellationReason: string,
): Promise<"ok" | "not_found"> {
  return db.transaction(async (tx) => {
    const [meetup] = await tx
      .select({
        organizerId: meetupsTable.organizerId,
        status: meetupsTable.status,
      })
      .from(meetupsTable)
      .where(eq(meetupsTable.id, meetupId))
      .for("update")
      .limit(1);
    if (!meetup || meetup.organizerId !== organizerId || meetup.status !== "scheduled") {
      return "not_found";
    }

    const [actor] = await tx
      .select({ name: profilesTable.name })
      .from(profilesTable)
      .where(eq(profilesTable.id, organizerId))
      .limit(1);
    const now = new Date();
    await tx
      .update(meetupsTable)
      .set({
        status: "cancelled",
        cancellationReason,
        cancelledAt: now,
        sharedTokenHash: null,
        shareExpiresAt: null,
        updatedAt: now,
      })
      .where(eq(meetupsTable.id, meetupId));

    const participantRows = await tx
      .select({ userId: meetupParticipantsTable.userId })
      .from(meetupParticipantsTable)
      .where(eq(meetupParticipantsTable.meetupId, meetupId));
    const recipientIds = new Set(participantRows.map((row) => row.userId));
    recipientIds.delete(organizerId);
    if (recipientIds.size) {
      await tx
        .insert(meetupNotificationOutboxTable)
        .values(
          [...recipientIds].map((recipientUserId) => ({
            meetupId,
            recipientUserId,
            type: "meetup_cancelled",
            dedupeKey: `${meetupId}:${recipientUserId}:meetup_cancelled`,
            actorName: actor?.name ?? null,
            cancellationReason,
          })),
        )
        .onConflictDoNothing();
    }
    return "ok";
  });
}

async function transitionMeetup(
  meetupId: string,
  userId: string,
  from: "scheduled" | "in_progress",
  to: "in_progress" | "completed",
): Promise<"ok" | "not_found" | "forbidden" | "invalid"> {
  return db.transaction(async (tx) => {
    const [meetup] = await tx.select({
      organizerId: meetupsTable.organizerId,
      status: meetupsTable.status,
    }).from(meetupsTable).where(eq(meetupsTable.id, meetupId)).for("update").limit(1);
    if (!meetup) return "not_found";
    if (meetup.organizerId !== userId) return "forbidden";
    if (meetup.status === to) return "ok";
    if (meetup.status !== from) return "invalid";
    const now = new Date();
    await tx.update(meetupsTable).set({ status: to, updatedAt: now }).where(eq(meetupsTable.id, meetupId));
    const [actor] = await tx.select({ name: profilesTable.name }).from(profilesTable)
      .where(eq(profilesTable.id, userId)).limit(1);
    const participants = await tx.select({ userId: meetupParticipantsTable.userId })
      .from(meetupParticipantsTable).where(eq(meetupParticipantsTable.meetupId, meetupId));
    const recipients = participants.map(({ userId: recipientUserId }) => recipientUserId).filter((id) => id !== userId);
    if (recipients.length) {
      await tx.insert(meetupNotificationOutboxTable).values(recipients.map((recipientUserId) => ({
        meetupId, recipientUserId, type: to === "in_progress" ? "meetup_started" : "meetup_completed",
        dedupeKey: `${meetupId}:${recipientUserId}:${to}`,
        actorName: actor?.name ?? null, actorUserId: userId,
      }))).onConflictDoNothing();
    }
    return "ok";
  });
}

router.post("/meetups/:id/start", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const result = await transitionMeetup(String(req.params.id), userId, "scheduled", "in_progress");
  if (result === "not_found") { res.status(404).json({ error: "Treffpunkt nicht gefunden" }); return; }
  if (result === "forbidden") { res.status(403).json({ error: "Nur der Organisator darf den Treffpunkt starten" }); return; }
  if (result === "invalid") { res.status(409).json({ error: "Dieser Treffpunkt kann nicht mehr gestartet werden" }); return; }
  res.json({ status: "in_progress" });
});

router.post("/meetups/:id/complete", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const result = await transitionMeetup(String(req.params.id), userId, "in_progress", "completed");
  if (result === "not_found") { res.status(404).json({ error: "Treffpunkt nicht gefunden" }); return; }
  if (result === "forbidden") { res.status(403).json({ error: "Nur der Organisator darf den Treffpunkt abschliessen" }); return; }
  if (result === "invalid") { res.status(409).json({ error: "Dieser Treffpunkt kann nicht abgeschlossen werden" }); return; }
  res.json({ status: "completed" });
});

router.post("/meetups/:id/messages", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = MeetupMessageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Nachricht muss 1 bis 500 Zeichen enthalten" }); return; }
  const meetupId = String(req.params.id);
  const result = await db.transaction(async (tx) => {
    const [meetup] = await tx.select({
      organizerId: meetupsTable.organizerId, status: meetupsTable.status,
    }).from(meetupsTable).where(eq(meetupsTable.id, meetupId)).for("update").limit(1);
    if (!meetup) return "not_found" as const;
    if (meetup.status === "completed" || meetup.status === "cancelled") return "closed" as const;
    const [membership] = await tx.select({ userId: meetupParticipantsTable.userId })
      .from(meetupParticipantsTable).where(and(eq(meetupParticipantsTable.meetupId, meetupId), eq(meetupParticipantsTable.userId, userId))).limit(1);
    const organizer = meetup.organizerId === userId;
    if (!organizer && !membership) return "forbidden" as const;
    if (!organizer && meetup.status !== "in_progress") return "not_started" as const;
    const cutoff = new Date(Date.now() - 30_000);
    const [recent] = await tx.select({ id: meetupNotificationOutboxTable.id })
      .from(meetupNotificationOutboxTable).where(and(
        eq(meetupNotificationOutboxTable.meetupId, meetupId),
        eq(meetupNotificationOutboxTable.type, "meetup_message"),
        eq(meetupNotificationOutboxTable.actorUserId, userId),
        gte(meetupNotificationOutboxTable.createdAt, cutoff),
      )).limit(1);
    if (recent) return "rate_limited" as const;
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
      .from(meetupNotificationOutboxTable).where(and(
        eq(meetupNotificationOutboxTable.meetupId, meetupId),
        eq(meetupNotificationOutboxTable.type, "meetup_message"),
      ));
    if (Number(count) >= 30) return "limit" as const;
    const participants = await tx.select({ userId: meetupParticipantsTable.userId })
      .from(meetupParticipantsTable).where(eq(meetupParticipantsTable.meetupId, meetupId));
    const [actor] = await tx.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
    const recipients = participants.map(({ userId: id }) => id).filter((id) => id !== userId);
    if (recipients.length) await tx.insert(meetupNotificationOutboxTable).values(recipients.map((recipientUserId) => ({
      meetupId, recipientUserId, type: "meetup_message", dedupeKey: `${meetupId}:${userId}:${Date.now()}:${recipientUserId}`,
      actorName: actor?.name ?? null, actorUserId: userId, messageText: parsed.data.messageText,
    }))).execute();
    return "ok" as const;
  });
  if (result === "not_found") { res.status(404).json({ error: "Treffpunkt nicht gefunden" }); return; }
  if (result === "forbidden") { res.status(403).json({ error: "Nur Mitglieder dürfen Nachrichten senden" }); return; }
  if (result === "not_started") { res.status(409).json({ error: "Teilnehmer dürfen erst während der Wanderung schreiben" }); return; }
  if (result === "closed") { res.status(409).json({ error: "Dieser Treffpunkt ist beendet" }); return; }
  if (result === "rate_limited") { res.status(429).json({ error: "Bitte warte 30 Sekunden bis zur nächsten Nachricht" }); return; }
  if (result === "limit") { res.status(429).json({ error: "Für diesen Treffpunkt sind maximal 30 Nachrichten erlaubt" }); return; }
  res.status(201).json({ sent: true });
});

router.get("/meetups", async (req, res): Promise<void> => {
  const currentUserId = getAuth(req)?.userId ?? null;
  const from = parseFrom(req.query.from);
  const routeId = typeof req.query.routeId === "string" ? req.query.routeId.trim() : "";
  const blockedRows = currentUserId
    ? await db
        .select({ userId: meetupBlocksTable.blockedUserId })
        .from(meetupBlocksTable)
        .where(eq(meetupBlocksTable.blockerId, currentUserId))
    : [];
  const blockedByRows = currentUserId
    ? await db
        .select({ userId: meetupBlocksTable.blockerId })
        .from(meetupBlocksTable)
        .where(eq(meetupBlocksTable.blockedUserId, currentUserId))
    : [];
  const blockedIds = [...blockedRows, ...blockedByRows].map((row) => row.userId);

  const rows = await db
    .select({
      meetup: meetupsTable,
      participantCount: sql<number>`count(${meetupParticipantsTable.userId})::int`,
    })
    .from(meetupsTable)
    .leftJoin(
      meetupParticipantsTable,
      eq(meetupParticipantsTable.meetupId, meetupsTable.id),
    )
    .where(
      and(
        gte(meetupsTable.startsAt, from),
        eq(meetupsTable.status, "scheduled"),
        routeId ? eq(meetupsTable.routeId, routeId) : undefined,
        blockedIds.length ? notInArray(meetupsTable.organizerId, blockedIds) : undefined,
      ),
    )
    .groupBy(meetupsTable.id)
    .orderBy(asc(meetupsTable.startsAt))
    .limit(100);

  const organizerNames = await profileNames(rows.map(({ meetup }) => meetup.organizerId));
  let joinedIds = new Set<string>();
  if (currentUserId && rows.length) {
    const joinedRows = await db
      .select({ meetupId: meetupParticipantsTable.meetupId })
      .from(meetupParticipantsTable)
      .where(
        and(
          eq(meetupParticipantsTable.userId, currentUserId),
          inArray(meetupParticipantsTable.meetupId, rows.map(({ meetup }) => meetup.id)),
        ),
      );
    joinedIds = new Set(joinedRows.map((row) => row.meetupId));
  }

  res.json({
    meetups: rows.map(({ meetup, participantCount }) =>
      shapeMeetup(
        meetup,
        Number(participantCount),
        organizerNames.get(meetup.organizerId) ?? "SagaTrail-Wanderer",
        joinedIds.has(meetup.id),
        currentUserId === meetup.organizerId,
      ),
    ),
  });
});

router.get("/meetups/:id", async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(meetupsTable)
    .where(eq(meetupsTable.id, String(req.params.id)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }

  const participants = await db
    .select({
      userId: meetupParticipantsTable.userId,
      joinedAt: meetupParticipantsTable.joinedAt,
      attendanceStatus: meetupParticipantsTable.attendanceStatus,
      delayMinutes: meetupParticipantsTable.delayMinutes,
      statusUpdatedAt: meetupParticipantsTable.statusUpdatedAt,
      name: profilesTable.name,
      bio: profilesTable.bio,
      avatarUrl: profilesTable.avatarUrl,
      dateOfBirth: profilesTable.dateOfBirth,
    })
    .from(meetupParticipantsTable)
    .leftJoin(profilesTable, eq(profilesTable.id, meetupParticipantsTable.userId))
    .where(eq(meetupParticipantsTable.meetupId, row.id))
    .orderBy(asc(meetupParticipantsTable.joinedAt));
  const currentUserId = getAuth(req)?.userId ?? null;
  if (currentUserId) {
    const [blocked] = await db
      .select({ blockedUserId: meetupBlocksTable.blockedUserId })
      .from(meetupBlocksTable)
      .where(
        or(
          and(
            eq(meetupBlocksTable.blockerId, currentUserId),
            eq(meetupBlocksTable.blockedUserId, row.organizerId),
          ),
          and(
            eq(meetupBlocksTable.blockerId, row.organizerId),
            eq(meetupBlocksTable.blockedUserId, currentUserId),
          ),
        ),
      )
      .limit(1);
    if (blocked) {
      res.status(404).json({ error: "Treffpunkt nicht gefunden" });
      return;
    }
  }

  const joined = Boolean(currentUserId && participants.some((participant) => participant.userId === currentUserId));
  const canViewRank = joined || currentUserId === row.organizerId;
  const canViewParticipantBio = joined || currentUserId === row.organizerId;
  const groupCounts = new Map<string, number>();
  if (canViewRank && participants.length) {
    const completionCounts = await db
      .select({
        userId: groupHikeCompletionsTable.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(groupHikeCompletionsTable)
      .where(inArray(
        groupHikeCompletionsTable.userId,
        participants.map((participant) => participant.userId),
      ))
      .groupBy(groupHikeCompletionsTable.userId);
    for (const completion of completionCounts) {
      groupCounts.set(completion.userId, Number(completion.count));
    }
  }
  res.json({
    ...shapeMeetup(
      row,
      participants.length,
      (await profileNames([row.organizerId])).get(row.organizerId) ?? "SagaTrail-Wanderer",
       joined,
      currentUserId === row.organizerId,
      joined,
    ),
    participants: participants.map((participant) => ({
      ...(joined ? { userId: participant.userId } : {}),
      avatarUrl: participant.avatarUrl ?? null,
      age: calculateAge(participant.dateOfBirth),
      name: participant.name ?? "SagaTrail-Wanderer",
      joinedAt: participant.joinedAt.toISOString(),
      ...(canViewParticipantBio ? { bio: participant.bio ?? null } : {}),
      ...(joined
        ? {
            attendanceStatus: participant.attendanceStatus,
            delayMinutes: participant.delayMinutes,
            statusUpdatedAt: participant.statusUpdatedAt.toISOString(),
          }
        : {}),
       ...(canViewRank
         ? {
              rankLevel: rankLevel(groupCounts.get(participant.userId) ?? 0),
              groupAchievements: groupAchievements(groupCounts.get(participant.userId) ?? 0),
           }
         : {}),
    })),
  });
});

router.post("/meetups", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = CreateMeetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Treffpunkt-Daten" });
    return;
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (startsAt.getTime() < Date.now() + 15 * 60_000) {
    res.status(400).json({ error: "Der Start muss mindestens 15 Minuten in der Zukunft liegen" });
    return;
  }
  const [row] = await db
    .insert(meetupsTable)
    .values({
      routeId: parsed.data.routeId,
      routeName: parsed.data.routeName,
      canton: parsed.data.canton,
      startsAt,
      maxParticipants: parsed.data.maxParticipants,
      pace: parsed.data.pace,
      note: parsed.data.note ?? null,
      organizerId: userId,
    })
    .returning();
  await db
    .insert(meetupParticipantsTable)
    .values({ meetupId: row.id, userId })
    .onConflictDoNothing()
    .execute();

  const organizer = await profileNames([userId]);
  res.status(201).json({
    ...shapeMeetup(row, 1, organizer.get(userId) ?? "SagaTrail-Wanderer", true, true),
    participants: [{
      userId,
      name: organizer.get(userId) ?? "SagaTrail-Wanderer",
      joinedAt: new Date().toISOString(),
      attendanceStatus: "confirmed",
      delayMinutes: null,
      statusUpdatedAt: new Date().toISOString(),
    }],
  });
});

router.post("/meetups/:id/join", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const meetupId = String(req.params.id);
  const result = await db.transaction(async (tx) => {
    const [meetup] = await tx
      .select()
      .from(meetupsTable)
      .where(eq(meetupsTable.id, meetupId))
      .for("update")
      .limit(1);
    if (!meetup) return { error: "not_found" as const };
    if (meetup.status !== "scheduled") return { error: "not_scheduled" as const };
    const [blocked] = await tx
      .select({ blockedUserId: meetupBlocksTable.blockedUserId })
      .from(meetupBlocksTable)
      .where(
        or(
          and(
            eq(meetupBlocksTable.blockerId, userId),
            eq(meetupBlocksTable.blockedUserId, meetup.organizerId),
          ),
          and(
            eq(meetupBlocksTable.blockerId, meetup.organizerId),
            eq(meetupBlocksTable.blockedUserId, userId),
          ),
        ),
      )
      .limit(1);
    if (blocked) return { error: "blocked" as const };
    if (meetup.startsAt.getTime() <= Date.now()) return { error: "started" as const };

    const [existing] = await tx
      .select({ meetupId: meetupParticipantsTable.meetupId })
      .from(meetupParticipantsTable)
      .where(
        and(
          eq(meetupParticipantsTable.meetupId, meetupId),
          eq(meetupParticipantsTable.userId, userId),
        ),
      )
      .limit(1);
    if (existing) return { error: "already_joined" as const };

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(meetupParticipantsTable)
      .where(eq(meetupParticipantsTable.meetupId, meetupId));
    if (Number(count) >= meetup.maxParticipants) return { error: "full" as const };

    await tx.insert(meetupParticipantsTable).values({ meetupId, userId }).execute();
    return { error: null };
  });
  if (result.error === "not_found" || result.error === "blocked") {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  if (result.error === "not_scheduled") {
    res.status(409).json({ error: "Dieser Treffpunkt ist nicht mehr geplant" });
    return;
  }
  if (result.error === "started") {
    res.status(409).json({ error: "Dieser Treffpunkt hat bereits begonnen" });
    return;
  }
  if (result.error === "full") {
    res.status(409).json({ error: "Dieser Treffpunkt ist bereits voll" });
    return;
  }
  res.json({ joined: true });
});

router.delete("/meetups/:id/join", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const [meetup] = await db
    .select({ organizerId: meetupsTable.organizerId })
    .from(meetupsTable)
    .where(eq(meetupsTable.id, String(req.params.id)))
    .limit(1);
  if (!meetup) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  if (meetup.organizerId === userId) {
    res.status(400).json({ error: "Der Organisator kann den Treffpunkt nicht verlassen" });
    return;
  }
  await db
    .delete(meetupParticipantsTable)
    .where(
      and(
        eq(meetupParticipantsTable.meetupId, String(req.params.id)),
        eq(meetupParticipantsTable.userId, userId),
      ),
    )
    .execute();
  res.json({ joined: false });
});

router.patch("/meetups/:id/attendance", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = MeetupAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültiger Anwesenheitsstatus" });
    return;
  }
  const meetupId = String(req.params.id);
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [meetup] = await tx
      .select({
        startsAt: meetupsTable.startsAt,
        status: meetupsTable.status,
        organizerId: meetupsTable.organizerId,
      })
      .from(meetupsTable)
      .where(eq(meetupsTable.id, meetupId))
      .for("update")
      .limit(1);
    if (!meetup) return { error: "not_found" as const };
    if (meetup.status !== "scheduled") return { error: "not_scheduled" as const };
    if (
      now.getTime() < meetup.startsAt.getTime() - 3 * 60 * 60_000 ||
      now.getTime() > meetup.startsAt.getTime() + 12 * 60 * 60_000
    ) {
      return { error: "outside_window" as const };
    }
    const [participant] = await tx
      .select({
        attendanceStatus: meetupParticipantsTable.attendanceStatus,
        delayMinutes: meetupParticipantsTable.delayMinutes,
        statusUpdatedAt: meetupParticipantsTable.statusUpdatedAt,
      })
      .from(meetupParticipantsTable)
      .where(
        and(
          eq(meetupParticipantsTable.meetupId, meetupId),
          eq(meetupParticipantsTable.userId, userId),
        ),
      )
      .for("update")
      .limit(1);
    if (!participant) return { error: "not_joined" as const };

    const delayMinutes = parsed.data.status === "delayed" ? parsed.data.delayMinutes! : null;
    if (
      participant.attendanceStatus === parsed.data.status &&
      participant.delayMinutes === delayMinutes
    ) {
      return { error: null, participant };
    }
    if (
      parsed.data.status !== "arrived" &&
      participant.attendanceStatus !== "confirmed" &&
      participant.statusUpdatedAt.getTime() > now.getTime() - 5 * 60_000
    ) {
      return { error: "rate_limited" as const };
    }
    if (participant.attendanceStatus === "arrived" && parsed.data.status !== "arrived") {
      return { error: "already_arrived" as const };
    }
    const [actor] = await tx
      .select({ name: profilesTable.name })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);
    const [updated] = await tx
      .update(meetupParticipantsTable)
      .set({ attendanceStatus: parsed.data.status, delayMinutes, statusUpdatedAt: now })
      .where(
        and(
          eq(meetupParticipantsTable.meetupId, meetupId),
          eq(meetupParticipantsTable.userId, userId),
        ),
      )
      .returning({
        attendanceStatus: meetupParticipantsTable.attendanceStatus,
        delayMinutes: meetupParticipantsTable.delayMinutes,
        statusUpdatedAt: meetupParticipantsTable.statusUpdatedAt,
      });
    if (parsed.data.status === "delayed") {
      const participantRows = await tx
        .select({ userId: meetupParticipantsTable.userId })
        .from(meetupParticipantsTable)
        .where(eq(meetupParticipantsTable.meetupId, meetupId));
      const recipientIds = new Set(participantRows.map((row) => row.userId));
      recipientIds.delete(userId);
      if (meetup.organizerId !== userId) recipientIds.add(meetup.organizerId);
      if (recipientIds.size) {
        const events = [...recipientIds].map((recipientUserId) => ({
          meetupId,
          recipientUserId,
          type: "meetup_delayed",
          dedupeKey: `${meetupId}:${userId}:${recipientUserId}:meetup_delayed`,
          actorName: actor?.name ?? null,
          delayMinutes,
        }));
        await tx
          .insert(meetupNotificationOutboxTable)
          .values(events)
          .onConflictDoNothing()
          .returning({ id: meetupNotificationOutboxTable.id });
      }
    }
    return { error: null, participant: updated };
  });
  if (result.error === "not_found" || result.error === "not_joined") {
    res.status(404).json({ error: "Treffpunkt oder Teilnahme nicht gefunden" });
    return;
  }
  if (result.error === "not_scheduled" || result.error === "already_arrived") {
    res.status(409).json({ error: "Dieser Status kann nicht mehr geändert werden" });
    return;
  }
  if (result.error === "outside_window") {
    res.status(409).json({ error: "Statusmeldungen sind erst drei Stunden vor dem Start möglich" });
    return;
  }
  if (result.error === "rate_limited") {
    res.status(429).json({ error: "Der Status kann höchstens alle fünf Minuten geändert werden" });
    return;
  }
  res.json({
    attendanceStatus: result.participant.attendanceStatus,
    delayMinutes: result.participant.delayMinutes,
    statusUpdatedAt: result.participant.statusUpdatedAt.toISOString(),
  });
});

router.post("/meetups/:id/block-organizer", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const result = await db.transaction(async (tx) => {
    const [meetup] = await tx
      .select({ organizerId: meetupsTable.organizerId })
      .from(meetupsTable)
      .where(eq(meetupsTable.id, String(req.params.id)))
      .for("update")
      .limit(1);
    if (!meetup) return "not_found" as const;
    if (meetup.organizerId === userId) return "self" as const;
    await tx
      .insert(meetupBlocksTable)
      .values({ blockerId: userId, blockedUserId: meetup.organizerId })
      .onConflictDoNothing()
      .execute();
    await tx
      .delete(meetupParticipantsTable)
      .where(
        and(
          eq(meetupParticipantsTable.meetupId, String(req.params.id)),
          eq(meetupParticipantsTable.userId, userId),
        ),
      )
      .execute();
    return "ok" as const;
  });
  if (result === "not_found") {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  if (result === "self") {
    res.status(400).json({ error: "Du kannst dich nicht selbst blockieren" });
    return;
  }
  res.json({ ok: true });
});

router.post("/meetups/:id/cancel", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = CancelMeetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Der Absagegrund muss zwischen 3 und 300 Zeichen lang sein" });
    return;
  }
  const meetupId = String(req.params.id);
  const cancelled = await cancelMeetupForOrganizer(meetupId, userId, parsed.data.reason);
  if (cancelled !== "ok") {
    res.status(404).json({ error: "Treffpunkt nicht gefunden oder nicht berechtigt" });
    return;
  }
  res.status(204).send();
});

router.delete("/meetups/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const meetupId = String(req.params.id);
  const genericReason = "Der Treffpunkt wurde vom Organisator abgesagt";
  const cancelled = await cancelMeetupForOrganizer(meetupId, userId, genericReason);
  if (cancelled !== "ok") {
    res.status(404).json({ error: "Treffpunkt nicht gefunden oder nicht berechtigt" });
    return;
  }
  res.status(204).send();
});

router.post("/meetups/:id/share", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const meetupId = String(req.params.id);
  const [meetup] = await db
    .select()
    .from(meetupsTable)
    .where(and(eq(meetupsTable.id, meetupId), eq(meetupsTable.status, "scheduled")))
    .limit(1);
  if (!meetup) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  const [participant] = await db
    .select({ userId: meetupParticipantsTable.userId })
    .from(meetupParticipantsTable)
    .where(
      and(
        eq(meetupParticipantsTable.meetupId, meetupId),
        eq(meetupParticipantsTable.userId, userId),
      ),
    )
    .limit(1);
  if (!participant) {
    res.status(403).json({ error: "Nur Teilnehmende dürfen teilen" });
    return;
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Math.max(
    meetup.startsAt.getTime() + 24 * 60 * 60_000,
    Date.now() + 60 * 60_000,
  ));
  await db
    .update(meetupsTable)
    .set({
      sharedTokenHash: createHash("sha256").update(token).digest("hex"),
      shareExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(meetupsTable.id, meetupId));
  res.json({ token, path: `/treffpunkte/shared/${token}`, expiresAt: expiresAt.toISOString() });
});

router.get("/meetups/shared/:token", async (req, res): Promise<void> => {
  const tokenHash = createHash("sha256").update(String(req.params.token)).digest("hex");
  const [row] = await db
    .select()
    .from(meetupsTable)
    .where(
      and(
        eq(meetupsTable.sharedTokenHash, tokenHash),
        gt(meetupsTable.shareExpiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row || !row.shareExpiresAt) {
    res.status(404).json({ error: "Link unbekannt oder abgelaufen" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(meetupParticipantsTable)
    .where(eq(meetupParticipantsTable.meetupId, row.id));
  res.json({
    routeName: row.routeName,
    canton: row.canton,
    startsAt: row.startsAt.toISOString(),
    participantCount: Number(count),
    maxParticipants: row.maxParticipants,
    status: row.status,
    expiresAt: row.shareExpiresAt.toISOString(),
  });
});

router.post("/meetups/:id/report", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = ReportMeetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Meldung" });
    return;
  }
  const meetupId = String(req.params.id);
  const [meetup] = await db
    .select({ id: meetupsTable.id, organizerId: meetupsTable.organizerId })
    .from(meetupsTable)
    .where(eq(meetupsTable.id, meetupId))
    .limit(1);
  if (!meetup) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  await db
    .insert(meetupReportsTable)
    .values({
      meetupId,
      reporterId: userId,
      reportedUserId: parsed.data.reportedUserId ?? meetup.organizerId,
      reason: parsed.data.reason,
      note: parsed.data.note ?? null,
    })
    .execute();
  res.status(201).json({ ok: true });
});

router.post("/meetups/users/:userId/block", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const blockedUserId = String(req.params.userId);
  if (blockedUserId === userId) {
    res.status(400).json({ error: "Du kannst dich nicht selbst blockieren" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(meetupBlocksTable)
      .values({ blockerId: userId, blockedUserId })
      .onConflictDoNothing()
      .execute();
    const organizedMeetups = await tx
      .select({ id: meetupsTable.id })
      .from(meetupsTable)
      .where(eq(meetupsTable.organizerId, blockedUserId))
      .for("update");
    if (organizedMeetups.length) {
      await tx
        .delete(meetupParticipantsTable)
        .where(
          and(
            eq(meetupParticipantsTable.userId, userId),
            inArray(meetupParticipantsTable.meetupId, organizedMeetups.map((meetup) => meetup.id)),
          ),
        )
        .execute();
    }
  });
  res.json({ ok: true });
});

router.delete("/meetups/users/:userId/block", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  await db
    .delete(meetupBlocksTable)
    .where(
      and(
        eq(meetupBlocksTable.blockerId, userId),
        eq(meetupBlocksTable.blockedUserId, String(req.params.userId)),
      ),
    )
    .execute();
  res.json({ ok: true });
});

router.delete("/meetups/:id/participants/:userId", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const meetupId = String(req.params.id);
  const [meetup] = await db
    .select({ organizerId: meetupsTable.organizerId })
    .from(meetupsTable)
    .where(eq(meetupsTable.id, meetupId))
    .limit(1);
  if (!meetup) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  if (meetup.organizerId !== userId) {
    res.status(403).json({ error: "Nur der Organisator darf Teilnehmer entfernen" });
    return;
  }
  if (String(req.params.userId) === meetup.organizerId) {
    res.status(400).json({ error: "Der Organisator kann sich nicht selbst entfernen" });
    return;
  }
  const removed = await db
    .delete(meetupParticipantsTable)
    .where(
      and(
        eq(meetupParticipantsTable.meetupId, meetupId),
        eq(meetupParticipantsTable.userId, String(req.params.userId)),
      ),
    )
    .returning({ userId: meetupParticipantsTable.userId });
  if (!removed.length) {
    res.status(404).json({ error: "Teilnehmer nicht gefunden" });
    return;
  }
  res.status(204).send();
});

export default router;