export interface TerrainProfilePoint {
  distanceKm: number;
  altM: number;
}

export type TerrainDirection = "up" | "down";

export interface TerrainSection {
  id: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  direction: TerrainDirection;
  elevationChangeM: number;
  averageGradePct: number;
  peakGradePct: number;
  isVerySteep: boolean;
}

export type RouteGradeBand = "green" | "yellow" | "orange" | "red";

export interface RouteGradeSegment {
  coordinates: number[][];
  band: RouteGradeBand;
}

const ANALYSIS_STEP_KM = 0.05;
const GRADE_WINDOW_KM = 0.05;
const GRADE_THRESHOLD_EPSILON_PCT = 0.000001;
const ANNOUNCE_GRADE_PCT = 6;
const VERY_STEEP_GRADE_PCT = 30;
const TERRAIN_SPEECH_MIN_GAP_KM = 0.45;

function distanceKm(a: number[], b: number[]): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const deltaLat = ((b[0] - a[0]) * Math.PI) / 180;
  const deltaLng = ((b[1] - a[1]) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function profileAltitude(points: TerrainProfilePoint[], distanceKmValue: number): number {
  return interpolate(points, distanceKmValue);
}

function gradeBand(gradePct: number): RouteGradeBand {
  const absoluteGrade = Math.abs(gradePct);
  if (absoluteGrade >= 30 - GRADE_THRESHOLD_EPSILON_PCT) return "red";
  if (absoluteGrade >= 20 - GRADE_THRESHOLD_EPSILON_PCT) return "orange";
  if (absoluteGrade >= 10 - GRADE_THRESHOLD_EPSILON_PCT) return "yellow";
  return "green";
}

/**
 * Removes isolated local extrema from the elevation profile before grading.
 * A single DTM sample can otherwise sit exactly on a 50 m bin boundary and
 * make both neighbouring bins look steep even though the route is flat.
 */
function smoothIsolatedProfileSpikes(
  points: TerrainProfilePoint[],
): TerrainProfilePoint[] {
  if (points.length < 3) return points;

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;
    const previous = points[index - 1];
    const next = points[index + 1];
    const surroundingWidthKm = next.distanceKm - previous.distanceKm;
    const isLocalExtremum =
      (point.altM > previous.altM && point.altM > next.altM) ||
      (point.altM < previous.altM && point.altM < next.altM);

    if (
      !isLocalExtremum ||
      surroundingWidthKm > GRADE_WINDOW_KM * 2 + 0.001
    ) {
      return point;
    }

    return {
      distanceKm: point.distanceKm,
      altM:
        previous.altM +
        ((next.altM - previous.altM) * (point.distanceKm - previous.distanceKm)) /
          (next.distanceKm - previous.distanceKm),
    };
  });
}

function pointAtDistance(
  coords: number[][],
  distances: number[],
  distanceKmValue: number,
): number[] {
  if (distanceKmValue <= 0) return coords[0];
  const lastIndex = coords.length - 1;
  if (distanceKmValue >= distances[lastIndex]) return coords[lastIndex];
  let low = 0;
  let high = lastIndex;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (distances[middle] <= distanceKmValue) low = middle;
    else high = middle;
  }
  const span = distances[high] - distances[low];
  if (span <= 0) return coords[low];
  const fraction = (distanceKmValue - distances[low]) / span;
  return [
    coords[low][0] + (coords[high][0] - coords[low][0]) * fraction,
    coords[low][1] + (coords[high][1] - coords[low][1]) * fraction,
  ];
}

function gradeAtDistance(
  profile: TerrainProfilePoint[],
  distanceKmValue: number,
  routeLengthKm: number,
  profileScale: number,
): number {
  const halfWindow = Math.min(GRADE_WINDOW_KM / 2, routeLengthKm / 2);
  const startKm = Math.max(0, distanceKmValue - halfWindow);
  const endKm = Math.min(routeLengthKm, distanceKmValue + halfWindow);
  const horizontalKm = endKm - startKm;
  if (horizontalKm <= 0) return 0;
  const startAltitude = profileAltitude(profile, startKm * profileScale);
  const endAltitude = profileAltitude(profile, endKm * profileScale);
  return ((endAltitude - startAltitude) / (horizontalKm * 1000)) * 100;
}

