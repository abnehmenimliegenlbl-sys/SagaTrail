import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(mobileRoot, "scripts", "ota-source-manifest.json");
const shouldWrite = process.argv.includes("--write");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const actual = {};
const failures = [];

for (const relativePath of Object.keys(manifest).sort()) {
  const absolutePath = path.join(mobileRoot, relativePath);
  let bytes;

  try {
    bytes = await readFile(absolutePath);
  } catch (error) {
    failures.push(`${relativePath}: cannot read file (${error.message})`);
    continue;
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  actual[relativePath] = { bytes: bytes.length, sha256 };

  if (bytes.length !== manifest[relativePath].bytes) {
    failures.push(
      `${relativePath}: byte count ${bytes.length} does not match manifest ${manifest[relativePath].bytes}`,
    );
  }
  if (sha256 !== manifest[relativePath].sha256) {
    failures.push(
      `${relativePath}: SHA-256 ${sha256} does not match the committed manifest`,
    );
  }
}

if (shouldWrite) {
  await writeFile(`${manifestPath}\n`, `${JSON.stringify(actual, null, 2)}\n`);
  console.log(`Updated OTA source manifest for ${Object.keys(actual).length} files.`);
  process.exit(0);
}

if (failures.length > 0) {
  console.error("OTA source integrity check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "If these files were intentionally changed, run the verifier with --write and commit the manifest together with the source changes.",
  );
  process.exit(1);
}

console.log(
  `OTA source integrity verified for ${Object.keys(manifest).length} files.`,
);