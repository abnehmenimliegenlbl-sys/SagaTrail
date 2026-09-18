function nullableNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateMinutes(distanceKm, ascentM) {
  const horizontalH = distanceKm / 4;
  const verticalH = Math.max(0, ascentM || 0) / 400;
  const hours =
    Math.max(horizontalH, verticalH) +
    Math.min(horizontalH, verticalH) / 2;
  return Math.max(15, Math.round(hours * 60));
}

function mapRouteRow(row) {
  const distanceKm = nullableNumber(row.distance_km);
  const distanceTagKm = nullableNumber(row.distance_tag_km);
  const ascentM = nullableNumber(row.ascent_m) ?? 0;
  const effectiveDistanceKm = distanceTagKm ?? distanceKm ?? 0;
  const storedMinutes = nullableNumber(row.minutes) ?? 0;
  const minutes =
    effectiveDistanceKm > 0
      ? estimateMinutes(effectiveDistanceKm, ascentM)
      : storedMinutes;

  return {
    id: row.id,
    sagaId: row.saga_id,
    canton: row.canton,
    cantons: row.cantons,
    name: row.name,
    ref: row.ref,
    distanceKm,
    distanceTagKm,
    ascentM: nullableNumber(row.ascent_m),
    maxElevationM: nullableNumber(row.max_elevation_m),
    minutes,
    sac: row.sac,
    sacSource: row.sac_source,
    schweizMobilCondition: row.schweizmobil_condition,
    schweizMobilTechnique: row.schweizmobil_technique,
    terrain: row.terrain,
    familyFriendly: row.family_friendly,
    childFriendly: row.child_friendly,
    dogsAllowed: row.dogs_allowed,
    wheelchairAccessible: row.wheelchair_accessible,
    wheelchairAccessibleSource: row.wheelchair_accessible_source,
    wheelchairAccessibleCheckedAt: row.wheelchair_accessible_checked_at,
    technicalDifficulty: row.technical_difficulty,
    lat: row.lat,
    lng: row.lng,
    geometry: row.geometry,
    geometryVersion: row.geometry_version,
    source: row.source,
    featured: row.featured,
    photoUrl: row.photo_url,
    photoAttribution: row.photo_attribution,
    routeType: row.route_type,
    isEtappe: row.is_etappe,
    description: row.description,
    descriptionSource: row.description_source,
  };
}

module.exports = { estimateMinutes, mapRouteRow };