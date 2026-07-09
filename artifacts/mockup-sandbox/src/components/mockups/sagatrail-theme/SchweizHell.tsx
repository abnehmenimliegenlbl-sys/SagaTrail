import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#FFFFFF",
  bgBottom: "#F2F4F6",
  headerText: "#1A1A1A",
  headerSub: "#8A8A8A",
  cardBg: "#FFFFFF",
  cardBorder: "#DA291C",
  cardText: "#1A1A1A",
  cardSub: "#7A8590",
  chipBg: "#EAF0F5",
  chipText: "#3B5C74",
  primary: "#DA291C",
  primaryText: "#FFFFFF",
  accent: "#3B5C74",
  accentText: "#FFFFFF",
  pillBg: "#DA291C",
  pillText: "#FFFFFF",
  modeIcon: "sun",
  mountainColor: "#9AA7B2",
  cloudColor: "#5B87A8",
  glassBg: "rgba(255,255,255,0.65)",
  glassBorder: "rgba(218,41,28,0.35)",
};

export function SchweizHell() {
  return <ScreenMock tokens={tokens} modeLabel="Hell" weatherLabel="12° · Frisch & Klar" />;
}
