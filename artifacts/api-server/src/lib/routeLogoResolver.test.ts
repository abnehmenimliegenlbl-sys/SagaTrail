import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import { resolveRegionalLocalLogoFile } from "./routeLogoResolver";

const logoFiles = new Set(
  readdirSync(
    new URL("../../../mobile/assets/schweizmobil/regional-local/", import.meta.url),
  ),
);
const knownCantons = new Set(["AG", "GR", "SZ", "UR"]);

test("resolves both canton-specific logos for route 85", () => {
  assert.equal(resolveRegionalLocalLogoFile("85", "GR", logoFiles, knownCantons), "WL_085_GR.jpg");
  assert.equal(resolveRegionalLocalLogoFile("85", "UR", logoFiles, knownCantons), "WL_085_UR.jpg");
});

test("resolves both canton-specific logos for route 99", () => {
  assert.equal(resolveRegionalLocalLogoFile("99", "SZ", logoFiles, knownCantons), "WL_099_SZ.jpg");
  assert.equal(resolveRegionalLocalLogoFile("99", "UR", logoFiles, knownCantons), "WL_099_UR.jpg");
});

test("does not use a different canton logo for an unknown canton", () => {
  assert.equal(resolveRegionalLocalLogoFile("85", "ZZ", logoFiles, knownCantons), undefined);
  assert.equal(resolveRegionalLocalLogoFile("99", "AG", logoFiles, knownCantons), undefined);
});

test("uses a generic route logo only for a real canton", () => {
  assert.equal(resolveRegionalLocalLogoFile("25", "AG", logoFiles, knownCantons), "WL_025.jpg");
  assert.equal(resolveRegionalLocalLogoFile("25", "ZZ", logoFiles, knownCantons), undefined);
});

test("logo selection is independent of SAC data, including unknown SAC", () => {
  const logoFor = (sac: string | null) => {
    void sac;
    return resolveRegionalLocalLogoFile("85", "GR", logoFiles, knownCantons);
  };

  assert.equal(logoFor("T1"), "WL_085_GR.jpg");
  assert.equal(logoFor("T6"), "WL_085_GR.jpg");
  assert.equal(logoFor("unbekannt"), "WL_085_GR.jpg");
  assert.equal(logoFor(null), "WL_085_GR.jpg");
});