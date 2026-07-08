import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, catalogSagasTable, storiesTable } from "@workspace/db";
import { CreateStoryBody, CreateStoryResponse } from "@workspace/api-zod";
import { generateStory } from "../lib/storyGenerator";

const router: IRouter = Router();

// Versionierte Quelle: Aenderungen am Erzaehl-Prompt (storyGenerator.ts)
// muessen diese Kennung mitbumpen, damit alte, im Stil ueberholte Kapitel
// nicht ewig aus dem Cache bedient werden. Alte Zeilen werden beim naechsten
// Abruf lazy ueberschrieben.
const STORY_SOURCE = "ai-v2";

router.post("/stories", async (req, res): Promise<void> => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sagaId, archetype, ageTier, language } = parsed.data;

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

  // 2. Sage laden: ausschliesslich aus dem kuratierten Katalog.
  const [saga] = await db
    .select()
    .from(catalogSagasTable)
    .where(eq(catalogSagasTable.id, sagaId));

  if (!saga) {
    res.status(404).json({ error: `Sage "${sagaId}" nicht gefunden` });
    return;
  }

  // 3. Via Anthropic erzeugen, cachen, liefern.
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
