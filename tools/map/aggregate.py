#!/usr/bin/env python3
"""Aggregate a Supabase claims export into public, privacy-safe figures.

Usage (from the repo root):
    python3 tools/map/aggregate.py /path/to/claims_rows.csv
    node tools/map/render.mjs
    python3 tools/build.py

The claims CSV contains private data (user ids, exact coordinates, photo
paths). Never copy it into this repository. This script reads it from
wherever it is stored and writes only aggregates:

- data/map-activity.json   counts by state and county, with small areas
                           reduced to ranges (see PRIVACY RULES below)
- data/stats.json          headline figures, snapshot date, 2,000 milestone

COUNTING RULES
- Only claims with status "approved" count. Pending and rejected are ignored.
- Only claims submitted on or after the public launch (LAUNCH_DATE, Eastern
  time) count. Earlier claims were pre-launch testing.
- Verified kills = sum of `quantity` on approved claims with target_type
  "adult". Egg masses are counted separately and not added to kills.
- Geolocated approved claims = approved claims (adult or egg mass) that have
  latitude and longitude.
- Each claim id is counted once; duplicate ids are dropped.

PRIVACY RULES
- Locations are assigned to a state and county (US Census boundaries from
  the us-atlas package) and then discarded. No coordinates leave this script.
- An area's exact kill count is published only if at least MIN_CONTRIBUTORS
  different accounts contributed AND it has at least MIN_EXACT kills.
  Otherwise the area is shown only as a range ("1-9", "10-49").
"""
import csv
import json
import sys
import pathlib
import subprocess
import datetime
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parents[2]
ET = ZoneInfo("America/New_York")
LAUNCH_DATE = datetime.date(2026, 9, 29)
MILESTONE = 2000
MIN_CONTRIBUTORS = 3
MIN_EXACT = 10


def tier(kills: int) -> str:
    if kills >= 1000:
        return "1000+"
    if kills >= 50:
        return "50-999"
    if kills >= 10:
        return "10-49"
    return "1-9"


def range_label(kills: int) -> str:
    return "Fewer than 10" if kills < 10 else "10 to 49" if kills < 50 else "50 to 999" if kills < 1000 else "1,000+"


def round_down(n: int, step: int) -> str:
    return f"{(n // step) * step:,}+"


def main(csv_path: str):
    launch = datetime.datetime.combine(LAUNCH_DATE, datetime.time(0), ET)
    seen, rows = set(), []
    latest_submit = None
    with open(csv_path, newline="") as fh:
        for r in csv.DictReader(fh):
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            sub = datetime.datetime.fromisoformat(r["submitted_at"].replace("Z", "+00:00")).astimezone(ET)
            latest_submit = max(latest_submit or sub, sub)
            if r["status"] != "approved" or sub < launch:
                continue
            rows.append({
                "user": r["user_id"], "type": r["target_type"], "q": int(r["quantity"]),
                "lat": float(r["latitude"]) if r["latitude"] else None,
                "lon": float(r["longitude"]) if r["longitude"] else None,
                "sub": sub,
            })

    # Headline figures
    adults = sorted((r for r in rows if r["type"] == "adult"), key=lambda r: r["sub"])
    kills = sum(r["q"] for r in adults)
    geo_claims = sum(1 for r in rows if r["lat"] is not None)
    cum, milestone_date = 0, None
    for r in adults:
        cum += r["q"]
        if cum >= MILESTONE:
            milestone_date = r["sub"].date()
            break

    # Assign states/counties with the Node helper (points never written to the repo)
    pts = [[r["lon"], r["lat"]] for r in rows if r["lat"] is not None]
    res = subprocess.run(["node", str(ROOT / "tools/map/locate.mjs")], input=json.dumps(pts),
                         capture_output=True, text=True, check=True, cwd=ROOT / "tools/map")
    places = iter(json.loads(res.stdout))

    states, counties = {}, {}
    for r in rows:
        if r["lat"] is None:
            continue
        st_id, st_name, co_id, co_name = next(places)
        if not st_id:
            continue
        for bucket, key, name, parent in ((states, st_id, st_name, None), (counties, co_id, co_name, st_name)):
            if not key:
                continue
            a = bucket.setdefault(key, {"id": key, "name": name, "state": parent, "kills": 0, "claims": 0, "users": set()})
            a["claims"] += 1
            a["users"].add(r["user"])
            if r["type"] == "adult":
                a["kills"] += r["q"]

    def public(a):
        exact = len(a["users"]) >= MIN_CONTRIBUTORS and a["kills"] >= MIN_EXACT
        out = {"id": a["id"], "name": a["name"], "tier": tier(a["kills"]),
               "label": f'{a["kills"]:,} verified kills' if exact else f'{range_label(a["kills"])} verified kills'}
        if a["state"]:
            out["state"] = a["state"]
        if exact:
            out["kills"] = a["kills"]
        return out

    as_of = latest_submit.date()
    activity = {
        "_about": "Aggregated, privacy-safe activity for the public map. Generated by tools/map/aggregate.py. Approved, post-launch claims only. No coordinates or account data.",
        "as_of": as_of.isoformat(),
        "launch_date": LAUNCH_DATE.isoformat(),
        "rules": {"min_contributors_for_exact": MIN_CONTRIBUTORS, "min_kills_for_exact": MIN_EXACT},
        "states": sorted((public(a) for a in states.values()), key=lambda x: -states[x["id"]]["kills"]),
        "counties": sorted((public(a) for a in counties.values()), key=lambda x: -counties[x["id"]]["kills"]),
    }
    (ROOT / "data/map-activity.json").write_text(json.dumps(activity, indent=2) + "\n")

    stats_path = ROOT / "data/stats.json"
    stats = json.loads(stats_path.read_text())
    stats["as_of"] = as_of.isoformat()
    stats["launch_date"] = LAUNCH_DATE.isoformat()
    stats["figures"] = [
        {"value": round_down(kills, 1000) if kills >= 1000 else f"{kills:,}", "label": "Verified spotted lanternfly kills"},
        {"value": round_down(geo_claims, 100), "label": "Geolocated, approved submissions"},
        {"value": str(len(states)), "label": "States reached"},
    ]
    stats["milestone"] = {"kills": MILESTONE, "date": milestone_date.isoformat() if milestone_date else None}
    stats["exact"] = {
        "verified_kills": kills, "approved_geolocated_claims": geo_claims, "states": len(states),
        "_note": "Exact figures behind the rounded values for the as_of date. Not displayed. Generated by tools/map/aggregate.py.",
    }
    stats_path.write_text(json.dumps(stats, indent=2) + "\n")
    print(json.dumps({"as_of": stats["as_of"], "exact": stats["exact"], "milestone": stats["milestone"]}, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
