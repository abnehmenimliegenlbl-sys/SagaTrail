export type TerrainGridCell = {
  lat: number;
  lng: number;
  elevationM: number | null;
};

export type TerrainGrid = {
  rows: number;
  columns: number;
  /** Geographic degrees: south, west, north, east. */
  bounds: { south: number; west: number; north: number; east: number };
  grid: TerrainGridCell[][];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Parses the terrain-corridor response without deriving coordinates or filling
 * elevation gaps. The grid's own cell coordinates are authoritative.
 */
export function parseTerrainCorridor(payload: unknown): TerrainGrid | null {
  const root = asRecord(payload);
  if (!root || !Array.isArray(root.grid)) return null;

  const rows = finite(root.rows);
  const columns = finite(root.columns);
  const rawBounds = asRecord(root.bounds);
  const south = finite(rawBounds?.south);
  const west = finite(rawBounds?.west);
  const north = finite(rawBounds?.north);
  const east = finite(rawBounds?.east);

  if (
    !rows ||
    !columns ||
    rows < 2 ||
    columns < 2 ||
    root.grid.length !== rows ||
    south == null ||
    west == null ||
    north == null ||
    east == null ||
    north <= south ||
    east <= west
  ) {
    return null;
  }

  const grid: TerrainGridCell[][] = [];
  for (const rawRow of root.grid) {
    if (!Array.isArray(rawRow) || rawRow.length !== columns) return null;
    const row: TerrainGridCell[] = [];
    for (const rawCell of rawRow) {
      const cell = asRecord(rawCell);
      const lat = finite(cell?.lat);
      const lng = finite(cell?.lng);
      // Null is deliberate missing DTM data, not a zero-height fallback.
      const elevationM =
        cell?.elevationM === null ? null : finite(cell?.elevationM);
      if (
        lat == null ||
        lng == null ||
        (elevationM === null && cell?.elevationM !== null)
      ) {
        return null;
      }
      row.push({ lat, lng, elevationM });
    }
    grid.push(row);
  }

  if (!grid.some((row) => row.some((cell) => cell.elevationM != null)))
    return null;
  return { rows, columns, bounds: { south, west, north, east }, grid };
}
