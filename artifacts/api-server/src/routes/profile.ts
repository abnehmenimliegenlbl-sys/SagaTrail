import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import {
  GetMyProfileResponse,
  SaveMyProfileBody,
  UpdateMyPremiumBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireUserId(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return null;
  }
  return auth.userId;
}

function toProfile(row: typeof profilesTable.$inferSelect) {
  return GetMyProfileResponse.parse({
    id: row.id,
    name: row.name,
    archetype: row.archetype,
    homeCanton: row.homeCanton,
    language: row.language,
    ageTier: row.ageTier,
    premium: row.premium,
    freeHikeUsed: row.freeHikeUsed,
  });
}

router.get("/me", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const [row] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));

  if (!row) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }
  res.json(toProfile(row));
});

router.put("/me", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SaveMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, archetype, homeCanton, language, ageTier } = parsed.data;

  const [row] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      name,
      archetype,
      homeCanton,
      language,
      ageTier,
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        name,
        archetype,
        homeCanton,
        language,
        ageTier,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(toProfile(row));
});

router.patch("/me/premium", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = UpdateMyPremiumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(profilesTable)
    .set({ premium: parsed.data.premium, updatedAt: new Date() })
    .where(eq(profilesTable.id, userId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }
  res.json(toProfile(row));
});

router.patch("/me/free-hike", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const [row] = await db
    .update(profilesTable)
    .set({ freeHikeUsed: true, updatedAt: new Date() })
    .where(eq(profilesTable.id, userId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }
  res.json(toProfile(row));
});

export default router;
