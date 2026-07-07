/**
 * Effektiver Premium-Status eines Profils: entweder dauerhaft (Flag)
 * oder befristet ueber `premiumBis` (z. B. manuelle Freischaltung).
 */
export function istPremiumAktiv(row: {
  premium: boolean;
  premiumBis: Date | null;
}): boolean {
  if (row.premium) return true;
  return row.premiumBis != null && row.premiumBis.getTime() > Date.now();
}
