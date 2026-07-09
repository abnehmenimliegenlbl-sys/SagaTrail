import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#1B1D22",
  bgBottom: "#101216",
  headerText: "#F5F3EC",
  headerSub: "#9AA0A8",
  cardBg: "#22262C",
  cardBorder: "rgba(218,41,28,0.55)",
  cardText: "#F5F3EC",
  cardSub: "#9AA0A8",
  chipBg: "rgba(218,41,28,0.16)",
  chipText: "#F0A79E",
  primary: "#E8362A",
  primaryText: "#FFFFFF",
  accent: "#E8362A",
  accentText: "#FFFFFF",
  pillBg: "#E8362A",
  pillText: "#FFFFFF",
  modeIcon: "moon",
  mountainColor: "#8A9199",
  cloudColor: "#B7BEC6",
  glassBg: "rgba(245,243,236,0.06)",
  glassBorder: "rgba(218,41,28,0.35)",
};

export function SchweizDunkel() {
  return <ScreenMock tokens={tokens} modeLabel="Dunkel" weatherLabel="4° · Klare Nacht" />;
}
