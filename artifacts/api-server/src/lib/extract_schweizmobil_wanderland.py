#!/usr/bin/env python3
"""Extract the missing local Wanderland geometries from the official GeoPackage.

The GeoPackage is the official SchweizMobil Open Data export.  This small
stdlib-only extractor is intentionally run only by the protected admin
restore job; it is not part of the request path used by hikers.
"""

from __future__ import annotations

import json
import math
import os
import sqlite3
import struct
import sys
import tempfile
import urllib.request


SOURCE_URL = "https://data.schweizmobil.ch/gpkg_export/wander.gpkg"
ENDPOINT_TOLERANCE_M = 10.0
ROUTE_REFS = (
    "447 458 459 463 464 472 483 583 584 701 737 738 739 748 749 751 "
    "753 754 759 763 769 787 789 826 848 857 858 864 866 899 931 932 933 "
    "966 967 968 973 976 979 981 994 995 996 998 999"
).split()


def extract_difficulty() -> list[dict[str, object]]:
    """Exportiert die offiziellen SchweizMobil-Routen-Kategorien ohne Geometrie.

    KonditionR und TechnikR sind die von SchweizMobil gepflegten Kategorien.
    Sie sind absichtlich keine SAC-Werte und werden im API-Datenmodell getrennt
    von `sac` gespeichert.
    """
    db, _ = open_database()
    try:
        rows = db.execute(
            "SELECT NrR, KonditionR, TechnikR, Typ_TR, LvArt FROM Route "
            "WHERE NrR IS NOT NULL"
        ).fetchall()
        return [
            {
                "ref": str(ref),
                "condition": str(condition) if condition else None,
                "technique": str(technique) if technique else None,
                "routeType": str(route_type) if route_type else None,
                "level": str(level) if level else None,
                "source": "SchweizMobil Open Data · wander.gpkg",
                "sourceUrl": SOURCE_URL,
            }
            for ref, condition, technique, route_type, level in rows
        ]
    finally:
        db.close()


