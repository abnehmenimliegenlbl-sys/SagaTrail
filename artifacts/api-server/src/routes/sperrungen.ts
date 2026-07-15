import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

interface Sperrung {
  id: string;
  titel: string;
  beschreibung: string;
  canton: string;
  typ: "sperrung" | "wegschaden" | "warnung";
  von?: string;
  bis?: string;
  meldedatum: string;
  quelle: "admin" | "rss";
}

// In-memory Admin-Eintraege (persistiert bis Server-Neustart)
const adminEintraege = new Map<string, Sperrung>();

// Einfacher RSS-Cache (5 Minuten)
let rssCache: { data: Sperrung[]; ts: number } | null = null;
const RSS_TTL = 5 * 60 * 1000;

const RSS_URL =
  "https://www.schweizer-wanderwege.ch/de/aktuell/meldungen/rss.xml";

async function fetchRssSperrungen(): Promise<Sperrung[]> {
  if (rssCache && Date.now() - rssCache.ts < RSS_TTL) return rssCache.data;
  try {
    const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items: Sperrung[] = [];
    // Minimaler XML-Parser ohne externe Deps
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    let idx = 0;
    for (const m of itemMatches) {
      const block = m[1];
      const title = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
      const desc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
      if (!title) continue;
      items.push({
        id: `rss-${idx++}`,
        titel: title.trim(),
        beschreibung: desc.replace(/<[^>]+>/g, "").trim(),
        canton: "ch",
        typ: title.toLowerCase().includes("gesperr") ? "sperrung" : "warnung",
        meldedatum: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        quelle: "rss",
      });
    }
    rssCache = { data: items, ts: Date.now() };
    return items;
  } catch (err) {
    logger.warn({ err }, "RSS-Sperrungen konnten nicht geladen werden");
    return rssCache?.data ?? [];
  }
}

// GET /sperrungen?canton=be
router.get("/sperrungen", async (req, res): Promise<void> => {
  const canton = typeof req.query.canton === "string" ? req.query.canton.toLowerCase() : null;
  const rss = await fetchRssSperrungen();
  const admin = Array.from(adminEintraege.values());
  let all = [...rss, ...admin];
  if (canton) {
    all = all.filter((s) => s.canton === "ch" || s.canton === canton);
  }
  all.sort((a, b) => new Date(b.meldedatum).getTime() - new Date(a.meldedatum).getTime());
  res.json(all);
});

// POST /admin/sperrungen  (ADMIN_TOKEN geschuetzt)
router.post("/admin/sperrungen", (req, res): void => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
    res.status(403).json({ error: "Nicht autorisiert" });
    return;
  }
  const { titel, beschreibung, canton, typ, von, bis } = req.body as Record<string, unknown>;
  if (
    typeof titel !== "string" ||
    typeof beschreibung !== "string" ||
    typeof canton !== "string" ||
    (typ !== "sperrung" && typ !== "wegschaden" && typ !== "warnung")
  ) {
    res.status(400).json({ error: "Ungueltige Felder" });
    return;
  }
  const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const eintrag: Sperrung = {
    id,
    titel,
    beschreibung,
    canton: canton.toLowerCase(),
    typ,
    von: typeof von === "string" ? von : undefined,
    bis: typeof bis === "string" ? bis : undefined,
    meldedatum: new Date().toISOString(),
    quelle: "admin",
  };
  adminEintraege.set(id, eintrag);
  logger.info({ id, canton }, "Sperrung/Wegschaden manuell erfasst");
  res.status(201).json(eintrag);
});

// DELETE /admin/sperrungen/:id
router.delete("/admin/sperrungen/:id", (req, res): void => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
    res.status(403).json({ error: "Nicht autorisiert" });
    return;
  }
  const { id } = req.params;
  if (!adminEintraege.has(id)) {
    res.status(404).json({ error: "Nicht gefunden" });
    return;
  }
  adminEintraege.delete(id);
  res.json({ ok: true });
});

export default router;
