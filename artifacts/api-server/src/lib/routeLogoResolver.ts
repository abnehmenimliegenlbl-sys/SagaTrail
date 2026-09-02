/**
 * Resolves the official regional/local logo for a route and canton.
 *
 * A generic WL_XXX logo is valid for every real canton because it is not
 * canton-specific. Canton-specific files, however, must match the requested
 * canton exactly. Unknown canton codes never get to use either kind of file.
 */
export function resolveRegionalLocalLogoFile(
  number: string,
  canton: string,
  availableFiles: ReadonlySet<string>,
  knownCantons: ReadonlySet<string>,
): string | undefined {
  const routeNumber = String(number ?? "");
  const cantonCode = String(canton ?? "").toUpperCase();

  if (!/^\d{2,3}$/.test(routeNumber) || !/^[A-Z]{2}$/.test(cantonCode)) {
    return undefined;
  }
  if (!knownCantons.has(cantonCode)) {
    return undefined;
  }

  const paddedNumber = routeNumber.padStart(3, "0");
  const cantonSpecific = `WL_${paddedNumber}_${cantonCode}.jpg`;
  if (availableFiles.has(cantonSpecific)) {
    return cantonSpecific;
  }

  const generic = `WL_${paddedNumber}.jpg`;
  return availableFiles.has(generic) ? generic : undefined;
}