# -*- coding: utf-8 -*-
"""
Red Atlas — Mars analogue zone scanner for Morocco.
Data source: NASA POWER API (climatology endpoint, no API key required).
Stdlib + numpy only.
"""

import json
import math
import time
import urllib.request
import urllib.error

import numpy as np

# ---------------------------------------------------------------- polygon ---
# Coarse Morocco land polygon (lon, lat), internationally recognized borders,
# capped at 27.7 deg N (no Western Sahara).
POLY = [
    (-5.36, 35.93), (-2.30, 35.10), (-1.15, 34.66), (-1.45, 34.35),
    (-1.79, 32.09), (-2.22, 31.55), (-3.65, 30.46), (-4.85, 29.85),
    (-6.50, 29.10), (-8.00, 28.40), (-8.68, 27.66), (-9.30, 28.30),
    (-9.74, 29.37), (-9.85, 30.43), (-9.63, 31.43), (-9.30, 32.57),
    (-8.80, 33.25), (-7.60, 33.70), (-6.85, 34.05), (-6.30, 34.60),
    (-5.90, 35.10), (-5.36, 35.93),
]


def points_in_polygon(lats, lons, poly):
    """Ray-casting point-in-polygon, vectorized with numpy.
    Returns boolean mask."""
    p = np.asarray(poly)                      # (N,2) lon,lat
    xs = p[:-1, 0]; ys = p[:-1, 1]
    xe = p[1:, 0];  ye = p[1:, 1]             # edge ends (last == first)
    lat = np.asarray(lats, dtype=float)
    lon = np.asarray(lons, dtype=float)
    inside = np.zeros(lat.shape, dtype=bool)
    for i in range(len(xs)):
        y1, y2 = ys[i], ye[i]
        x1, x2 = xs[i], xe[i]
        # does edge straddle the horizontal ray at this lat?
        cond = ((y1 > lat) != (y2 > lat))
        # intersection lon of the edge with the ray
        xint = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
        inside ^= cond & (lon < xint)
    return inside


# ------------------------------------------------------------------ grid ---
LAT_MIN, LAT_MAX, LAT_STEP = 27.8, 35.8, 0.5
LON_MIN, LON_MAX, LON_STEP = -12.5, -1.0, 0.5

grid = []
lat = LAT_MIN
while lat <= LAT_MAX + 1e-9:
    lon = LON_MIN
    while lon <= LON_MAX + 1e-9:
        grid.append((round(lat, 2), round(lon, 2)))
        lon += LON_STEP
    lat += LAT_STEP

lats = np.array([g[0] for g in grid])
lons = np.array([g[1] for g in grid])
mask = points_in_polygon(lats, lons, POLY)
grid = [g for g, m in zip(grid, mask) if m]
print("Grid points inside Morocco polygon: %d" % len(grid))

# ------------------------------------------------------------- NASA POWER ---
BASE = ("https://power.larc.nasa.gov/api/temporal/climatology/point"
        "?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,ALLSKY_SFC_SW_DWN"
        "&community=AG&longitude={lon}&latitude={lat}&format=JSON")

DELAY = 0.35
RETRY_DELAY = 2.0
TIMEOUT = 20

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def fetch_point(lat, lon):
    url = BASE.format(lon=lon, lat=lat)
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "red-atlas/1.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                data = json.loads(r.read().decode("utf-8"))
            return data["properties"]["parameter"]
        except Exception as e:
            if attempt == 0:
                print("  retry %s,%s after error: %s" % (lat, lon, e))
                time.sleep(RETRY_DELAY)
            else:
                print("  FAILED %s,%s: %s" % (lat, lon, e))
                return None
    return None


points = []
failures = 0
t0 = time.time()
for i, (lat, lon) in enumerate(grid):
    par = fetch_point(lat, lon)
    if par is None:
        failures += 1
        time.sleep(DELAY)
        continue
    try:
        tmax = par["T2M_MAX"]; tmin = par["T2M_MIN"]
        swing = float(np.mean([tmax[m] - tmin[m] for m in MONTHS]))
        precip = float(par["PRECTOTCORR"]["ANN"])
        wind = float(par["WS10M"]["ANN"])
        solar = float(par["ALLSKY_SFC_SW_DWN"]["ANN"])
    except (KeyError, TypeError) as e:
        print("  BAD DATA %s,%s: %s" % (lat, lon, e))
        failures += 1
        time.sleep(DELAY)
        continue

    thermal = min(swing / 60.0, 1.0)
    aridity = max(1.0 - precip / 2.0, 0.0)
    aeolian = min(wind / 6.0, 1.0)
    solarn = min(solar / 22.0, 1.0)
    mli = round(100.0 * np.mean([thermal, aridity, aeolian, solarn]), 1)

    points.append({
        "lat": lat, "lon": lon,
        "swing": round(swing, 1), "precip": round(precip, 2),
        "wind": round(wind, 1), "solar": round(solar, 2),
        "mli": mli,
        "_v": [thermal, aridity, aeolian, solarn],
    })

    time.sleep(DELAY)
    n = i + 1
    if n % 20 == 0:
        el = time.time() - t0
        print("progress: %d/%d  (ok=%d, failed=%d, %.0fs)" %
              (n, len(grid), len(points), failures, el))

