/* ============================================================
   Ranch Cuts: local partnerships and planned metros
   A partnership = one partner ranch + one partner butcher in a
   place. The ranch is the seller of record on every share; the
   butcher processes it. Ranch Cuts takes every payment and pays
   the ranch and the butcher (decision 2026-10-05). It never takes
   title to cattle or beef (see docs in ~/Documents/RanchCuts).

   Never call a partnership a "site" anywhere a customer reads it.
   ============================================================ */

export type PartnershipStatus = "live" | "planned";

export interface Ranch {
  name: string;          // legal-ish display name
  short: string;         // "Thunderbolt"
  sellerOfRecord: string;
  region: string;        // where it is, said plainly
  /* Approximate region center. Ranch addresses are never published. */
  lat: number;
  lon: number;
  contact: { name: string; phone: string; email: string };
  logo?: string;         // public/ asset
  summary: string;       // one line, approved claims only
  story: string;
  claims: string[];      // approved claims only
}

export interface Butcher {
  name: string;
  short: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  phone: string;
  cutSheetEmail: string;
  about: string;
  /* the butcher's posted processing rates (billed to each owner) */
  rates: { kill: number; perLbHanging: number; perQuarterSplit: number };
  hang: string;          // dry-age, said plainly
}

export interface Partnership {
  slug: string;
  status: "live";
  city: string;          // RANCH CUTS <CITY>
  state: string;         // same-state rule: ranch, butcher, buyer
  stateName: string;
  center: { lat: number; lon: number }; // the metro the partnership serves
  serves: string[];      // towns named on the listing
  ranch: Ranch;
  butcher: Butcher;
  pickupOnly: boolean;
  steersPerSeason: number;
}

export interface PlannedMetro {
  slug: string;
  status: "planned";
  city: string;
  metro: string;         // census metro name
  states: string[];      // a metro across a state line gets a partnership on each side
  lat: number;
  lon: number;
  butchersNearby: number; // capable beef plants within 60 miles (Ranch Cuts call list)
}

export const PARTNERSHIPS: Partnership[] = [
  {
    slug: "denver",
    status: "live",
    city: "Denver",
    state: "CO",
    stateName: "Colorado",
    center: { lat: 39.705, lon: -104.952 },
    serves: ["Denver", "Boulder", "Fort Collins", "Greeley", "Loveland", "Longmont", "Brighton"],
    ranch: {
      name: "Thunderbolt Ranch",
      short: "Thunderbolt",
      sellerOfRecord: "Thunderbolt Ranch LLC",
      region: "Northeast Colorado",
      lat: 40.62,
      lon: -103.7,
      contact: { name: "Josh", phone: "402-245-8195", email: "thunderboltbeef@gmail.com" },
      logo: "thunderbolt-mark.png",
      summary: "Angus cattle, pasture raised and grain finished in Colorado",
      story:
        "Thunderbolt raises Angus cattle on pasture in northeast Colorado and grain-finishes them on its own Colorado pens for rich marbling. The ranch keeps ownership of every animal from conception to harvest. No sale barns, no middlemen.",
      claims: ["Angus genetics", "Pasture raised in Colorado", "Grain finished", "Owned from conception to harvest", "Typically grades Choice or Prime"],
    },
    butcher: {
      name: "Colorado Custom Meat Co",
      short: "Colorado Custom",
      address: "443 4th Street, Kersey CO 80644",
      city: "Kersey",
      state: "CO",
      lat: 40.387,
      lon: -104.562,
      phone: "970-356-2333",
      cutSheetEmail: "order@ccmeatco.com",
      about:
        "A Colorado butcher in Kersey, about an hour northeast of Denver. Your steer hangs here for 14 days, then it is cut to your sheet, vacuum sealed, labeled with your name and frozen.",
      rates: { kill: 135, perLbHanging: 1.1, perQuarterSplit: 20 },
      hang: "14-day dry age",
    },
    pickupOnly: true,
    steersPerSeason: 7,
  },
];

/* Planned metros: the launch-order states (CO, WY, NE first, then KS,
   IA, MO, TX, OK, WI, MN), metros of 250K+ with enough capable beef
   plants within 60 miles. Nothing here is signed. Waitlist sign-ups
   decide which ones open first. Source: call-list/data/metro_viability.csv */