/**
 * Splits a route into smoothed, approximately 50 m LineStrings so MapLibre
 * can color every section independently. The absolute grade is used, therefore
 * steep descents are visible as well as steep climbs. A fixed analysis window
 * prevents short DTM/profile fluctuations from creating false red sections.
 */
export function buildRouteGradeSegments(
  geometry: number[][] | null | undefined,
  inputProfile: TerrainProfilePoint[] | null | undefined,
): RouteGradeSegment[] {
  if (!geometry || geometry.length < 2) return [];
  const coords = geometry.filter(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );
  if (coords.length < 2) return [];

  const routeDistances = [0];
  for (let index = 1; index < coords.length; index++) {
    routeDistances.push(
      routeDistances[index - 1] + distanceKm(coords[index - 1], coords[index]),
    );
  }
  const routeLengthKm = routeDistances[routeDistances.length - 1];
  if (routeLengthKm <= 0) return [];

  const profile = (inputProfile ?? [])
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (profile.length < 2) {
    return [{ coordinates: coords, band: "green" }];
  }
  const firstProfileDistance = profile[0].distanceKm;
  const normalizedProfile = profile.map((point) => ({
    distanceKm: point.distanceKm - firstProfileDistance,
    altM: point.altM,
  }));
  const profileLengthKm = normalizedProfile[normalizedProfile.length - 1].distanceKm;
  if (profileLengthKm <= 0) return [{ coordinates: coords, band: "green" }];
  const profileScale = profileLengthKm / routeLengthKm;
  const gradingProfile = smoothIsolatedProfileSpikes(normalizedProfile);

  const breakDistances = [...routeDistances];
  for (let distanceKmValue = GRADE_WINDOW_KM; distanceKmValue < routeLengthKm; distanceKmValue += GRADE_WINDOW_KM) {
    breakDistances.push(distanceKmValue);
  }
  breakDistances.sort((a, b) => a - b);

  const uniqueBreakDistances = breakDistances.filter(
    (distanceKmValue, index) =>
      index === 0 || distanceKmValue - breakDistances[index - 1] > 0.000001,
  );
  return uniqueBreakDistances.slice(1).map((endDistanceKm, index) => {
    const startDistanceKm = uniqueBreakDistances[index];
    const gradePct = gradeAtDistance(
      gradingProfile,
      (startDistanceKm + endDistanceKm) / 2,
      routeLengthKm,
      profileScale,
    );
    return {
      coordinates: [
        pointAtDistance(coords, routeDistances, startDistanceKm),
        pointAtDistance(coords, routeDistances, endDistanceKm),
      ],
      band: gradeBand(gradePct),
    };
  });
}

function interpolate(points: TerrainProfilePoint[], distanceKm: number): number {
  if (distanceKm <= points[0].distanceKm) return points[0].altM;
  const last = points[points.length - 1];
  if (distanceKm >= last.distanceKm) return last.altM;

  let low = 0;
  let high = points.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].distanceKm <= distanceKm) low = middle;
    else high = middle;
  }
  const a = points[low];
  const b = points[high];
  const span = b.distanceKm - a.distanceKm;
  if (span <= 0) return a.altM;
  const fraction = (distanceKm - a.distanceKm) / span;
  return a.altM + (b.altM - a.altM) * fraction;
}

/**
 * Makes stable, human-sized terrain sections from the swisstopo profile.
 * Short fluctuations are ignored; a very steep 50 m bin is retained so the
 * safety warning is not hidden by averaging it into a longer climb.
 */
