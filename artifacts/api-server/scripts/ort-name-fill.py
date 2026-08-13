"""
Füllt das Feld ortName für alle 'exakt'-Sagen via Nominatim-Reverse.
Überspringt Sagen die bereits einen ortName haben.
"""
import json, time, urllib.request, urllib.parse, sys, os

JSON_PATH = os.path.join(os.path.dirname(__file__), "../src/lib/curatedSagas.json")

# Adresstypen die eine Straße/Platz repräsentieren (nicht das gesuchte Objekt)
ROAD_TYPES = {"road", "residential", "pedestrian", "footway", "path",
              "cycleway", "service", "unclassified", "living_street", "square"}

def reverse(lat, lng, zoom=18):
    url = (
        f"https://nominatim.openstreetmap.org/reverse"
        f"?lat={lat}&lon={lng}&zoom={zoom}&format=json&accept-language=de"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "SagaTrail/1.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def best_name(data, saga=None):
    """Extrahiert den spezifischsten Namen aus der Nominatim-Antwort."""
    atype  = data.get("addresstype", "")
    name   = data.get("name", "").strip()
    addr   = data.get("address", {})

    # Guter Treffer: Landmark-Typ mit Name
    GOOD_TYPES = {"historic", "tourism", "natural", "water", "waterway",
                  "leisure", "man_made", "amenity", "building", "place",
                  "boundary", "landuse", "locality"}
    if atype in GOOD_TYPES and name:
        return name

    # Straßenname → bildmotiv-Fallback
    if atype in ROAD_TYPES or not name:
        if saga:
            motiv = (saga.get("bildmotiv") or "").split(",")[0].strip()
            if motiv:
                return motiv
        return ""

    return name

def save(sagas):
    tmp = JSON_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sagas, f, ensure_ascii=False, indent=2)
    os.replace(tmp, JSON_PATH)

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        sagas = json.load(f)

    targets = [s for s in sagas if s.get("koordinatenSicherheit") == "exakt"
               and not s.get("ortName") and s.get("lat") and s.get("lng")]
    print(f"{len(targets)} Sagen ohne ortName", flush=True)

    updated = 0
    for i, saga in enumerate(targets):
        try:
            data = reverse(saga["lat"], saga["lng"])
            name = best_name(data, saga)
            if name:
                saga["ortName"] = name
                save(sagas)
                updated += 1
                print(f"[{i+1}/{len(targets)}] ✓ {saga['title'][:40]} → {name}", flush=True)
            else:
                print(f"[{i+1}/{len(targets)}] – {saga['title'][:40]} (kein Name)", flush=True)
        except Exception as e:
            print(f"[{i+1}/{len(targets)}] ✗ {saga['title'][:40]}: {e}", flush=True)
        time.sleep(1.1)

    print(f"\nFertig: {updated}/{len(targets)} ortName gesetzt")

if __name__ == "__main__":
    main()
