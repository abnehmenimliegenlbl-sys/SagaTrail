/**
 * SagaTrail Design-System-Tokens.
 *
 * Schweizer Rot-Weiss-Design mit zwei Modi: `hell` und `dunkel`.
 * Gold (`altgold`) bleibt in beiden Modi unveraendert reserviert fuer
 * Premium-/Sagenpaket-Aktionen (siehe PrimaryButton `variant="gold"`).
 */

const shared = {
  altgold: "#B8935A", // NUR fuer Premium-/Sagenpaket-Aktionen (PrimaryButton variant="gold", Achievement-Marken) — modiuebergreifend fix
  moosgrau: "#6B7568", // gedaempfter Text, Trennlinien, Metadaten (Dunkel-Basis)
};

const hell = {
  ...shared,
  // Kernpalette
  nachthimmel: "#FFFFFF",
  talschatten: "#F4F5F7",
  gletscherweiss: "#181A1E",
  almrausch: "#DA291C", // Schweizer Rot — Primäraktion
  moosgrau: "#6B7280",
  accent: "#DA291C", // Schweizer Rot — Raender, Trennlinien, Akzenttext/-icons
  accentForeground: "#FFFFFF",

  // Frosted-Glass-Werte (helles Glas)
  glassBg: "rgba(255,255,255,0.55)",
  glassBgStrong: "rgba(255,255,255,0.75)",
  glassBorder: "rgba(218,41,28,0.35)",
  glassHighlight: "rgba(255,255,255,0.6)",
  trackGroove: "rgba(24,26,30,0.12)",
  photoScrimText: "#FFFFFF",
  photoScrimMuted: "rgba(255,255,255,0.78)",

  // Puck-Schieberegler (Eishockey-Look): weisser Rand wie Schweizer Kreuz, glaenzendes Oben, dunkler Rand unten
  puckRim: "#FFFFFF",
  puckHighlight: "#FF7A6E",
  puckShade: "#8C1710",

  // Semantische Aliase
  text: "#181A1E",
  tint: "#B8935A",
  background: "#F4F5F7",
  backgroundDeep: "#FFFFFF",
  foreground: "#181A1E",
  card: "#FFFFFF",
  cardForeground: "#181A1E",
  primary: "#DA291C",
  primaryForeground: "#FFFFFF",
  secondary: "#FFFFFF",
  secondaryForeground: "#181A1E",
  muted: "#EDEEF1",
  mutedForeground: "#6B7280",
  destructive: "#DA291C",
  destructiveForeground: "#FFFFFF",
  border: "rgba(218,41,28,0.35)",
  input: "rgba(218,41,28,0.2)",
};

const dunkel = {
  ...shared,
  // Kernpalette
  nachthimmel: "#101216",
  talschatten: "#1B1D22",
  gletscherweiss: "#F5F3EC",
  almrausch: "#E8362A", // Schweizer Rot (dunkel-optimiert) — Primäraktion
  accent: "#E8362A", // Schweizer Rot (dunkel-optimiert) — Raender, Trennlinien, Akzenttext/-icons
  accentForeground: "#FFFFFF",

  // Frosted-Glass-Werte (dunkles Glas)
  glassBg: "rgba(245,243,236,0.08)",
  glassBgStrong: "rgba(245,243,236,0.14)",
  glassBorder: "rgba(232,54,42,0.35)",
  glassHighlight: "rgba(255,255,255,0.12)",
  trackGroove: "rgba(0,0,0,0.35)",
  photoScrimText: "#FFFFFF",
  photoScrimMuted: "rgba(255,255,255,0.78)",

  // Puck-Schieberegler (Eishockey-Look): weisser Rand wie Schweizer Kreuz, glaenzendes Oben, dunkler Rand unten
  puckRim: "#FFFFFF",
  puckHighlight: "#FF9188",
  puckShade: "#7A140E",

  // Semantische Aliase
  text: "#F5F3EC",
  tint: "#B8935A",
  background: "#1B1D22",
  backgroundDeep: "#101216",
  foreground: "#F5F3EC",
  card: "#1F2127",
  cardForeground: "#F5F3EC",
  primary: "#E8362A",
  primaryForeground: "#FFFFFF",
  secondary: "#1F2127",
  secondaryForeground: "#F5F3EC",
  muted: "#1F2127",
  mutedForeground: "#8A8D95",
  destructive: "#E8362A",
  destructiveForeground: "#FFFFFF",
  border: "rgba(232,54,42,0.35)",
  input: "rgba(245,243,236,0.14)",
};

const colors = {
  light: hell,
  dark: dunkel,
  hell,
  dunkel,
  radius: 14,
};

export type ThemeMode = "hell" | "dunkel";

export default colors;
