/**
 * Abbildung der deutschen Kantonsnamen (wie in der App verwendet) auf die
 * ISO-3166-2-Codes, mit denen die amtlichen Kantonsgrenzen in OpenStreetMap
 * getaggt sind. Ueber diese Codes wird die Overpass-Abfrage robust auf einen
 * Kanton eingegrenzt (unabhaengig von Sprach-/Namensvarianten in OSM).
 */
export const CANTON_ISO: Record<string, string> = {
  Zürich: "CH-ZH",
  Bern: "CH-BE",
  Luzern: "CH-LU",
  Uri: "CH-UR",
  Schwyz: "CH-SZ",
  Obwalden: "CH-OW",
  Nidwalden: "CH-NW",
  Glarus: "CH-GL",
  Zug: "CH-ZG",
  Freiburg: "CH-FR",
  Solothurn: "CH-SO",
  "Basel-Stadt": "CH-BS",
  "Basel-Landschaft": "CH-BL",
  Schaffhausen: "CH-SH",
  "Appenzell Ausserrhoden": "CH-AR",
  "Appenzell Innerrhoden": "CH-AI",
  "St. Gallen": "CH-SG",
  Graubünden: "CH-GR",
  Aargau: "CH-AG",
  Thurgau: "CH-TG",
  Tessin: "CH-TI",
  Waadt: "CH-VD",
  Wallis: "CH-VS",
  Neuenburg: "CH-NE",
  Genf: "CH-GE",
  Jura: "CH-JU",
};

export function isoForCanton(canton: string): string | undefined {
  return CANTON_ISO[canton];
}
