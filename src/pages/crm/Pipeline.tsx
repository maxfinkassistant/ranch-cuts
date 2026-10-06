/* Pairs (the ranch + butcher pipeline, ending in a signed partnership)
   and Metros (where each launch metro stands). */

import {
  PAIR_STAGES, METRO_ORDER, METRO_CENTERS, STAGE_RANK, isOpen, roadMiles, metroRank,
  type Pair, type PairStage, type Rec,
} from "../../lib/crm";
import type { Crm } from "./useCrm";
import { StagePill, NextLine, shortName, type Filters, type Lookups, type Open } from "./shared";

export function PairsBoard({ crm, lk, filters, onOpen }: { crm: Crm; lk: Lookups; filters: Filters; onOpen: Open }) {
  const pairs = crm.pairs
    .filter((p) => (!filters.metro || p.metro === filters.metro)
      && (!filters.state || lk.rancherById.get(p.rancherId)?.state === filters.state)
      && (!filters.owner || (filters.owner === "-" ? !p.owner : p.owner === filters.owner)))
    .sort((a, b) => metroRank(a.metro) - metroRank(b.metro));
  const cols = PAIR_STAGES.filter((s) => s.id !== "lost");
  const lost = pairs.filter((p) => p.stage === "lost");

  return (
    <div>
      <p className="small mute crm-boardnote">
        A pair is one ranch and one butcher in the same state. It moves left to right: both sides talk, then three visits,
        the third signs them together. Open a pair to log a visit; change the stage on the card or in the drawer.
      </p>
      <div className="crm-board">
        {cols.map((col) => {
          const here = pairs.filter((p) => p.stage === col.id);
          return (
            <section key={col.id} className="crm-col" aria-label={col.label}>
              <header><span className="tag">{col.label}</span><span className="mono">{here.length}</span></header>
              {here.map((p) => <PairCard key={p.id} p={p} crm={crm} lk={lk} onOpen={onOpen} />)}
              {here.length === 0 && <p className="small mute">{col.hint}</p>}
            </section>
          );
        })}
      </div>
      {lost.length > 0 && (
        <details className="crm-lost">
          <summary className="small">{lost.length} lost</summary>
          {lost.map((p) => <PairCard key={p.id} p={p} crm={crm} lk={lk} onOpen={onOpen} />)}
        </details>
      )}
    </div>
  );
}

function PairCard({ p, crm, lk, onOpen }: { p: Pair; crm: Crm; lk: Lookups; onOpen: Open }) {
  const r = lk.rancherById.get(p.rancherId);
  const b = lk.butcherById.get(p.butcherId);
  const mi = r && b ? roadMiles(r, b) : null;
  return (
    <article className="crm-card" onClick={() => onOpen("pair", p.id)}>
      <div className="small mute">{p.metro}{mi != null ? ` · ${mi} mi apart` : ""}</div>
      <div className="crm-card-side"><span className="crm-name">{shortName(r?.name ?? "?")}</span>{r && <StagePill stage={r.stage} />}</div>
      <div className="crm-card-side"><span>{shortName(b?.name ?? "?")}</span>{b && <StagePill stage={b.stage} />}</div>
      <NextLine r={p} />
      <select className="admin-select crm-card-stage" value={p.stage} onClick={(e) => e.stopPropagation()}
        onChange={(e) => crm.savePair(p, { stage: e.target.value as PairStage })} aria-label="Pair stage">
        {PAIR_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </article>
  );
}

/* ---------------- metros ---------------- */

const warm = (r: Rec) => STAGE_RANK[r.stage] >= STAGE_RANK.interested;
const touched = (r: Rec) => r.stage !== "new";

export function Metros({ crm, lk, onPick }: { crm: Crm; lk: Lookups; onPick: (metro: string) => void }) {
  const metros = [...METRO_ORDER, ...new Set([...crm.ranchers, ...crm.butchers].map((r) => r.metro).filter((m) => m && !METRO_ORDER.includes(m)))];
  const rows = metros.map((m) => {
    const rs = crm.ranchers.filter((r) => r.metro === m);
    /* butchers by distance, not by list label: the call list files Lincoln's plants under Omaha */
    const c = METRO_CENTERS[m];
    const bs = crm.butchers.filter((b) => !b.disqualified && (c
      ? c.states.includes(b.state) && (roadMiles(b, c) ?? 999) <= 90
      : b.metro === m));
    const ps = crm.pairs.filter((p) => p.metro === m);
    const stageIdx = (s: PairStage | undefined) => PAIR_STAGES.findIndex((x) => x.id === s);
    const best = ps.filter((p) => p.stage !== "lost").sort((a, b) => stageIdx(b.stage) - stageIdx(a.stage))[0];
    /* a ranch with no same-state butcher of ours within 90 road miles is a butcher gap */
    const gap = rs.filter((r) => isOpen(r.stage) && !(r.roadMiToButcher != null && r.roadMiToButcher <= 90) && !r.currentButcherId).length;
    return { m, rs, bs, ps, best, gap, inPlan: METRO_ORDER.includes(m) };
  }).filter((x) => x.inPlan || x.rs.length || x.ps.length);

  return (
    <div className="admin-table-wrap">
      <table className="admin-table crm-table">
        <thead>
          <tr>
            <th>Metro</th><th>Ranchers</th><th>Butchers within 90 mi</th><th>Pairs</th><th>Furthest pair</th><th>Watch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, rs, bs, ps, best, gap, inPlan }) => (
            <tr key={m} className="crm-click" onClick={() => onPick(m)}>
              <td><div className="crm-name">{m}</div><span className="admin-sub">{inPlan ? `launch #${METRO_ORDER.indexOf(m) + 1}` : "not in the launch plan"}</span></td>
              <td>
                <Bar n={rs.length} a={rs.filter(touched).length} b={rs.filter(warm).length} />
                <span className="admin-sub">{rs.length} · {rs.filter((r) => r.finishConfidence === "Confirmed").length} confirmed · {rs.filter(touched).length} contacted · {rs.filter(warm).length} warm</span>
              </td>
              <td>
                <Bar n={bs.length} a={bs.filter(touched).length} b={bs.filter(warm).length} />
                <span className="admin-sub">{bs.length} · {bs.filter(touched).length} contacted · {bs.filter(warm).length} warm</span>
              </td>
              <td className="mono">{ps.filter((p) => p.stage !== "lost").length}</td>
              <td>{best ? <><span className="admin-chip hot">{PAIR_STAGES.find((s) => s.id === best.stage)?.label}</span><span className="admin-sub">{shortName(lk.rancherById.get(best.rancherId)?.name ?? "")} × {shortName(lk.butcherById.get(best.butcherId)?.name ?? "")}</span></> : <span className="mute">none</span>}</td>
              <td className="small">
                {bs.length === 0 && <span className="admin-chip">no butchers listed</span>}
                {gap > 0 && <span className="admin-chip">{gap} ranch{gap === 1 ? "" : "es"} 90+ mi from a butcher</span>}
                {rs.length < 5 && <span className="admin-chip">thin on ranches</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small mute" style={{ marginTop: "var(--space-sm)" }}>
        Contacted = anything past "Not contacted". Warm = Interested or further. Click a metro to filter every tab to it.
      </p>
    </div>
  );
}

/* contacted (slate) and warm (brick) as shares of the list */
function Bar({ n, a, b }: { n: number; a: number; b: number }) {
  if (!n) return null;
  return (
    <span className="crm-bar" aria-hidden>
      <span className="a" style={{ width: `${(a / n) * 100}%` }} />
      <span className="b" style={{ width: `${(b / n) * 100}%` }} />
    </span>
  );
}
