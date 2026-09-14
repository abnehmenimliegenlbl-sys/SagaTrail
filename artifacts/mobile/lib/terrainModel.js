"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeOriginForAR = routeOriginForAR;
exports.isLocalTerrainModel = isLocalTerrainModel;
exports.terrainVisibilityForPeak = terrainVisibilityForPeak;
exports.buildLocalTerrainMesh = buildLocalTerrainMesh;
exports.projectGeographicPointOntoTerrain = projectGeographicPointOntoTerrain;
exports.buildLocalTerrainRouteLines = buildLocalTerrainRouteLines;
exports.buildGeographicTerrainRouteLines = buildGeographicTerrainRouteLines;
exports.routeGeometryMaxDistanceM = routeGeometryMaxDistanceM;
exports.arWorldOffsetForPosition = arWorldOffsetForPosition;
exports.buildGeographicTerrainRouteSegments = buildGeographicTerrainRouteSegments;
exports.routeGeometryAheadOfPosition = routeGeometryAheadOfPosition;
exports.buildGeographicTerrainRouteDestination = buildGeographicTerrainRouteDestination;
exports.buildLocalMapRouteLines = buildLocalMapRouteLines;
const terrainCues_1 = require("./terrainCues");
/**
 * Returns a route point suitable as the geographic origin of a live AR
 * session. GPS can be several metres away from the visible trail even while
 * the user is standing still, so nearby fixes are snapped to the closest
 * segment. Far-away fixes stay untouched instead of falsely pulling the
 * route underneath an off-route user.
 */
