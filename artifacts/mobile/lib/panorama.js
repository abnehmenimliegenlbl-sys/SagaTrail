"use strict";
/**
 * Waehlt ein repraesentatives Panorama-Bild fuer eine Route — passend zur
 * aktuellen Jahreszeit und zur Hoehenlage (Tal vs. hochalpin). Die Bilder
 * sind gebuendelt, damit die Auswahl auch offline funktioniert.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PANORAMA_OFFLINE_SOURCE = exports.PANORAMA_OFFLINE_VERSION = exports.PANORAMA_ROUTE_CORRIDOR_KM = void 0;
exports.panoramaFuerRoute = panoramaFuerRoute;
exports.selectPanoramaPeaks = selectPanoramaPeaks;
exports.createOfflinePanoramaDatenbank = createOfflinePanoramaDatenbank;
exports.isOfflinePanoramaDatenbank = isOfflinePanoramaDatenbank;
exports.erkenneGipfel = erkenneGipfel;
const geo_1 = require("@/lib/geo");
const terrainModel_1 = require("@/lib/terrainModel");
const BILDER = {
    fruehling: {
        tal: require("@/assets/images/panorama/fruehling-tal.jpg"),
        alpin: require("@/assets/images/panorama/fruehling-alpin.jpg"),
    },
    sommer: {
        tal: require("@/assets/images/panorama/sommer-tal.jpg"),
        alpin: require("@/assets/images/panorama/sommer-alpin.jpg"),
    },
    herbst: {
        tal: require("@/assets/images/panorama/herbst-tal.jpg"),
        alpin: require("@/assets/images/panorama/herbst-alpin.jpg"),
    },
    winter: {
        tal: require("@/assets/images/panorama/winter-tal.jpg"),
        alpin: require("@/assets/images/panorama/winter-alpin.jpg"),
    },
};
/** Ab dieser Maximalhoehe gilt eine Route als hochalpin. */
const ALPIN_AB_M = 1800;
function aktuelleJahreszeit(datum) {
    const monat = datum.getMonth() + 1;
    if (monat >= 3 && monat <= 5)
        return "fruehling";
    if (monat >= 6 && monat <= 8)
        return "sommer";
    if (monat >= 9 && monat <= 11)
        return "herbst";
    return "winter";
}
function panoramaFuerRoute(maxElevationM, datum = new Date()) {
    const jahreszeit = aktuelleJahreszeit(datum);
    const lage = (maxElevationM ?? 0) >= ALPIN_AB_M ? "alpin" : "tal";
    return BILDER[jahreszeit][lage];
}
function selectPanoramaPeaks(candidates, maxPeaks) {
    const limit = Math.max(0, maxPeaks);
    if (limit === 0)
        return [];
    if (candidates.length <= limit)
        return [...candidates];
    const selected = [candidates[0]];
    const selectedIds = new Set([candidates[0]?.id]);
    while (selected.length < limit) {
        let bestCandidate = null;
        let bestAngularDistance = -1;
        for (const candidate of candidates) {
            if (selectedIds.has(candidate.id))
                continue;
            const nearestDistance = selected.reduce((minimum, chosen) => {
                const distance = Math.abs(((candidate.bearingDeg - chosen.bearingDeg + 540) % 360) - 180);
                return Math.min(minimum, distance);
            }, 180);
            if (nearestDistance > bestAngularDistance ||
                (nearestDistance === bestAngularDistance &&
                    (!bestCandidate || candidate.distanceKm < bestCandidate.distanceKm))) {
                bestCandidate = candidate;
                bestAngularDistance = nearestDistance;
            }
        }
        if (!bestCandidate)
            break;
        selected.push(bestCandidate);
        selectedIds.add(bestCandidate.id);
    }
    return selected.sort((a, b) => {
        const aAngle = a.relativeBearingDeg == null ? 180 : Math.abs(a.relativeBearingDeg);
        const bAngle = b.relativeBearingDeg == null ? 180 : Math.abs(b.relativeBearingDeg);
        return aAngle - bAngle || a.distanceKm - b.distanceKm;
    });
}
// Das Panorama zeigt die lokale Höhenverteilung. Entfernte Gipfel würden die
// Winkelverteilung dominieren, obwohl sie für das Gelände direkt vor dem
// Wanderer nicht repräsentativ sind.
exports.PANORAMA_ROUTE_CORRIDOR_KM = 5;
exports.PANORAMA_OFFLINE_VERSION = 4;
exports.PANORAMA_OFFLINE_SOURCE = "OpenStreetMap natural=peak via Overpass; Höhe aus OSM ele; SwissTopo route and local terrain; 20 km route corridor";
function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
/**
 * Erstellt aus dem OSM-POI-Download einen eigenständigen, kleinen Offline-
 * Datensatz. Die Quelle und Version reisen mit, damit alte lokale Datensätze
 * nicht stillschweigend als aktuell ausgegeben werden.
 */
