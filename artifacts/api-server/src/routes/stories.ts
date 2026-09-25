import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, catalogSagasTable, profilesTable, storiesTable } from "@workspace/db";
import { CreateStoryBody, CreateStoryResponse } from "@workspace/api-zod";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { generateStory } from "../lib/storyGenerator";
import { CURATED_SAGAS } from "../lib/curatedSagas";

const router: IRouter = Router();

// Versionierte Quelle: Aenderungen am Erzaehl-Prompt (storyGenerator.ts)
// muessen diese Kennung mitbumpen, damit alte, im Stil ueberholte Kapitel
// nicht ewig aus dem Cache bedient werden. Alte Zeilen werden beim naechsten
// Abruf lazy ueberschrieben.
const STORY_SOURCE = "ai-v4";

function cantonSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sagaPackSlug(canton: string, sagaIndex0: number): string {
  const packNumber = Math.floor(sagaIndex0 / 9);
  return packNumber === 0 ? canton : `${canton}_${packNumber + 1}`;
}

router.post("/stories", async (req, res): Promise<void> => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return;
  }

  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sagaId, archetype, ageTier, language } = parsed.data;

  const [saga] = await db
    .select()
    .from(catalogSagasTable)
    .where(eq(catalogSagasTable.id, sagaId));
  if (!saga) {
    res.status(404).json({ error: `Sage "${sagaId}" nicht gefunden` });
    return;
  }

  const [profile] = await db
    .select({
      premium: profilesTable.premium,
      premiumBis: profilesTable.premiumBis,
      freeHikeUsed: profilesTable.freeHikeUsed,
      purchasedPacks: profilesTable.purchasedPacks,
      hikeHistory: profilesTable.hikeHistory,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!profile) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }

  const canton = cantonSlug(saga.canton);
  const sagaIndex = CURATED_SAGAS
    .filter((item) => item.canton === saga.canton)
    .findIndex((item) => item.id === sagaId);
  const requiredPack = sagaIndex >= 0 ? sagaPackSlug(canton, sagaIndex) : null;
  const hasCantonPack =
    requiredPack !== null &&
    (profile.purchasedPacks ?? []).some(
      (pack) => pack === requiredPack || pack === `pack_${requiredPack}`,
    );
  const hasHeardSaga =
    Array.isArray(profile.hikeHistory) &&
    profile.hikeHistory.some(
      (entry) =>
        entry != null &&
        typeof entry === "object" &&
        "sagaId" in entry &&
        entry.sagaId === sagaId,
    );
  const canAccess =
    istPremiumAktiv(profile) || hasCantonPack || hasHeardSaga || !profile.freeHikeUsed;
  if (!canAccess) {
    res.status(403).json({ error: "Für diese Sage ist Premium oder ein passendes Sagenpaket erforderlich" });
    return;
  }

  // 1. Cache-Treffer? Dann direkt liefern (kein Anthropic-Aufruf noetig).
  const [cached] = await db
    .select()
    .from(storiesTable)
    .where(
      and(
        eq(storiesTable.sagaId, sagaId),
        eq(storiesTable.archetype, archetype),
        eq(storiesTable.ageTier, ageTier),
        eq(storiesTable.lang, language),
        eq(storiesTable.source, STORY_SOURCE),
      ),
    );

  if (cached) {
    res.json(
      CreateStoryResponse.parse({
        sagaId,
        archetype,
        ageTier,
        language,
        source: "cache",
        chapters: cached.chapters,
      }),
    );
    return;
  }

  // 2. Via Anthropic erzeugen, cachen, liefern.
  let chapters;
  try {
    chapters = await generateStory(saga, archetype, ageTier, language, req.log);
  } catch (err) {
    req.log.error({ err, sagaId, archetype, ageTier, language }, "Story-Generierung fehlgeschlagen");
    res.status(502).json({ error: "Erzeugung der Erzaehlung fehlgeschlagen" });
    return;
  }

  await db
    .insert(storiesTable)
    .values({ sagaId, archetype, ageTier, lang: language, chapters, source: STORY_SOURCE })
    .onConflictDoUpdate({
      target: [storiesTable.sagaId, storiesTable.archetype, storiesTable.ageTier, storiesTable.lang],
      set: { chapters, source: STORY_SOURCE },
    });

  res.json(
    CreateStoryResponse.parse({
      sagaId,
      archetype,
      ageTier,
      language,
      source: "ai",
      chapters,
    }),
  );
});

export default router;
