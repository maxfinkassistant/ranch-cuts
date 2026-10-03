"""Build public/zip/<3-digit prefix>.json from GeoNames US postal codes.

Source: https://download.geonames.org/export/zip/US.zip (CC BY 4.0, GeoNames).
Each file maps zip -> [lat, lon, place, state]. The zip search page fetches
only the prefix file it needs (a few KB), never the whole country.
"""
import csv, json, os, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "data-src" / "US.txt"
out = root / "public" / "zip"
out.mkdir(parents=True, exist_ok=True)
for f in out.glob("*.json"):
    f.unlink()

by_prefix: dict[str, dict] = {}
with open(src, encoding="utf-8") as fh:
    for row in csv.reader(fh, delimiter="\t"):
        zip_, place, state, lat, lon = row[1], row[2], row[4], row[9], row[10]
        if not (zip_.isdigit() and len(zip_) == 5 and lat and lon and state):
            continue
        by_prefix.setdefault(zip_[:3], {})[zip_] = [round(float(lat), 3), round(float(lon), 3), place, state]

for prefix, zips in by_prefix.items():
    (out / f"{prefix}.json").write_text(json.dumps(zips, separators=(",", ":")))
print(f"{sum(len(z) for z in by_prefix.values())} zips in {len(by_prefix)} files")
