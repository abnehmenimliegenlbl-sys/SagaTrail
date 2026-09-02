import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type Wegweiser = (name: string, sac: string | null, wpUrl: string, cantonCode: string) => string;

const wordpressSource = readFileSync(
  new URL("../../../../wordpress/routen.php", import.meta.url),
  "utf8",
);
const candidateStart = wordpressSource.indexOf(
  "function strOfficialLogoCandidates(number,cantonCode,specialFile){",
);
const imageStart = wordpressSource.indexOf("function strOfficialLogoImg(candidates){");
const browserHelpersStart = wordpressSource.indexOf("/* ══════════════════════════════════════", imageStart);
const sacStart = wordpressSource.indexOf("function sacNum(s){");
const parserStart = wordpressSource.indexOf("function parseRouteName(name){");
const functionEnd = wordpressSource.indexOf("/* ── Kanton wählen ── */", parserStart);

assert.ok(candidateStart >= 0, "WordPress logo candidate resolver not found");
assert.ok(imageStart > candidateStart, "WordPress logo image renderer not found");
assert.ok(browserHelpersStart > imageStart, "WordPress browser helper boundary not found");
assert.ok(sacStart > browserHelpersStart, "WordPress SAC helper not found");
assert.ok(parserStart > sacStart, "WordPress route parser not found");
assert.ok(functionEnd > parserStart, "WordPress route renderer boundary not found");

const esc = (value: unknown): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const makeWegweiser = new Function(
  "esc",
  [
    wordpressSource.slice(candidateStart, imageStart),
    wordpressSource.slice(imageStart, browserHelpersStart),
    wordpressSource.slice(sacStart, parserStart),
    wordpressSource.slice(parserStart, functionEnd),
  ].join("\n") + "; return makeWegweiser;",
)(esc) as Wegweiser;

function logoUrl(name: string, sac: string | null, cantonCode: string): string {
  const html = makeWegweiser(name, sac, "", cantonCode);
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  assert.ok(match, `No official logo rendered for ${name} (${cantonCode})`);
  return match[1]!;
}

test("WordPress selects route 85 logo by canton, not by SAC", () => {
  const urls = ["T1", "T6", "unbekannt", null].map((sac) =>
    logoUrl("85 Graubünden", sac, "GR"),
  );

  assert.deepEqual(new Set(urls).size, 1);
  assert.match(urls[0]!, /\/resolve\/85\/GR$/);
  assert.doesNotMatch(urls[0]!, /085_UR/);
});

test("WordPress selects route 99 logo by canton, not by SAC", () => {
  const urls = ["T1", "T6", "unbekannt", null].map((sac) =>
    logoUrl("99 Schwyz", sac, "SZ"),
  );

  assert.deepEqual(new Set(urls).size, 1);
  assert.match(urls[0]!, /\/resolve\/99\/SZ$/);
  assert.doesNotMatch(urls[0]!, /099_UR/);
});