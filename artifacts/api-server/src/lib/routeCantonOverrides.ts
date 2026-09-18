/**
 * Offizielle Startkantone für einzelne importierte Etappen, deren temporärer
 * "__hidden__"-Status sonst bis in die mobile Themenwelt durchgereicht wird.
 *
 * Die Zuordnung ist absichtlich auf die stabile Routen-ID begrenzt: Andere
 * versteckte Routen dürfen nicht ohne belastbaren Nachweis einem Kanton
 * zugeordnet werden.
 */
export const START_CANTON_OVERRIDES: Readonly<Record<string, string>> = {
  "wiki-3094421-1": "Graubünden",
};