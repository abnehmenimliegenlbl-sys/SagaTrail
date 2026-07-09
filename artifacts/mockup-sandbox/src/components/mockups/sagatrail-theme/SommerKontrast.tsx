import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#DCEFDA",
  bgBottom: "#C3E4D6",
  headerText: "#1B3324",
  headerSub: "#3F6B4C",
  cardBg: "#FFFFFF",
  cardBorder: "#BFDCC7",
  cardText: "#1B3324",
  cardSub: "#4C7259",
  chipBg: "#CFEBFA",
  chipText: "#164E6E",
  primary: "#2F8F53",
  primaryText: "#FFFFFF",
  accent: "#4FB6E8",
  accentText: "#1B3324",
  pillBg: "#FDEFC6",
  pillText: "#7A5A0A",
  seasonIcon: "sun",
  mountainColor: "#6E8878",
  cloudColor: "#3E9BD1",
};

export function SommerKontrast() {
  return <ScreenMock tokens={tokens} seasonLabel="Sommer" weatherLabel="24° · Klarer Himmel" />;
}
