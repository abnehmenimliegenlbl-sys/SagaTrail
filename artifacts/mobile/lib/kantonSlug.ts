// Bildet einen Kantonsnamen auf den stabilen Slug ab, der in RevenueCat
// als Entitlement-/Paket-Schluessel verwendet wird (pack_<slug>).
// Muss identisch sein zur kantonSlug-Funktion in scripts/src/portfolio2026.ts.

/**
 * Maximale Anzahl Sagen pro Sagen-Pack-Stufe.
 * Pack 1 deckt Indizes 0 bis SAGEN_PRO_PACK-1 ab,
 * Pack 2 deckt Indizes SAGEN_PRO_PACK bis 2*SAGEN_PRO_PACK-1, usw.
 */
export const SAGEN_PRO_PACK = 8;

/**
 * DB-Pack-Slug fuer eine Sage basierend auf ihrem 0-basierten Index im Kanton.
 * Pack 1 (Index 0-7): kantonSlug
 * Pack 2 (Index 8-15): kantonSlug + "_2"
 * Pack 3 (Index 16-23): kantonSlug + "_3" usw.
 */
export function sagaPackSlug(slug: string, sagaIndex0: number): string {
  const packNr = Math.floor(sagaIndex0 / SAGEN_PRO_PACK);
  return packNr === 0 ? slug : `${slug}_${packNr + 1}`;
}

export function kantonSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Entitlement-Schluessel des Sagen-Packs fuer einen Kanton. */
export function packEntitlementFuerKanton(kanton: string): string {
  return `pack_${kantonSlug(kanton)}`;
}
