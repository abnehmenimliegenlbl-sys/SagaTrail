import type { Poi } from "@workspace/api-client-react";
import type { HikingRoute } from "@/constants/routes";

export const ROUTE_THEME_KEYS = [
  "wasserwege",
  "burgen_ruinen_alte_wege",
  "gipfel_panorama",
  "geologie_eiszeit",
  "hoehlen_grotten",
  "wald_wildtiere",
  "alpen_landwirtschaft",
  "pilger_handelswege",
  "industriekultur",
  "familien_entdecker",
  "nacht_sterne",
  "flora_jahreszeiten",
  "bahn_seilbahn",
] as const;

export type RouteThemeKey = (typeof ROUTE_THEME_KEYS)[number];

export const THEME_MAX_DISTANCE_KM: Record<RouteThemeKey, number> = {
  wasserwege: 0.2,
  burgen_ruinen_alte_wege: 0.2,
  gipfel_panorama: 2,
  geologie_eiszeit: 2,
  hoehlen_grotten: 0.5,
  wald_wildtiere: 2,
  alpen_landwirtschaft: 0.5,
  pilger_handelswege: 0.1,
  industriekultur: 0.2,
  familien_entdecker: 1,
  nacht_sterne: 2,
  flora_jahreszeiten: 2,
  bahn_seilbahn: 0.2,
};

export const MAX_THEME_DISTANCE_KM = Math.max(
  ...Object.values(THEME_MAX_DISTANCE_KM),
);

