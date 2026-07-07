// Bildet einen Kantonsnamen auf den stabilen Slug ab, der in RevenueCat
// als Entitlement-/Paket-Schluessel verwendet wird (pack_<slug>).
// Muss identisch sein zur kantonSlug-Funktion in scripts/src/portfolio2026.ts.
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
