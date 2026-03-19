#!/usr/bin/env python3
"""
Load Indian administrative boundaries into Civitro PostGIS database.

Data sources (public domain / open data):
- States: geoBoundaries (William & Mary geoLab) — Simplified India ADM1
- Districts: geoBoundaries ADM2
- Parliamentary constituencies: datameet community

Usage:
  pip install psycopg2-binary requests
  python load-boundaries.py --host localhost --port 15432  # local
  python load-boundaries.py --host postgres --port 5432    # inside Docker

On EC2:
  docker exec -it civitro-postgres apt-get update && apt-get install -y python3 python3-pip
  OR run from host with: python3 load-boundaries.py --host localhost --port 15432
"""

import argparse
import json
import sys
import uuid
from urllib.request import urlopen, Request
from urllib.error import URLError

# Try psycopg2, fall back to raw SQL via subprocess
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# ─── Data Sources ───────────────────────────────────────────────

# geoBoundaries — open license, simplified geometries
SOURCES = {
    "states": {
        "url": "https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States",
        "level": "state",
        "track": "administrative",
        "name_field": "NAME_1",
        "fallback_url": "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson",
        "fallback_name": "NAME_1",
    },
}

# India state GeoJSON — most reliable single-file source
INDIA_STATES_URL = "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
INDIA_DISTRICTS_URL = "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson"
INDIA_PC_URL = "https://raw.githubusercontent.com/datameet/maps/master/parliamentary-constituencies/india_pc_2019.geojson"

def fetch_geojson(url):
    """Download and parse a GeoJSON file."""
    print(f"  Downloading: {url[:80]}...")
    req = Request(url, headers={"User-Agent": "Civitro-BoundaryLoader/1.0"})
    try:
        with urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        print(f"  Got {len(data.get('features', []))} features")
        return data
    except (URLError, json.JSONDecodeError) as e:
        print(f"  FAILED: {e}")
        return None


def get_connection(host, port, dbname, user, password):
    """Get a psycopg2 connection."""
    if not HAS_PSYCOPG2:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)
    return psycopg2.connect(
        host=host, port=port, dbname=dbname, user=user, password=password
    )


def insert_boundary(cur, name, level, track, parent_id, geojson_geometry, code=None, population=None, urban_rural=None):
    """Insert a single boundary and return its UUID."""
    bid = str(uuid.uuid4())

    # Convert GeoJSON geometry to PostGIS
    geom_json = json.dumps(geojson_geometry)

    cur.execute("""
        INSERT INTO boundaries (id, name, level, track, parent_id, polygon, code, population, urban_rural, created_at)
        VALUES (%s, %s, %s, %s, %s,
                ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)),
                %s, %s, %s, NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
    """, (bid, name, level, track, parent_id, geom_json, code, population, urban_rural))

    result = cur.fetchone()
    return result[0] if result else None


def load_india_nation(cur):
    """Create the India nation boundary (simple bounding box)."""
    print("\n=== Loading Nation: India ===")

    # Check if already exists
    cur.execute("SELECT id FROM boundaries WHERE level = 'nation' AND name = 'India'")
    row = cur.fetchone()
    if row:
        print("  Already exists, skipping.")
        return row[0]

    # Simple bounding box for India
    india_bbox = {
        "type": "Polygon",
        "coordinates": [[[68.0, 6.0], [97.5, 6.0], [97.5, 37.0], [68.0, 37.0], [68.0, 6.0]]]
    }

    nation_id = insert_boundary(cur, "India", "nation", "administrative", None, india_bbox, code="IN")
    print(f"  Created India nation boundary: {nation_id}")
    return nation_id


def load_states(cur, nation_id):
    """Load Indian state boundaries."""
    print("\n=== Loading States ===")

    # Check if states already loaded
    cur.execute("SELECT COUNT(*) FROM boundaries WHERE level = 'state'")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  {count} states already loaded, skipping.")
        return

    data = fetch_geojson(INDIA_STATES_URL)
    if not data:
        print("  Failed to download states. Trying fallback...")
        return

    # State code mapping
    state_codes = {
        "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
        "Bihar": "BR", "Chhattisgarh": "CG", "Goa": "GA", "Gujarat": "GJ",
        "Haryana": "HR", "Himachal Pradesh": "HP", "Jharkhand": "JH",
        "Karnataka": "KA", "Kerala": "KL", "Madhya Pradesh": "MP",
        "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML",
        "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OD", "Punjab": "PB",
        "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
        "Telangana": "TG", "Tripura": "TR", "Uttar Pradesh": "UP",
        "Uttarakhand": "UK", "West Bengal": "WB",
        "Andaman and Nicobar Islands": "AN", "Chandigarh": "CH",
        "Dadra and Nagar Haveli and Daman and Diu": "DD",
        "Delhi": "DL", "Jammu and Kashmir": "JK", "Ladakh": "LA",
        "Lakshadweep": "LD", "Puducherry": "PY",
        # Alternate names
        "NCT of Delhi": "DL", "Jammu & Kashmir": "JK",
        "Dadra & Nagar Haveli": "DD", "Daman & Diu": "DD",
        "Andaman & Nicobar": "AN",
    }

    loaded = 0
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry")
        if not geom:
            continue

        # Try different name fields
        name = props.get("NAME_1") or props.get("name") or props.get("ST_NM") or props.get("state")
        if not name:
            continue

        code = state_codes.get(name, "")
        urban_rural = "mixed"

        bid = insert_boundary(cur, name, "state", "administrative", nation_id, geom, code=code, urban_rural=urban_rural)
        if bid:
            loaded += 1
            print(f"  [{loaded}] {name} ({code})")

    print(f"  Loaded {loaded} states")


