import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import {
  GetMyProfileResponse,
  SaveMyProfileBody,
  UpdateMyPremiumBody,
  ClaimKantonspackBody,
  ClaimKantonspackResponse,
  WelcomeSagenpaketBody,
  WelcomeSagenpaketResponse,
  SyncMyProgressBody,
  SyncMyProgressResponse,
} from "@workspace/api-zod";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { hatAktivesPremiumEntitlement } from "../lib/revenuecatSync";
import { claimKantonspack, KANTON_SLUGS } from "../lib/kantonspackClaim";

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
    premium: istPremiumAktiv(row),
    freeHikeUsed: row.freeHikeUsed,
    purchasedPacks: row.purchasedPacks ?? [],
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

  // Sicherheitsgrenze: Nutzer duerfen sich Premium NICHT selbst geben.
  // Upgrades laufen ausschliesslich ueber vertrauenswuerdige Server-Pfade
  // (Admin-Endpunkt heute, verifizierter RevenueCat-Abgleich spaeter).
  // Nur das Zuruecksetzen (premium=false) bleibt als Self-Service erlaubt.
  if (parsed.data.premium) {
    res.status(403).json({
      error: "Premium kann nicht selbst gesetzt werden",
    });
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

router.post("/me/premium/sync", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  // Verifizierter Upgrade-Pfad: Der Server prueft direkt bei RevenueCat,
  // ob der Nutzer (Customer-ID = Nutzer-ID via Purchases.logIn) ein
  // aktives "premium"-Entitlement hat. Nur dann wird upgegradet.
  // Fehlendes Entitlement fuehrt bewusst NICHT zum Entzug — Downgrade
  // bleibt Self-Service (PATCH /me/premium) bzw. Admin-Sache, damit
  // admin-gewaehrtes Premium nicht ueberschrieben wird.
  const [bestehend] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!bestehend) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }

  let premiumAktiv: boolean;
  try {
    premiumAktiv = await hatAktivesPremiumEntitlement(userId);
    req.log.info({ userId, premiumAktiv }, "[IAP] /me/premium/sync geprueft");
  } catch (err) {
    // RC-Connector nicht konfiguriert oder vorruebergehend nicht erreichbar:
    // aktuellen Profilstatus zurueckgeben statt 502 — verhindert, dass ein
    // RC-Ausfall Admin-vergebenes Premium oder bereits aktive Abos loescht.
    req.log.warn({ err, userId }, "[IAP] RevenueCat nicht erreichbar — gebe bestehenden Profilstatus zurueck");
    res.json(toProfile(bestehend));
    return;
  }

  // Admin-Reset-Sperre: nur fuer Downgrade (kein aktives RC-Entitlement).
  // Liegt ein echter Kauf vor (premiumAktiv=true), laeuft der Upgrade durch —
  // die Sperre schuetzt nur davor, dass Admin-vergebenes Premium durch ein
  // abgelaufenes Test-Abo entzogen wird.
  if (!premiumAktiv && bestehend.premiumSyncLockedUntil && bestehend.premiumSyncLockedUntil > new Date()) {
    req.log.info(
      { userId, premiumSyncLockedUntil: bestehend.premiumSyncLockedUntil },
      "[IAP] /me/premium/sync: kein Downgrade wegen Admin-Reset-Sperre",
    );
    res.json(toProfile(bestehend));
    return;
  }

  if (premiumAktiv) {
    const [row] = await db
      .update(profilesTable)
      .set({ premium: true, updatedAt: new Date() })
      .where(eq(profilesTable.id, userId))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Kein Profil vorhanden" });
      return;
    }
    res.json(toProfile(row));
    return;
  }

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

router.post("/me/packs/claim", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = ClaimKantonspackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = parsed.data.kanton;
  if (!KANTON_SLUGS.includes(slug)) {
    res.status(400).json({ error: "Unbekannter Kanton" });
    return;
  }

  // Verifizierter Freischalt-Pfad: Der Server prueft bei RevenueCat, ob der
  // Customer mehr gueltige Kantonspack-Kaeufe als bereits vergebene
  // pack_<kanton>-Entitlements hat, und vergibt erst dann das Entitlement.
  let ergebnis;
  try {
    ergebnis = await claimKantonspack(userId, slug);
  } catch (err) {
    // RC-Connector nicht konfiguriert oder vorruebergehend nicht erreichbar.
    // RC vergibt das pack_<slug>-Entitlement nach dem Kauf automatisch —
    // wir antworten mit "bereits_freigeschaltet" damit der Client keinen
    // Fehlerdialog zeigt und refreshCustomerInfo() den echten Zustand laedt.
    req.log.warn({ err, userId, slug }, "[IAP] packs/claim: RC nicht erreichbar — Best-Effort-OK");
    res.json(
      ClaimKantonspackResponse.parse({
        entitlement: `pack_${slug}`,
        bereitsFreigeschaltet: true,
      })
    );
    return;
  }

  if (ergebnis.status === "kein_offener_kauf") {
    res.status(409).json({ error: "Kein offener Kantonspack-Kauf vorhanden" });
    return;
  }
  res.json(
    ClaimKantonspackResponse.parse({
      entitlement: ergebnis.entitlement,
      bereitsFreigeschaltet: ergebnis.status === "bereits_freigeschaltet",
    })
  );
});

function mergeById<T extends { id: string }>(
  serverItems: unknown,
  clientItems: T[]
): T[] {
  const serverArr = Array.isArray(serverItems) ? (serverItems as T[]) : [];
  const merged = new Map<string, T>();
  for (const item of serverArr) merged.set(item.id, item);
  for (const item of clientItems) merged.set(item.id, item);
  return Array.from(merged.values());
}

