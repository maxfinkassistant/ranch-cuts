/* Ranchers and Butchers: the full lists, sortable, filterable, with an
   "add" form for leads found after the research pass. */

import { useMemo, useState } from "react";
import {
  STAGES, STAGE_RANK, METRO_ORDER, metroRank, ago, downloadCsv,
  type Rec, type RancherRec, type ButcherRec, type Stage,
} from "../../lib/crm";
import type { Crm } from "./useCrm";
import { matches, StagePill, TierBadge, NextLine, Phone, shortName, type Filters, type Lookups, type Open } from "./shared";

type SortKey = "tier" | "fit" | "name" | "metro" | "stage" | "last" | "next" | "miles";

function useSort(initial: SortKey) {
  const [key, setKey] = useState<SortKey>(initial);
  const [dir, setDir] = useState<1 | -1>(1);
  const th = (k: SortKey, label: string) => (
    <th aria-sort={key === k ? (dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="crm-sort" onClick={() => { if (key === k) setDir((d) => (d === 1 ? -1 : 1)); else { setKey(k); setDir(1); } }}>
        {label}{key === k ? (dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
  return { key, dir, th };
}

function sorter(key: SortKey, dir: 1 | -1, lk: Lookups, miles: (r: Rec) => number | null) {
  return (a: Rec, b: Rec) => {
    let d = 0;
    switch (key) {
      case "tier": d = lk.tierOf(a) - lk.tierOf(b) || b.fitScore - a.fitScore; break;
      case "fit": d = b.fitScore - a.fitScore; break;
      case "name": d = a.name.localeCompare(b.name); break;
      case "metro": d = metroRank(a.metro) - metroRank(b.metro) || a.metro.localeCompare(b.metro) || b.fitScore - a.fitScore; break;
      case "stage": d = STAGE_RANK[b.stage] - STAGE_RANK[a.stage]; break;
      case "last": d = (b.lastContact ?? "").localeCompare(a.lastContact ?? ""); break;
      case "next": d = (a.nextDate || "9999").localeCompare(b.nextDate || "9999"); break;
      case "miles": d = (miles(a) ?? 9999) - (miles(b) ?? 9999); break;
    }
    return d * dir;
  };
}

function StageFilter({ value, onChange }: { value: Stage | ""; onChange: (s: Stage | "") => void }) {
  return (
    <select className="admin-select" value={value} onChange={(e) => onChange(e.target.value as Stage | "")} aria-label="Stage">
      <option value="">All stages</option>
      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

/* ---------------- ranchers ---------------- */

export function RancherTable({ crm, lk, filters, onOpen }: { crm: Crm; lk: Lookups; filters: Filters; onOpen: Open }) {
  const { key, dir, th } = useSort("metro");
  const [stage, setStage] = useState<Stage | "">("");
  const [finish, setFinish] = useState("");
  const [adding, setAdding] = useState(false);
  const miles = (r: Rec) => (r.kind === "rancher" ? r.roadMiToButcher : null);
  const rows = useMemo(
    () => crm.ranchers
      .filter((r) => matches(r, filters) && (!stage || r.stage === stage) && (!finish || r.finishConfidence === finish || r.finishType === finish))
      .sort(sorter(key, dir, lk, miles)),
    [crm.ranchers, filters, stage, finish, key, dir, lk],
  );

  const exportRows = () => downloadCsv("ranchcuts-crm-ranchers.csv",
    ["tier", "fit", "name", "town", "state", "metro", "phone", "email", "website", "contact", "finish", "confidence", "current_butcher",
      "miles_to_butcher", "stage", "owner", "interest", "head_per_year", "finishes_confirmed", "price_ok", "last_contact", "next_step", "next_date", "notes"],
    rows.map((r) => [lk.tierOf(r), r.fitScore, r.name, r.town, r.state, r.metro, r.phone, r.email, r.website, r.contactName, r.finishType,
      r.finishConfidence, r.currentButcherId ? lk.butcherById.get(r.currentButcherId)?.name : r.currentProcessor, r.roadMiToButcher,
      r.stage, r.owner, r.interest, r.headPerYear, r.finishesConfirmed, r.priceOk, r.lastContact?.slice(0, 10), r.nextStep, r.nextDate, r.notes]));

  return (
    <div>
      <div className="crm-toolbar">
        <StageFilter value={stage} onChange={setStage} />
        <select className="admin-select" value={finish} onChange={(e) => setFinish(e.target.value)} aria-label="Finishing">
          <option value="">Any finishing</option>
          <option value="Confirmed">Confirmed finishers</option>
          <option value="Likely">Likely finishers</option>
          <option value="Grain">Grain</option>
          <option value="Grass">Grass</option>
          <option value="Both">Grain and grass</option>
        </select>
        <span className="small mute">{rows.length} of {crm.ranchers.length}</span>
        <span className="grow" />
        <button className="btn btn-ghost" onClick={exportRows}>Export CSV</button>
        <button className="btn btn-solid" onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add a ranch"}</button>
      </div>
      {adding && <AddForm kind="rancher" crm={crm} onDone={(id) => { setAdding(false); if (id) onOpen("rancher", id); }} />}
      <div className="admin-table-wrap">
        <table className="admin-table crm-table">
          <thead>
            <tr>{th("tier", "Tier")}{th("name", "Ranch")}{th("metro", "Metro")}<th>Finishing</th>{th("miles", "Butcher")}<th>Phone</th>{th("stage", "Stage")}{th("next", "Next")}</tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cur = r.currentButcherId ? lk.butcherById.get(r.currentButcherId) : undefined;
              const nb = lk.butcherById.get(r.nearestButcherId);
              return (
                <tr key={r.id} onClick={() => onOpen("rancher", r.id)} className="crm-click">
                  <td><TierBadge n={lk.tierOf(r)} /><span className="admin-sub">fit {r.fitScore}</span></td>
                  <td><div className="crm-name">{r.name}</div><span className="admin-sub">{r.town}, {r.state}{r.owner ? ` · ${r.owner}` : ""}</span></td>
                  <td>{r.metro}</td>
                  <td>
                    <span className={"admin-chip" + (r.finishConfidence === "Confirmed" ? " hot" : "")}>{r.finishConfidence}</span>
                    <span className="admin-sub">{r.finishType}{r.raisedFromBirth === "Yes" ? " · born here" : ""}</span>
                  </td>
                  <td>
                    {cur ? <><span className="admin-chip hot">{r.ownsButcher ? "Owns" : "Uses"}</span> {shortName(cur.name)}</>
                      : nb ? <>{shortName(nb.name)}<span className="admin-sub">{r.roadMiToButcher} mi, nearest</span></> : <span className="mute">none in state</span>}
                  </td>
                  <td><Phone phone={r.phone} /></td>
                  <td><StagePill stage={r.stage} />{r.lastContact && <span className="admin-sub">last {ago(r.lastContact)}</span>}</td>
                  <td><NextLine r={{ nextStep: r.nextStep, nextDate: r.nextDate }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- butchers ---------------- */

export function ButcherTable({ crm, lk, filters, onOpen }: { crm: Crm; lk: Lookups; filters: Filters; onOpen: Open }) {
  const { key, dir, th } = useSort("tier");
  const [stage, setStage] = useState<Stage | "">("");
  const [scope, setScope] = useState("launch");
  const [adding, setAdding] = useState(false);
  const rows = useMemo(
    () => crm.butchers
      .filter((b) => matches(b, filters) && (!stage || b.stage === stage)
        && (scope === "all" || (scope === "launch" ? b.inLaunchMetro && !b.disqualified : scope === "other" ? !b.inLaunchMetro : b.disqualified)))
      .sort(sorter(key, dir, lk, (r) => (r.kind === "butcher" ? r.roadMiToMetro : null))),
    [crm.butchers, filters, stage, scope, key, dir, lk],
  );

  const exportRows = () => downloadCsv("ranchcuts-crm-butchers.csv",
    ["tier", "fit", "name", "city", "state", "metro", "phone", "website", "inspection", "custom_beef", "posted_kill", "posted_per_lb",
      "stage", "owner", "interest", "takes_shares", "slots_per_week", "confirmed_kill", "confirmed_per_lb", "confirmed_split", "lead_time",
      "last_contact", "next_step", "next_date", "notes"],
    rows.map((b) => [lk.tierOf(b), b.fitScore, b.name, b.city, b.state, b.metro, b.phone, b.website, b.inspection, b.doesCustomBeef,
      b.postedKill, b.postedPerLb, b.stage, b.owner, b.interest, b.takesShares, b.slotsPerWeek, b.confirmedKill, b.confirmedPerLb,
      b.confirmedSplit, b.leadTime, b.lastContact?.slice(0, 10), b.nextStep, b.nextDate, b.notes]));

  return (
    <div>
      <div className="crm-toolbar">
        <select className="admin-select" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Which butchers">
          <option value="launch">Launch metros</option>
          <option value="other">Other metros</option>
          <option value="skip">Disqualified</option>
          <option value="all">All {crm.butchers.length}</option>
        </select>
        <StageFilter value={stage} onChange={setStage} />
        <span className="small mute">{rows.length} shown</span>
        <span className="grow" />
        <button className="btn btn-ghost" onClick={exportRows}>Export CSV</button>
        <button className="btn btn-solid" onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add a butcher"}</button>
      </div>
      {adding && <AddForm kind="butcher" crm={crm} onDone={(id) => { setAdding(false); if (id) onOpen("butcher", id); }} />}
      <div className="admin-table-wrap">
        <table className="admin-table crm-table">
          <thead>
            <tr>{th("tier", "Tier")}{th("name", "Butcher")}{th("metro", "Metro")}<th>Type</th><th>Rates</th><th>Phone</th>{th("stage", "Stage")}{th("next", "Next")}</tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} onClick={() => onOpen("butcher", b.id)} className="crm-click">
                <td><TierBadge n={lk.tierOf(b)} /><span className="admin-sub">fit {b.fitScore}</span></td>
                <td><div className="crm-name">{b.name}</div><span className="admin-sub">{b.city}, {b.state}{b.owner ? ` · ${b.owner}` : ""}</span></td>
                <td>{b.metro}<span className="admin-sub">{b.roadMiToMetro != null ? `${b.roadMiToMetro} mi` : ""}</span></td>
                <td>{b.inspection}<span className="admin-sub">custom beef: {b.doesCustomBeef || "?"}</span></td>
                <td className="mono">
                  {b.confirmedKill || b.confirmedPerLb
                    ? <>{b.confirmedKill} + {b.confirmedPerLb}/lb<span className="admin-sub">confirmed</span></>
                    : b.postedKill != null ? <>${b.postedKill} + ${b.postedPerLb}/lb<span className="admin-sub">posted</span></> : <span className="mute">call</span>}
                </td>
                <td><Phone phone={b.phone} /></td>
                <td><StagePill stage={b.stage} />{b.slotsPerWeek && <span className="admin-sub">{b.slotsPerWeek} slots/wk</span>}</td>
                <td><NextLine r={{ nextStep: b.nextStep, nextDate: b.nextDate }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- add a record ---------------- */

const STATES = ["CO", "NE", "IA", "KS", "MO", "OK", "TX", "MN", "WI", "WY", "SD", "IL"];

function AddForm({ kind, crm, onDone }: { kind: "rancher" | "butcher"; crm: Crm; onDone: (id?: string) => void }) {
  const [f, setF] = useState({ name: "", town: "", state: "CO", metro: "Denver", phone: "", email: "", website: "", contactName: "",
    finishType: "Unknown", finishConfidence: "Likely", inspection: "Custom-exempt", notes: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const exists = (kind === "rancher" ? crm.ranchers : crm.butchers).find((r) => r.name.toLowerCase() === f.name.trim().toLowerCase() && r.state === f.state);
    if (exists) { alert(`${exists.name} is already in the CRM.`); return; }
    const id = kind === "rancher"
      ? crm.addRancher({ name: f.name.trim(), town: f.town, state: f.state, metro: f.metro, phone: f.phone, email: f.email, website: f.website,
          contactName: f.contactName, finishType: f.finishType, finishConfidence: f.finishConfidence, researchNotes: f.notes,
          fitTier: f.finishConfidence === "Confirmed" ? "A" : "B", fitScore: f.finishConfidence === "Confirmed" ? 70 : 40 })
      : crm.addButcher({ name: f.name.trim(), city: f.town, state: f.state, metro: f.metro, phone: f.phone, website: f.website,
          inspection: f.inspection, researchNotes: f.notes, inLaunchMetro: METRO_ORDER.includes(f.metro) });
    onDone(id);
  };
  return (
    <form className="crm-add" onSubmit={submit}>
      <label className="crm-mini wide"><span>{kind === "rancher" ? "Ranch" : "Butcher"} name</span><input className="admin-input" value={f.name} onChange={set("name")} required autoFocus /></label>
      <label className="crm-mini"><span>Town</span><input className="admin-input" value={f.town} onChange={set("town")} /></label>
      <label className="crm-mini"><span>State</span>
        <select className="admin-select" value={f.state} onChange={set("state")}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="crm-mini"><span>Metro</span>
        <select className="admin-select" value={f.metro} onChange={set("metro")}>{METRO_ORDER.map((m) => <option key={m}>{m}</option>)}<option>Other</option></select></label>
      <label className="crm-mini"><span>Phone</span><input className="admin-input" value={f.phone} onChange={set("phone")} /></label>
      {kind === "rancher" && <label className="crm-mini"><span>Email</span><input className="admin-input" value={f.email} onChange={set("email")} /></label>}
      <label className="crm-mini"><span>Website</span><input className="admin-input" value={f.website} onChange={set("website")} /></label>
      {kind === "rancher" ? (
        <>
          <label className="crm-mini"><span>Contact</span><input className="admin-input" value={f.contactName} onChange={set("contactName")} /></label>
          <label className="crm-mini"><span>Finishing</span>
            <select className="admin-select" value={f.finishType} onChange={set("finishType")}>{["Unknown", "Grain", "Grass", "Both"].map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="crm-mini"><span>Finishes on own place?</span>
            <select className="admin-select" value={f.finishConfidence} onChange={set("finishConfidence")}><option>Likely</option><option>Confirmed</option></select></label>
        </>
      ) : (
        <label className="crm-mini"><span>Inspection</span>
          <select className="admin-select" value={f.inspection} onChange={set("inspection")}>{["Custom-exempt", "State", "USDA", "T-A"].map((s) => <option key={s}>{s}</option>)}</select></label>
      )}
      <label className="crm-mini wide"><span>Where you found them</span><input className="admin-input" value={f.notes} onChange={set("notes")} placeholder="Colorado Beef Council directory, referral from…" /></label>
      <div className="crm-add-go"><button className="btn btn-solid" type="submit">Add</button></div>
    </form>
  );
}

