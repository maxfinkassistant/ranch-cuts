/* Small pieces shared by the CRM views. */

import {
  stageLabel, isDue, ago, fmtDay, rancherTier, butcherTier, metroRank,
  type RancherRec, type ButcherRec, type Rec, type Stage, type Pair,
} from "../../lib/crm";
import type { Crm } from "./useCrm";

export type Open = (kind: "rancher" | "butcher" | "pair", id: string, focusLog?: boolean) => void;

export interface Filters {
  metro: string;     // "" = all
  state: string;
  owner: string;     // "" = anyone, "-" = unassigned
  q: string;
}

export const blankFilters: Filters = { metro: "", state: "", owner: "", q: "" };

export function matches(r: Rec, f: Filters): boolean {
  if (f.metro && r.metro !== f.metro) return false;
  if (f.state && r.state !== f.state) return false;
  if (f.owner === "-" && r.owner) return false;
  if (f.owner && f.owner !== "-" && r.owner !== f.owner) return false;
  if (f.q) {
    const hay = [r.name, r.metro, r.state, r.phone, r.notes,
      r.kind === "rancher" ? `${r.town} ${r.contactName} ${r.currentProcessor} ${r.breed}` : `${r.city} ${r.dba}`]
      .join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Context every view needs: lookups and computed tiers. */
export function useLookups(crm: Crm) {
  const butcherById = new Map(crm.butchers.map((b) => [b.id, b]));
  const rancherById = new Map(crm.ranchers.map((r) => [r.id, r]));
  const paired = new Set(crm.pairs.filter((p) => p.stage !== "lost").map((p) => p.butcherId));
  const tierOf = (r: Rec) => (r.kind === "rancher" ? rancherTier(r) : butcherTier(r, paired));
  const pairsOf = (r: Rec) => crm.pairs.filter((p) => (r.kind === "rancher" ? p.rancherId : p.butcherId) === r.id);
  const activityOf = (kind: string, id: string) => crm.activities.filter((a) => a.refKind === kind && a.refId === id);
  return { butcherById, rancherById, paired, tierOf, pairsOf, activityOf };
}
export type Lookups = ReturnType<typeof useLookups>;

/** Call order inside a list: follow-ups due first, then never-tried, then by launch metro and fit. */
export function callOrder(a: Rec, b: Rec): number {
  const due = Number(isDue(b)) - Number(isDue(a));
  if (due) return due;
  const fresh = Number(b.stage === "new") - Number(a.stage === "new");
  if (fresh) return fresh;
  return metroRank(a.metro) - metroRank(b.metro) || b.fitScore - a.fitScore;
}

const short = (name: string) => name.replace(/,? (LLC|Inc\.?|Co\.?|Company|Ltd)\.?$/i, "").replace(/\s*\(.*\)$/, "");
export const shortName = short;

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={`crm-stage s-${stage}`}>{stageLabel(stage)}</span>;
}

export function TierBadge({ n }: { n: number }) {
  return <span className={`crm-tier t${n}`} title={`Call tier ${n}`}>T{n}</span>;
}

/** Why this record is worth the call, in chips. */
export function WhyChips({ r, lk }: { r: Rec; lk: Lookups }) {
  const chips: { text: string; hot?: boolean; title?: string }[] = [];
  if (r.kind === "rancher") {
    if (r.brief) chips.push({ text: "Call prep ready", hot: true, title: r.brief.owners });
    const finish = r.finishType && r.finishType !== "Unknown" ? r.finishType.toLowerCase() : "";
    chips.push({ text: `${r.finishConfidence === "Confirmed" ? "Finishes" : "Likely finishes"}${finish ? ` · ${finish}` : ""}`, hot: r.finishConfidence === "Confirmed", title: r.finishEvidence });
    if (r.raisedFromBirth === "Yes") chips.push({ text: "Born here" });
    const cur = r.currentButcherId ? lk.butcherById.get(r.currentButcherId) : undefined;
    if (cur) chips.push({ text: `${r.ownsButcher ? "Owns" : "Uses"} ${short(cur.name)}`, hot: true });
    else if (r.roadMiToButcher != null) {
      const nb = lk.butcherById.get(r.nearestButcherId);
      chips.push({ text: `${r.roadMiToButcher} mi to ${nb ? short(nb.name) : "butcher"}` });
    }
    if (/quarter|half|whole/i.test(r.sellsShares)) chips.push({ text: "Sells shares" });
    if (r.postedPrice) chips.push({ text: r.postedPrice.length > 34 ? r.postedPrice.slice(0, 32) + "…" : r.postedPrice, title: r.postedPrice });
  } else {
    if (r.inspection) chips.push({ text: r.inspection });
    if (r.doesCustomBeef === "Yes") chips.push({ text: "Custom beef", hot: true });
    if (r.postedKill != null) chips.push({ text: `$${r.postedKill} kill${r.postedPerLb != null ? ` + $${r.postedPerLb}/lb` : ""}` });
    const pr = lk.pairsOf(r).map((p) => lk.rancherById.get(p.rancherId)).filter(Boolean);
    if (pr.length) chips.push({ text: `Paired: ${pr.map((x) => short(x!.name)).join(", ")}`, hot: true });
    if (r.roadMiToMetro != null) chips.push({ text: `${r.roadMiToMetro} mi to ${r.metro.split(",")[0]}` });
    if (r.disqualifier) chips.push({ text: r.disqualifier });
  }
  return (
    <span className="crm-why">
      {chips.map((c, i) => <span key={i} className={"admin-chip" + (c.hot ? " hot" : "")} title={c.title}>{c.text}</span>)}
    </span>
  );
}

export function NextLine({ r }: { r: { nextStep?: string; nextDate?: string; lastContact?: string; attempts?: number } }) {
  const due = isDue(r);
  return (
    <span className="crm-next">
      {r.nextDate && <span className={due ? "due" : ""}>{due ? "Due " : ""}{fmtDay(r.nextDate)}</span>}
      {r.nextStep && <span className="mute"> · {r.nextStep}</span>}
      {!r.nextDate && !r.nextStep && r.lastContact && <span className="mute">Last {ago(r.lastContact)}</span>}
      {!r.nextDate && !r.nextStep && !r.lastContact && <span className="mute">—</span>}
      {!!r.attempts && <span className="admin-sub">{r.attempts} attempt{r.attempts === 1 ? "" : "s"}{r.lastContact ? `, last ${ago(r.lastContact)}` : ""}</span>}
    </span>
  );
}

export function Phone({ phone }: { phone: string }) {
  if (!phone) return <span className="mute small">No phone</span>;
  const first = phone.split(/[;/]| or /)[0].trim();
  return <a className="crm-phone" href={`tel:${first.replace(/[^\d+x]/g, "").replace(/x.*/, "")}`} onClick={(e) => e.stopPropagation()}>{phone}</a>;
}

export const pairTitle = (p: Pair, lk: Lookups) =>
  `${short(lk.rancherById.get(p.rancherId)?.name ?? "?")} × ${short(lk.butcherById.get(p.butcherId)?.name ?? "?")}`;

export const isRancher = (r: Rec): r is RancherRec => r.kind === "rancher";
export const isButcher = (r: Rec): r is ButcherRec => r.kind === "butcher";
