import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#FFFFFF",
  bgBottom: "#F7F7F7",
  headerText: "#1A1A1A",
  headerSub: "#8A8A8A",
  cardBg: "#FFFFFF",
  cardBorder: "#DA291C",
  cardText: "#1A1A1A",
  cardSub: "#7A7A7A",
  chipBg: "#FBEBEA",
  chipText: "#B01E23",
  primary: "#DA291C",
  primaryText: "#FFFFFF",
  accent: "#DA291C",
  accentText: "#FFFFFF",
  pillBg: "#DA291C",
  pillText: "#FFFFFF",
  seasonIcon: "sun",
  mountainColor: "#DA291C",
  cloudColor: "#B0B0B0",
};

export function SchweizSommer() {
  return <ScreenMock tokens={tokens} seasonLabel="Sommer" weatherLabel="22° · Sonnig" />;
}
