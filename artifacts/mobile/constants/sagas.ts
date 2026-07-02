import { Saga } from "../types";

export const SAGAS: Saga[] = [
  {
    id: "teufelsbrucke",
    title: "Der Geist der Teufelsbrücke",
    canton: "Uri",
    coreMotif: "Pakt mit dem Teufel",
    mood: "Düster und stürmisch",
    summary:
      "Die Schöllenenschlucht war unpassierbar, bis die Urner einen Pakt schlossen: Der Teufel baut die Brücke, fordert aber die erste Seele, die sie überquert. Ein listiger Bauer schickte einen Geißbock hinüber.",
    source: "Müller, Sagen aus Uri (gemeinfrei)",
    coordinates: { lat: 46.6529, lng: 8.5837 },
    isAnchorPlace: true,
  },
  {
    id: "rossberg",
    title: "Der Schatten vom Rossberg",
    canton: "Schwyz",
    coreMotif: "Naturkatastrophe",
    mood: "Erdrückend",
    summary:
      "Bevor der Berg in Goldau niederging, sahen die Sennen Omen am Himmel. Der Berg grollte, doch die Warnungen der alten Hirten wurden in den Tälern ignoriert.",
    source: "Meinrad Lienert, Schweizer Sagen (gemeinfrei)",
    coordinates: { lat: 47.0543, lng: 8.5519 },
    isAnchorPlace: true,
  },
  {
    id: "tschaggatta",
    title: "Die Rache der Tschäggättä",
    canton: "Wallis",
    coreMotif: "Verborgene Talgemeinschaften",
    mood: "Wild und geheimnisvoll",
    summary:
      "Im Lötschental lebten einst Diebe, die sich in Felle hüllten und Holzmasken trugen, um die Talgemeinschaften zu erschrecken und Vorräte zu stehlen. Ihre wilden Schreie hallen noch heute durch die Nächte.",
    source: "Volksüberlieferung Lötschental (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "blausee",
    title: "Das Mädchen vom Blausee",
    canton: "Bern",
    coreMotif: "Unglückliche Liebe",
    mood: "Melancholisch, traurig",
    summary:
      "Ein junges Mädchen verlor ihren Liebsten in den Bergen. Sie weinte so viele Tränen, dass daraus ein See von tiefblauer Farbe entstand, der bis heute ihre Trauer widerspiegelt.",
    source: "Berner Oberland Sagensammlung (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "viamala",
    title: "Die Hexen der Viamala",
    canton: "Graubünden",
    coreMotif: "Gefährliche Reisewege",
    mood: "Gefährlich, klaustrophobisch",
    summary:
      "In den tiefsten Schluchten des Hinterrheins, wo kaum Sonnenlicht hinfällt, sollen einst Hexen den Reisenden aufgelauert haben. Nur wer ein reines Gewissen hatte, passierte die Viamala unbeschadet.",
    source: "Bündner Sagen (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "monte-san-salvatore",
    title: "Der Einsiedler vom Salvatore",
    canton: "Tessin",
    coreMotif: "Einsamkeit und Erleuchtung",
    mood: "Friedlich, erhaben",
    summary:
      "Auf dem Gipfel hoch über dem See lebte ein Einsiedler, der Stürme besänftigen konnte, indem er ein einfaches Lied sang. Sein Geist wacht noch heute über den See.",
    source: "Ticino Leggende (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "pilatus",
    title: "Der schlafende Drache",
    canton: "Luzern",
    coreMotif: "Magische Kreaturen",
    mood: "Mystisch, bedrohlich",
    summary:
      "Im Pilatussee auf dem Berg soll ein gewaltiger Drache ruhen. Wirft man einen Stein in das dunkle Wasser, erwacht der Drache und schickt furchtbare Unwetter über das Land.",
    source: "Luzerner Chronik (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "martinsloch",
    title: "Der Wurf des Martinsloch",
    canton: "Glarus",
    coreMotif: "Heiligenlegende",
    mood: "Kraftvoll, ehrfürchtig",
    summary:
      "Als der Heilige Martin von einem riesigen Schafhirten angegriffen wurde, warf er seinen Wanderstab durch den Berg, was ein riesiges Loch hinterließ. Zweimal im Jahr scheint die Sonne genau hindurch.",
    source: "Glarner Sagen (gemeinfrei)",
    isAnchorPlace: true,
    coordinates: { lat: 46.9142, lng: 9.1764 },
  },
  {
    id: "tell",
    title: "Tells Sprung",
    canton: "Uri",
    coreMotif: "Freiheit und Auflehnung",
    mood: "Trotzig, entschlossen",
    summary:
      "Der Landvogt Gessler zwang Wilhelm Tell, einen Apfel vom Kopf seines Sohnes zu schießen. Als Gefangener auf dem sturmgepeitschten Urnersee entkam Tell mit einem Sprung auf einen Felsen und läutete den Aufstand ein.",
    source: "Weisses Buch von Sarnen (gemeinfrei)",
    coordinates: { lat: 46.9573, lng: 8.6083 },
    isAnchorPlace: true,
  },
  {
    id: "matterhorn",
    title: "Die versunkene Stadt am Matterhorn",
    canton: "Wallis",
    coreMotif: "Hochmut und Strafe",
    mood: "Erhaben, warnend",
    summary:
      "Wo heute das Matterhorn kahl in den Himmel ragt, sollen einst fruchtbare Weiden und eine reiche Stadt gelegen haben. Als ihre Bewohner in Übermut und Geiz verfielen, ließ der Himmel das Land zu Fels und Eis erstarren.",
    source: "Walliser Sagen (gemeinfrei)",
    coordinates: { lat: 45.9763, lng: 7.6586 },
    isAnchorPlace: true,
  },
  {
    id: "flims",
    title: "Das Nachtvolk vom Flimserstein",
    canton: "Graubünden",
    coreMotif: "Geisterzug",
    mood: "Unheimlich, ruhelos",
    summary:
      "Über dem gewaltigen Bergsturz von Flims zieht in dunklen Nächten das Nachtvolk seine Bahn: eine stumme Schar Verstorbener, die keine Ruhe fand. Wer ihnen begegnet, soll den Weg freigeben und schweigen, sonst wird er selbst Teil des Zuges.",
    source: "Bündner Sagen (gemeinfrei)",
    isAnchorPlace: false,
  },
  {
    id: "rigi",
    title: "Die weisse Gämse der Rigi",
    canton: "Luzern",
    coreMotif: "Jägerprüfung",
    mood: "Sagenhaft, mahnend",
    summary:
      "Auf der Rigi lebte eine weiße Gämse, die kein Jäger je erlegen konnte. Wen die Gier packte und dennoch auf sie anlegte, den verschluckte der Nebel, denn sie war die Hüterin des Berges, nicht seine Beute.",
    source: "Innerschweizer Sagen (gemeinfrei)",
    isAnchorPlace: false,
  },
];
