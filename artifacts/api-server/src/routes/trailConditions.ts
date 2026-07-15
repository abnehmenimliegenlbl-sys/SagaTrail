import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, trailConditionReportsTable } from "@workspace/db";
import { z } from "zod/v4";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

const CONDITION_LEVELS = ["excellent", "clear", "muddy", "snow", "icy", "blocked"] as const;
type ConditionLevel = (typeof CONDITION_LEVELS)[number];

const TrailConditionInputSchema = z.object({
  condition: z.enum(CONDITION_LEVELS),
  note: z.string().max(200).nullable().optional(),
});

const EXPIRY_DAYS = 7;
const RATE_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 Stunden
const MAX_REPORTS = 10;

function expiryThreshold(): Date {
  const d = new Date();
  d.setDate(d.getDate() - EXPIRY_DAYS);
  return d;
}

function toDto(row: typeof trailConditionReportsTable.$inferSelect) {
  return {
    id: row.id,
    routeId: row.routeId,
    userName: row.userName ?? null,
    condition: row.condition as ConditionLevel,
    note: row.note ?? null,
    reportedAt: row.reportedAt.toISOString(),
  };
}

// GET /routes/:routeId/conditions
router.get("/routes/:routeId/conditions", async (req: Request, res: Response): Promise<void> => {
  const { routeId } = req.params as { routeId: string };
  try {
    const rows = await db
      .select()
      .from(trailConditionReportsTable)
      .where(
        and(
          eq(trailConditionReportsTable.routeId, routeId),
          gte(trailConditionReportsTable.reportedAt, expiryThreshold()),
        ),
      )
      .orderBy(desc(trailConditionReportsTable.reportedAt))
      .limit(MAX_REPORTS);
    res.json(rows.map(toDto));
  } catch (err) {
    req.log.error({ err }, "Trail conditions konnten nicht geladen werden");
    res.status(502).json({ error: "Trail conditions konnten nicht geladen werden" });
  }
});

// POST /routes/:routeId/conditions
router.post("/routes/:routeId/conditions", async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return;
  }

  const { routeId } = req.params as { routeId: string };
  const parsed = TrailConditionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe" });
    return;
  }

  try {
    // Rate-Limit: max 1 Bericht pro User + Route pro 2h
    const twoHoursAgo = new Date(Date.now() - RATE_LIMIT_MS);
    const [recent] = await db
      .select({ id: trailConditionReportsTable.id })
      .from(trailConditionReportsTable)
      .where(
        and(
          eq(trailConditionReportsTable.routeId, routeId),
          eq(trailConditionReportsTable.userId, auth.userId),
          gte(trailConditionReportsTable.reportedAt, twoHoursAgo),
        ),
      )
      .limit(1);

    if (recent) {
      res.status(429).json({ error: "Du hast fuer diese Route bereits einen Bericht eingereicht. Bitte warte 2 Stunden." });
      return;
    }

    const { condition, note } = parsed.data;

    const [inserted] = await db
      .insert(trailConditionReportsTable)
      .values({
        id: randomUUID(),
        routeId,
        userId: auth.userId,
        userName: null,
        condition,
        note: note ?? null,
      })
      .returning();

    res.status(201).json(toDto(inserted!));
  } catch (err) {
    req.log.error({ err }, "Trail condition konnte nicht gespeichert werden");
    res.status(502).json({ error: "Trail condition konnte nicht gespeichert werden" });
  }
});

export default router;