function routeOriginForAR(position, routeGeometry, maxSnapDistanceM = 50) {
    if (!routeGeometry || routeGeometry.length < 2)
        return position;
    const earthRadiusM = 6_371_000;
    const centerLatRad = (position.lat * Math.PI) / 180;
    let bestDistanceM = Infinity;
    let bestPoint = null;
    for (let index = 1; index < routeGeometry.length; index += 1) {
        const previous = routeGeometry[index - 1];
        const current = routeGeometry[index];
        if (typeof previous?.[0] !== "number" ||
            typeof previous?.[1] !== "number" ||
            typeof current?.[0] !== "number" ||
            typeof current?.[1] !== "number" ||
            !Number.isFinite(previous[0]) ||
            !Number.isFinite(previous[1]) ||
            !Number.isFinite(current[0]) ||
            !Number.isFinite(current[1])) {
            continue;
        }
        const previousNorthM = ((previous[0] - position.lat) * Math.PI * earthRadiusM) / 180;
        const previousEastM = ((previous[1] - position.lng) *
            Math.PI *
            earthRadiusM *
            Math.cos(centerLatRad)) /
            180;
        const currentNorthM = ((current[0] - position.lat) * Math.PI * earthRadiusM) / 180;
        const currentEastM = ((current[1] - position.lng) *
            Math.PI *
            earthRadiusM *
            Math.cos(centerLatRad)) /
            180;
        const northDeltaM = currentNorthM - previousNorthM;
        const eastDeltaM = currentEastM - previousEastM;
        const lengthSquared = northDeltaM ** 2 + eastDeltaM ** 2;
        const projection = lengthSquared <= 0
            ? 0
            : clampNumber(-(previousNorthM * northDeltaM +
                previousEastM * eastDeltaM) / lengthSquared, 0, 1);
        const snappedNorthM = previousNorthM + projection * northDeltaM;
        const snappedEastM = previousEastM + projection * eastDeltaM;
        const distanceM = Math.hypot(snappedNorthM, snappedEastM);
        if (distanceM >= bestDistanceM)
            continue;
        bestDistanceM = distanceM;
        bestPoint = {
            lat: position.lat + (snappedNorthM * 180) / (Math.PI * earthRadiusM),
            lng: position.lng +
                (snappedEastM * 180) /
                    (Math.PI * earthRadiusM * Math.max(0.01, Math.cos(centerLatRad))),
        };
    }
    return bestPoint && bestDistanceM <= maxSnapDistanceM ? bestPoint : position;
}
const AR_WORLD_SCALE = 0.04;
const MIN_RAY_DISTANCE_M = 12;
const MAX_OCCLUSION_GAP_DEG = 8;
const OCCLUSION_MARGIN_DEG = 0.5;
const DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M = 80;
const DEFAULT_MAX_ROUTE_SEGMENTS = 96;
// Keep a visible minimum at the compressed end of the route. A very thin
// final segment makes otherwise touching Viro polylines look disconnected.
const MIN_ROUTE_THICKNESS = 0.032;
const MAX_ROUTE_THICKNESS = 0.09;
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
function normalizeBearing(degrees) {
    return ((degrees % 360) + 360) % 360;
}
function bearingDifference(a, b) {
    const difference = Math.abs(normalizeBearing(a) - normalizeBearing(b));
    return Math.min(difference, 360 - difference);
}
function isFiniteLatLng(value) {
    if (!value || typeof value !== "object")
        return false;
    const point = value;
    return (typeof point.lat === "number" &&
        Number.isFinite(point.lat) &&
        typeof point.lng === "number" &&
        Number.isFinite(point.lng));
}
function isLocalTerrainModel(value) {
    if (!value || typeof value !== "object")
        return false;
    const model = value;
    if (model.version !== 1 ||
        model.source !== "SwissTopo DTM radial profiles" ||
        !isFiniteLatLng(model.center) ||
        typeof model.radiusM !== "number" ||
        !Number.isFinite(model.radiusM) ||
        typeof model.sectors !== "number" ||
        typeof model.rings !== "number" ||
        (model.observerElevationM !== null &&
            (typeof model.observerElevationM !== "number" ||
                !Number.isFinite(model.observerElevationM))) ||
        !Array.isArray(model.rays)) {
        return false;
    }
    return model.rays.every((ray) => !!ray &&
        typeof ray.bearingDeg === "number" &&
        Number.isFinite(ray.bearingDeg) &&
        Array.isArray(ray.samples) &&
        ray.samples.every((sample) => !!sample &&
            typeof sample.distanceM === "number" &&
            Number.isFinite(sample.distanceM) &&
            typeof sample.elevationM === "number" &&
            Number.isFinite(sample.elevationM)));
}
function interpolateRayElevation(ray, distanceM) {
    const samples = ray.samples
        .filter((sample) => Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM))
        .sort((a, b) => a.distanceM - b.distanceM);
    if (samples.length < 2)
        return null;
    if (distanceM < samples[0].distanceM || distanceM > samples[samples.length - 1].distanceM) {
        return null;
    }
    for (let index = 1; index < samples.length; index++) {
        const previous = samples[index - 1];
        const current = samples[index];
        if (distanceM > current.distanceM)
            continue;
        const span = current.distanceM - previous.distanceM;
        if (span <= 0)
            return current.elevationM;
        const fraction = (distanceM - previous.distanceM) / span;
        return previous.elevationM + (current.elevationM - previous.elevationM) * fraction;
    }
    return null;
}
function nearestRay(model, bearingDeg) {
    let closest = null;
    let closestDifference = Infinity;
    for (const ray of model.rays) {
        const difference = bearingDifference(ray.bearingDeg, bearingDeg);
        if (difference < closestDifference) {
            closestDifference = difference;
            closest = ray;
        }
    }
    return closest && closestDifference <= MAX_OCCLUSION_GAP_DEG ? closest : null;
}
/**
 * Determines whether a real terrain sample blocks the line of sight to a peak.
 * Missing rays, missing observer elevation, distant peaks beyond the model
 * radius, and unknown peak angles deliberately return "unknown".
 */
