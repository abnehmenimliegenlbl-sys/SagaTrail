import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, "..", "garmin", "manifest.xml");
const manifest = await readFile(manifestPath, "utf8");

// These are the intentionally supported products listed in garmin/README.md.
// Keep this allowlist explicit: a new watch must be validated against the
// Connect IQ SDK catalog before it is added to the manifest.
const supportedProducts = new Set([
  "fenix7",
  "fenix7s",
  "fenix7x",
  "epix2",
  "venu2",
  "vivoactive4",
  "fr955",
]);
const legacyAliases = new Map([["forerunner955", "fr955"]]);
const productIds = [...manifest.matchAll(/<iq:product\s+id="([^"]+)"/g)].map(
  (match) => match[1],
);

if (productIds.length === 0) {
  throw new Error("Garmin manifest contains no iq:product entries.");
}

const duplicateIds = productIds.filter(
  (id, index) => productIds.indexOf(id) !== index,
);
if (duplicateIds.length > 0) {
  throw new Error(`Garmin manifest contains duplicate product IDs: ${[...new Set(duplicateIds)].join(", ")}`);
}

const unsupported = productIds.filter((id) => !supportedProducts.has(id));
if (unsupported.length > 0) {
  const hints = unsupported
    .map((id) => `${id}${legacyAliases.has(id) ? ` (use ${legacyAliases.get(id)})` : ""}`)
    .join(", ");
  throw new Error(`Garmin manifest contains unvalidated product IDs: ${hints}`);
}

console.log(
  `Garmin manifest validated: ${productIds.length} supported product IDs (${productIds.join(", ")}).`,
);