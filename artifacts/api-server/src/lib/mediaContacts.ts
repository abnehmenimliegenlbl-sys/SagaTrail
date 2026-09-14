import type { Lead } from "./leadMailer";

/**
 * Medienkontakte aus dem bereitgestellten CSV.
 *
 * Der Bestand ist bewusst getrennt von den Partner-Leads und Verbänden:
 * Medienkontakte haben keine Route-/Typfilter und werden nur über die
 * Medienkampagne im Admin-Dashboard angeschrieben.
 */
export const MEDIA_CONTACTS: Lead[] = [
  { name: "Kiludo", email: "info@kiludo.ch", kanton: "unbekannt", sprache: "DE", route: "", typ: "Online" },
  { name: "Radio 32", email: "info@radio32.ch", kanton: "Bern", sprache: "DE", route: "", typ: "Radio" },
  { name: "Radio Bern1", email: "info@radiobern1.ch", kanton: "Bern", sprache: "DE", route: "", typ: "Radio" },
  { name: "Aargauer Zeitung", email: "kontakt@a-z.ch", kanton: "Aargau", sprache: "DE", route: "", typ: "Print" },
  { name: "Luzerner Zeitung", email: "redaktion-luzernerzeitung@chmedia.ch", kanton: "Luzern", sprache: "DE", route: "", typ: "Print" },
  { name: "Basler Zeitung", email: "redaktion@baz.ch", kanton: "Basel-Stadt", sprache: "DE", route: "", typ: "Print" },
  { name: "Berner Zeitung", email: "redaktion@bernerzeitung.ch", kanton: "Bern", sprache: "DE", route: "", typ: "Print" },
  { name: "Radio Pilatus", email: "redaktion@radio-pilatus.ch", kanton: "Luzern", sprache: "DE", route: "", typ: "Radio" },
  { name: "Radio BeO", email: "redaktion@radiobeo.ch", kanton: "Bern", sprache: "DE", route: "", typ: "Radio" },
  { name: "Radio Munot", email: "redaktion@radiomunot.ch", kanton: "Schaffhausen", sprache: "DE", route: "", typ: "Radio" },
  { name: "Tages-Anzeiger", email: "redaktion@tages-anzeiger.ch", kanton: "Zürich", sprache: "DE", route: "", typ: "Print" },
  { name: "TeleBärn", email: "redaktion@telebaern.ch", kanton: "Bern", sprache: "DE", route: "", typ: "Tele" },
  { name: "Telebasel", email: "redaktion@telebasel.ch", kanton: "Basel-Stadt", sprache: "DE", route: "", typ: "Tele" },
  { name: "TeleM1", email: "redaktion@telem1.ch", kanton: "Aargau/Solothurn", sprache: "DE", route: "", typ: "Tele" },
  { name: "Tele Züri", email: "redaktion@telezueri.ch", kanton: "Zürich", sprache: "DE", route: "", typ: "Tele" },
  { name: "St. Galler Tagblatt", email: "zentralredaktion@tagblatt.ch", kanton: "St. Gallen", sprache: "DE", route: "", typ: "Print" },
  { name: "SRF Zentralschweiz", email: "zentralschweiz@srf.ch", kanton: "Zentralschweiz (LU/UR/SZ/OW/NW/ZG)", sprache: "DE", route: "", typ: "Radio/Tele" },
];