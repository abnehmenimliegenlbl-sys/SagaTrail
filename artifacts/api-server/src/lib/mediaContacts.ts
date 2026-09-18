/**
 * Initiale Medienkontakte aus dem bereitgestellten CSV.
 *
 * Diese Liste wird nur zur Erstbefüllung der persistenten Tabelle verwendet.
 * Danach sind die Kontakte ausschließlich über das Admin-Dashboard editierbar.
 */
export const MEDIA_CONTACT_SEED = [
  { name: "Kiludo", email: "info@kiludo.ch", kanton: "unbekannt", typ: "Online" },
  { name: "Radio 32", email: "info@radio32.ch", kanton: "Bern", typ: "Radio" },
  { name: "Radio Bern1", email: "info@radiobern1.ch", kanton: "Bern", typ: "Radio" },
  { name: "Aargauer Zeitung", email: "kontakt@a-z.ch", kanton: "Aargau", typ: "Print" },
  { name: "Luzerner Zeitung", email: "redaktion-luzernerzeitung@chmedia.ch", kanton: "Luzern", typ: "Print" },
  { name: "Basler Zeitung", email: "redaktion@baz.ch", kanton: "Basel-Stadt", typ: "Print" },
  { name: "Berner Zeitung", email: "redaktion@bernerzeitung.ch", kanton: "Bern", typ: "Print" },
  { name: "Radio Pilatus", email: "redaktion@radio-pilatus.ch", kanton: "Luzern", typ: "Radio" },
  { name: "Radio BeO", email: "redaktion@radiobeo.ch", kanton: "Bern", typ: "Radio" },
  { name: "Radio Munot", email: "redaktion@radiomunot.ch", kanton: "Schaffhausen", typ: "Radio" },
  { name: "Tages-Anzeiger", email: "redaktion@tages-anzeiger.ch", kanton: "Zürich", typ: "Print" },
  { name: "TeleBärn", email: "redaktion@telebaern.ch", kanton: "Bern", typ: "Tele" },
  { name: "Telebasel", email: "redaktion@telebasel.ch", kanton: "Basel-Stadt", typ: "Tele" },
  { name: "TeleM1", email: "redaktion@telem1.ch", kanton: "Aargau/Solothurn", typ: "Tele" },
  { name: "Tele Züri", email: "redaktion@telezueri.ch", kanton: "Zürich", typ: "Tele" },
  { name: "St. Galler Tagblatt", email: "zentralredaktion@tagblatt.ch", kanton: "St. Gallen", typ: "Print" },
  { name: "SRF Zentralschweiz", email: "zentralschweiz@srf.ch", kanton: "Zentralschweiz (LU/UR/SZ/OW/NW/ZG)", typ: "Radio/Tele" },
];