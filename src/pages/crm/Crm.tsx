/* Partner CRM at /crm: Ranch Cuts' own back office for signing ranches
   and butchers. Tiered call lists, the full ranch and butcher lists,
   the pair pipeline and a metro rollup. Not linked from the site.

   Passcode: with the Apps Script backend, CRM_KEY (or ADMIN_KEY) in its
   Script Properties, checked server-side. Locally, the demo passcode. */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BACKEND_URL } from "../../data/config";
import { crmBackend, isDue, isOpen, openStore, METRO_ORDER, SEED_VERSION } from "../../lib/crm";
import { useCrm, useMe, OWNERS } from "./useCrm";
import { useLookups, blankFilters, type Filters, type Open } from "./shared";
import CallLists from "./CallLists";
import { RancherTable, ButcherTable } from "./Tables";
import { PairsBoard, Metros } from "./Pipeline";
import Drawer from "./Drawer";

const AUTH_KEY = "rc.crm.auth";
const KEY_KEY = "rc.crm.key";
const DEMO_PASSCODE = "PARTNERS";

type Tab = "calls" | "ranchers" | "butchers" | "pairs" | "metros";
const TABS: { id: Tab; label: string }[] = [
  { id: "calls", label: "Call lists" },
  { id: "ranchers", label: "Ranchers" },
  { id: "butchers", label: "Butchers" },
  { id: "pairs", label: "Pairs" },
  { id: "metros", label: "Metros" },
];

export default function Crm() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_KEY) ?? "");
  if (!authed) return <Gate onIn={(k) => { setKey(k); setAuthed(true); }} />;
  return <CrmApp adminKey={key} onLock={() => { sessionStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(KEY_KEY); setAuthed(false); }} />;
}

function Gate({ onIn }: { onIn: (key: string) => void }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState("");
  const [checking, setChecking] = useState(false);
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = code.trim();
    if (BACKEND_URL) {
      setChecking(true);
      try {
        await openStore(k).all();
      } catch (err) {
        setChecking(false);
        setBad((err as Error).message === "bad key" ? "That's not it." : "Couldn't reach the CRM sheet. Try again in a minute.");
        return;
      }
      setChecking(false);
    } else if (k.toUpperCase() !== DEMO_PASSCODE) {
      setBad("That's not it.");
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(KEY_KEY, k);
    onIn(k);
  };
  return (
    <main className="page confirm-wrap" style={{ maxWidth: 420 }}>
      <div className="tag" style={{ color: "var(--navy)", marginBottom: "var(--space-md)" }}>Ranch Cuts · partner CRM</div>
      <h2 className="d">Partners desk.</h2>
      <form className="decision" style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-lg)", textAlign: "left" }} onSubmit={unlock}>
        <div className="field">
          <label htmlFor="crm-pc">Passcode</label>
          <input id="crm-pc" type="password" value={code} onChange={(e) => { setCode(e.target.value); setBad(""); }} autoFocus />
        </div>
        {bad && <p className="small" style={{ color: "var(--brick)" }}>{bad}</p>}
        <button className="btn btn-solid btn-wide" type="submit" disabled={checking}>{checking ? "Checking…" : "Open the CRM"}</button>
      </form>
    </main>
  );
}