function terrainVisibilityForPeak(model, peak, observerElevationM) {
    if (!model || peak.elevationAngleDeg == null || !Number.isFinite(peak.elevationAngleDeg)) {
        return "unknown";
    }
    const elevation = observerElevationM ?? model.observerElevationM;
    const targetDistanceM = peak.distanceKm * 1000;
    if (elevation == null ||
        !Number.isFinite(elevation) ||
        !Number.isFinite(targetDistanceM) ||
        targetDistanceM <= MIN_RAY_DISTANCE_M ||
        targetDistanceM > model.radiusM + 1) {
        return "unknown";
    }
    const ray = nearestRay(model, peak.bearingDeg);
    if (!ray)
        return "unknown";
    const samples = ray.samples
        .filter((sample) => Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM))
        .sort((a, b) => a.distanceM - b.distanceM);
    let hasTerrainEvidence = false;
    for (let index = 1; index < samples.length; index++) {
        const start = samples[index - 1].distanceM;
        const end = samples[index].distanceM;
        if (end <= MIN_RAY_DISTANCE_M || start >= targetDistanceM || end <= start)
            continue;
        const segmentEnd = Math.min(end, targetDistanceM);
        const steps = Math.max(1, Math.ceil((segmentEnd - Math.max(start, MIN_RAY_DISTANCE_M)) / 40));
        for (let step = 0; step <= steps; step++) {
            const distanceM = Math.max(start, MIN_RAY_DISTANCE_M) +
                ((segmentEnd - Math.max(start, MIN_RAY_DISTANCE_M)) * step) / steps;
            if (distanceM >= targetDistanceM)
                continue;
            const terrainElevationM = interpolateRayElevation(ray, distanceM);
            if (terrainElevationM == null)
                continue;
            hasTerrainEvidence = true;
            const terrainAngleDeg = (Math.atan2(terrainElevationM - elevation, distanceM) * 180) / Math.PI;
            if (terrainAngleDeg > peak.elevationAngleDeg + OCCLUSION_MARGIN_DEG) {
                return "occluded";
            }
        }
    }
    return hasTerrainEvidence ? "visible" : "unknown";
}
/**
 * Converts the radial model into a local Viro mesh. Directions stay geographic
 * by subtracting the current compass heading, while distance and elevation use
 * the same display scale so the terrain keeps its real slope angles.
 */
function buildLocalTerrainMesh(model, headingDeg) {
    const observerElevation = model?.observerElevationM;
    if (!model || headingDeg == null || observerElevation == null)
        return null;
    const rays = model.rays
        .filter((ray) => ray.samples.length >= 2)
        .slice()
        .sort((a, b) => a.bearingDeg - b.bearingDeg);
    if (rays.length < 4)
        return null;
    const ringCount = Math.min(model.rings, ...rays.map((ray) => ray.samples.length));
    if (ringCount < 2)
        return null;
    const vertices = [];
    const normals = [];
    const texcoords = [];
    for (const ray of rays) {
        const relativeBearing = ((ray.bearingDeg - headingDeg + 540) % 360) - 180;
        const angle = (relativeBearing * Math.PI) / 180;
        for (const sample of ray.samples.slice(0, ringCount)) {
            const distance = sample.distanceM * AR_WORLD_SCALE;
            vertices.push([
                Math.sin(angle) * distance,
                (sample.elevationM - observerElevation) * AR_WORLD_SCALE,
                -Math.cos(angle) * distance,
            ]);
            normals.push([0, 1, 0]);
            const geographicAngle = (ray.bearingDeg * Math.PI) / 180;
            const eastM = Math.sin(geographicAngle) * sample.distanceM;
            const northM = Math.cos(geographicAngle) * sample.distanceM;
            texcoords.push([
                clampNumber(0.5 + eastM / (model.radiusM * 2), 0, 1),
                // Native Three textures are uploaded with flipY=true: the northern
                // (top) edge of the WMS image therefore lives at larger V values.
                clampNumber(0.5 + northM / (model.radiusM * 2), 0, 1),
            ]);
        }
    }
    const triangleIndices = [];
    const expectedGap = 360 / Math.max(1, model.sectors);
    for (let rayIndex = 0; rayIndex < rays.length; rayIndex++) {
        const nextRayIndex = (rayIndex + 1) % rays.length;
        const gap = nextRayIndex === 0
            ? bearingDifference(rays[rayIndex].bearingDeg, rays[0].bearingDeg)
            : bearingDifference(rays[rayIndex].bearingDeg, rays[nextRayIndex].bearingDeg);
        if (gap > expectedGap * 1.6)
            continue;
        for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex++) {
            const a = rayIndex * ringCount + ringIndex;
            const b = nextRayIndex * ringCount + ringIndex;
            const c = rayIndex * ringCount + ringIndex + 1;
            const d = nextRayIndex * ringCount + ringIndex + 1;
            triangleIndices.push([a, b, c], [c, b, d]);
        }
    }
    return triangleIndices.length > 0
        ? { vertices, normals, texcoords, triangleIndices }
        : null;
}
/**
 * Projects a geographic point onto the exact radial DTM triangles used by
 * buildLocalTerrainMesh. The returned point is in the same geographic local
 * frame (heading 0) as the mesh, before the panorama applies its rotation.
 */
