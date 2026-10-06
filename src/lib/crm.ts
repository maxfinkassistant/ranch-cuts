/* ============================================================
   Partner CRM (/crm): ranchers, butchers, the pairs that become
   partnerships, and every call. Ranch Cuts staff only.

   Research (who they are, how they finish, distances) comes from
   src/data/crm-seed.json, built by scripts/build-crm-seed.py from
   ~/Documents/RanchCuts/call-list. The seed is git-ignored (this repo
   is public and main deploys to Pages), so a build without it gets an
   empty research set instead of failing. The CRM store keeps only what
   the team enters: an overlay per record (stage, notes, confirmed
   numbers), added records, pairs and activities. Re-seeding never
   loses a call note.

   Store, by environment:
     VITE_BACKEND_URL set  -> Apps Script ("CRM" sheet in the order book)
     bun run dev           -> crm/crm.json in this repo (vite middleware)
     otherwise (demo file) -> this browser's localStorage
   ============================================================ */

import { BACKEND_URL } from "../data/config";
import { PARTNERSHIPS, PLANNED } from "../data/partnerships";

/* ---------------- research records (from the seed) ---------------- */

export interface Rancher {
  id: string;
  name: string;
  town: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  metro: string;
  website: string;
  phone: string;
  email: string;
  contactName: string;
  finishType: string;            // Grain | Grass | Both | Unknown
  finishConfidence: string;      // Confirmed | Likely
  finishEvidence: string;
  evidenceUrl: string;
  raisedFromBirth: string;
  sellsShares: string;
  postedPrice: string;
  currentProcessor: string;
  usesPartnerButcher: boolean;
  ownsButcher: boolean;
  nearestButcherId: string;
  currentButcherId: string;
  roadMiToButcher: number | null;
  roadMiToMetro: number | null;
  herd: string;
  breed: string;
  researchNotes: string;
  fitScore: number;
  fitTier: string;               // A | B | C
  livePartner?: boolean;
  added?: boolean;               // entered in the CRM, not from research
  brief?: Brief;                 // call prep (Tier 1), from call-list/data/ranchers/tier1_briefs_*.json
}

/** Call prep for a rancher: public, business-relevant research gathered before the first call. */
export interface Brief {
  owners: string;
  background: string;
  sells_today: string;
  reputation: string;
  connections: string;
  openers: string[];
  cautions: string[];
  sources: string[];
  researched?: string;
}

export interface Butcher {
  id: string;
  name: string;
  dba: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  metro: string;
  inLaunchMetro: boolean;
  roadMiToMetro: number | null;
  phone: string;
  website: string;
  inspection: string;
  size: string;
  fitScore: number;
  listPriority: string;
  disqualified: boolean;
  disqualifier: string;
  doesCustomBeef: string;
  takesOutsideCattle: string;
  postedKill: number | null;
  postedPerLb: number | null;
  postedSplit: number | null;
  researchNotes: string;
  priceSourceUrl: string;
  capableWithin60: number;
  livePartner?: boolean;
  added?: boolean;
}

/* ---------------- what the team enters ---------------- */

export type Stage =
  | "new" | "attempted" | "connected" | "interested" | "visit" | "committed" | "partner" | "no-fit" | "dnc";

