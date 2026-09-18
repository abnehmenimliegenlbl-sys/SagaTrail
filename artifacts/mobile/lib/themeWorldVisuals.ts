import type { RouteThemeKey } from "@/lib/routeThemes";

/**
 * Lokale Motive halten die Übersicht auch offline bildstark und vermeiden
 * einen zusätzlichen Netzwerk-Request pro Themenkachel.
 */
export const THEME_WORLD_IMAGES: Record<RouteThemeKey, number> = {
  wasserwege: require("@/assets/images/theme-worlds/wasser.jpg"),
  burgen_ruinen_alte_wege: require("@/assets/images/theme-worlds/burgen.jpg"),
  gipfel_panorama: require("@/assets/images/theme-worlds/gipfel.jpg"),
  geologie_eiszeit: require("@/assets/images/theme-worlds/geologie.jpg"),
  hoehlen_grotten: require("@/assets/images/theme-worlds/hoehlen-grotten.jpg"),
  wald_wildtiere: require("@/assets/images/theme-worlds/wald-wildtiere.jpg"),
  alpen_landwirtschaft: require("@/assets/images/theme-worlds/alpen-landwirtschaft.jpg"),
  pilger_handelswege: require("@/assets/images/theme-worlds/pilger.jpg"),
  industriekultur: require("@/assets/images/theme-worlds/industrie.jpg"),
  familien_entdecker: require("@/assets/images/theme-worlds/familie.jpg"),
  nacht_sterne: require("@/assets/images/theme-worlds/nacht-sterne.jpg"),
  flora_jahreszeiten: require("@/assets/images/theme-worlds/flora.jpg"),
  bahn_seilbahn: require("@/assets/images/theme-worlds/bahn-seilbahn.jpg"),
};

export const THEME_WORLD_HOME_BANNER = require("@/assets/images/theme-worlds/home-banner.jpg");
export const MEETUP_HOME_BANNER = require("@/assets/images/meetup-banner.jpg");
export const RECOMMENDATION_HOME_BANNER = require("@/assets/images/theme-worlds/panorama.jpg");