import { db, catalogRoutesTable, catalogSagasTable } from "@workspace/db";
import type { InsertCatalogRoute, InsertCatalogSaga } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Kuratierte Ausgangsdaten des Online-Katalogs. Der Server ist die verbindliche
 * Quelle; die App faellt offline auf ihre gebuendelten Seed-Daten zurueck. Diese
 * Liste muss inhaltlich mit den App-Seed-Daten uebereinstimmen.
 */
const SEED_ROUTES: InsertCatalogRoute[] = [
  { id: "teufelsbrucke", sagaId: "teufelsbrucke", name: "Schöllenen-Schlucht", region: "Uri", distanceKm: 6.4, ascentM: 480, minutes: 165, sac: "T3", terrain: "Schluchtsteig entlang der tosenden Reuss", lat: 46.6529, lng: 8.5837, featured: true },
  { id: "rossberg", sagaId: "rossberg", name: "Bergsturz-Weg Goldau", region: "Schwyz", distanceKm: 8.1, ascentM: 620, minutes: 210, sac: "T2", terrain: "Bergsturzgelände mit weiten Ausblicken", lat: 47.0489, lng: 8.547, featured: true },
  { id: "martinsloch", sagaId: "martinsloch", name: "Martinsloch-Panorama", region: "Glarus", distanceKm: 10.2, ascentM: 910, minutes: 290, sac: "T4", terrain: "Anspruchsvoller Höhenweg mit Felspassagen", lat: 46.9142, lng: 9.1764, featured: true },
  { id: "tschaggatta", sagaId: "tschaggatta", name: "Lötschentaler Höhenweg", region: "Wallis", distanceKm: 9.3, ascentM: 720, minutes: 240, sac: "T3", terrain: "Sonnenhang hoch über dem Lötschental", lat: 46.406, lng: 7.774, featured: false },
  { id: "blausee", sagaId: "blausee", name: "Blausee-Rundweg", region: "Bern", distanceKm: 4.2, ascentM: 180, minutes: 95, sac: "T1", terrain: "Sanfter Wald- und Uferweg am See", lat: 46.5686, lng: 7.6489, featured: false },
  { id: "viamala", sagaId: "viamala", name: "Viamala-Schlucht Steig", region: "Graubünden", distanceKm: 7.0, ascentM: 430, minutes: 175, sac: "T3", terrain: "Enge Schlucht mit steilen Treppen am Hinterrhein", lat: 46.6994, lng: 9.4519, featured: false },
  { id: "monte-san-salvatore", sagaId: "monte-san-salvatore", name: "Sentiero San Salvatore", region: "Tessin", distanceKm: 5.6, ascentM: 640, minutes: 160, sac: "T2", terrain: "Sonniger Gipfelaufstieg über dem Luganersee", lat: 45.9967, lng: 8.9469, featured: false },
  { id: "pilatus", sagaId: "pilatus", name: "Pilatus Drachenweg", region: "Luzern", distanceKm: 11.4, ascentM: 1050, minutes: 330, sac: "T3", terrain: "Langer Gipfelweg mit Blick über die Zentralschweiz", lat: 46.979, lng: 8.2554, featured: false },
  { id: "tellsplatte", sagaId: "tell", name: "Weg der Schweiz – Tellsplatte", region: "Uri", distanceKm: 12.5, ascentM: 540, minutes: 300, sac: "T2", terrain: "Uferweg hoch über dem Urnersee zur Tellskapelle", lat: 46.9573, lng: 8.6083, featured: false },
  { id: "hoernliweg", sagaId: "matterhorn", name: "Hörnli-Aussichtsweg", region: "Wallis", distanceKm: 9.8, ascentM: 780, minutes: 285, sac: "T3", terrain: "Höhenweg mit stetem Blick auf das Matterhorn", lat: 45.9876, lng: 7.7043, featured: false },
  { id: "caumasee", sagaId: "flims", name: "Caumasee-Rundweg", region: "Graubünden", distanceKm: 6.8, ascentM: 260, minutes: 150, sac: "T2", terrain: "Waldweg rund um den türkisblauen Caumasee", lat: 46.8331, lng: 9.2807, featured: false },
  { id: "rigi", sagaId: "rigi", name: "Rigi Gipfelweg", region: "Luzern", distanceKm: 8.6, ascentM: 720, minutes: 240, sac: "T2", terrain: "Panoramaweg zur Königin der Berge", lat: 47.0576, lng: 8.4852, featured: false },
];