export const STAGES: { id: Stage; label: string; open: boolean }[] = [
  { id: "new", label: "Not contacted", open: true },
  { id: "attempted", label: "Tried, no answer", open: true },
  { id: "connected", label: "Talked", open: true },
  { id: "interested", label: "Interested", open: true },
  { id: "visit", label: "Visit set", open: true },
  { id: "committed", label: "Committed", open: false },
  { id: "partner", label: "Live partner", open: false },
  { id: "no-fit", label: "Not a fit", open: false },
  { id: "dnc", label: "Do not contact", open: false },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const isOpen = (s: Stage) => STAGES.find((x) => x.id === s)?.open ?? true;
/* how far along, for "warmest first" sorting and the metro rollup */
export const STAGE_RANK: Record<Stage, number> = {
  new: 0, attempted: 1, connected: 2, interested: 3, visit: 4, committed: 5, partner: 6, "no-fit": -1, dnc: -2,
};

export interface Overlay {
  stage?: Stage;
  owner?: string;                // Max | Josh | McLane | ...
  nextStep?: string;
  nextDate?: string;             // YYYY-MM-DD
  lastContact?: string;          // ISO
  attempts?: number;
  interest?: number;             // 1-5
  notes?: string;
  tierOverride?: number;         // 1-4
  archived?: boolean;
  /* rancher, confirmed on the call */
  finishesConfirmed?: string;    // Yes | No | Partly
  headPerYear?: string;
  butcherConfirmed?: string;     // who kills for them today, per the call
  priceOk?: string;              // Yes | No | Maybe (share at sale barn + 50%)
  /* butcher, confirmed on the call */
  confirmedKill?: string;
  confirmedPerLb?: string;
  confirmedSplit?: string;
  slotsPerWeek?: string;
  leadTime?: string;
  takesShares?: string;          // Yes | No | Maybe (custom-exempt shares, billed to owners)
}

export type RancherRec = Rancher & Overlay & { kind: "rancher"; stage: Stage };
export type ButcherRec = Butcher & Overlay & { kind: "butcher"; stage: Stage };
export type Rec = RancherRec | ButcherRec;

export type PairStage = "proposed" | "intro" | "visit1" | "visit2" | "signing" | "signed" | "live" | "lost";
export const PAIR_STAGES: { id: PairStage; label: string; hint: string }[] = [
  { id: "proposed", label: "Proposed", hint: "On paper: same state, a sensible drive apart" },
  { id: "intro", label: "Both talked", hint: "Ranch and butcher have each had a call" },
  { id: "visit1", label: "Visit 1", hint: "First in-person visit" },
  { id: "visit2", label: "Visit 2", hint: "Second visit: numbers, slots, cut sheet" },
  { id: "signing", label: "Visit 3: signing", hint: "Third visit signs the ranch and its butcher together" },
  { id: "signed", label: "Signed", hint: "Partner agreements signed, listing in progress" },
  { id: "live", label: "Live", hint: "Taking orders on ranchcuts.com" },
  { id: "lost", label: "Lost", hint: "Not happening (say why in notes)" },
];

export interface Pair {
  id: string;
  rancherId: string;
  butcherId: string;
  metro: string;
  origin?: string;
  stage?: PairStage;
  owner?: string;
  nextStep?: string;
  nextDate?: string;
  notes?: string;
  livePartner?: boolean;
  archived?: boolean;
}

export type ActivityKind = "call" | "no-answer" | "voicemail" | "email" | "text" | "visit" | "note";
export const ACTIVITY_KINDS: { id: ActivityKind; label: string; attempt: boolean; contact: boolean }[] = [
  { id: "call", label: "Call, talked", attempt: true, contact: true },
  { id: "no-answer", label: "No answer", attempt: true, contact: false },
  { id: "voicemail", label: "Left voicemail", attempt: true, contact: false },
  { id: "email", label: "Email", attempt: false, contact: true },
  { id: "text", label: "Text", attempt: false, contact: true },
  { id: "visit", label: "Visit", attempt: false, contact: true },
  { id: "note", label: "Note", attempt: false, contact: false },
];

export interface Activity {
  id: string;
  refKind: "rancher" | "butcher" | "pair";
  refId: string;
  kind: ActivityKind;
  summary: string;
  by: string;
  at: string;                    // ISO
}

/* ---------------- call tiers ---------------- */

export const RANCHER_TIERS = [
  { n: 1, label: "Ready-made pairs", hint: "Already uses (or owns) a butcher on our list. One trip can sign both." },
  { n: 2, label: "Strong finishers", hint: "Fit A: confirmed finishing on their place, close to a butcher and the metro." },
  { n: 3, label: "Worth a call", hint: "Fit B: likely finishers or a longer drive." },
  { n: 4, label: "Research first", hint: "Fit C, or no phone or email published. Find a number before calling." },
];
export const BUTCHER_TIERS = [
  { n: 1, label: "Paired", hint: "Already part of a pair: a ranch on our list uses them." },
  { n: 2, label: "Launch metros", hint: "Near Denver or one of the 16 planned metros." },
  { n: 3, label: "Other metros", hint: "Strong plants near metros that aren't on the launch plan yet." },
  { n: 4, label: "Skip", hint: "Disqualified in research (no beef slaughter, no custom work, etc.)." },
];

export function rancherTier(r: RancherRec): number {
  if (r.tierOverride) return r.tierOverride;
  if (r.currentButcherId) return 1;
  if (!r.phone && !r.email) return 4;
  return r.fitTier === "A" ? 2 : r.fitTier === "B" ? 3 : 4;
}

export function butcherTier(b: ButcherRec, paired: Set<string>): number {
  if (b.tierOverride) return b.tierOverride;
  if (b.disqualified) return 4;
  if (paired.has(b.id)) return 1;
  return b.inLaunchMetro ? 2 : 3;
}

/* Launch order: Front Range first, then the plains, then the rest (matches PLANNED in partnerships.ts). */
export const METRO_ORDER = [
  "Denver", "Colorado Springs", "Omaha", "Lincoln", "Kansas City", "Wichita", "Des Moines", "St. Louis", "Springfield",
  "Oklahoma City", "Tulsa", "Dallas-Fort Worth", "Houston", "Austin", "San Antonio", "Minneapolis-St. Paul",
  "Milwaukee", "Madison",
];
/* Metro centers and the states a partnership there can draw from (same-state rule). */
export const METRO_CENTERS: Record<string, { lat: number; lon: number; states: string[] }> = {
  ...Object.fromEntries(PARTNERSHIPS.map((p) => [p.city, { ...p.center, states: [p.state] }])),
  "Colorado Springs": { lat: 38.834, lon: -104.821, states: ["CO"] },
  ...Object.fromEntries(PLANNED.map((p) => [p.city, { lat: p.lat, lon: p.lon, states: p.states }])),
};

export const metroRank = (m: string) => {
  const i = METRO_ORDER.indexOf(m);
  return i === -1 ? 99 : i;
};

/* ---------------- dates ---------------- */

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const isDue = (o: { nextDate?: string }) => !!o.nextDate && o.nextDate <= today();
export function ago(iso?: string): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export const fmtDay = (ymd?: string) =>
  ymd ? new Date(ymd + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "";

/* ---------------- the document store ---------------- */

export type DocKind = "rancher" | "butcher" | "pair" | "activity";
export interface Doc { kind: DocKind; id: string; data: Record<string, unknown>; updatedAt: string; by?: string }

interface Store {
  name: "sheet" | "file" | "browser";
  all(): Promise<Doc[]>;
  put(doc: Doc): Promise<void>;
  del(kind: DocKind, id: string): Promise<void>;
}

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { throw new Error("The CRM store returned a non-JSON response"); }
  if (!res.ok || body.ok === false) throw new Error(body.error || `CRM store error ${res.status}`);
  return body as T;
}

/* Apps Script: same "simple request" rules as lib/api.ts (no headers, text body). */
const sheetStore = (key: string): Store => ({
  name: "sheet",
  all: async () =>
    (await json<{ docs: Doc[] }>(await fetch(`${BACKEND_URL}?action=crm&key=${encodeURIComponent(key)}`, { redirect: "follow" }))).docs,
  put: async (doc) => {
    await json(await fetch(BACKEND_URL, { method: "POST", redirect: "follow", body: JSON.stringify({ action: "crm-put", key, doc }) }));
  },
  del: async (kind, id) => {
    await json(await fetch(BACKEND_URL, { method: "POST", redirect: "follow", body: JSON.stringify({ action: "crm-del", key, kind, id }) }));
  },
});

const fileStore: Store = {
  name: "file",
  all: async () => (await json<{ docs: Doc[] }>(await fetch("/__crm"))).docs,
  put: async (doc) => { await json(await fetch("/__crm", { method: "POST", body: JSON.stringify({ op: "put", doc }) })); },
  del: async (kind, id) => { await json(await fetch("/__crm", { method: "POST", body: JSON.stringify({ op: "del", kind, id }) })); },
};

const BROWSER_KEY = "rc.crm.v1";
const browserStore: Store = {
  name: "browser",
  all: async () => {
    try { return JSON.parse(localStorage.getItem(BROWSER_KEY) || "[]") as Doc[]; } catch { return []; }
  },
  put: async (doc) => {
    const docs = (await browserStore.all()).filter((d) => !(d.kind === doc.kind && d.id === doc.id));
    docs.push(doc);
    try { localStorage.setItem(BROWSER_KEY, JSON.stringify(docs)); } catch { /* private window: session only */ }
  },
  del: async (kind, id) => {
    const docs = (await browserStore.all()).filter((d) => !(d.kind === kind && d.id === id));
    try { localStorage.setItem(BROWSER_KEY, JSON.stringify(docs)); } catch { /* ignore */ }
  },
};

export const crmBackend = () => (BACKEND_URL ? "sheet" : import.meta.env.DEV ? "file" : "browser");

export function openStore(key: string): Store {
  if (BACKEND_URL) return sheetStore(key);
  if (import.meta.env.DEV) return fileStore;
  return browserStore;
}

/* ---------------- assembling the working set ---------------- */

type Seed = { version: string; ranchers: Rancher[]; butchers: Butcher[]; pairs: Pair[] };
/* glob, not import: a missing seed file yields {} rather than a build error */
const seedFile = Object.values(import.meta.glob("../data/crm-seed.json", { eager: true, import: "default" }))[0];
const SEED = (seedFile ?? { version: "none", ranchers: [], butchers: [], pairs: [] }) as Seed;
export const SEED_VERSION = SEED.version;

export interface CrmData {
  ranchers: RancherRec[];
  butchers: ButcherRec[];
  pairs: Pair[];
  activities: Activity[];
}

export function assemble(docs: Doc[]): CrmData {
  const over: Record<string, Record<string, Record<string, unknown>>> = { rancher: {}, butcher: {}, pair: {} };
  const activities: Activity[] = [];
  for (const d of docs) {
    if (d.kind === "activity") activities.push(d.data as unknown as Activity);
    else over[d.kind][d.id] = d.data;
  }
  const merge = <T extends { id: string; livePartner?: boolean }>(base: T[], kind: "rancher" | "butcher") => {
    const seen = new Set(base.map((b) => b.id));
    const added = Object.entries(over[kind]).filter(([id]) => !seen.has(id)).map(([, d]) => d as unknown as T);
    return [...base, ...added].map((b) => {
      const o = over[kind][b.id] ?? {};
      return { ...b, ...o, kind, stage: (o.stage as Stage) ?? (b.livePartner ? "partner" : "new") };
    });
  };
  const ranchers = (merge(SEED.ranchers, "rancher") as RancherRec[]).filter((r) => !r.archived);
  const butchers = (merge(SEED.butchers, "butcher") as ButcherRec[]).filter((b) => !b.archived);
  const seenPairs = new Set(SEED.pairs.map((p) => p.id));
  const pairs = [
    ...SEED.pairs.map((p) => ({ ...p, ...(over.pair[p.id] ?? {}) })),
    ...Object.entries(over.pair).filter(([id]) => !seenPairs.has(id)).map(([, d]) => d as unknown as Pair),
  ]
    .map((p) => ({ ...p, stage: p.stage ?? (p.livePartner ? "live" : "proposed") }) as Pair)
    .filter((p) => !p.archived);
  activities.sort((a, b) => b.at.localeCompare(a.at));
  return { ranchers, butchers, pairs, activities };
}

/* Only the overlay keys are written for seeded records: research stays in the seed. */
const OVERLAY_KEYS: (keyof Overlay)[] = [
  "stage", "owner", "nextStep", "nextDate", "lastContact", "attempts", "interest", "notes", "tierOverride", "archived",
  "finishesConfirmed", "headPerYear", "butcherConfirmed", "priceOk",
  "confirmedKill", "confirmedPerLb", "confirmedSplit", "slotsPerWeek", "leadTime", "takesShares",
];

export function overlayOf(rec: Rec): Record<string, unknown> {
  if (rec.added) {
    const { kind, ...rest } = rec;
    return rest;
  }
  const o: Record<string, unknown> = {};
  for (const k of OVERLAY_KEYS) if (rec[k] !== undefined && rec[k] !== "") o[k] = rec[k];
  return o;
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const slugId = (prefix: string, name: string, state: string) =>
  `${prefix}-${name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28)}-${state.toLowerCase()}`;

/* ---------------- geography ---------------- */

export function roadMiles(a: { lat: number | null; lon: number | null }, b: { lat: number | null; lon: number | null }): number | null {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null;
  const R = 3958.8;
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.2);   // same straight-line x 1.2 rule as the site
}

/* ---------------- CSV ---------------- */

export function downloadCsv(name: string, head: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").split('"').join('""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
