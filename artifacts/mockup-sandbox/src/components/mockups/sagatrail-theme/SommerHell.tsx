import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#EAF6E9",
  bgBottom: "#DCEFE0",
  headerText: "#22392A",
  headerSub: "#5B7A62",
  cardBg: "#FFFFFF",
  cardBorder: "#DCE9DE",
  cardText: "#22392A",
  cardSub: "#6B8072",
  chipBg: "#E4F1FB",
  chipText: "#2E5F7A",
  primary: "#4C9A6A",
  primaryText: "#FFFFFF",
  accent: "#8FD1F0",
  accentText: "#22392A",
  pillBg: "#FFF6DE",
  pillText: "#9A7A1E",
  seasonIcon: "sun",
  mountainColor: "#8C9A8E",
  cloudColor: "#7FB6D9",
};

export function SommerHell() {
  return <ScreenMock tokens={tokens} seasonLabel="Sommer" weatherLabel="22° · Sonnig" />;
}
