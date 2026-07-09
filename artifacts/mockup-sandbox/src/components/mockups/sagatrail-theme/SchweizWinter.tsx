import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#FFFFFF",
  bgBottom: "#F2F4F6",
  headerText: "#1A1A1A",
  headerSub: "#8A8A8A",
  cardBg: "#FFFFFF",
  cardBorder: "#E7ECEF",
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
  seasonIcon: "snow",
  mountainColor: "#9AA7B2",
  cloudColor: "#5B87A8",
};

export function SchweizWinter() {
  return <ScreenMock tokens={tokens} seasonLabel="Winter" weatherLabel="-2° · Frisch & Klar" />;
}