function projectGeographicPointOntoTerrain(model, point) {
    if (!model || model.observerElevationM == null)
        return null;
    const earthRadiusM = 6_371_000;
    const centerLatRad = (model.center.lat * Math.PI) / 180;
    const northM = ((point.lat - model.center.lat) * Math.PI * earthRadiusM) / 180;
    const eastM = ((point.lng - model.center.lng) *
        Math.PI *
        earthRadiusM *
        Math.cos(centerLatRad)) /
        180;
    const distanceM = Math.hypot(northM, eastM);
    if (distanceM > model.radiusM + 1)
        return null;
    const targetX = eastM * AR_WORLD_SCALE;
    const targetZ = -northM * AR_WORLD_SCALE;
    const containsPoint = (first, second, third) => {
        const denominator = (second[2] - third[2]) * (first[0] - third[0]) +
            (third[0] - second[0]) * (first[2] - third[2]);
        if (Math.abs(denominator) < 1e-9)
            return null;
        const firstWeight = ((second[2] - third[2]) * (targetX - third[0]) +
            (third[0] - second[0]) * (targetZ - third[2])) /
            denominator;
        const secondWeight = ((third[2] - first[2]) * (targetX - third[0]) +
            (first[0] - third[0]) * (targetZ - third[2])) /
            denominator;
        const thirdWeight = 1 - firstWeight - secondWeight;
        const tolerance = 0.0001;
        return firstWeight >= -tolerance &&
            secondWeight >= -tolerance &&
            thirdWeight >= -tolerance
            ? [firstWeight, secondWeight, thirdWeight]
            : null;
    };
    const mesh = buildLocalTerrainMesh(model, 0);
    if (!mesh)
        return null;
    for (const indices of mesh.triangleIndices) {
        const triangle = indices.map((index) => mesh.vertices[index]);
        const weights = containsPoint(triangle[0], triangle[1], triangle[2]);
        if (!weights)
            continue;
        return [
            targetX,
            triangle[0][1] * weights[0] +
                triangle[1][1] * weights[1] +
                triangle[2][1] * weights[2],
            targetZ,
        ];
    }
    return null;
}
/**
 * Projects route geometry into a local Viro frame. When headingDeg is set,
 * coordinates are camera-relative (used by the retained map-card renderer).
 * When it is null, coordinates stay in the geographic GravityAndHeading frame
 * (used by the live AR route).
 */
