"""Build src/data/crm-seed.json for the partner CRM at /crm.

Reads the research in ~/Documents/RanchCuts/call-list:
  data/rancher_prospects.json      ranches that finish their own cattle (07_rancher_prospects.py)
  RanchCuts_Tier1_CallList.csv     the Tier 1 butcher call list
  data/processors_universe.csv     butcher coordinates
  data/ranchers/tier1_briefs_*.json  call-prep briefs for Tier 1 ranchers (owners, background, openers)
and writes research fields only. CRM fields (stage, notes, calls) start blank and live in the
CRM store; re-running this never touches them: the CRM adds records it doesn't have yet and
refreshes research fields on the ones it does.

Run: python3 scripts/build-crm-seed.py
"""
import csv, glob, json, os, re
from datetime import date

RC = os.path.expanduser("~/Documents/RanchCuts/call-list")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/data/crm-seed.json")

# metro short names shared by ranchers and butchers (the 16 planned + Denver + Colorado Springs)
METRO_SHORT = {
    "Denver-Aurora-Centennial, CO": "Denver", "Colorado Springs, CO": "Colorado Springs", "Omaha, NE-IA": "Omaha",
    "Lincoln, NE": "Lincoln", "Kansas City, MO-KS": "Kansas City", "Wichita, KS": "Wichita",
    "Des Moines-West Des Moines, IA": "Des Moines", "St. Louis, MO-IL": "St. Louis", "Springfield, MO": "Springfield",
    "Oklahoma City, OK": "Oklahoma City", "Tulsa, OK": "Tulsa", "Dallas-Fort Worth-Arlington, TX": "Dallas-Fort Worth",
    "Houston-Pasadena-The Woodlands, TX": "Houston", "Austin-Round Rock-San Marcos, TX": "Austin",
    "San Antonio-New Braunfels, TX": "San Antonio", "Minneapolis-St. Paul-Bloomington, MN-WI": "Minneapolis-St. Paul",
    "Milwaukee-Waukesha, WI": "Milwaukee", "Madison, WI": "Madison",
}
STOP = {"llc", "inc", "co", "company", "the", "meats", "meat", "processing", "locker", "lockers", "custom", "market", "and", "ltd"}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def num(v):
    try:
        return float(v) if v not in ("", None) else None
    except ValueError:
        return None


def tokens(s):
    return {t for t in re.findall(r"[a-z0-9']+", (s or "").lower().replace("'", "")) if t not in STOP and len(t) > 2}


def title(s):
    return s.title() if s.isupper() else s


