import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#FBFCFD",
  bgBottom: "#E9EFF4",
  headerText: "#3A4650",
  headerSub: "#7A8896",
  cardBg: "#FFFFFF",
  cardBorder: "#E6ECF1",
  cardText: "#3A4650",
  cardSub: "#7E8B97",
  chipBg: "#EFF4F8",
  chipText: "#4C7793",
  primary: "#6F94AE",
  primaryText: "#FFFFFF",
  accent: "#C9DCE8",
  accentText: "#3A4650",
  pillBg: "#F3F0E6",
  pillText: "#9A7F42",
  seasonIcon: "snow",
  mountainColor: "#B7C0C8",
  cloudColor: "#8FAAC0",
};

export function WinterSanft() {
  return <ScreenMock tokens={tokens} seasonLabel="Winter" weatherLabel="1° · Sanftes Winterlicht" />;
}
