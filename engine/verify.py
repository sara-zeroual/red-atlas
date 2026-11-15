#!/usr/bin/env python3
"""
RED ATLAS — Independent verification script
============================================
Every headline number published by RED ATLAS is recomputed HERE, live,
from the NASA POWER API — nothing is hard-coded except the published
values we are checking against.

Run:   python engine/verify.py        (Python 3.8+, stdlib only)
Exit code 0 = all checks passed.

NASA POWER endpoint (no key, no account):
https://power.larc.nasa.gov/api/temporal/climatology/point
parameters: T2M_MAX, T2M_MIN  (monthly climatology, °C)
"""

import json
import statistics
import sys
import urllib.request

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
TOLERANCE = 0.3  # °C — climatology can shift slightly as NASA extends the record

# name, lat, lon, published mean diurnal swing (°C), published July T2M_MAX (°C or None)
CHECKS = [
    ("Erg Chebbi, Morocco",      31.16,  -3.99, 31.0, 44.8),
    ("M'hamid, Morocco",         29.83,  -5.72, 31.1, 46.9),
    ("Tafilalet (Erfoud)",       31.44,  -4.23, 30.8, 44.1),
    ("Atacama, Chile (control)", -23.5, -68.2,  31.1, None),
    ("Death Valley (control)",    36.5, -116.9, 34.0, 46.2),
]


def power_climatology(lat, lon):
    url = (
        "https://power.larc.nasa.gov/api/temporal/climatology/point"
        f"?parameters=T2M_MAX,T2M_MIN&community=RE"
        f"&longitude={lon}&latitude={lat}&format=JSON"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "red-atlas-verify/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["properties"]["parameter"]


def main():
    print("RED ATLAS verification — recomputing from NASA POWER (live)\n")
    failures = 0
    for name, lat, lon, pub_swing, pub_jul in CHECKS:
        p = power_climatology(lat, lon)
        swing = statistics.mean(p["T2M_MAX"][m] - p["T2M_MIN"][m] for m in MONTHS)
        jul = p["T2M_MAX"]["JUL"]

        ok_swing = abs(swing - pub_swing) <= TOLERANCE
        status = "PASS" if ok_swing else "FAIL"
        failures += 0 if ok_swing else 1
        print(f"[{status}] {name}: mean diurnal swing = {swing:.1f} °C "
              f"(published {pub_swing} °C)")

        if pub_jul is not None:
            ok_jul = abs(jul - pub_jul) <= TOLERANCE
            status = "PASS" if ok_jul else "FAIL"
            failures += 0 if ok_jul else 1
            print(f"[{status}] {name}: July average daily max = {jul:.1f} °C "
                  f"(published {pub_jul} °C)")

    print()
    # The two headline comparisons
    print("Headline claims reproduced above:")
    print("  1. Erg Chebbi swing ≈ Atacama swing  (same Mars-class thermal stress)")
    print("  2. M'hamid July max > Death Valley July max  (hottest beats hottest)")
    if failures:
        print(f"\n{failures} check(s) FAILED — climatology drift beyond ±{TOLERANCE} °C.")
        sys.exit(1)
    print(f"\nAll checks passed within ±{TOLERANCE} °C. The numbers are NASA's, not ours.")
    sys.exit(0)


if __name__ == "__main__":
    main()