const THEME_LABELS: Record<string, Record<RouteThemeKey, string>> = {
  de: {
    wasserwege: "Wasserwege",
    burgen_ruinen_alte_wege: "Burgen, Ruinen & alte Wege",
    gipfel_panorama: "Gipfel & Panorama",
    geologie_eiszeit: "Geologie & Eiszeit",
    hoehlen_grotten: "Höhlen & Grotten",
    wald_wildtiere: "Wald, Wildtiere & Spuren",
    alpen_landwirtschaft: "Alpen & Landwirtschaft",
    pilger_handelswege: "Pilger- & Handelswege",
    industriekultur: "Industriekultur",
    familien_entdecker: "Familien-Entdecker",
    nacht_sterne: "Nacht & Sterne",
    flora_jahreszeiten: "Flora & Jahreszeiten",
    bahn_seilbahn: "Bahn, Tram & Seilbahn",
  },
  gsw: {
    wasserwege: "Wasserwäg",
    burgen_ruinen_alte_wege: "Burgä, Ruine & alti Wäg",
    gipfel_panorama: "Gipfel & Panorama",
    geologie_eiszeit: "Geologie & Iisziit",
    hoehlen_grotten: "Höhle & Grottene",
    wald_wildtiere: "Wald, Wildtier & Spure",
    alpen_landwirtschaft: "Alpe & Landwirtschaft",
    pilger_handelswege: "Pilger- & Handelswäg",
    industriekultur: "Industriekultur",
    familien_entdecker: "Familie-Entdecker",
    nacht_sterne: "Nacht & Stärne",
    flora_jahreszeiten: "Flora & Jahresziite",
    bahn_seilbahn: "Bahn, Tram & Seilbahn",
  },
  en: {
    wasserwege: "Waterways",
    burgen_ruinen_alte_wege: "Castles, ruins & old trails",
    gipfel_panorama: "Summits & panoramas",
    geologie_eiszeit: "Geology & Ice Age",
    hoehlen_grotten: "Caves & grottoes",
    wald_wildtiere: "Forest, wildlife & tracks",
    alpen_landwirtschaft: "Alps & farming",
    pilger_handelswege: "Pilgrimage & trade routes",
    industriekultur: "Industrial heritage",
    familien_entdecker: "Family discovery",
    nacht_sterne: "Night & stars",
    flora_jahreszeiten: "Flora & seasons",
    bahn_seilbahn: "Rail, tram & cable car",
  },
  fr: {
    wasserwege: "Chemins de l’eau",
    burgen_ruinen_alte_wege: "Châteaux, ruines & anciens chemins",
    gipfel_panorama: "Sommets & panoramas",
    geologie_eiszeit: "Géologie & période glaciaire",
    hoehlen_grotten: "Grottes & cavernes",
    wald_wildtiere: "Forêt, faune & traces",
    alpen_landwirtschaft: "Alpes & agriculture",
    pilger_handelswege: "Chemins de pèlerinage & de commerce",
    industriekultur: "Patrimoine industriel",
    familien_entdecker: "Découverte en famille",
    nacht_sterne: "Nuit & étoiles",
    flora_jahreszeiten: "Flore & saisons",
    bahn_seilbahn: "Train, tram & remontées",
  },
  it: {
    wasserwege: "Vie dell’acqua",
    burgen_ruinen_alte_wege: "Castelli, rovine & antichi sentieri",
    gipfel_panorama: "Vette & panorami",
    geologie_eiszeit: "Geologia & era glaciale",
    hoehlen_grotten: "Grotte & caverne",
    wald_wildtiere: "Boschi, fauna & tracce",
    alpen_landwirtschaft: "Alpi & agricoltura",
    pilger_handelswege: "Vie di pellegrinaggio & commercio",
    industriekultur: "Patrimonio industriale",
    familien_entdecker: "Scoperta in famiglia",
    nacht_sterne: "Notte & stelle",
    flora_jahreszeiten: "Flora & stagioni",
    bahn_seilbahn: "Treno, tram & funivia",
  },
  es: {
    wasserwege: "Rutas del agua",
    burgen_ruinen_alte_wege: "Castillos, ruinas y caminos antiguos",
    gipfel_panorama: "Cumbres y panoramas",
    geologie_eiszeit: "Geología y era glacial",
    hoehlen_grotten: "Cuevas y grutas",
    wald_wildtiere: "Bosque, fauna y huellas",
    alpen_landwirtschaft: "Alpes y agricultura",
    pilger_handelswege: "Rutas de peregrinación y comercio",
    industriekultur: "Patrimonio industrial",
    familien_entdecker: "Descubrimiento en familia",
    nacht_sterne: "Noche y estrellas",
    flora_jahreszeiten: "Flora y estaciones",
    bahn_seilbahn: "Tren, tranvía y teleférico",
  },
  pt: {
    wasserwege: "Caminhos da água",
    burgen_ruinen_alte_wege: "Castelos, ruínas e caminhos antigos",
    gipfel_panorama: "Cumes e panoramas",
    geologie_eiszeit: "Geologia e era glacial",
    hoehlen_grotten: "Grutas e cavernas",
    wald_wildtiere: "Floresta, fauna e pegadas",
    alpen_landwirtschaft: "Alpes e agricultura",
    pilger_handelswege: "Rotas de peregrinação e comércio",
    industriekultur: "Património industrial",
    familien_entdecker: "Descoberta em família",
    nacht_sterne: "Noite e estrelas",
    flora_jahreszeiten: "Flora e estações",
    bahn_seilbahn: "Comboio, elétrico e teleférico",
  },
  zh: {
    wasserwege: "水之旅",
    burgen_ruinen_alte_wege: "城堡、遗迹与古道",
    gipfel_panorama: "山峰与全景",
    geologie_eiszeit: "地质与冰河时代",
    hoehlen_grotten: "洞穴与岩洞",
    wald_wildtiere: "森林、野生动物与踪迹",
    alpen_landwirtschaft: "阿尔卑斯与农业",
    pilger_handelswege: "朝圣与商贸路线",
    industriekultur: "工业遗产",
    familien_entdecker: "家庭探索",
    nacht_sterne: "夜空与星辰",
    flora_jahreszeiten: "植物与四季",
    bahn_seilbahn: "铁路、有轨电车与缆车",
  },
  ru: {
    wasserwege: "Водные маршруты",
    burgen_ruinen_alte_wege: "Замки, руины и старые тропы",
    gipfel_panorama: "Вершины и панорамы",
    geologie_eiszeit: "Геология и ледниковый период",
    hoehlen_grotten: "Пещеры и гроты",
    wald_wildtiere: "Лес, животные и следы",
    alpen_landwirtschaft: "Альпы и сельское хозяйство",
    pilger_handelswege: "Паломнические и торговые пути",
    industriekultur: "Промышленное наследие",
    familien_entdecker: "Семейные открытия",
    nacht_sterne: "Ночь и звёзды",
    flora_jahreszeiten: "Флора и времена года",
    bahn_seilbahn: "Поезд, трамвай и канатная дорога",
  },
};

export function routeThemeLabel(key: RouteThemeKey, language?: string): string {
  return (THEME_LABELS[language ?? "de"] ?? THEME_LABELS.de)[key];
}

function hasKind(poi: Poi, ...kinds: string[]): boolean {
  return kinds.some((kind) => poi.kind === kind);
}