const SEED_SAGAS: InsertCatalogSaga[] = [
  { id: "teufelsbrucke", title: "Der Geist der Teufelsbrücke", canton: "Uri", coreMotif: "Pakt mit dem Teufel", mood: "Düster und stürmisch", summary: "Die Schöllenenschlucht war unpassierbar, bis die Urner einen Pakt schlossen: Der Teufel baut die Brücke, fordert aber die erste Seele, die sie überquert. Ein listiger Bauer schickte einen Geißbock hinüber.", source: "Müller, Sagen aus Uri (gemeinfrei)", lat: 46.6529, lng: 8.5837, isAnchorPlace: true },
  { id: "rossberg", title: "Der Schatten vom Rossberg", canton: "Schwyz", coreMotif: "Naturkatastrophe", mood: "Erdrückend", summary: "Bevor der Berg in Goldau niederging, sahen die Sennen Omen am Himmel. Der Berg grollte, doch die Warnungen der alten Hirten wurden in den Tälern ignoriert.", source: "Meinrad Lienert, Schweizer Sagen (gemeinfrei)", lat: 47.0543, lng: 8.5519, isAnchorPlace: true },
  { id: "tschaggatta", title: "Die Rache der Tschäggättä", canton: "Wallis", coreMotif: "Verborgene Talgemeinschaften", mood: "Wild und geheimnisvoll", summary: "Im Lötschental lebten einst Diebe, die sich in Felle hüllten und Holzmasken trugen, um die Talgemeinschaften zu erschrecken und Vorräte zu stehlen. Ihre wilden Schreie hallen noch heute durch die Nächte.", source: "Volksüberlieferung Lötschental (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "blausee", title: "Das Mädchen vom Blausee", canton: "Bern", coreMotif: "Unglückliche Liebe", mood: "Melancholisch, traurig", summary: "Ein junges Mädchen verlor ihren Liebsten in den Bergen. Sie weinte so viele Tränen, dass daraus ein See von tiefblauer Farbe entstand, der bis heute ihre Trauer widerspiegelt.", source: "Berner Oberland Sagensammlung (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "viamala", title: "Die Hexen der Viamala", canton: "Graubünden", coreMotif: "Gefährliche Reisewege", mood: "Gefährlich, klaustrophobisch", summary: "In den tiefsten Schluchten des Hinterrheins, wo kaum Sonnenlicht hinfällt, sollen einst Hexen den Reisenden aufgelauert haben. Nur wer ein reines Gewissen hatte, passierte die Viamala unbeschadet.", source: "Bündner Sagen (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "monte-san-salvatore", title: "Der Einsiedler vom Salvatore", canton: "Tessin", coreMotif: "Einsamkeit und Erleuchtung", mood: "Friedlich, erhaben", summary: "Auf dem Gipfel hoch über dem See lebte ein Einsiedler, der Stürme besänftigen konnte, indem er ein einfaches Lied sang. Sein Geist wacht noch heute über den See.", source: "Ticino Leggende (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "pilatus", title: "Der schlafende Drache", canton: "Luzern", coreMotif: "Magische Kreaturen", mood: "Mystisch, bedrohlich", summary: "Im Pilatussee auf dem Berg soll ein gewaltiger Drache ruhen. Wirft man einen Stein in das dunkle Wasser, erwacht der Drache und schickt furchtbare Unwetter über das Land.", source: "Luzerner Chronik (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "martinsloch", title: "Der Wurf des Martinsloch", canton: "Glarus", coreMotif: "Heiligenlegende", mood: "Kraftvoll, ehrfürchtig", summary: "Als der Heilige Martin von einem riesigen Schafhirten angegriffen wurde, warf er seinen Wanderstab durch den Berg, was ein riesiges Loch hinterließ. Zweimal im Jahr scheint die Sonne genau hindurch.", source: "Glarner Sagen (gemeinfrei)", lat: 46.9142, lng: 9.1764, isAnchorPlace: true },
  { id: "tell", title: "Tells Sprung", canton: "Uri", coreMotif: "Freiheit und Auflehnung", mood: "Trotzig, entschlossen", summary: "Der Landvogt Gessler zwang Wilhelm Tell, einen Apfel vom Kopf seines Sohnes zu schießen. Als Gefangener auf dem sturmgepeitschten Urnersee entkam Tell mit einem Sprung auf einen Felsen und läutete den Aufstand ein.", source: "Weisses Buch von Sarnen (gemeinfrei)", lat: 46.9573, lng: 8.6083, isAnchorPlace: true },
  { id: "matterhorn", title: "Die versunkene Stadt am Matterhorn", canton: "Wallis", coreMotif: "Hochmut und Strafe", mood: "Erhaben, warnend", summary: "Wo heute das Matterhorn kahl in den Himmel ragt, sollen einst fruchtbare Weiden und eine reiche Stadt gelegen haben. Als ihre Bewohner in Übermut und Geiz verfielen, ließ der Himmel das Land zu Fels und Eis erstarren.", source: "Walliser Sagen (gemeinfrei)", lat: 45.9763, lng: 7.6586, isAnchorPlace: true },
  { id: "flims", title: "Das Nachtvolk vom Flimserstein", canton: "Graubünden", coreMotif: "Geisterzug", mood: "Unheimlich, ruhelos", summary: "Über dem gewaltigen Bergsturz von Flims zieht in dunklen Nächten das Nachtvolk seine Bahn: eine stumme Schar Verstorbener, die keine Ruhe fand. Wer ihnen begegnet, soll den Weg freigeben und schweigen, sonst wird er selbst Teil des Zuges.", source: "Bündner Sagen (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
  { id: "rigi", title: "Die weisse Gämse der Rigi", canton: "Luzern", coreMotif: "Jägerprüfung", mood: "Sagenhaft, mahnend", summary: "Auf der Rigi lebte eine weiße Gämse, die kein Jäger je erlegen konnte. Wen die Gier packte und dennoch auf sie anlegte, den verschluckte der Nebel, denn sie war die Hüterin des Berges, nicht seine Beute.", source: "Innerschweizer Sagen (gemeinfrei)", lat: null, lng: null, isAnchorPlace: false },
];

/**
 * Befuellt den Katalog idempotent beim Serverstart. Bereits vorhandene
 * Eintraege werden aktualisiert, sodass Inhaltskorrekturen automatisch greifen.
 */
export async function seedCatalog(): Promise<void> {
  await db
    .insert(catalogSagasTable)
    .values(SEED_SAGAS)
    .onConflictDoUpdate({
      target: catalogSagasTable.id,
      set: {
        title: sql`excluded.title`,
        canton: sql`excluded.canton`,
        coreMotif: sql`excluded.core_motif`,
        mood: sql`excluded.mood`,
        summary: sql`excluded.summary`,
        source: sql`excluded.source`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        isAnchorPlace: sql`excluded.is_anchor_place`,
      },
    });

  await db
    .insert(catalogRoutesTable)
    .values(SEED_ROUTES)
    .onConflictDoUpdate({
      target: catalogRoutesTable.id,
      set: {
        sagaId: sql`excluded.saga_id`,
        name: sql`excluded.name`,
        region: sql`excluded.region`,
        distanceKm: sql`excluded.distance_km`,
        ascentM: sql`excluded.ascent_m`,
        minutes: sql`excluded.minutes`,
        sac: sql`excluded.sac`,
        terrain: sql`excluded.terrain`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        featured: sql`excluded.featured`,
      },
    });

  logger.info(
    { routes: SEED_ROUTES.length, sagas: SEED_SAGAS.length },
    "Katalog geseedet",
  );
}