print("Fetch done: %d ok, %d failed, %.0fs" %
      (len(points), failures, time.time() - t0))

if not points:
    raise SystemExit("No data fetched — refusing to write engine.json")

# ----------------------------------------------------------------- k-means ---
X = np.array([p["_v"] for p in points], dtype=float)
K = 3
rng = np.random.default_rng(42)
# deterministic init: pick K distinct points via rng
init_idx = rng.choice(len(X), size=K, replace=False)
cent = X[init_idx].copy()
labels = np.zeros(len(X), dtype=int)
for it in range(50):
    d = ((X[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
    new_labels = d.argmin(axis=1)
    new_cent = cent.copy()
    for k in range(K):
        members = X[new_labels == k]
        if len(members) > 0:
            new_cent[k] = members.mean(axis=0)
    if np.array_equal(new_labels, labels) and it > 0:
        labels = new_labels
        cent = new_cent
        break
    labels = new_labels
    cent = new_cent
print("k-means iterations: %d" % (it + 1))

# Label clusters by mean MLI: highest = "A", then "B", then "C"
mli_arr = np.array([p["mli"] for p in points])
cluster_mean = {k: float(mli_arr[labels == k].mean()) for k in range(K)}
order = sorted(cluster_mean, key=lambda k: -cluster_mean[k])
name_map = {order[0]: "A", order[1]: "B", order[2]: "C"}

for i, p in enumerate(points):
    p["cluster"] = name_map[labels[i]]

clusters = {}
for name in ["A", "B", "C"]:
    sel = [p for p, lb in zip(points, labels) if name_map[lb] == name]
    clusters[name] = {
        "count": len(sel),
        "meanMli": round(float(np.mean([p["mli"] for p in sel])), 1),
    }

# ------------------------------------------------------------- known sites ---
SITES = [
    ("Erg Chebbi", 31.16, -3.99),
    ("Tafilalet", 31.44, -4.23),
    ("Agoudal", 31.59, -5.41),
    ("Anti-Atlas", 29.72, -8.97),
    ("M'hamid", 29.83, -5.72),
]


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def dist_nearest(lat, lon):
    return min(haversine(lat, lon, s[1], s[2]) for s in SITES)


for p in points:
    p["_dist"] = dist_nearest(p["lat"], p["lon"])

top10 = sorted(points, key=lambda p: -p["mli"])[:10]


def export_point(p):
    out = {k: p[k] for k in ("lat", "lon", "swing", "precip", "wind", "solar", "mli", "cluster")}
    return out


def export_top(p):
    out = export_point(p)
    out["distNearestSiteKm"] = round(p["_dist"], 1)
    return out


top_export = [export_top(p) for p in top10]
discoveries = [export_top(p) for p in top10 if p["_dist"] > 80.0][:5]

for p in points:
    del p["_v"], p["_dist"]

engine = {
    "generated": "2026-11-14",
    "source": "NASA POWER API climatology",
    "formula": ("MLI = mean(min(swing/60,1), max(1-precip/2,0), "
                "min(wind/6,1), min(solar/22,1)) x 100"),
    "points": [export_point(p) for p in points],
    "clusters": clusters,
    "top": top_export,
    "discoveries": discoveries,
}

OUT = "engine.json"
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(engine, f, ensure_ascii=False, indent=1)

# ------------------------------------------------------------------ report ---
print("\n===== REPORT =====")
print("points scanned: %d" % len(points))
print("failures: %d" % failures)
for name in ("A", "B", "C"):
    print("cluster %s: count=%d meanMli=%.1f" %
          (name, clusters[name]["count"], clusters[name]["meanMli"]))
print("\nTOP 10:")
for p in top_export:
    print("  (%.2f, %.2f)  MLI=%.1f  cluster=%s  dist=%.1f km" %
          (p["lat"], p["lon"], p["mli"], p["cluster"], p["distNearestSiteKm"]))
print("\nDISCOVERIES (>80 km from known sites):")
for p in discoveries:
    print("  (%.2f, %.2f)  MLI=%.1f  dist=%.1f km" %
          (p["lat"], p["lon"], p["mli"], p["distNearestSiteKm"]))
print("engine.json written.")
