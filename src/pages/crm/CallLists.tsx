/* Call lists: the CRM's home. Pick ranchers or butchers, pick a tier,
   work the list top to bottom. Follow-ups that are due float to the top
   of every list and also collect in "Due now". */

import { useState } from "react";
import {
  RANCHER_TIERS, BUTCHER_TIERS, isOpen, isDue, fmtDay, PAIR_STAGES,
  type Rec,
} from "../../lib/crm";
import type { Crm } from "./useCrm";
import {
  matches, callOrder, StagePill, WhyChips, NextLine, Phone, TierBadge, pairTitle,
  type Filters, type Lookups, type Open,
} from "./shared";

type Side = "ranchers" | "butchers";

export default function CallLists({ crm, lk, filters, onOpen }: { crm: Crm; lk: Lookups; filters: Filters; onOpen: Open }) {
  const [side, setSide] = useState<Side>(() => (sessionStorage.getItem("rc.crm.side") as Side) || "ranchers");
  const [tier, setTier] = useState<number>(() => Number(sessionStorage.getItem("rc.crm.tier") ?? 1));
  const [showClosed, setShowClosed] = useState(false);
  const pick = (s: Side, t: number) => {
    setSide(s); setTier(t);
    try { sessionStorage.setItem("rc.crm.side", s); sessionStorage.setItem("rc.crm.tier", String(t)); } catch { /* ignore */ }
  };

  const pool: Rec[] = (side === "ranchers" ? crm.ranchers : crm.butchers).filter((r) => matches(r, filters));
  const tiers = side === "ranchers" ? RANCHER_TIERS : BUTCHER_TIERS;
  const due = [...crm.ranchers, ...crm.butchers].filter((r) => matches(r, filters) && isOpen(r.stage) && isDue(r));
  const pairsDue = crm.pairs.filter((p) => isDue(p) && p.stage !== "lost" && (!filters.metro || p.metro === filters.metro));

  const list = tier === 0
    ? [...due].sort((a, b) => (a.nextDate ?? "").localeCompare(b.nextDate ?? ""))
    : pool.filter((r) => lk.tierOf(r) === tier && (showClosed || isOpen(r.stage))).sort(callOrder);
  const closedHere = tier === 0 ? 0 : pool.filter((r) => lk.tierOf(r) === tier && !isOpen(r.stage)).length;
  const meta = tiers.find((t) => t.n === tier);

  return (
    <div>
      <div className="crm-side">
        {(["ranchers", "butchers"] as Side[]).map((s) => (
          <button key={s} className={"crm-seg" + (side === s && tier !== 0 ? " on" : "")} onClick={() => pick(s, tier === 0 ? 1 : tier)}>
            {s === "ranchers" ? "Ranchers" : "Butchers"}
          </button>
        ))}
      </div>

      <div className="crm-tiers">
        <button className={"crm-tiercard due" + (tier === 0 ? " on" : "")} onClick={() => pick(side, 0)}>
          <span className="tag">Due now</span>
          <span className="n">{due.length + pairsDue.length}</span>
          <span className="small">follow-ups dated today or earlier</span>
        </button>
        {tiers.map((t) => {
          const inTier = pool.filter((r) => lk.tierOf(r) === t.n);
          const open = inTier.filter((r) => isOpen(r.stage));
          const fresh = open.filter((r) => r.stage === "new").length;
          return (
            <button key={t.n} className={"crm-tiercard" + (tier === t.n ? " on" : "")} onClick={() => pick(side, t.n)} title={t.hint}>
              <span className="tag">Tier {t.n} · {t.label}</span>
              <span className="n">{open.length}</span>
              <span className="small">{fresh} not called yet{inTier.length - open.length ? ` · ${inTier.length - open.length} closed` : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="crm-listhead">
        <p className="small">
          {tier === 0
            ? "Everyone with a follow-up dated today or earlier, oldest first."
            : <><strong>{meta?.label}.</strong> {meta?.hint} Due follow-ups first, then never-called, then by launch order and fit.</>}
        </p>
        {tier !== 0 && closedHere > 0 && (
          <label className="small crm-check">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show {closedHere} closed
          </label>
        )}
      </div>

      {tier === 0 && pairsDue.length > 0 && (
        <div className="crm-pairsdue">
          {pairsDue.map((p) => (
            <button key={p.id} className="crm-row pair" onClick={() => onOpen("pair", p.id)}>
              <span className="crm-row-main">
                <span className="crm-name">{pairTitle(p, lk)}</span>
                <span className="small mute">Pair · {p.metro} · {PAIR_STAGES.find((s) => s.id === p.stage)?.label}</span>
              </span>
              <NextLine r={p} />
            </button>
          ))}
        </div>
      )}

      <ol className="crm-list">
        {list.map((r, i) => (
          <li key={r.kind + r.id} className={"crm-row" + (isOpen(r.stage) ? "" : " closed")} onClick={() => onOpen(r.kind, r.id)}>
            <span className="crm-num mono">{i + 1}</span>
            <span className="crm-row-main">
              <span className="crm-name">
                {r.name}
                {tier === 0 && <TierBadge n={lk.tierOf(r)} />}
              </span>
              <span className="small mute">
                {r.kind === "rancher" ? r.town : r.city}, {r.state} · {r.metro || "no metro"}
                {r.kind === "rancher" && r.contactName ? ` · ${r.contactName}` : ""}
                {r.owner ? ` · ${r.owner}'s` : ""}
              </span>
              <WhyChips r={r} lk={lk} />
            </span>
            <span className="crm-row-phone"><Phone phone={r.phone} /></span>
            <span className="crm-row-status">
              <StagePill stage={r.stage} />
              <NextLine r={r} />
            </span>
            <span className="crm-row-act">
              <button className="btn btn-ghost crm-logbtn" onClick={(e) => { e.stopPropagation(); onOpen(r.kind, r.id, true); }}>
                Log call
              </button>
            </span>
          </li>
        ))}
      </ol>
      {list.length === 0 && (
        <p className="mute crm-empty">
          {tier === 0 ? "Nothing due. Pick a tier and start calling." : "Nobody left in this tier with these filters."}
        </p>
      )}
      {tier === 0 && due.length > 0 && (
        <p className="small mute" style={{ marginTop: "var(--space-sm)" }}>
          Oldest follow-up: {fmtDay([...due].sort((a, b) => (a.nextDate ?? "").localeCompare(b.nextDate ?? ""))[0].nextDate)}.
        </p>
      )}
    </div>
  );
}