function buildLocalTerrainRouteLines(model, routeGeometry, headingDeg, centerOverride, maxDisplayRadiusM) {
    const observerElevation = model?.observerElevationM;
    // The caller supplies the fixed geographic origin captured when the
    // GravityAndHeading AR session starts. The terrain model can be up to two
    // minutes / 120 m old, so falling back to model.center can move the route
    // outside the local radius and yield no line at all.
    const center = centerOverride ?? model?.center;
    // The displayed route may extend beyond the DTM coverage. Outside that
    // coverage the route stays level; terrain elevation is never fabricated.
    const radiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
    if (!center ||
        !Array.isArray(routeGeometry) ||
        routeGeometry.length < 2) {
        return [];
    }
    const earthRadiusM = 6_371_000;
    const centerLatRad = (center.lat * Math.PI) / 180;
    const maxPoints = 160;
    const stride = Math.max(1, Math.ceil(routeGeometry.length / maxPoints));
    const lines = [];
    let currentLine = [];
    const flush = () => {
        if (currentLine.length >= 2)
            lines.push(currentLine);
        currentLine = [];
    };
    const sampledIndices = [];
    for (let index = 0; index < routeGeometry.length; index += stride) {
        sampledIndices.push(index);
    }
    if (sampledIndices[sampledIndices.length - 1] !== routeGeometry.length - 1) {
        sampledIndices.push(routeGeometry.length - 1);
    }
    for (const index of sampledIndices) {
        const point = routeGeometry[index];
        const lat = point?.[0];
        const lng = point?.[1];
        if (typeof lat !== "number" ||
            typeof lng !== "number" ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)) {
            flush();
            continue;
        }
        const deltaLat = ((lat - center.lat) * Math.PI) / 180;
        const deltaLng = ((lng - center.lng) * Math.PI) / 180;
        const northM = deltaLat * earthRadiusM;
        const eastM = deltaLng * earthRadiusM * Math.cos(centerLatRad);
        const distanceM = Math.hypot(northM, eastM);
        if (distanceM > radiusM + 1) {
            flush();
            continue;
        }
        const bearingDeg = ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360;
        const relativeBearing = headingDeg == null
            ? bearingDeg
            : ((bearingDeg - headingDeg + 540) % 360) - 180;
        const angle = (relativeBearing * Math.PI) / 180;
        const ray = model == null ? null : nearestRay(model, bearingDeg);
        const terrainElevation = observerElevation == null || ray == null
            ? observerElevation
            : interpolateRayElevation(ray, distanceM) ?? observerElevation;
        const distance = distanceM * AR_WORLD_SCALE;
        // The route is still useful without an absolute observer elevation. In
        // that case keep it level rather than dropping the complete AR overlay.
        const elevation = terrainElevation == null || observerElevation == null
            ? 0
            : (terrainElevation - observerElevation) * AR_WORLD_SCALE;
        currentLine.push([
            Math.sin(angle) * distance,
            elevation,
            -Math.cos(angle) * distance,
        ]);
    }
    flush();
    return lines;
}
/**
 * Route overlay for the live AR world. GravityAndHeading already aligns Viro
 * with geographic north, so these coordinates must not be rotated by the
 * phone's current compass heading a second time.
 */
function buildGeographicTerrainRouteLines(model, routeGeometry, centerOverride, maxDisplayRadiusM) {
    return buildLocalTerrainRouteLines(model, routeGeometry, null, centerOverride, maxDisplayRadiusM);
}
function geographicDistanceM(point, center) {
    const lat = point[0];
    const lng = point[1];
    if (typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)) {
        return null;
    }
    const earthRadiusM = 6_371_000;
    const centerLatRad = (center.lat * Math.PI) / 180;
    const northM = ((lat - center.lat) * Math.PI * earthRadiusM) / 180;
    const eastM = ((lng - center.lng) * Math.PI * earthRadiusM * Math.cos(centerLatRad)) / 180;
    return Math.hypot(northM, eastM);
}
function routeGeometryMaxDistanceM(routeGeometry, center) {
    if (!routeGeometry || routeGeometry.length === 0 || !center)
        return 0;
    return routeGeometry.reduce((maximum, point) => {
        const distanceM = geographicDistanceM(point, center);
        return distanceM == null ? maximum : Math.max(maximum, distanceM);
    }, 0);
}
/**
 * Converts a geographic position into the fixed Viro world frame. The
 * translation is applied after projecting a point relative to the current
 * observer, so the near-field route can be refreshed without sliding through
 * the real landscape.
 */