function distanceToSegmentKm(
  point: { lat: number; lng: number },
  a: number[],
  b: number[],
): number {
  const radius = 6371;
  const radians = Math.PI / 180;
  const cosLat = Math.cos(point.lat * radians);
  const ax = (a[1]! - point.lng) * radians * cosLat * radius;
  const ay = (a[0]! - point.lat) * radians * radius;
  const bx = (b[1]! - point.lng) * radians * cosLat * radius;
  const by = (b[0]! - point.lat) * radians * radius;
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToRouteKm(poi: Poi, geometry: number[][]): number {
  if (geometry.length < 2) return Infinity;
  let nearest = Infinity;
  for (let index = 1; index < geometry.length; index += 1) {
    nearest = Math.min(
      nearest,
      distanceToSegmentKm(
        { lat: poi.lat, lng: poi.lng },
        geometry[index - 1]!,
        geometry[index]!,
      ),
    );
  }
  return nearest;
}

/**
 * Erzeugt sichtbare Themen aus den tatsächlich gefundenen Routen-POIs.
 * Kategorien ohne belastbaren POI-Beleg werden absichtlich nicht geraten.
 */
export function deriveRouteThemes(
  pois: readonly Poi[],
  route: Pick<HikingRoute, "familyFriendly" | "geometry">,
): RouteThemeKey[] {
  const tags = new Set<RouteThemeKey>();
  const geometry = route.geometry ?? [];
  for (const poi of pois) {
    const kind = poi.kind ?? "";
    const distanceKm = distanceToRouteKm(poi, geometry);
    const addIfNear = (theme: RouteThemeKey, matches: boolean) => {
      if (matches && distanceKm <= THEME_MAX_DISTANCE_KM[theme]) {
        tags.add(theme);
      }
    };
    addIfNear("wasserwege", (
      kind === "natural=water" ||
      kind === "natural=waterfall" ||
      kind === "natural=spring" ||
      kind === "natural=gorge" ||
      kind === "waterway=waterfall" ||
      kind === "waterway=river" ||
      kind === "waterway=stream"
    ));
    addIfNear("burgen_ruinen_alte_wege", (
      kind.startsWith("historic=") &&
      [
        "historic=castle",
        "historic=ruins",
        "historic=fort",
        "historic=archaeological_site",
        "historic=roman_road",
        "historic=roman_villa",
        "historic=roman_building",
        "historic=battlefield",
        "historic=bridge",
      ].includes(kind)
    ));
    addIfNear(
      "gipfel_panorama",
      hasKind(poi, "natural=peak", "natural=saddle", "tourism=viewpoint"),
    );
    addIfNear(
      "geologie_eiszeit",
      kind.startsWith("geological=") ||
      hasKind(poi, "natural=rock", "natural=glacier")
    );
    addIfNear("hoehlen_grotten", (
      hasKind(
        poi,
        "natural=arch",
        "natural=cave",
        "natural=cave_entrance",
        "natural=rock_shelter",
        "man_made=adit",
      )
    ));
    addIfNear(
      "wald_wildtiere",
      hasKind(poi, "natural=wood", "natural=wetland", "tourism=wildlife_hide"),
    );
    addIfNear("alpen_landwirtschaft", (
      hasKind(
        poi,
        "tourism=alpine_hut",
        "amenity=shelter",
        "shop=cheese",
        "farm=Alp",
        "landuse=meadow",
        "landuse=pasture",
      )
    ));
    addIfNear("pilger_handelswege", (
      hasKind(
        poi,
        "route=pilgrimage",
        "historic=church",
        "historic=wayside_cross",
        "historic=wayside_shrine",
        "historic=milestone",
        "historic=boundary_stone",
      )
    ));
    addIfNear("industriekultur", (
      kind.startsWith("man_made=") &&
      ["man_made=watermill", "man_made=windmill", "man_made=works", "man_made=quarry"].includes(kind)
    ));
    addIfNear(
      "familien_entdecker",
      hasKind(poi, "amenity=playground", "amenity=picnic_site", "amenity=toilets"),
    );
    if (route.familyFriendly === true) tags.add("familien_entdecker");
    addIfNear(
      "nacht_sterne",
      hasKind(poi, "amenity=observatory", "tourism=observatory"),
    );
    addIfNear("flora_jahreszeiten", (
      hasKind(
        poi,
        "natural=tree",
        "natural=wetland",
        "landuse=orchard",
        "landuse=vineyard",
        "natural=heath",
      )
    ));
    addIfNear("bahn_seilbahn", (
      hasKind(
        poi,
        "railway=station",
        "railway=halt",
        "railway=tram_stop",
        "highway=bus_stop",
        "aerialway=station",
        "amenity=ferry_terminal",
      )
    ));
  }
  return ROUTE_THEME_KEYS.filter((key) => tags.has(key));
}