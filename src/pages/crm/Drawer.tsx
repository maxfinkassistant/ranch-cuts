/* The record drawer: everything about one rancher, butcher or pair,
   the call logger, what to confirm on the call, pairs and history. */

import { useEffect, useRef, useState } from "react";
import {
  STAGES, PAIR_STAGES, ACTIVITY_KINDS, RANCHER_TIERS, BUTCHER_TIERS, roadMiles, ago, fmtDay, today,
  type Rec, type RancherRec, type ButcherRec, type Pair, type Activity, type ActivityKind, type Stage,
  type PairStage, type Overlay,
} from "../../lib/crm";
import { OWNERS, type Crm } from "./useCrm";
import { StagePill, TierBadge, Phone, pairTitle, shortName, type Lookups, type Open } from "./shared";

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Drawer({
  crm, lk, target, focusLog, onOpen, onClose,
}: {
  crm: Crm; lk: Lookups; target: { kind: "rancher" | "butcher" | "pair"; id: string }; focusLog: boolean;
  onOpen: Open; onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rec = target.kind === "rancher" ? lk.rancherById.get(target.id) : target.kind === "butcher" ? lk.butcherById.get(target.id) : undefined;
  const pair = target.kind === "pair" ? crm.pairs.find((p) => p.id === target.id) : undefined;

  return (
    <div className="crm-drawer-wrap" onClick={onClose}>
      <aside className="crm-drawer" onClick={(e) => e.stopPropagation()} aria-label="Record">
        <button className="crm-close" onClick={onClose} aria-label="Close">×</button>
        {rec && <RecordView key={rec.id} crm={crm} lk={lk} rec={rec} focusLog={focusLog} onOpen={onOpen} />}
        {pair && <PairView key={pair.id} crm={crm} lk={lk} pair={pair} onOpen={onOpen} />}
        {!rec && !pair && <p className="mute">That record isn't here any more.</p>}
      </aside>
    </div>
  );
}

/* ---------------- log form ---------------- */

function LogForm({
  onLog, kinds, stages, autoFocus, current,
}: {
  onLog: (x: { kind: ActivityKind; summary: string; stage?: string; nextStep: string; nextDate: string }) => void;
  kinds: ActivityKind[];
  stages: { id: string; label: string }[];
  autoFocus: boolean;
  current: { nextStep?: string; nextDate?: string };
}) {
  const [kind, setKind] = useState<ActivityKind>(kinds[0]);
  const [summary, setSummary] = useState("");
  const [stage, setStage] = useState("");
  const [nextStep, setNextStep] = useState(current.nextStep ?? "");
  const [nextDate, setNextDate] = useState(current.nextDate ?? "");
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() && kind !== "no-answer" && kind !== "voicemail") { ref.current?.focus(); return; }
    onLog({ kind, summary: summary || ACTIVITY_KINDS.find((k) => k.id === kind)!.label, stage: stage || undefined, nextStep, nextDate });
    setSummary(""); setStage(""); setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <form className="crm-log" onSubmit={submit}>
      <div className="crm-kinds" role="radiogroup" aria-label="What happened">
        {kinds.map((k) => (
          <button type="button" key={k} role="radio" aria-checked={kind === k}
            className={"crm-kind" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>
            {ACTIVITY_KINDS.find((x) => x.id === k)!.label}
          </button>
        ))}
      </div>
      <textarea ref={ref} className="admin-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)}
        placeholder={kind === "no-answer" || kind === "voicemail" ? "Optional" : "What did you learn? Head per year, who kills for them, price reaction…"} />
      <div className="crm-log-row">
        <label className="crm-mini">
          <span>Stage</span>
          <select className="admin-select" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Auto</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="crm-mini grow">
          <span>Next step</span>
          <input className="admin-input" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Call back after weaning, send deck…" />
        </label>
        <label className="crm-mini">
          <span>Follow up</span>
          <input className="admin-input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </label>
      </div>
      <div className="crm-log-row">
        <span className="crm-quick">
          {[["Tomorrow", 1], ["+3 days", 3], ["+1 week", 7], ["+2 weeks", 14], ["+1 month", 30]].map(([l, n]) => (
            <button type="button" key={l} className="small" onClick={() => setNextDate(plusDays(n as number))}>{l}</button>
          ))}
          {nextDate && <button type="button" className="small" onClick={() => { setNextDate(""); setNextStep(""); }}>Clear</button>}
        </span>
        <button className="btn btn-solid" type="submit">{done ? "Logged ✓" : "Log it"}</button>
      </div>
    </form>
  );
}

/* ---------------- timeline ---------------- */

function Timeline({ items, crm }: { items: Activity[]; crm: Crm }) {
  if (!items.length) return <p className="small mute">Nothing logged yet.</p>;
  return (
    <ol className="crm-timeline">
      {items.map((a) => (
        <li key={a.id}>
          <span className="tag">{ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? a.kind}</span>
          <span className="small mute"> {ago(a.at)} · {a.by} · {new Date(a.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          <p className="small">{a.summary}</p>
          <button className="crm-undo small" onClick={() => { if (confirm("Delete this entry?")) crm.deleteActivity(a); }}>delete</button>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- field helpers ---------------- */

function Field({ label, value, onSave, options, placeholder, wide }: {
  label: string; value?: string; onSave: (v: string) => void; options?: string[]; placeholder?: string; wide?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <label className={"crm-mini" + (wide ? " wide" : "")}>
      <span>{label}</span>
      {options ? (
        <select className="admin-select" value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}>
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="admin-input" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
          onBlur={() => { if (v !== (value ?? "")) onSave(v); }} />
      )}
    </label>
  );
}

function Fact({ k, v, href }: { k: string; v?: string | number | null; href?: string }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="crm-fact">
      <dt>{k}</dt>
      <dd>{href ? <a href={href} target="_blank" rel="noreferrer">{v}</a> : v}</dd>
    </div>
  );
}

const url = (u: string) => (u && !/^https?:/.test(u) ? `https://${u}` : u);

/* ---------------- rancher / butcher ---------------- */

function RecordView({ crm, lk, rec, focusLog, onOpen }: { crm: Crm; lk: Lookups; rec: Rec; focusLog: boolean; onOpen: Open }) {
  const save = (patch: Partial<Overlay>) => crm.saveRec(rec, patch as Partial<Rec>);
  const tier = lk.tierOf(rec);
  const tiers = rec.kind === "rancher" ? RANCHER_TIERS : BUTCHER_TIERS;
  const pairs = lk.pairsOf(rec);
  const [notes, setNotes] = useState(rec.notes ?? "");
  useEffect(() => { setNotes(rec.notes ?? ""); }, [rec.notes]);

  return (
    <div className="crm-rec">
      <div className="tag">
        {rec.kind === "rancher" ? "Rancher" : "Butcher"} · <TierBadge n={tier} /> {tiers.find((t) => t.n === tier)?.label}
        {" "}· fit {rec.fitScore}{rec.kind === "rancher" ? ` (${rec.fitTier})` : ""}
        {rec.added && " · added in CRM"}
      </div>
      <h3 className="d crm-title">{rec.name}</h3>
      <p className="small mute">
        {rec.kind === "rancher" ? rec.town : rec.city}, {rec.state}{rec.zip ? ` ${rec.zip}` : ""} · serves {rec.metro || "?"}
        {rec.kind === "butcher" && rec.dba ? ` · dba ${rec.dba}` : ""}
      </p>

      <div className="crm-contact">
        <Phone phone={rec.phone} />
        {rec.kind === "rancher" && rec.email && <a href={`mailto:${rec.email}`}>{rec.email}</a>}
        {rec.website && <a href={url(rec.website)} target="_blank" rel="noreferrer">{rec.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>}
        {rec.kind === "rancher" && rec.contactName && <span>{rec.contactName}</span>}
      </div>

      <div className="crm-controls">
        <label className="crm-mini">
          <span>Stage</span>
          <select className="admin-select" value={rec.stage} onChange={(e) => save({ stage: e.target.value as Stage })}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="crm-mini">
          <span>Owner</span>
          <select className="admin-select" value={rec.owner ?? ""} onChange={(e) => save({ owner: e.target.value })}>
            <option value="">Unassigned</option>
            {OWNERS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="crm-mini">
          <span>Call tier</span>
          <select className="admin-select" value={rec.tierOverride ?? 0} onChange={(e) => save({ tierOverride: Number(e.target.value) || undefined })}>
            <option value={0}>Auto (T{rec.tierOverride ? "?" : tier})</option>
            {tiers.map((t) => <option key={t.n} value={t.n}>T{t.n} {t.label}</option>)}
          </select>
        </label>
        <label className="crm-mini">
          <span>Interest</span>
          <select className="admin-select" value={rec.interest ?? 0} onChange={(e) => save({ interest: Number(e.target.value) || undefined })}>
            <option value={0}>—</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"●".repeat(n)}{"○".repeat(5 - n)}</option>)}
          </select>
        </label>
      </div>
      {(rec.nextDate || rec.nextStep) && (
        <p className="small crm-followup">
          Next: {rec.nextStep || "follow up"}{rec.nextDate ? `, ${fmtDay(rec.nextDate)}` : ""}
          {rec.nextDate && rec.nextDate <= today() && <span className="crm-due"> due</span>}
        </p>
      )}

      {rec.kind === "rancher" && rec.brief && <CallPrep b={rec.brief} />}

      <section>
        <h4 className="crm-h">Log a call</h4>
        <LogForm
          kinds={["call", "no-answer", "voicemail", "email", "text", "visit", "note"]}
          stages={STAGES}
          autoFocus={focusLog}
          current={rec}
          onLog={(x) => crm.log(rec, { ...x, stage: x.stage as Stage | undefined })}
        />
      </section>

      <section>
        <h4 className="crm-h">Confirm on the call</h4>
        {rec.kind === "rancher" ? <RancherConfirm r={rec} save={save} lk={lk} /> : <ButcherConfirm b={rec} save={save} />}
      </section>

      <section>
        <h4 className="crm-h">Notes</h4>
        <textarea className="admin-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (rec.notes ?? "")) save({ notes }); }}
          placeholder="Anything worth knowing before the next call" />
      </section>

      {rec.kind === "rancher" && <Connections r={rec} crm={crm} lk={lk} onOpen={onOpen} />}

      <section>
        <h4 className="crm-h">Pairs</h4>
        {pairs.map((p) => (
          <button key={p.id} className="crm-pairlink" onClick={() => onOpen("pair", p.id)}>
            <span>{pairTitle(p, lk)}</span>
            <span className="admin-chip">{PAIR_STAGES.find((s) => s.id === p.stage)?.label}</span>
          </button>
        ))}
        <PairPicker crm={crm} lk={lk} rec={rec} onOpen={onOpen} />
      </section>

      <section>
        <h4 className="crm-h">History</h4>
        <Timeline items={lk.activityOf(rec.kind, rec.id)} crm={crm} />
      </section>

      <section>
        <h4 className="crm-h">Research</h4>
        {rec.kind === "rancher" ? <RancherResearch r={rec} lk={lk} onOpen={onOpen} /> : <ButcherResearch b={rec} />}
      </section>

      <p className="small mute crm-archive">
        <button className="crm-undo" onClick={() => {
          if (confirm(`Remove ${rec.name} from the CRM? Calls stay logged; the record is hidden.`)) save({ archived: true });
        }}>Remove from CRM</button>
      </p>
    </div>
  );
}

/* ---------------- call prep and connections ---------------- */

function CallPrep({ b }: { b: NonNullable<RancherRec["brief"]> }) {
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  return (
    <section className="crm-prep">
      <h4 className="crm-h">Call prep{b.researched ? ` · researched ${b.researched}` : ""}</h4>
      {b.owners && <p className="small"><strong>Who:</strong> {b.owners}</p>}
      {b.background && <p className="small"><strong>Background:</strong> {b.background}</p>}
      {b.sells_today && <p className="small"><strong>Sells today:</strong> {b.sells_today}</p>}
      {b.reputation && <p className="small"><strong>Reputation:</strong> {b.reputation}</p>}
      {b.connections && <p className="small"><strong>Works with:</strong> {b.connections}</p>}
      {b.openers.filter(Boolean).length > 0 && (
        <div className="crm-prep-list">
          <span className="tag">Openers</span>
          <ul>{b.openers.filter(Boolean).map((o, i) => <li key={i} className="small">{o}</li>)}</ul>
        </div>
      )}
      {b.cautions.filter(Boolean).length > 0 && (
        <div className="crm-prep-list caution">
          <span className="tag">Careful</span>
          <ul>{b.cautions.filter(Boolean).map((o, i) => <li key={i} className="small">{o}</li>)}</ul>
        </div>
      )}
      {b.sources.length > 0 && (
        <p className="small mute crm-sources">
          Sources: {b.sources.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer">{host(u)}</a>)}
        </p>
      )}
    </section>
  );
}

/* Who this ranch may know: our live partners, ranches on our list nearby (same state,
   within 40 road miles), and other ranches that use the same butcher. Their CRM stage
   shows, so a warm neighbor can open a door. */
function Connections({ r, crm, lk, onOpen }: { r: RancherRec; crm: Crm; lk: Lookups; onOpen: Open }) {
  const live = crm.ranchers.filter((x) => x.livePartner && x.id !== r.id)
    .map((x) => ({ x, mi: roadMiles(r, x) })).filter((y) => y.mi != null && y.x.state === r.state);
  const near = crm.ranchers.filter((x) => x.id !== r.id && !x.livePartner && x.state === r.state)
    .map((x) => ({ x, mi: roadMiles(r, x) })).filter((y) => y.mi != null && y.mi <= 40)
    .sort((a, b) => (a.mi ?? 0) - (b.mi ?? 0));
  const butcherId = r.currentButcherId;
  const sameButcher = butcherId ? crm.ranchers.filter((x) => x.id !== r.id && x.currentButcherId === butcherId) : [];
  const liveButcher = crm.butchers.find((b) => b.livePartner && b.state === r.state);
  const toLiveButcher = liveButcher ? roadMiles(r, liveButcher) : null;
  if (!live.length && !near.length && !sameButcher.length && toLiveButcher == null) return null;
  const Row = ({ x, why }: { x: RancherRec; why: string }) => (
    <button className="crm-conn" onClick={() => onOpen("rancher", x.id)}>
      <span><span className="crm-name">{shortName(x.name)}</span> <span className="small mute">{why}</span></span>
      <StagePill stage={x.stage} />
    </button>
  );
  return (
    <section>
      <h4 className="crm-h">Connections</h4>
      {live.map(({ x, mi }) => <Row key={x.id} x={x} why={`our live partner ranch, about ${mi} mi away. Ask ${x.contactName || "them"} if they know each other.`} />)}
      {liveButcher && toLiveButcher != null && toLiveButcher <= 120 && r.currentButcherId !== liveButcher.id && (
        <button className="crm-conn" onClick={() => onOpen("butcher", liveButcher.id)}>
          <span><span className="crm-name">{shortName(liveButcher.name)}</span> <span className="small mute">our live partner butcher, {toLiveButcher} mi away</span></span>
          <StagePill stage={liveButcher.stage} />
        </button>
      )}
      {sameButcher.map((x) => <Row key={x.id} x={x} why={`also uses ${shortName(lk.butcherById.get(butcherId)?.name ?? "their butcher")}`} />)}
      {near.filter(({ x }) => !sameButcher.includes(x)).slice(0, 6).map(({ x, mi }) => <Row key={x.id} x={x} why={`${mi} mi away, ${x.town}`} />)}
      {!live.length && !near.length && !sameButcher.length && <p className="small mute">No ranches on our list within 40 miles.</p>}
    </section>
  );
}

function RancherConfirm({ r, save, lk }: { r: RancherRec; save: (p: Partial<Overlay>) => void; lk: Lookups }) {
  return (
    <div className="crm-grid">
      <Field label="Finishes on own place?" value={r.finishesConfirmed} options={["Yes", "Partly", "No"]} onSave={(v) => save({ finishesConfirmed: v })} />
      <Field label="Head finished a year" value={r.headPerYear} placeholder="e.g. 40" onSave={(v) => save({ headPerYear: v })} />
      <Field label="Who kills for them today" value={r.butcherConfirmed}
        placeholder={r.currentButcherId ? shortName(lk.butcherById.get(r.currentButcherId)?.name ?? "") : r.currentProcessor || "Butcher name"}
        onSave={(v) => save({ butcherConfirmed: v })} />
      <Field label="Share at sale barn + 50% OK?" value={r.priceOk} options={["Yes", "Maybe", "No"]} onSave={(v) => save({ priceOk: v })} />
    </div>
  );
}

function ButcherConfirm({ b, save }: { b: ButcherRec; save: (p: Partial<Overlay>) => void }) {
  return (
    <div className="crm-grid">
      <Field label="Takes shares billed to owners?" value={b.takesShares} options={["Yes", "Maybe", "No"]} onSave={(v) => save({ takesShares: v })} />
      <Field label="Beef slots a week for us" value={b.slotsPerWeek} placeholder="1 to start" onSave={(v) => save({ slotsPerWeek: v })} />
      <Field label="Kill fee" value={b.confirmedKill} placeholder={b.postedKill != null ? `$${b.postedKill} posted` : "$"} onSave={(v) => save({ confirmedKill: v })} />
      <Field label="Per lb hanging" value={b.confirmedPerLb} placeholder={b.postedPerLb != null ? `$${b.postedPerLb} posted` : "$"} onSave={(v) => save({ confirmedPerLb: v })} />
      <Field label="Quarter split fee" value={b.confirmedSplit} placeholder={b.postedSplit != null ? `$${b.postedSplit} posted` : "$"} onSave={(v) => save({ confirmedSplit: v })} />
      <Field label="Booking lead time" value={b.leadTime} placeholder="e.g. 6 months" onSave={(v) => save({ leadTime: v })} />
    </div>
  );
}

function RancherResearch({ r, lk, onOpen }: { r: RancherRec; lk: Lookups; onOpen: Open }) {
  const nb = lk.butcherById.get(r.nearestButcherId);
  const cur = r.currentButcherId ? lk.butcherById.get(r.currentButcherId) : undefined;
  return (
    <>
      {r.finishEvidence && (
        <blockquote className="crm-evidence">
          <span className="tag">{r.finishConfidence} · {r.finishType}</span>
          <p className="small">{r.finishEvidence}</p>
          {r.evidenceUrl && <a className="small" href={url(r.evidenceUrl)} target="_blank" rel="noreferrer">Source</a>}
        </blockquote>
      )}
      <dl className="crm-facts">
        <Fact k="Raised from birth" v={r.raisedFromBirth} />
        <Fact k="Sells direct" v={r.sellsShares} />
        <Fact k="Posted price" v={r.postedPrice} />
        <Fact k="Processor (research)" v={r.currentProcessor} />
        <Fact k="Herd / volume" v={r.herd} />
        <Fact k="Breed" v={r.breed} />
        <Fact k="Road miles to metro" v={r.roadMiToMetro} />
        <Fact k="Notes" v={r.researchNotes} />
      </dl>
      <div className="crm-links">
        {cur && <button onClick={() => onOpen("butcher", cur.id)}>Their butcher: {cur.name} ›</button>}
        {nb && nb.id !== cur?.id && <button onClick={() => onOpen("butcher", nb.id)}>Nearest on our list: {nb.name}, {r.roadMiToButcher} mi ›</button>}
      </div>
    </>
  );
}

function ButcherResearch({ b }: { b: ButcherRec }) {
  return (
    <dl className="crm-facts">
      <Fact k="Inspection" v={b.inspection} />
      <Fact k="Size" v={b.size} />
      <Fact k="Custom beef" v={b.doesCustomBeef} />
      <Fact k="Takes outside cattle" v={b.takesOutsideCattle} />
      <Fact k="Posted rates" v={b.postedKill != null ? `$${b.postedKill} kill${b.postedPerLb != null ? `, $${b.postedPerLb}/lb hanging` : ""}${b.postedSplit != null ? `, $${b.postedSplit}/quarter split` : ""}` : ""}
        href={b.priceSourceUrl && /^http/.test(b.priceSourceUrl) ? b.priceSourceUrl : undefined} />
      <Fact k="List priority" v={b.listPriority} />
      <Fact k="Capable plants within 60 mi" v={b.capableWithin60} />
      <Fact k="Road miles to metro" v={b.roadMiToMetro} />
      <Fact k="Disqualifier" v={b.disqualifier} />
      <Fact k="Notes" v={b.researchNotes} />
    </dl>
  );
}

/* Propose a pair: same state only (the share standard), nearest first. */
function PairPicker({ crm, lk, rec, onOpen }: { crm: Crm; lk: Lookups; rec: Rec; onOpen: Open }) {
  const [pick, setPick] = useState("");
  const taken = new Set(lk.pairsOf(rec).map((p) => (rec.kind === "rancher" ? p.butcherId : p.rancherId)));
  const others = (rec.kind === "rancher" ? crm.butchers : crm.ranchers)
    .filter((o) => o.state === rec.state && !taken.has(o.id) && o.stage !== "dnc")
    .map((o) => ({ o, mi: roadMiles(rec, o) }))
    .sort((a, b) => (a.mi ?? 9999) - (b.mi ?? 9999))
    .slice(0, 40);
  if (!others.length) return <p className="small mute">No other {rec.kind === "rancher" ? "butchers" : "ranches"} in {rec.state} on the list yet.</p>;
  const go = () => {
    const o = others.find((x) => x.o.id === pick)?.o;
    if (!o) return;
    const id = rec.kind === "rancher" ? crm.addPair(rec, o as ButcherRec) : crm.addPair(o as RancherRec, rec);
    setPick("");
    onOpen("pair", id);
  };
  return (
    <div className="crm-log-row">
      <select className="admin-select grow" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Pair with">
        <option value="">Pair with a {rec.kind === "rancher" ? "butcher" : "ranch"} in {rec.state}…</option>
        {others.map(({ o, mi }) => (
          <option key={o.id} value={o.id}>{o.name}{mi != null ? ` · ${mi} mi` : ""} · {o.metro}</option>
        ))}
      </select>
      <button className="btn btn-ghost" disabled={!pick} onClick={go}>Propose pair</button>
    </div>
  );
}

/* ---------------- pair ---------------- */

function PairView({ crm, lk, pair, onOpen }: { crm: Crm; lk: Lookups; pair: Pair; onOpen: Open }) {
  const r = lk.rancherById.get(pair.rancherId);
  const b = lk.butcherById.get(pair.butcherId);
  const mi = r && b ? roadMiles(r, b) : null;
  const [notes, setNotes] = useState(pair.notes ?? "");
  useEffect(() => { setNotes(pair.notes ?? ""); }, [pair.notes]);
  const save = (patch: Partial<Pair>) => crm.savePair(pair, patch);
  const stageMeta = PAIR_STAGES.find((s) => s.id === pair.stage);

  return (
    <div className="crm-rec">
      <div className="tag">Pair · {pair.metro} · {pair.origin}</div>
      <h3 className="d crm-title">{pairTitle(pair, lk)}</h3>
      <p className="small mute">{mi != null ? `${mi} road miles apart` : ""}{stageMeta ? ` · ${stageMeta.hint}` : ""}</p>

      <div className="crm-sides">
        {[r, b].map((x) => x && (
          <button key={x.id} className="crm-sidecard" onClick={() => onOpen(x.kind, x.id)}>
            <span className="tag">{x.kind === "rancher" ? "Ranch" : "Butcher"}</span>
            <span className="crm-name">{x.name}</span>
            <span className="small mute">{x.kind === "rancher" ? x.town : x.city}, {x.state}</span>
            <StagePill stage={x.stage} />
            {x.phone && <Phone phone={x.phone} />}
          </button>
        ))}
      </div>

      <div className="crm-controls">
        <label className="crm-mini">
          <span>Pair stage</span>
          <select className="admin-select" value={pair.stage} onChange={(e) => save({ stage: e.target.value as PairStage })}>
            {PAIR_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="crm-mini">
          <span>Owner</span>
          <select className="admin-select" value={pair.owner ?? ""} onChange={(e) => save({ owner: e.target.value })}>
            <option value="">Unassigned</option>
            {OWNERS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      </div>

      <section>
        <h4 className="crm-h">Log a visit or call</h4>
        <LogForm kinds={["visit", "call", "email", "note"]} stages={PAIR_STAGES} autoFocus={false} current={pair}
          onLog={(x) => {
            crm.log(pair, { kind: x.kind, summary: x.summary, nextStep: x.nextStep, nextDate: x.nextDate });
            if (x.stage) save({ stage: x.stage as PairStage, nextStep: x.nextStep, nextDate: x.nextDate });
          }} />
      </section>

      <section>
        <h4 className="crm-h">Notes</h4>
        <textarea className="admin-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (pair.notes ?? "")) save({ notes }); }}
          placeholder="Who drives to whom, slot days, the cut sheet, open questions" />
      </section>

      <section>
        <h4 className="crm-h">History</h4>
        <Timeline items={lk.activityOf("pair", pair.id)} crm={crm} />
      </section>

      {!pair.livePartner && (
        <p className="small mute crm-archive">
          <button className="crm-undo" onClick={() => { if (confirm("Remove this pair?")) save({ archived: true }); }}>Remove pair</button>
        </p>
      )}
    </div>
  );
}