export function buildTerrainSections(
  input: TerrainProfilePoint[] | null | undefined,
): TerrainSection[] {
  if (!input || input.length < 2) return [];

  const sorted = input
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (sorted.length < 2) return [];

  const firstDistance = sorted[0].distanceKm;
  const points = sorted.map((point) => ({
    distanceKm: Math.max(0, point.distanceKm - firstDistance),
    altM: point.altM,
  }));
  const maxDistance = points[points.length - 1].distanceKm;
  if (maxDistance <= 0) return [];

  const samples: TerrainProfilePoint[] = [];
  for (let distanceKm = 0; distanceKm < maxDistance; distanceKm += ANALYSIS_STEP_KM) {
    samples.push({ distanceKm, altM: interpolate(points, distanceKm) });
  }
  samples.push({ distanceKm: maxDistance, altM: interpolate(points, maxDistance) });

  // A small moving average suppresses DTM noise without hiding a steep slope.
  const smoothed = samples.map((sample, index) => {
    const from = Math.max(0, index - 1);
    const to = Math.min(samples.length - 1, index + 1);
    const altitudes = samples.slice(from, to + 1).map((point) => point.altM);
    return {
      distanceKm: sample.distanceKm,
      altM: altitudes.reduce((sum, altitude) => sum + altitude, 0) / altitudes.length,
    };
  });

  type Bin = {
    start: TerrainProfilePoint;
    end: TerrainProfilePoint;
    gradePct: number;
    direction: TerrainDirection | null;
  };
  const bins: Bin[] = [];
  for (let index = 1; index < smoothed.length; index++) {
    const start = smoothed[index - 1];
    const end = smoothed[index];
    const lengthKm = end.distanceKm - start.distanceKm;
    if (lengthKm <= 0) continue;
    const gradePct = ((end.altM - start.altM) / (lengthKm * 1000)) * 100;
    bins.push({
      start,
      end,
      gradePct,
      direction:
        gradePct >= ANNOUNCE_GRADE_PCT
          ? "up"
          : gradePct <= -ANNOUNCE_GRADE_PCT
            ? "down"
            : null,
    });
  }

  const sections: TerrainSection[] = [];
  let run: Bin[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const direction = run[0].direction;
    if (!direction) {
      run = [];
      return;
    }

    const startKm = run[0].start.distanceKm;
    const endKm = run[run.length - 1].end.distanceKm;
    const lengthKm = endKm - startKm;
    const elevationChangeM = run[run.length - 1].end.altM - run[0].start.altM;
    const averageGradePct = (elevationChangeM / (lengthKm * 1000)) * 100;
    const peakGradePct = Math.max(...run.map((bin) => Math.abs(bin.gradePct)));
    const isVerySteep = peakGradePct >= VERY_STEEP_GRADE_PCT;
    const longEnough = lengthKm >= (isVerySteep ? 0.05 : 0.15);
    const highEnough = Math.abs(elevationChangeM) >= (isVerySteep ? 5 : 8);

    if (longEnough && highEnough) {
      sections.push({
        id: `${direction}-${Math.round(startKm * 1000)}-${Math.round(endKm * 1000)}`,
        startKm,
        endKm,
        lengthKm,
        direction,
        elevationChangeM,
        averageGradePct,
        peakGradePct,
        isVerySteep,
      });
    }
    run = [];
  };

  for (const bin of bins) {
    if (bin.direction == null) {
      flush();
      continue;
    }
    if (run.length > 0 && run[0].direction !== bin.direction) flush();
    run.push(bin);
  }
  flush();
  return sections;
}

/**
 * Reduces dense terrain sections for speech only. The map still keeps every
 * 50 m color segment, but a winding route must not trigger a new voice cue at
 * every small grade change. Within a 450 m window the strongest section wins;
 * very steep sections are prioritized so the safety warning is not hidden.
 */
export function limitTerrainSectionsForSpeech(
  input: TerrainSection[] | null | undefined,
): TerrainSection[] {
  if (!input || input.length < 2) return input ?? [];

  const sorted = [...input].sort((a, b) => a.startKm - b.startKm);
  const selected: TerrainSection[] = [];
  const strength = (section: TerrainSection): number =>
    (section.isVerySteep ? 1000 : 0) +
    section.peakGradePct * 2 +
    section.lengthKm +
    Math.abs(section.elevationChangeM) / 100;

  for (const section of sorted) {
    const previous = selected[selected.length - 1];
    if (
      !previous ||
      section.startKm - previous.startKm >= TERRAIN_SPEECH_MIN_GAP_KM
    ) {
      selected.push(section);
      continue;
    }

    if (strength(section) > strength(previous)) {
      const beforePrevious = selected[selected.length - 2];
      if (
        !beforePrevious ||
        section.startKm - beforePrevious.startKm >= TERRAIN_SPEECH_MIN_GAP_KM
      ) {
        selected[selected.length - 1] = section;
      }
    }
  }

  return selected;
}