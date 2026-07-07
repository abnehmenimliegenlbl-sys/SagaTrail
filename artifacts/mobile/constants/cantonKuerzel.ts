// Offizielle Kantonskuerzel — als Wappen-Ersatz-Badges im Sagen-Album.
export const CANTON_KUERZEL: Record<string, string> = {
  Aargau: "AG",
  "Appenzell Ausserrhoden": "AR",
  "Appenzell Innerrhoden": "AI",
  "Basel-Landschaft": "BL",
  "Basel-Stadt": "BS",
  Bern: "BE",
  Freiburg: "FR",
  Genf: "GE",
  Glarus: "GL",
  Graubünden: "GR",
  Jura: "JU",
  Luzern: "LU",
  Neuenburg: "NE",
  Nidwalden: "NW",
  Obwalden: "OW",
  Schaffhausen: "SH",
  Schwyz: "SZ",
  Solothurn: "SO",
  "St. Gallen": "SG",
  Tessin: "TI",
  Thurgau: "TG",
  Uri: "UR",
  Waadt: "VD",
  Wallis: "VS",
  Zug: "ZG",
  Zürich: "ZH",
};

export function kantonsKuerzel(canton: string): string {
  return CANTON_KUERZEL[canton] ?? canton.slice(0, 2).toUpperCase();
}
