/**
 * SagaTrail Design-System-Tokens.
 *
 * Farbwerte 1:1 aus dem verbindlichen Style Guide (AlpSaga/SagaTrail).
 * Die App ist durchgehend dunkel — daher tragen `light` und `dark`
 * dieselben Werte, damit useColors() unabhängig vom Systemschema
 * immer die Markenpalette liefert.
 */

const brand = {
  // Kernpalette (fixe Aufgaben laut Style Guide)
  nachthimmel: "#10181A", // tiefster Kontrast — Splash, Onboarding, Nacht
  talschatten: "#1B2E28", // primärer App-Hintergrund
  gletscherweiss: "#F5F3EC", // Text auf Dunkel, Icons, Glas-Highlights
  almrausch: "#C4462F", // Primäraktion, SOS, Entscheidungsmomente — reserviert
  altgold: "#B8935A", // Akzente, Icons, Achievements, der Funke
  moosgrau: "#6B7568", // gedämpfter Text, Trennlinien, Metadaten

  // Frozen-Glass-Werte
  glassBg: "rgba(245,243,236,0.08)",
  glassBgStrong: "rgba(245,243,236,0.14)",
  glassBorder: "rgba(245,243,236,0.20)",

  // Semantische Aliase (mobile-ui Konvention)
  text: "#F5F3EC",
  tint: "#B8935A",
  background: "#1B2E28",
  backgroundDeep: "#10181A",
  foreground: "#F5F3EC",
  card: "#22362F",
  cardForeground: "#F5F3EC",
  primary: "#C4462F",
  primaryForeground: "#F5F3EC",
  secondary: "#22362F",
  secondaryForeground: "#F5F3EC",
  muted: "#22362F",
  mutedForeground: "#6B7568",
  accent: "#B8935A",
  accentForeground: "#10181A",
  destructive: "#C4462F",
  destructiveForeground: "#F5F3EC",
  border: "rgba(245,243,236,0.14)",
  input: "rgba(245,243,236,0.14)",
};

const colors = {
  light: { ...brand },
  dark: { ...brand },
  radius: 14,
};

export default colors;