def main():
    uni = {r["record_id"]: r for r in csv.DictReader(open(os.path.join(RC, "data/processors_universe.csv")))}
    butchers = []
    for r in csv.DictReader(open(os.path.join(RC, "RanchCuts_Tier1_CallList.csv"))):
        u = uni.get(r["record_id"], {})
        prio = r["call_priority"]
        butchers.append({
            "id": r["record_id"],
            "name": title(r["name"]), "dba": r["dba"], "city": title(r["city"]), "state": r["state"],
            "zip": r["zip"].split(".")[0], "lat": num(u.get("lat")), "lon": num(u.get("lon")),
            "metro": METRO_SHORT.get(r["target_metro"], r["target_metro"]),
            "inLaunchMetro": r["target_metro"] in METRO_SHORT,
            "roadMiToMetro": round(float(r["dist_to_metro_mi"]) * 1.2) if r["dist_to_metro_mi"] else None,
            "phone": r["phone"], "website": r["website"], "inspection": r["inspection_type"], "size": r["size_class"],
            "fitScore": int(float(r["fit_score"] or 0)), "listPriority": prio,
            "disqualified": prio.startswith("Skip") or bool(r["disqualifier"]),
            "disqualifier": r["disqualifier"],
            "doesCustomBeef": r["does_custom_beef"], "takesOutsideCattle": r["takes_outside_cattle"],
            "postedKill": num(r["kill_fee"]), "postedPerLb": num(r["per_lb_hanging"]), "postedSplit": num(r["quarter_split_fee"]),
            "researchNotes": r["notes"], "priceSourceUrl": r["price_source_url"],
            "capableWithin60": int(float(r["capable_within_60mi"] or 0)),
        })
    by_id = {b["id"]: b for b in butchers}

    ranchers, pairs = [], []
    for x in json.load(open(os.path.join(RC, "data/rancher_prospects.json"))):
        rid = "R-" + slug(re.sub(r"\(.*?\)", "", x["ranch_name"]))[:28] + "-" + x["state"].lower()
        rec = {
            "id": rid, "name": x["ranch_name"], "town": x["town"], "state": x["state"], "zip": x["zip"],
            "lat": x["lat"] or None, "lon": x["lon"] or None, "metro": x["target_metro"],
            "website": x["website"], "phone": x["phone"], "email": x["email"], "contactName": x["contact_name"],
            "finishType": x["finish_type"] or "Unknown", "finishConfidence": x["finish_confidence"],
            "finishEvidence": x["finish_evidence"], "evidenceUrl": x["evidence_url"],
            "raisedFromBirth": x["raised_from_birth"], "sellsShares": x["sells_shares"], "postedPrice": x["posted_price"],
            "currentProcessor": x["current_processor"], "usesPartnerButcher": x["uses_partner_butcher"] == "Yes",
            "ownsButcher": x.get("owns_butcher") == "Yes",
            "nearestButcherId": x["nearest_butcher_id"], "roadMiToButcher": x["road_mi_to_butcher"] or None,
            "roadMiToMetro": x["road_mi_to_metro"] or None, "herd": x["herd_or_volume_hint"], "breed": x["breed"],
            "researchNotes": x["notes"], "fitScore": x["fit_score"], "fitTier": x["tier"],
        }
        # match the butcher they already use to a Tier 1 record (same state, best name overlap)
        rec["currentButcherId"] = ""
        if rec["usesPartnerButcher"] or rec["ownsButcher"]:
            want = tokens(x["current_processor"]) or tokens(x["ranch_name"])
            best, score = None, 0
            for b in butchers:
                if b["state"] != rec["state"]:
                    continue
                s = len(want & (tokens(b["name"]) | tokens(b["dba"]))) + (0.5 if b["city"].lower() in (x["current_processor"] or "").lower() else 0)
                if s > score:
                    best, score = b, s
            if best and score >= 1:
                rec["currentButcherId"] = best["id"]
        ranchers.append(rec)
        if rec["currentButcherId"]:
            pairs.append({"id": f"P-{rid[2:]}", "rancherId": rid, "butcherId": rec["currentButcherId"],
                          "metro": rec["metro"], "origin": "Ranch already uses this butcher"})

    # the live partnership
    ranchers.insert(0, {
        "id": "R-thunderbolt-co", "name": "Thunderbolt Ranch", "town": "Weldona area", "state": "CO", "zip": "80653",
        "lat": 40.62, "lon": -103.7, "metro": "Denver", "website": "", "phone": "402-245-8195",
        "email": "thunderboltbeef@gmail.com", "contactName": "Josh", "finishType": "Grain", "finishConfidence": "Confirmed",
        "finishEvidence": "Pasture raised, grain finished on its own Colorado pens; owned from conception to harvest.",
        "evidenceUrl": "", "raisedFromBirth": "Yes", "sellsShares": "Quarter/Half/Whole", "postedPrice": "",
        "currentProcessor": "Colorado Custom Meat Co (Kersey)", "usesPartnerButcher": True, "ownsButcher": False,
        "nearestButcherId": "RC00226", "currentButcherId": "RC00226", "roadMiToButcher": None, "roadMiToMetro": None,
        "herd": "7 steers a season on Ranch Cuts", "breed": "Angus", "researchNotes": "Partnership #1, co-founder's ranch.",
        "fitScore": 100, "fitTier": "A", "livePartner": True,
    })
    pairs.insert(0, {"id": "P-denver", "rancherId": "R-thunderbolt-co", "butcherId": "RC00226", "metro": "Denver",
                     "origin": "Partnership #1", "livePartner": True})
    by_id["RC00226"]["livePartner"] = True

    # call-prep briefs (keyed by rancher id)
    briefs = {}
    for f in sorted(glob.glob(os.path.join(RC, "data/ranchers/tier1_briefs_*.json"))):
        researched = date.fromtimestamp(os.path.getmtime(f)).isoformat()
        for b in json.load(open(f)):
            briefs[b["id"]] = {k: b.get(k, [] if k in ("openers", "cautions", "sources") else "")
                               for k in ("owners", "background", "sells_today", "reputation", "connections", "openers", "cautions", "sources")}
            briefs[b["id"]]["researched"] = researched
    for r in ranchers:
        if r["id"] in briefs:
            r["brief"] = briefs[r["id"]]
    unknown = set(briefs) - {r["id"] for r in ranchers}
    if unknown:
        print("  briefs with unknown ids:", ", ".join(sorted(unknown)))

    ids = [r["id"] for r in ranchers]
    assert len(ids) == len(set(ids)), "duplicate rancher ids"
    seed = {"version": date.today().isoformat(), "ranchers": ranchers, "butchers": butchers, "pairs": pairs}
    json.dump(seed, open(OUT, "w"), separators=(",", ":"))
    print(f"{len(ranchers)} ranchers ({len(briefs)} with call prep), {len(butchers)} butchers, {len(pairs)} pairs -> {OUT} ({os.path.getsize(OUT)//1024} KB)")
    for p in pairs:
        r = next(x for x in ranchers if x["id"] == p["rancherId"])
        print(f"  {r['name'][:38]:38} | {r['currentProcessor'][:34]:34} -> {by_id[p['butcherId']]['name']}")
    miss = [r["name"] for r in ranchers if (r["usesPartnerButcher"] or r["ownsButcher"]) and not r["currentButcherId"]]
    if miss:
        print("  no butcher match:", "; ".join(miss))


if __name__ == "__main__":
    main()