router.post("/me/progress/sync", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SyncMyProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!existing) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }

  // Vereinigung statt Ueberschreiben: ein Geraet, das nach einem Ab-/Anmelden
  // (oder auf einem anderen Geraet) mit leerem oder aelterem lokalen Zustand
  // synct, darf bereits serverseitig bekannte Wanderungen/Errungenschaften
  // nie loeschen. Merge erfolgt ausschliesslich ueber die id.
  const mergedHikeHistory = mergeById(existing.hikeHistory, parsed.data.hikeHistory)
    .sort((a: any, b: any) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
    .slice(0, 200);
  const mergedAchievements = mergeById(existing.achievements, parsed.data.achievements);

  const [row] = await db
    .update(profilesTable)
    .set({
      hikeHistory: mergedHikeHistory,
      achievements: mergedAchievements,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, userId))
    .returning();

  res.json(
    SyncMyProgressResponse.parse({
      hikeHistory: row.hikeHistory,
      achievements: row.achievements,
    })
  );
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

router.post("/me/push-token", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { token } = req.body as { token?: unknown };
  if (typeof token !== "string" && token !== null) {
    res.status(400).json({ error: "token muss ein String oder null sein" });
    return;
  }
  await db
    .update(profilesTable)
    .set({ pushToken: (token as string | null) ?? null })
    .where(eq(profilesTable.id, userId));
  res.json({ ok: true });
});

// GET /me/bookmarks — gibt gespeicherte Saga-IDs + Benachrichtigungseinstellung zurueck
router.get("/me/bookmarks", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const [row] = await db
    .select({ savedSagaIds: profilesTable.savedSagaIds, pushWeatherEnabled: profilesTable.pushWeatherEnabled })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  res.json({ sagaIds: row?.savedSagaIds ?? [], pushWeatherEnabled: row?.pushWeatherEnabled ?? true });
});

// POST /me/bookmarks — fuegt eine Saga-ID hinzu (Idempotent)
router.post("/me/bookmarks", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { sagaId } = req.body as { sagaId?: unknown };
  if (typeof sagaId !== "string" || !sagaId) {
    res.status(400).json({ error: "sagaId muss ein nicht-leerer String sein" });
    return;
  }
  const [row] = await db
    .select({ savedSagaIds: profilesTable.savedSagaIds })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  const current = row?.savedSagaIds ?? [];
  if (!current.includes(sagaId)) {
    const [updated] = await db
      .update(profilesTable)
      .set({ savedSagaIds: [...current, sagaId] })
      .where(eq(profilesTable.id, userId))
      .returning({ savedSagaIds: profilesTable.savedSagaIds });
    res.json({ sagaIds: updated?.savedSagaIds ?? [] });
  } else {
    res.json({ sagaIds: current });
  }
});

// DELETE /me/bookmarks/:sagaId — entfernt eine Saga-ID
router.delete("/me/bookmarks/:sagaId", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { sagaId } = req.params;
  const [row] = await db
    .select({ savedSagaIds: profilesTable.savedSagaIds })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  const current = row?.savedSagaIds ?? [];
  const [updated] = await db
    .update(profilesTable)
    .set({ savedSagaIds: current.filter((id) => id !== sagaId) })
    .where(eq(profilesTable.id, userId))
    .returning({ savedSagaIds: profilesTable.savedSagaIds });
  res.json({ sagaIds: updated?.savedSagaIds ?? [] });
});

// POST /me/welcome-sagenpaket — schenkt dem Premium-Nutzer einmalig ein Sagen Paket seiner Wahl.
// Idempotent: wird bereitsGenutzt=true zurueckgegeben wenn schon eingeloest.
router.post("/me/welcome-sagenpaket", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = WelcomeSagenpaketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = parsed.data.kanton;
  if (!KANTON_SLUGS.includes(slug)) {
    res.status(400).json({ error: "Unbekannter Kanton" });
    return;
  }

  const [row] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));

  if (!row) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }

  // Bereits eingeloest — idempotent OK zurueckgeben.
  if (row.welcomeSagenpaketClaimed) {
    res.json(WelcomeSagenpaketResponse.parse({ slug, bereitsGenutzt: true }));
    return;
  }

  // Nur fuer Premium-Nutzer (Elite ist automatisch eingeschlossen,
  // braucht diese Schenkung aber nicht — trotzdem erlaubt).
  if (!istPremiumAktiv(row)) {
    res.status(403).json({ error: "Nur fuer Premium-Nutzer verfuegbar" });
    return;
  }

  const currentPacks = row.purchasedPacks ?? [];
  const newPacks = currentPacks.includes(slug)
    ? currentPacks
    : [...currentPacks, slug];

  await db
    .update(profilesTable)
    .set({
      purchasedPacks: newPacks,
      welcomeSagenpaketClaimed: true,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, userId));

  res.json(WelcomeSagenpaketResponse.parse({ slug, bereitsGenutzt: false }));
});

// PATCH /me/notifications — schaltet Wetter-Push ein/aus
router.patch("/me/notifications", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { pushWeatherEnabled } = req.body as { pushWeatherEnabled?: unknown };
  if (typeof pushWeatherEnabled !== "boolean") {
    res.status(400).json({ error: "pushWeatherEnabled muss ein Boolean sein" });
    return;
  }
  await db
    .update(profilesTable)
    .set({ pushWeatherEnabled })
    .where(eq(profilesTable.id, userId));
  res.json({ ok: true });
});

export default router;
