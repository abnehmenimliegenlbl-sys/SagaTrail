import { LatLng } from "@/types";

const ERDRADIUS_KM = 6371;

/**
 * Distanz zwischen zwei Koordinaten in Kilometern (Haversine).
 * Wird genutzt, um aus GPS-Fixes die real zurueckgelegte Strecke zu bilden.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Kuerzeste Distanz eines Punkts zu einem Liniensegment in Kilometern.
 * Rechnet lokal in einer aequirektangulaeren Projektion um den Punkt —
 * fuer die kurzen Segmente eines Wanderwegs mehr als genau genug. Wird
 * fuer den POI-Korridor genutzt, damit auch Orte nahe der Segmentmitte
 * (zwischen ausgeduennten Stuetzpunkten) korrekt erfasst werden.
 */
export function distanzZuSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const cosLat = Math.cos(toRad(p.lat));
  const ax = toRad(a.lng - p.lng) * cosLat * ERDRADIUS_KM;
  const ay = toRad(a.lat - p.lat) * ERDRADIUS_KM;
  const bx = toRad(b.lng - p.lng) * cosLat * ERDRADIUS_KM;
  const by = toRad(b.lat - p.lat) * ERDRADIUS_KM;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Bounding Box rund um einen Wegverlauf (oder, ohne Geometrie, um einen
 * Mittelpunkt), mit Rand in km. Dient dazu, den Kartenausschnitt fuer
 * Zusatzdaten (z. B. Seilbahnen) einzugrenzen — bewusst grosszuegig genug,
 * damit nahegelegene Bergbahnen nicht am Rand abgeschnitten werden.
 */
export function bboxAroundGeometry(
  geometry: number[][] | null | undefined,
  center: LatLng,
  paddingKm = 3
): BoundingBox {
  const points = geometry && geometry.length > 1 ? geometry.map((p) => ({ lat: p[0], lng: p[1] })) : [center];
  let south = points[0].lat;
  let north = points[0].lat;
  let west = points[0].lng;
  let east = points[0].lng;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  const latPad = paddingKm / 111;
  const lngPad = paddingKm / (111 * Math.cos(toRad((south + north) / 2)) || 1);
  return {
    south: south - latPad,
    west: west - lngPad,
    north: north + latPad,
    east: east + lngPad,
  };
}