function CrmApp({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [me, setMe] = useMe();
  const crm = useCrm(adminKey, me);
  const lk = useLookups(crm);
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "calls";
  const openParam = params.get("open");
  const [focusLog, setFocusLog] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => {
    try { return { ...blankFilters, ...JSON.parse(sessionStorage.getItem("rc.crm.filters") || "{}") }; } catch { return blankFilters; }
  });
  const setF = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    try { sessionStorage.setItem("rc.crm.filters", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const setParam = useCallback((k: string, v: string | null) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v); else n.delete(k);
      return n;
    });
  }, [setParams]);
  const onOpen: Open = useCallback((kind, id, log = false) => { setFocusLog(log); setParam("open", `${kind}:${id}`); }, [setParam]);
  const target = useMemo(() => {
    if (!openParam) return null;
    const i = openParam.indexOf(":");
    return { kind: openParam.slice(0, i) as "rancher" | "butcher" | "pair", id: openParam.slice(i + 1) };
  }, [openParam]);

  const states = useMemo(() => [...new Set([...crm.ranchers, ...crm.butchers].map((r) => r.state))].sort(), [crm.ranchers, crm.butchers]);
  const metros = useMemo(() => {
    const extra = [...new Set(crm.butchers.map((b) => b.metro))].filter((m) => m && !METRO_ORDER.includes(m)).sort();
    return [...METRO_ORDER, ...extra];
  }, [crm.butchers]);

  const all = [...crm.ranchers, ...crm.butchers];
  const due = all.filter((r) => isOpen(r.stage) && isDue(r)).length + crm.pairs.filter((p) => isDue(p) && p.stage !== "lost").length;
  const week = Date.now() - 7 * 86_400_000;
  const callsThisWeek = crm.activities.filter((a) => new Date(a.at).getTime() > week && a.kind !== "note").length;
  const signed = crm.pairs.filter((p) => p.stage === "signed" || p.stage === "live").length;
  const where = { sheet: "the CRM sheet", file: "crm/crm.json (local dev)", browser: "this browser only (demo)" }[crmBackend()];

  if (crm.loading) return <main className="page section wide mute">Loading the CRM…</main>;

  return (
    <main className="page order-main crm" style={{ maxWidth: 1240 }}>
      <div className="admin-bar">
        <div>
          <div className="tag" style={{ color: "var(--navy)" }}>Ranch Cuts · partner CRM</div>
          <h2 className="d" style={{ fontSize: "2rem" }}>Ranches that finish, butchers that cut.</h2>
          <div className="crm-stats">
            <span><b>{crm.ranchers.length}</b> ranchers</span>
            <span><b>{crm.butchers.filter((b) => !b.disqualified).length}</b> butchers</span>
            <span><b>{crm.pairs.filter((p) => p.stage !== "lost").length}</b> pairs</span>
            <span><b>{signed}</b> signed or live</span>
            <span className={due ? "hot" : ""}><b>{due}</b> due now</span>
            <span><b>{callsThisWeek}</b> touches this week</span>
          </div>
        </div>
        <div className="admin-actions">
          <label className="crm-me small">
            I'm
            <select className="admin-select" value={me} onChange={(e) => setMe(e.target.value)}>
              {OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost" onClick={() => crm.reload()}>Refresh</button>
          <button className="btn btn-ghost" onClick={onLock}>Lock</button>
        </div>
      </div>

      {crm.error && (
        <div className="crm-error" role="alert">
          <span>{crm.error}</span>
          <button className="small" onClick={() => crm.setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={"admin-tab" + (tab === t.id ? " on" : "")} onClick={() => setParam("tab", t.id === "calls" ? null : t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "metros" && (
        <div className="crm-filters">
          <select className="admin-select" value={filters.metro} onChange={(e) => setF({ metro: e.target.value })} aria-label="Metro">
            <option value="">All metros</option>
            {metros.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="admin-select" value={filters.state} onChange={(e) => setF({ state: e.target.value })} aria-label="State">
            <option value="">All states</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="admin-select" value={filters.owner} onChange={(e) => setF({ owner: e.target.value })} aria-label="Owner">
            <option value="">Anyone's</option>
            {OWNERS.map((o) => <option key={o} value={o}>{o}'s</option>)}
            <option value="-">Unassigned</option>
          </select>
          <input className="admin-input crm-search" type="search" placeholder="Search name, town, notes…" value={filters.q}
            onChange={(e) => setF({ q: e.target.value })} aria-label="Search" />
          {(filters.metro || filters.state || filters.owner || filters.q) && (
            <button className="small" style={{ textDecoration: "underline" }} onClick={() => setF(blankFilters)}>Clear</button>
          )}
        </div>
      )}

      {tab === "calls" && <CallLists crm={crm} lk={lk} filters={filters} onOpen={onOpen} />}
      {tab === "ranchers" && <RancherTable crm={crm} lk={lk} filters={filters} onOpen={onOpen} />}
      {tab === "butchers" && <ButcherTable crm={crm} lk={lk} filters={filters} onOpen={onOpen} />}
      {tab === "pairs" && <PairsBoard crm={crm} lk={lk} filters={filters} onOpen={onOpen} />}
      {tab === "metros" && <Metros crm={crm} lk={lk} onPick={(m) => { setF({ metro: m }); setParam("tab", null); }} />}

      <p className="small mute crm-foot">
        Saved to {where}{crm.saving ? " · saving…" : ""}. Research from {SEED_VERSION} (rebuild with
        <span className="mono"> python3 scripts/build-crm-seed.py</span>); your stages, notes and calls are kept separately and survive a rebuild.
      </p>

      {target && (
        <Drawer crm={crm} lk={lk} target={target} focusLog={focusLog} onOpen={onOpen} onClose={() => setParam("open", null)} />
      )}
    </main>
  );
}
