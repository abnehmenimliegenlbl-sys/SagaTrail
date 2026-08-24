import assert from "node:assert/strict";
import test from "node:test";
import { findReverseLoops } from "./reverseLoopAudit";
import { findDuplicateWayRefs, reverseLoopExplanation } from "./overpass";

function line(count: number, offset = 0): { lat: number; lng: number }[] {
  return Array.from({ length: count }, (_, index) => ({
    lat: 46 + (offset + index) * 0.001,
    lng: 7,
  }));
}

test("detects a reverse sequence starting at the route beginning", () => {
  const forward = line(6);
  const points = [...forward, ...forward.slice(0, -1).reverse(), ...line(2, 7)];
  const [finding] = findReverseLoops(points);
  assert.ok(finding);
  assert.equal(finding.startPoint, 0);
  assert.equal(finding.reverseStartPoint, 5);
  assert.ok(finding.lengthM > 500);
});

test("detects a reverse sequence in the middle of a route", () => {
  const prefix = line(3);
  const loop = line(6, 10);
  const suffix = line(3, 18);
  const points = [...prefix, ...loop, ...loop.slice(0, -1).reverse(), ...suffix];
  const [finding] = findReverseLoops(points);
  assert.ok(finding);
  assert.equal(finding.startPoint, prefix.length);
  assert.equal(finding.reverseStartPoint, prefix.length + loop.length - 1);
});

test("does not report a repeated sequence shorter than the minimum length", () => {
  const short = line(4, 20).map((point) => ({ ...point, lat: 46 + (point.lat - 46) * 0.1 }));
  assert.deepEqual(findReverseLoops([...short, ...short.slice(0, -1).reverse()]), []);
});

test("keeps each repeated OSM way explanation only once", () => {
  assert.deepEqual(findDuplicateWayRefs([11, 12, 11, 13, 12, 11]), [11, 12]);
});

test("explains roundtrip relations and repeated OSM ways", () => {
  const reasons = reverseLoopExplanation("YES", [11, 12, 11, 13, 12]);
  assert.equal(reasons[0], "OSM roundtrip=yes");
  assert.match(reasons[1]!, /OSM-Way mehrfach referenziert \(2: 11, 12\)/);
});