function createOfflinePanoramaDatenbank(pois, terrainProfile, terrainModel, downloadedAt = Date.now()) {
    const seen = new Set();
    const peaks = [];
    for (const poi of pois) {
        if (poi.kind !== "natural=peak" ||
            typeof poi.id !== "string" ||
            typeof poi.name !== "string" ||
            poi.name.trim().length === 0 ||
            !Number.isFinite(poi.lat) ||
            !Number.isFinite(poi.lng) ||
            seen.has(poi.id)) {
            continue;
        }
        seen.add(poi.id);
        peaks.push({
            id: poi.id,
            name: poi.name.trim(),
            lat: poi.lat,
            lng: poi.lng,
            elevationM: finiteNumber(poi.elevation ?? poi.elevationM),
        });
    }
    const validTerrainProfile = (terrainProfile ?? [])
        .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM))
        .map((point) => ({
        distanceKm: point.distanceKm,
        altM: point.altM,
    }));
    return {
        version: exports.PANORAMA_OFFLINE_VERSION,
        source: exports.PANORAMA_OFFLINE_SOURCE,
        downloadedAt,
        peaks,
        ...(validTerrainProfile.length >= 2
            ? { terrainProfile: validTerrainProfile }
            : {}),
        ...(terrainModel && (0, terrainModel_1.isLocalTerrainModel)(terrainModel)
            ? { terrainModel }
            : {}),
    };
}
function isOfflinePanoramaDatenbank(value) {
    if (!value || typeof value !== "object")
        return false;
    const data = value;
    return (data.version === exports.PANORAMA_OFFLINE_VERSION &&
        data.source === exports.PANORAMA_OFFLINE_SOURCE &&
        typeof data.downloadedAt === "number" &&
        Array.isArray(data.peaks) &&
        (data.terrainProfile === undefined || Array.isArray(data.terrainProfile)) &&
        (data.terrainModel === undefined || (0, terrainModel_1.isLocalTerrainModel)(data.terrainModel)));
}
function signedBearingDifference(target, heading) {
    return ((target - heading + 540) % 360) - 180;
}
/**
 * Ermittelt echte OSM-Gipfel im Umfeld der aktuellen Position und berechnet
 * ihre Lage im Sichtfeld. Das ist bewusst eine geografische Erkennung, keine
 * visuelle KI-Bildanalyse: Es werden nur Gipfel angezeigt, die der Server als
 * natural=peak geliefert hat.
 */
function erkenneGipfel(pois, position, heading, observerElevationM = null, maxPeaks = 8) {
    if (!position)
        return [];
    const seen = new Set();
    const candidates = pois
        .filter((poi) => poi.kind === "natural=peak" && poi.name.trim().length > 0)
        .map((poi) => {
        const target = { lat: poi.lat, lng: poi.lng };
        const distanceKm = (0, geo_1.haversineKm)(position, target);
        const targetBearing = (0, geo_1.bearingDeg)(position, target);
        const elevationM = finiteNumber(poi.elevation ?? poi.elevationM);
        const elevationAngleDeg = elevationM != null && finiteNumber(observerElevationM) != null
            ? (Math.atan2(elevationM - observerElevationM, Math.max(1, distanceKm * 1000)) *
                180) /
                Math.PI
            : null;
        return {
            id: poi.id,
            name: poi.name.trim(),
            lat: poi.lat,
            lng: poi.lng,
            distanceKm,
            bearingDeg: targetBearing,
            elevationM,
            elevationAngleDeg,
            relativeBearingDeg: heading == null ? null : signedBearingDifference(targetBearing, heading),
        };
    })
        .filter((peak) => {
        if (seen.has(peak.id))
            return false;
        seen.add(peak.id);
        return true;
    })
        .filter((peak) => peak.distanceKm <= exports.PANORAMA_ROUTE_CORRIDOR_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    const limit = Math.max(0, maxPeaks);
    if (limit === 0 || candidates.length <= limit)
        return candidates;
    // Immer den noch grössten vorhandenen Winkelabstand besetzen. Damit
    // kommen echte Gipfel in unterrepräsentierte Richtungen, statt dass viele
    // nahe Gipfel aus einer einzigen Richtung alle Plätze verbrauchen.
    return selectPanoramaPeaks(candidates, limit);
}