def load_districts(cur):
    """Load Indian district boundaries."""
    print("\n=== Loading Districts ===")

    cur.execute("SELECT COUNT(*) FROM boundaries WHERE level = 'district'")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  {count} districts already loaded, skipping.")
        return

    data = fetch_geojson(INDIA_DISTRICTS_URL)
    if not data:
        print("  Failed to download districts.")
        return

    # Build state lookup
    cur.execute("SELECT id, name FROM boundaries WHERE level = 'state'")
    state_map = {}
    for row in cur.fetchall():
        state_map[row[1].lower()] = row[0]

    loaded = 0
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry")
        if not geom:
            continue

        name = props.get("DISTRICT") or props.get("dtname") or props.get("NAME_2")
        state_name = props.get("ST_NM") or props.get("NAME_1") or props.get("state")
        if not name or not state_name:
            continue

        parent_id = state_map.get(state_name.lower())

        bid = insert_boundary(cur, name, "district", "administrative", parent_id, geom, urban_rural="mixed")
        if bid:
            loaded += 1
            if loaded % 50 == 0:
                print(f"  [{loaded}] {name}, {state_name}")

    print(f"  Loaded {loaded} districts")


def load_parliamentary(cur):
    """Load parliamentary constituency boundaries."""
    print("\n=== Loading Parliamentary Constituencies ===")

    cur.execute("SELECT COUNT(*) FROM boundaries WHERE level = 'parliamentary'")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  {count} PCs already loaded, skipping.")
        return

    data = fetch_geojson(INDIA_PC_URL)
    if not data:
        print("  Failed to download parliamentary constituencies.")
        return

    # Build state lookup
    cur.execute("SELECT id, name FROM boundaries WHERE level = 'state'")
    state_map = {}
    for row in cur.fetchall():
        state_map[row[1].lower()] = row[0]

    loaded = 0
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry")
        if not geom:
            continue

        name = props.get("PC_NAME") or props.get("pc_name") or props.get("NAME")
        state_name = props.get("ST_NAME") or props.get("state") or props.get("STATE")
        pc_no = props.get("PC_NO") or props.get("pc_no")
        if not name:
            continue

        parent_id = state_map.get(state_name.lower()) if state_name else None
        code = str(pc_no) if pc_no else None

        bid = insert_boundary(cur, name, "parliamentary", "electoral", parent_id, geom, code=code)
        if bid:
            loaded += 1
            if loaded % 50 == 0:
                print(f"  [{loaded}] {name}, {state_name}")

    print(f"  Loaded {loaded} parliamentary constituencies")


def print_summary(cur):
    """Print boundary count summary."""
    print("\n=== Boundary Summary ===")
    cur.execute("""
        SELECT level, track, COUNT(*)
        FROM boundaries
        GROUP BY level, track
        ORDER BY
            CASE level
                WHEN 'nation' THEN 1 WHEN 'state' THEN 2
                WHEN 'district' THEN 3 WHEN 'parliamentary' THEN 4
            END
    """)
    for row in cur.fetchall():
        print(f"  {row[0]:25s} ({row[1] or 'unset':15s}) → {row[2]:,} boundaries")

    cur.execute("SELECT COUNT(*) FROM boundaries")
    total = cur.fetchone()[0]
    print(f"\n  TOTAL: {total:,} boundaries")


def main():
    parser = argparse.ArgumentParser(description="Load Indian boundary data into Civitro PostGIS")
    parser.add_argument("--host", default="localhost", help="PostgreSQL host")
    parser.add_argument("--port", type=int, default=15432, help="PostgreSQL port")
    parser.add_argument("--dbname", default="civitro", help="Database name")
    parser.add_argument("--user", default="civitro", help="Database user")
    parser.add_argument("--password", default="civitro_dev", help="Database password")
    args = parser.parse_args()

    print(f"Connecting to PostgreSQL at {args.host}:{args.port}/{args.dbname}...")
    conn = get_connection(args.host, args.port, args.dbname, args.user, args.password)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        nation_id = load_india_nation(cur)
        conn.commit()

        load_states(cur, nation_id)
        conn.commit()

        load_districts(cur)
        conn.commit()

        load_parliamentary(cur)
        conn.commit()

        print_summary(cur)

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

    print("\n=== Done! ===")


if __name__ == "__main__":
    main()
