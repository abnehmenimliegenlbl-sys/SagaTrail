import { ScreenMock, ThemeTokens } from "./_shared";

const tokens: ThemeTokens = {
  bgTop: "#F4F6F8",
  bgBottom: "#E4EAF0",
  headerText: "#28323C",
  headerSub: "#5E6E7C",
  cardBg: "#FFFFFF",
  cardBorder: "#DCE3EA",
  cardText: "#28323C",
  cardSub: "#66727E",
  chipBg: "#E6EEF6",
  chipText: "#33607F",
  primary: "#3E6E96",
  primaryText: "#FFFFFF",
  accent: "#A9C6DE",
  accentText: "#28323C",
  pillBg: "#EAF2F8",
  pillText: "#3E6E96",
  seasonIcon: "snow",
  mountainColor: "#9AA7B2",
  cloudColor: "#5B87A8",
};

export function WinterKlar() {
  return <ScreenMock tokens={tokens} seasonLabel="Winter" weatherLabel="-2° · Frisch & Klar" />;
}