def unpack_geometry(blob: bytes) -> list[list[tuple[float, float]]]:
    if blob[:2] != b"GP":
        raise ValueError("not a GeoPackage geometry")
    flags = blob[3]
    envelope_type = (flags >> 1) & 7
    offset = 8 + {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[envelope_type]

    def read_geometry() -> list[list[tuple[float, float]]]:
        nonlocal offset
        endian_flag = blob[offset]
        offset += 1
        endian = "<" if endian_flag else ">"
        geometry_type = struct.unpack_from(endian + "I", blob, offset)[0]
        offset += 4
        base_type = geometry_type % 1000
        dimensions = 3 if 1000 <= geometry_type < 2000 else 2

        if base_type == 2:  # LINESTRING
            count = struct.unpack_from(endian + "I", blob, offset)[0]
            offset += 4
            points: list[tuple[float, float]] = []
            for _ in range(count):
                values = struct.unpack_from(endian + ("d" * dimensions), blob, offset)
                offset += 8 * dimensions
                easting, northing = values[:2]
                points.append((easting, northing))
            return [points]

        if base_type == 5:  # MULTILINESTRING
            count = struct.unpack_from(endian + "I", blob, offset)[0]
            offset += 4
            parts: list[list[tuple[float, float]]] = []
            for _ in range(count):
                parts.extend(read_geometry())
            return parts

        raise ValueError(f"unsupported WKB geometry type {geometry_type}")

    return read_geometry()


def lv95_to_wgs84(easting: float, northing: float) -> tuple[float, float]:
    """Approximate EPSG:2056 -> EPSG:4326 conversion used by swisstopo."""
    y = (easting - 2_600_000.0) / 1_000_000.0
    x = (northing - 1_200_000.0) / 1_000_000.0
    lat = (
        16.9023892
        + 3.238272 * x
        - 0.270978 * y * y
        - 0.002528 * x * x
        - 0.0447 * y * y * x
        - 0.0140 * x * x * x
    )
    lng = (
        2.6779094
        + 4.728982 * y
        + 0.791484 * y * x
        + 0.1306 * y * x * x
        - 0.0436 * y * y * y
    )
    return lat * 100.0 / 36.0, lng * 100.0 / 36.0


def endpoint_distance_m(
    first: tuple[float, float], second: tuple[float, float]
) -> float:
    return math.hypot(first[0] - second[0], first[1] - second[1])


def order_parts(
    parts: list[list[tuple[float, float]]],
    start_hint: tuple[float, float] | None = None,
) -> list[list[tuple[float, float]]]:
    """Order connected LineString parts by their shared LV95 endpoints.

    The GeoPackage does not guarantee that MultiLineString members are stored
    in traversal order. A small endpoint graph avoids flattening those members
    in storage order, which can create artificial kilometre-sized jumps.
    """
    usable = [part for part in parts if len(part) >= 2]
    if len(usable) <= 1:
        return usable

    endpoint_nodes: list[tuple[float, float]] = []
    edge_nodes: list[tuple[int, int]] = []

    def node_for(point: tuple[float, float]) -> int:
        for index, existing in enumerate(endpoint_nodes):
            if endpoint_distance_m(point, existing) <= ENDPOINT_TOLERANCE_M:
                return index
        endpoint_nodes.append(point)
        return len(endpoint_nodes) - 1

    for part in usable:
        edge_nodes.append((node_for(part[0]), node_for(part[-1])))

    adjacency: dict[int, list[int]] = {}
    for edge_index, (first_node, last_node) in enumerate(edge_nodes):
        adjacency.setdefault(first_node, []).append(edge_index)
        adjacency.setdefault(last_node, []).append(edge_index)

    remaining = set(range(len(usable)))
    ordered: list[list[tuple[float, float]]] = []
    current_point = start_hint
    current_node: int | None = None

    def choose_start_edge() -> tuple[int, int]:
        if current_point is not None:
            best = min(
                (
                    (
                        endpoint_distance_m(current_point, point),
                        edge_index,
                        node,
                    )
                    for edge_index in remaining
                    for node in edge_nodes[edge_index]
                    for point in [endpoint_nodes[node]]
                ),
                key=lambda item: item[0],
            )
            return best[1], best[2]
        edge_index = min(remaining)
        return edge_index, edge_nodes[edge_index][0]

    while remaining:
        if current_node is None or not any(
            edge_index in remaining for edge_index in adjacency.get(current_node, [])
        ):
            edge_index, current_node = choose_start_edge()
        else:
            candidates = [
                edge_index
                for edge_index in adjacency[current_node]
                if edge_index in remaining
            ]
            # A valid route is normally a chain or loop. For a branch, keep
            # the deterministic source order rather than inventing a branch
            # ranking from geometry.
            edge_index = min(candidates)

        first_node, last_node = edge_nodes[edge_index]
        part = list(usable[edge_index])
        if last_node == current_node and first_node != current_node:
            part.reverse()
            first_node, last_node = last_node, first_node
        elif first_node != current_node and last_node != current_node:
            # A disconnected component starts at the endpoint nearest the
            # previous component. This remains visible to validate().
            if current_point is not None and endpoint_distance_m(
                current_point, part[-1]
            ) < endpoint_distance_m(current_point, part[0]):
                part.reverse()
                first_node, last_node = last_node, first_node

        ordered.append(part)
        remaining.remove(edge_index)
        current_node = last_node
        current_point = part[-1]

    return ordered


def flatten(parts: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for part in parts:
        if not part:
            continue
        for point in part:
            if not points or point != points[-1]:
                points.append(point)
    return points


def resample(points: list[tuple[float, float]], max_points: int = 500) -> list[list[float]]:
    if len(points) <= max_points:
        selected = points
    else:
        step = (len(points) - 1) / (max_points - 1)
        selected = [points[round(i * step)] for i in range(max_points)]
    return [[round(lat, 7), round(lng, 7)] for lat, lng in selected]


def validate(points: list[list[float]]) -> None:
    if len(points) < 2:
        raise ValueError("fewer than two points")
    for lat, lng in points:
        if not (45.0 <= lat <= 48.5 and 5.0 <= lng <= 11.5):
            raise ValueError(f"point outside Switzerland/Liechtenstein: {lat},{lng}")
        if not (math.isfinite(lat) and math.isfinite(lng)):
            raise ValueError("non-finite coordinate")

    # A jump over 2 km is almost certainly a malformed/stitching artefact.
    for first, second in zip(points, points[1:]):
        lat1, lng1 = first
        lat2, lng2 = second
        metres = math.hypot((lat2 - lat1) * 111_320, (lng2 - lng1) * 75_000)
        if metres > 2_000:
            raise ValueError(f"implausible geometry jump: {round(metres)}m")


def open_database() -> tuple[sqlite3.Connection, str]:
    configured = os.environ.get("SCHWEIZMOBIL_WANDER_GPKG", "").strip()
    path = configured or os.path.join(tempfile.gettempdir(), "sagatrail-wander.gpkg")
    if not os.path.exists(path):
        request = urllib.request.Request(
            SOURCE_URL,
            headers={"User-Agent": "SagaTrail/1.0 (official route restoration)"},
        )
        with urllib.request.urlopen(request, timeout=180) as response, open(path, "wb") as target:
            while chunk := response.read(1024 * 1024):
                target.write(chunk)
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True), path


def extract() -> list[dict[str, object]]:
    db, _ = open_database()
    try:
        placeholders = ",".join("?" for _ in ROUTE_REFS)
        rows = db.execute(
            f"SELECT NrR, NrEtappe, geom, DistanzE FROM Etappe "
            f"WHERE NrR IN ({placeholders}) ORDER BY NrR, NrEtappe",
            ROUTE_REFS,
        ).fetchall()
        by_ref: dict[str, list[tuple[int, bytes, int | None]]] = {}
        for ref, stage, geometry, distance in rows:
            by_ref.setdefault(str(ref), []).append((int(stage), geometry, distance))

        # Every missing route currently has an Etappe.  Keep Route as a
        # defensive fallback for future official exports without Etappe rows.
        route_rows = db.execute(
            f"SELECT NrR, geom, LaengeR FROM Route WHERE NrR IN ({placeholders})",
            ROUTE_REFS,
        ).fetchall()
        by_route = {str(ref): (geometry, distance) for ref, geometry, distance in route_rows}

        result: list[dict[str, object]] = []
        for ref in ROUTE_REFS:
            parts_by_stage: dict[int, list[list[tuple[float, float]]]] = {}
            official_distance: int | None = None
            stages = by_ref.get(ref, [])
            if stages:
                for stage, blob, distance in stages:
                    parts_by_stage.setdefault(stage, []).extend(unpack_geometry(blob))
                    if official_distance is None and distance is not None:
                        official_distance = int(distance)
            elif ref in by_route:
                blob, official_distance = by_route[ref]
                parts_by_stage[0] = unpack_geometry(blob)
            else:
                raise ValueError(f"official dataset has no route {ref}")

            ordered_parts: list[list[tuple[float, float]]] = []
            previous_end: tuple[float, float] | None = None
            for stage in sorted(parts_by_stage):
                stage_parts = order_parts(parts_by_stage[stage], previous_end)
                ordered_parts.extend(stage_parts)
                if stage_parts:
                    previous_end = stage_parts[-1][-1]

            lv95_points = flatten(ordered_parts)
            points = resample([lv95_to_wgs84(e, n) for e, n in lv95_points])
            validate(points)
            result.append(
                {
                    "ref": ref,
                    "points": points,
                    "officialDistanceKm": official_distance,
                    "source": "SchweizMobil Open Data · wander.gpkg",
                    "sourceUrl": SOURCE_URL,
                }
            )
        return result
    finally:
        db.close()


if __name__ == "__main__":
    payload = extract_difficulty() if len(sys.argv) > 1 and sys.argv[1] == "--difficulty" else extract()
    json.dump(payload, sys.stdout, separators=(",", ":"), ensure_ascii=False)