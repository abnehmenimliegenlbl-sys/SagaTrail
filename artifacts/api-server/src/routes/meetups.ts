import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  db,
  meetupParticipantsTable,
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
  };
}

router.get("/meetups", async (req, res): Promise<void> => {
  const currentUserId = getAuth(req)?.userId ?? null;
  const from = parseFrom(req.query.from);
  const routeId = typeof req.query.routeId === "string" ? req.query.routeId.trim() : "";

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
        routeId ? eq(meetupsTable.routeId, routeId) : undefined,
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
    })
    .from(meetupParticipantsTable)
    .leftJoin(profilesTable, eq(profilesTable.id, meetupParticipantsTable.userId))
    .where(eq(meetupParticipantsTable.meetupId, row.id))
    .orderBy(asc(meetupParticipantsTable.joinedAt));
  const currentUserId = getAuth(req)?.userId ?? null;

  res.json({
    ...shapeMeetup(
      row,
      participants.length,
      (await profileNames([row.organizerId])).get(row.organizerId) ?? "SagaTrail-Wanderer",
      Boolean(currentUserId && participants.some((participant) => participant.userId === currentUserId)),
    ),
    participants: participants.map((participant) => ({
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
    ...shapeMeetup(row, 1, organizer.get(userId) ?? "SagaTrail-Wanderer", true),
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

router.delete("/meetups/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const deleted = await db
    .delete(meetupsTable)
    .where(
      and(
        eq(meetupsTable.id, String(req.params.id)),
        eq(meetupsTable.organizerId, userId),
      ),
    )
    .returning({ id: meetupsTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "Treffpunkt nicht gefunden oder nicht berechtigt" });
    return;
  }
  res.status(204).send();
});

export default router;