function arWorldOffsetForPosition(worldOrigin, position) {
    if (!worldOrigin || !position)
        return [0, 0, 0];
    const earthRadiusM = 6_371_000;
    const originLatRad = (worldOrigin.lat * Math.PI) / 180;
    const northM = ((position.lat - worldOrigin.lat) * Math.PI * earthRadiusM) / 180;
    const eastM = ((position.lng - worldOrigin.lng) *
        Math.PI *
        earthRadiusM *
        Math.cos(originLatRad)) /
        180;
    return [eastM * AR_WORLD_SCALE, 0, -northM * AR_WORLD_SCALE];
}
function compressedRouteDistanceM(distanceM, realScaleRadiusM, maxRouteDistanceM, maxVirtualDistanceM) {
    if (distanceM <= realScaleRadiusM || maxRouteDistanceM <= realScaleRadiusM) {
        return distanceM;
    }
    const farDistanceM = maxRouteDistanceM - realScaleRadiusM;
    const farProgress = Math.log1p((distanceM - realScaleRadiusM) / Math.max(1, realScaleRadiusM)) /
        Math.log1p(farDistanceM / Math.max(1, realScaleRadiusM));
    return (realScaleRadiusM +
        clampNumber(farProgress, 0, 1) *
            Math.max(0, maxVirtualDistanceM - realScaleRadiusM));
}
function projectGeographicRoutePoint(model, point, center, terrainRadiusM, maxRouteDistanceM, maxVirtualDistanceM, realScaleRadiusM) {
    const distanceM = geographicDistanceM(point, center);
    if (distanceM == null)
        return null;
    const earthRadiusM = 6_371_000;
    const centerLatRad = (center.lat * Math.PI) / 180;
    const northM = ((point[0] - center.lat) * Math.PI * earthRadiusM) / 180;
    const eastM = ((point[1] - center.lng) * Math.PI * earthRadiusM * Math.cos(centerLatRad)) /
        180;
    const bearingDeg = ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360;
    const observerElevation = model?.observerElevationM ?? null;
    const ray = model == null ? null : nearestRay(model, bearingDeg);
    const terrainElevation = observerElevation == null || ray == null || distanceM > terrainRadiusM + 1
        ? observerElevation
        : interpolateRayElevation(ray, distanceM) ?? observerElevation;
    const elevation = terrainElevation == null || observerElevation == null
        ? 0
        : (terrainElevation - observerElevation) * AR_WORLD_SCALE;
    const displayDistanceM = compressedRouteDistanceM(distanceM, realScaleRadiusM, maxRouteDistanceM, maxVirtualDistanceM);
    const distance = displayDistanceM * AR_WORLD_SCALE;
    const angle = (bearingDeg * Math.PI) / 180;
    return {
        point: [
            Math.sin(angle) * distance,
            elevation,
            -Math.cos(angle) * distance,
        ],
        displayDistanceM,
    };
}
function mergeRouteGradeSegments(segments, maxSegments) {
    if (segments.length <= maxSegments)
        return segments;
    const groupSize = Math.ceil(segments.length / maxSegments);
    const merged = [];
    for (let start = 0; start < segments.length; start += groupSize) {
        const group = segments.slice(start, start + groupSize);
        const coordinates = group.flatMap((segment, index) => index === 0 ? segment.coordinates : segment.coordinates.slice(1));
        merged.push({
            coordinates,
            band: group.reduce((strongest, segment) => {
                const rank = {
                    green: 0,
                    yellow: 1,
                    orange: 2,
                    red: 3,
                };
                return rank[segment.band] > rank[strongest] ? segment.band : strongest;
            }, "green"),
        });
    }
    return merged;
}
/**
 * Splits and projects the complete live AR route. The nearby part retains
 * geographic scale, while distant parts are logarithmically compressed so the
 * destination remains in the AR world. Each slot gets a distance-based line
 * thickness, and the route remains capped to the fixed native slot count.
 */
