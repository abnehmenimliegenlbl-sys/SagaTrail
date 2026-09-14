import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, gte, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  db,
  meetupBlocksTable,
  meetupParticipantsTable,
  meetupReportsTable,
  meetupsTable,
  profilesTable,
} from "@workspace/db";

const router: IRouter = Router();

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
    isOrganizer,
  };
}

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
  const blockedIds = blockedRows.map((row) => row.userId);

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
      name: profilesTable.name,
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
        and(
          eq(meetupBlocksTable.blockerId, currentUserId),
          eq(meetupBlocksTable.blockedUserId, row.organizerId),
        ),
      )
      .limit(1);
    if (blocked) {
      res.status(404).json({ error: "Treffpunkt nicht gefunden" });
      return;
    }
  }

  res.json({
    ...shapeMeetup(
      row,
      participants.length,
      (await profileNames([row.organizerId])).get(row.organizerId) ?? "SagaTrail-Wanderer",
      Boolean(currentUserId && participants.some((participant) => participant.userId === currentUserId)),
      currentUserId === row.organizerId,
    ),
    participants: participants.map((participant) => ({
      ...(currentUserId === row.organizerId ? { userId: participant.userId } : {}),
      avatarUrl: participant.avatarUrl ?? null,
      age: calculateAge(participant.dateOfBirth),
      name: participant.name ?? "SagaTrail-Wanderer",
      joinedAt: participant.joinedAt.toISOString(),
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
    participants: [{ name: organizer.get(userId) ?? "SagaTrail-Wanderer", joinedAt: new Date().toISOString() }],
  });
});

router.post("/meetups/:id/join", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const meetupId = String(req.params.id);
  const [meetup] = await db
    .select()
    .from(meetupsTable)
    .where(eq(meetupsTable.id, meetupId))
    .limit(1);
  if (!meetup) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  const [organizerBlocked] = await db
    .select({ blockedUserId: meetupBlocksTable.blockedUserId })
    .from(meetupBlocksTable)
    .where(
      and(
        eq(meetupBlocksTable.blockerId, userId),
        eq(meetupBlocksTable.blockedUserId, meetup.organizerId),
      ),
    )
    .limit(1);
  if (organizerBlocked) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden" });
    return;
  }
  if (meetup.startsAt.getTime() <= Date.now()) {
    res.status(409).json({ error: "Dieser Treffpunkt hat bereits begonnen" });
    return;
  }

  const [existing] = await db
    .select({ meetupId: meetupParticipantsTable.meetupId })
    .from(meetupParticipantsTable)
    .where(
      and(
        eq(meetupParticipantsTable.meetupId, meetupId),
        eq(meetupParticipantsTable.userId, userId),
      ),
    )
    .limit(1);
  if (existing) {
    res.json({ joined: true });
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(meetupParticipantsTable)
    .where(eq(meetupParticipantsTable.meetupId, meetupId));
  if (Number(count) >= meetup.maxParticipants) {
    res.status(409).json({ error: "Dieser Treffpunkt ist bereits voll" });
    return;
  }

  await db
    .insert(meetupParticipantsTable)
    .values({ meetupId, userId })
    .onConflictDoNothing()
    .execute();
  res.json({ joined: true });
});

router.delete("/meetups/:id/join", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
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

router.post("/meetups/:id/block-organizer", async (req, res): Promise<void> => {
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
    res.status(400).json({ error: "Du kannst dich nicht selbst blockieren" });
    return;
  }
  await db
    .insert(meetupBlocksTable)
    .values({ blockerId: userId, blockedUserId: meetup.organizerId })
    .onConflictDoNothing()
    .execute();
  res.json({ ok: true });
});

router.delete("/meetups/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const cancelled = await db
    .update(meetupsTable)
    .set({
      status: "cancelled",
      sharedTokenHash: null,
      shareExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(meetupsTable.id, String(req.params.id)),
        eq(meetupsTable.organizerId, userId),
        eq(meetupsTable.status, "scheduled"),
      ),
    )
    .returning({ id: meetupsTable.id });
  if (!cancelled.length) {
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
  await db
    .insert(meetupBlocksTable)
    .values({ blockerId: userId, blockedUserId })
    .onConflictDoNothing()
    .execute();
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