export const PLANNED: PlannedMetro[] = [
  { slug: "omaha", status: "planned", city: "Omaha", metro: "Omaha, NE-IA", states: ["NE", "IA"], lat: 41.24, lon: -96.041, butchersNearby: 15 },
  { slug: "lincoln", status: "planned", city: "Lincoln", metro: "Lincoln, NE", states: ["NE"], lat: 40.803, lon: -96.694, butchersNearby: 10 },
  { slug: "kansas-city", status: "planned", city: "Kansas City", metro: "Kansas City, MO-KS", states: ["MO", "KS"], lat: 39.027, lon: -94.575, butchersNearby: 15 },
  { slug: "wichita", status: "planned", city: "Wichita", metro: "Wichita, KS", states: ["KS"], lat: 37.691, lon: -97.313, butchersNearby: 19 },
  { slug: "des-moines", status: "planned", city: "Des Moines", metro: "Des Moines-West Des Moines, IA", states: ["IA"], lat: 41.611, lon: -93.663, butchersNearby: 21 },
  { slug: "st-louis", status: "planned", city: "St. Louis", metro: "St. Louis, MO-IL", states: ["MO", "IL"], lat: 38.654, lon: -90.365, butchersNearby: 27 },
  { slug: "springfield-mo", status: "planned", city: "Springfield", metro: "Springfield, MO", states: ["MO"], lat: 37.211, lon: -93.266, butchersNearby: 11 },
  { slug: "oklahoma-city", status: "planned", city: "Oklahoma City", metro: "Oklahoma City, OK", states: ["OK"], lat: 35.454, lon: -97.523, butchersNearby: 29 },
  { slug: "tulsa", status: "planned", city: "Tulsa", metro: "Tulsa, OK", states: ["OK"], lat: 36.106, lon: -95.913, butchersNearby: 24 },
  { slug: "dallas-fort-worth", status: "planned", city: "Dallas-Fort Worth", metro: "Dallas-Fort Worth-Arlington, TX", states: ["TX"], lat: 32.863, lon: -96.945, butchersNearby: 20 },
  { slug: "houston", status: "planned", city: "Houston", metro: "Houston-Pasadena-The Woodlands, TX", states: ["TX"], lat: 29.796, lon: -95.432, butchersNearby: 23 },
  { slug: "austin", status: "planned", city: "Austin", metro: "Austin-Round Rock-San Marcos, TX", states: ["TX"], lat: 30.332, lon: -97.741, butchersNearby: 17 },
  { slug: "san-antonio", status: "planned", city: "San Antonio", metro: "San Antonio-New Braunfels, TX", states: ["TX"], lat: 29.501, lon: -98.493, butchersNearby: 15 },
  { slug: "minneapolis", status: "planned", city: "Minneapolis-St. Paul", metro: "Minneapolis-St. Paul-Bloomington, MN-WI", states: ["MN", "WI"], lat: 44.994, lon: -93.266, butchersNearby: 22 },
  { slug: "milwaukee", status: "planned", city: "Milwaukee", metro: "Milwaukee-Waukesha, WI", states: ["WI"], lat: 43.077, lon: -88.053, butchersNearby: 15 },
  { slug: "madison", status: "planned", city: "Madison", metro: "Madison, WI", states: ["WI"], lat: 43.084, lon: -89.428, butchersNearby: 22 },
];

/* The one live partnership today. The order flow is bound to it. */
export const LIVE = PARTNERSHIPS[0];

export const partnershipBySlug = (slug?: string) => PARTNERSHIPS.find((p) => p.slug === slug);

/* ---------------- distance + zip matching ---------------- */

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Straight-line miles run short of road miles; this is close enough
   for "about how far is the drive" on the Front Range and the plains. */
export const roadMiles = (straight: number) => Math.round(straight * 1.2);

export interface ZipPlace { zip: string; lat: number; lon: number; place: string; state: string }

/* Zip centroids live in public/zip/<first three digits>.json so a search
   downloads a few KB, not the whole country. GeoNames, CC BY 4.0. */
let demoZips: Map<string, ZipPlace> | null = null;

export async function lookupZip(zip: string): Promise<ZipPlace | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  /* the single-file demo carries every zip inline (no server to fetch from) */
  if (import.meta.env.VITE_DEMO) {
    if (!demoZips) {
      const packed = (await import("virtual:demo-zips")).default;
      demoZips = new Map();
      for (const line of packed.split("\n")) {
        const [z, lat, lon, place, state] = line.split(",");
        demoZips.set(z, { zip: z, lat: +lat, lon: +lon, place, state });
      }
    }
    return demoZips.get(zip) ?? null;
  }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}zip/${zip.slice(0, 3)}.json`);
    if (!res.ok) return null;
    const table = (await res.json()) as Record<string, [number, number, string, string]>;
    const row = table[zip];
    return row ? { zip, lat: row[0], lon: row[1], place: row[2], state: row[3] } : null;
  } catch {
    return null;
  }
}

/* How a zip is served.
   - covered: same state as a live partnership, within an easy drive of its butcher
   - reachable: same state, a longer drive (still allowed: same-state rule holds)
   - planned: no live partnership in the state; a planned metro is within 120 miles
   - waitlist: nothing nearby yet                                                  */
type Served = { partnership: Partnership; miles: number; drive: number };
export type Coverage =
  | ({ kind: "covered" } & Served)
  | ({ kind: "reachable" } & Served)
  | { kind: "planned"; metro: PlannedMetro; miles: number; nearestLive: { partnership: Partnership; miles: number } }
  | { kind: "waitlist"; nearestPlanned: { metro: PlannedMetro; miles: number } | null; nearestLive: { partnership: Partnership; miles: number } };

export const EASY_DRIVE_MILES = 110;   // road miles to the butcher
export const PLANNED_RADIUS_MILES = 120;

export function coverageFor(p: { lat: number; lon: number; state: string }): Coverage {
  const live = PARTNERSHIPS.map((x) => ({ partnership: x, miles: milesBetween(p, x.butcher) })).sort((a, b) => a.miles - b.miles);
  const nearestLive = live[0];
  const inState = live.find((x) => x.partnership.state === p.state);
  if (inState) {
    const drive = roadMiles(inState.miles);
    const served = { partnership: inState.partnership, miles: inState.miles, drive };
    return drive <= EASY_DRIVE_MILES ? { kind: "covered", ...served } : { kind: "reachable", ...served };
  }
  const planned = PLANNED.map((m) => ({ metro: m, miles: milesBetween(p, m) })).sort((a, b) => a.miles - b.miles);
  const near = planned.find((x) => x.miles <= PLANNED_RADIUS_MILES && x.metro.states.includes(p.state));
  if (near) return { kind: "planned", metro: near.metro, miles: near.miles, nearestLive };
  return { kind: "waitlist", nearestPlanned: planned[0] ?? null, nearestLive };
}