function buildGeographicTerrainRouteSegments(model, routeGeometry, centerOverride, maxDisplayRadiusM, terrainProfile, displayOptions = {}) {
    if (!routeGeometry || routeGeometry.length < 2)
        return [];
    const center = centerOverride ?? model?.center;
    if (!center)
        return [];
    const terrainRadiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
    const maxVirtualDistanceM = displayOptions.maxVirtualDistanceM ?? DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M;
    const realScaleRadiusM = Math.max(1, displayOptions.realScaleRadiusM ?? terrainRadiusM);
    const maxSegments = displayOptions.maxSegments ?? DEFAULT_MAX_ROUTE_SEGMENTS;
    const geometry = routeGeometry.map((point) => [point[0], point[1]]);
    const gradeSegments = mergeRouteGradeSegments((0, terrainCues_1.buildRouteGradeSegments)(geometry, terrainProfile ? terrainProfile.map((point) => ({ ...point })) : null), maxSegments);
    const maxRouteDistanceM = displayOptions.maxRouteDistanceM ??
        routeGeometryMaxDistanceM(geometry, center);
    const worldOffset = displayOptions.worldOffset ?? [0, 0, 0];
    // Only keep the first connected near-field prefix. Filtering every grade
    // band independently by radial distance lets a later part of a loop
    // re-enter the 50 m circle and appear as a detached floating line.
    let reachedRenderedDistanceLimit = false;
    return gradeSegments.flatMap((segment) => {
        if (reachedRenderedDistanceLimit)
            return [];
        const projected = segment.coordinates
            .map((point) => projectGeographicRoutePoint(model, point, center, terrainRadiusM, maxRouteDistanceM, maxVirtualDistanceM, realScaleRadiusM))
            .filter((point) => point !== null);
        const maxRenderedDistanceM = displayOptions.maxRenderedDistanceM;
        const visibleProjected = [];
        for (const point of projected) {
            if (maxRenderedDistanceM != null &&
                point.displayDistanceM > Math.max(1, maxRenderedDistanceM)) {
                reachedRenderedDistanceLimit = true;
                break;
            }
            visibleProjected.push(point);
        }
        if (visibleProjected.length < 2)
            return [];
        const displayDistanceM = visibleProjected.reduce((sum, point) => sum + point.displayDistanceM, 0) /
            visibleProjected.length;
        const distanceProgress = maxVirtualDistanceM <= 0
            ? 1
            : clampNumber(displayDistanceM / maxVirtualDistanceM, 0, 1);
        const thickness = Math.max(MIN_ROUTE_THICKNESS, MAX_ROUTE_THICKNESS * (1 - 0.45 * distanceProgress));
        return [
            {
                points: visibleProjected.map(({ point }) => [
                    point[0] + worldOffset[0],
                    point[1] + worldOffset[1],
                    point[2] + worldOffset[2],
                ]),
                band: segment.band,
                thickness,
            },
        ];
    });
}
/**
 * Returns the remaining route starting at the closest point to the current
 * GPS fix. Coordinates stay in the original route frame so an AR renderer can
 * hide walked segments without moving the established AR world origin.
 */
