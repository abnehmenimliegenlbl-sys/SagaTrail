import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Offline-Cache fuer POI-Detail (quellenbelegte Angaben) und POI-Story.
 *
 * Beim Download einer Route werden Details und Geschichten aller POIs vorab
 * geladen und in AsyncStorage abgelegt. Im Hike-Screen werden sie bevorzugt
 * vor einem Netzwerk-Request genutzt.
 *
 * Konvention:
 *   getOfflinePoiDetail → undefined/null = kein positiver Cache-Eintrag
 *                                        (→ Netzwerk noetig)
 *                          WikiSummary   = gecachte Daten
 *
 *   getOfflinePoiStory  → null   = kein Cache-Eintrag (→ Netzwerk noetig)
 *                          string = gecachter Story-Text
 */

// Neue verifizierte Ortsquellen und das angepasste POI-Narrativ dürfen nicht
// durch ältere, generische Offline-Texte verdeckt werden.
const DETAIL_PREFIX = "sagatrail:poi-detail:v6:";
const STORY_PREFIX = "sagatrail:poi-story:v3:";

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  lang: string;
  image?: string | null;
  sources?: {
    role: "text" | "image";
    provider: string;
    title?: string;
    url: string;
    license?: string;
    creator?: string;
  }[];
}

function detailKey(poiId: string): string {
  return `${DETAIL_PREFIX}${poiId}`;
}

function storyKey(poiId: string, lang: string): string {
  return `${STORY_PREFIX}${poiId}:${lang}`;
}

/** Speichert nur positive POI-Details. Null-Werte bleiben erneut abrufbar. */
export async function cachePoiDetail(
  poiId: string,
  wiki: WikiSummary | null | undefined
): Promise<void> {
  if (!wiki) {
    await clearOfflinePoiDetail(poiId);
    return;
  }
  await AsyncStorage.setItem(detailKey(poiId), JSON.stringify(wiki)).catch(() => {});
}

/** Entfernt einen Detail-Cache, wenn der Netzwerkabruf fehlgeschlagen ist. */
export async function clearOfflinePoiDetail(poiId: string): Promise<void> {
  await AsyncStorage.removeItem(detailKey(poiId)).catch(() => {});
}

/** Speichert eine POI-Story im Cache. */
export async function cachePoiStory(
  poiId: string,
  lang: string,
  text: string
): Promise<void> {
  await AsyncStorage.setItem(storyKey(poiId, lang), text).catch(() => {});
}

/**
 * Liest gecachtes POI-Detail.
 * - undefined/null: kein positiver Eintrag (Netzwerk noetig)
 * - WikiSummary: gecachte Daten
 */
export async function getOfflinePoiDetail(
  poiId: string
): Promise<WikiSummary | null | undefined> {
  try {
    const raw = await AsyncStorage.getItem(detailKey(poiId));
    if (raw === null) return undefined; // nicht im Cache
    if (raw === "null") return null; // alter negativer Eintrag: Netzwerk erneut versuchen
    return JSON.parse(raw) as WikiSummary;
  } catch {
    return undefined;
  }
}

/**
 * Liest gecachte POI-Story.
 * - null: kein Eintrag (Netzwerk noetig)
 * - string: gecachter Text
 */
export async function getOfflinePoiStory(
  poiId: string,
  lang: string
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(storyKey(poiId, lang));
  } catch {
    return null;
  }
}

/** Loescht Detail- und Story-Caches fuer eine Liste von POI-IDs. */
export async function deletePoiCaches(poiIds: string[]): Promise<void> {
  // Alle Sprach-Varianten per Prefix loeschen ist nicht direkt moeglich —
  // stattdessen loeschen wir alle bekannten Keys aus dem Index.
  const allKeys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  const toDelete = allKeys.filter((k) =>
    poiIds.some((id) => k.startsWith(`${DETAIL_PREFIX}${id}`) || k.includes(`${STORY_PREFIX}${id}:`))
  );
  if (toDelete.length > 0) {
    await AsyncStorage.multiRemove(toDelete as string[]).catch(() => {});
  }
}