function routeGeometryAheadOfPosition(routeGeometry, routeOrigin, currentPosition, maxSnapDistanceM = 80) {
    if (!routeGeometry ||
        routeGeometry.length < 2 ||
        !routeOrigin ||
        !currentPosition) {
        return null;
    }
    const earthRadiusM = 6_371_000;
    const centerLatRad = (routeOrigin.lat * Math.PI) / 180;
    const toLocal = (point) => ({
        north: ((point[0] - routeOrigin.lat) * Math.PI * earthRadiusM) / 180,
        east: ((point[1] - routeOrigin.lng) *
            Math.PI *
            earthRadiusM *
            Math.cos(centerLatRad)) /
            180,
    });
    const current = toLocal([currentPosition.lat, currentPosition.lng]);
    let closestDistanceM = Infinity;
    let closestSegmentIndex = -1;
    let closestFraction = 0;
    for (let index = 1; index < routeGeometry.length; index += 1) {
        const from = routeGeometry[index - 1];
        const to = routeGeometry[index];
        if (!from || !to)
            continue;
        const fromLocal = toLocal(from);
        const toLocalPoint = toLocal(to);
        const northDelta = toLocalPoint.north - fromLocal.north;
        const eastDelta = toLocalPoint.east - fromLocal.east;
        const lengthSquared = northDelta ** 2 + eastDelta ** 2;
        const fraction = lengthSquared <= 0
            ? 0
            : clampNumber(((current.north - fromLocal.north) * northDelta +
                (current.east - fromLocal.east) * eastDelta) /
                lengthSquared, 0, 1);
        const projectedNorth = fromLocal.north + northDelta * fraction;
        const projectedEast = fromLocal.east + eastDelta * fraction;
        const distanceM = Math.hypot(current.north - projectedNorth, current.east - projectedEast);
        if (distanceM >= closestDistanceM)
            continue;
        closestDistanceM = distanceM;
        closestSegmentIndex = index - 1;
        closestFraction = fraction;
    }
    if (closestSegmentIndex < 0 ||
        closestDistanceM > Math.max(1, maxSnapDistanceM)) {
        return null;
    }
    const from = routeGeometry[closestSegmentIndex];
    const to = routeGeometry[closestSegmentIndex + 1];
    if (!from || !to)
        return null;
    const projected = [
        from[0] + (to[0] - from[0]) * closestFraction,
        from[1] + (to[1] - from[1]) * closestFraction,
    ];
    return [projected, ...routeGeometry.slice(closestSegmentIndex + 1)];
}
/**
 * Returns the projected final route point used by the small destination flag.
 * It uses the same compression and terrain rules as the route polylines.
 */
function buildGeographicTerrainRouteDestination(model, routeGeometry, centerOverride, maxDisplayRadiusM, displayOptions = {}) {
    if (!routeGeometry || routeGeometry.length < 2)
        return null;
    const center = centerOverride ?? model?.center;
    if (!center)
        return null;
    const terrainRadiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
    const maxVirtualDistanceM = displayOptions.maxVirtualDistanceM ?? DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M;
    const realScaleRadiusM = Math.max(1, displayOptions.realScaleRadiusM ?? terrainRadiusM);
    const maxRouteDistanceM = displayOptions.maxRouteDistanceM ??
        routeGeometryMaxDistanceM(routeGeometry, center);
    const worldOffset = displayOptions.worldOffset ?? [0, 0, 0];
    for (let index = routeGeometry.length - 1; index >= 0; index -= 1) {
        const projected = projectGeographicRoutePoint(model, routeGeometry[index], center, terrainRadiusM, maxRouteDistanceM, maxVirtualDistanceM, realScaleRadiusM);
        if (projected) {
            return [
                projected.point[0] + worldOffset[0],
                projected.point[1] + worldOffset[1],
                projected.point[2] + worldOffset[2],
            ];
        }
    }
    return null;
}
/**
 * Converts the same route geometry into a north-up map-card coordinate system.
 * The map card uses x=east and y=north, while the AR terrain frame uses x=east
 * and z=north. Elevation is intentionally discarded for this flat map view.
 */
function buildLocalMapRouteLines(model, routeGeometry) {
    return buildLocalTerrainRouteLines(model, routeGeometry, 0).map((line) => line.map(([east, _elevation, northFacing]) => [
        east / AR_WORLD_SCALE,
        -northFacing / AR_WORLD_SCALE,
        0.04,
    ]));
}
