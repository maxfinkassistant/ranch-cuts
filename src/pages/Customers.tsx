/* Ranch office at /customers: the built-in CRM for one live
   partnership (Ranch Cuts Denver). Reads the same orders store the
   order flow writes. Passcode gate is a placeholder until real
   auth lands. */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SHARES, SEASONS, CURRENT_SEASON, DEPOSIT, LISTING_NAME, PROCESSOR, seasonOf, money, money2,
  type SeasonId,
} from "../data/config";
import { LIVE } from "../data/partnerships";
import {
  listOrders, updateOrder, updateOrderStatus, getNotes, setNote, STATUS_STEPS,
  listSteers, saveSteer, deleteSteer, getSettings, saveSettings, reservedSteers,
  DEFAULT_SETTINGS,
  type Order, type OrderStatus, type Steer, type SeasonSettings,
} from "../lib/store";
import { downloadCutSheet } from "../lib/cutsheetPdf";
import { finalPrice } from "../lib/estimate";
import {
  backendConfigured, checkAdminKey, fetchOffice, pushStatus,
  pushSteer, removeSteer, pushAssignment, pushSettings, sendInvoice, type Office,
} from "../lib/api";
import { refreshAvailability, steerCount } from "../lib/availability";
import SteerTracker from "../components/SteerTracker";

type Tab = "roster" | "steers" | "customers";

const fmtDate = (iso?: string) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

const AUTH_KEY = "rc.admin.v1";
const KEY_KEY = "rc.admin.key";
/* Local demo mode only (no backend). With a backend, the key is
   validated server-side and never lives in this code. */
const DEMO_PASSCODE = "KERSEY";

function exportCsv(orders: Order[], steers: Steer[]) {
  const head = [
    "code", "partnership", "status", "name", "email", "phone", "address", "share", "harvest",
    "steer", "steer_hanging_lbs", "est_ready", "est_takehome_lbs",
    "animal_to_ranch", "animal_discount", "processing_to_butcher", "processing_is",
    "total", "deposit_to_ranch", "animal_balance_to_ranch", "due_at_pickup", "created",
  ];
  const rows = orders.map((o) => {
    const steer = steers.find((s) => s.id === o.steer);
    const sh = SHARES[o.share];
    const p = finalPrice(o.share, steer);
    const animal = p?.animal ?? sh.animal;
    const processing = p?.processing ?? sh.processing;
    const total = p?.total ?? sh.total;
    return [
      o.code, o.partnership ?? LIVE.slug, o.status, o.name, o.email, o.phone, o.address,
      o.share, seasonOf(o).label,
      o.steer ?? "", steer?.hangingWeight ?? "", steer?.readyDate ?? "", sh.takehome,
      animal, p?.discount ?? 0, processing, p ? "actual" : "estimate",
      total, DEPOSIT, animal - DEPOSIT, total - DEPOSIT,
      new Date(o.createdAt).toISOString().slice(0, 10),
    ];
  });
  const csv = [head, ...rows]
    .map((r) => r.map((c) => `"${String(c).split('"').join('""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "ranchcuts-denver-orders.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* One steer, editable in place. `steer` undefined = the blank "add" row. */
function SteerRow({
  steer, linked, taken, onSave, onRemove,
}: {
  steer?: Steer;
  linked: Order[];
  taken: string[];                 // ids already in use by other steers
  onSave: (next: Steer, originalId?: string) => Promise<void> | void;
  onRemove?: () => void;
}) {
  const blank = { id: "", season: CURRENT_SEASON as SeasonId, hangingWeight: "", readyDate: "", discount: "" };
  const from = (s?: Steer) =>
    s ? {
      id: s.id, season: s.season,
      hangingWeight: s.hangingWeight ? String(s.hangingWeight) : "",
      readyDate: s.readyDate ?? "",
      discount: s.discount ? String(s.discount) : "",
    } : blank;
  const [d, setD] = useState(() => from(steer));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setD(from(steer)); }, [steer?.id, steer?.season, steer?.hangingWeight, steer?.readyDate, steer?.discount]);

  const id = d.id.trim();
  const dirty = JSON.stringify(d) !== JSON.stringify(from(steer));
  const clash = taken.includes(id);
  const weight = d.hangingWeight.trim() === "" ? undefined : Number(d.hangingWeight);
  const weightBad = weight !== undefined && !(weight > 0);
  const discount = d.discount.trim() === "" ? undefined : Number(d.discount);
  const discountBad = discount !== undefined && !(discount >= 0 && discount < SHARES.whole.animal);
  const claimed = linked.reduce((t, o) => t + SHARES[o.share].frac, 0);
  const label = steer ? `steer ${steer.id}` : "new steer";

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ id, season: d.season, hangingWeight: weight, readyDate: d.readyDate || undefined, discount: discount || undefined }, steer?.id);
      if (!steer) setD(blank);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>
        <input className="admin-input mono" value={d.id} placeholder={steer ? "" : "Tag or ID"}
          aria-label={`ID for ${label}`} onChange={(e) => setD({ ...d, id: e.target.value })} />
        {clash && <span className="admin-sub" style={{ color: "var(--navy)" }}>Already used</span>}
      </td>
      <td>
        <select className="admin-select" value={d.season} aria-label={`Harvest for ${label}`}
          onChange={(e) => setD({ ...d, season: e.target.value as SeasonId })}>
          {Object.values(SEASONS).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </td>
      <td>
        <input className="admin-input mono" type="number" min="0" step="1" inputMode="decimal"
          value={d.hangingWeight} placeholder="lb" aria-label={`Hanging weight for ${label}`}
          onChange={(e) => setD({ ...d, hangingWeight: e.target.value })} />
      </td>
      <td>
        <input className="admin-input mono" type="number" min="0" step="25" inputMode="decimal"
          value={d.discount} placeholder="0" aria-label={`Animal discount in dollars for ${label}`}
          onChange={(e) => setD({ ...d, discount: e.target.value })} />
        {discountBad
          ? <span className="admin-sub" style={{ color: "var(--navy)" }}>0 to {money(SHARES.whole.animal - 1)}</span>
          : discount
            ? <span className="admin-sub" style={{ color: "var(--slate)" }}>
                {money(Math.round(discount / 2))} off a half, {money(Math.round(discount / 4))} off a quarter
              </span>
            : <span className="admin-sub">Blank = none</span>}
      </td>
      <td>
        <input className="admin-input" type="date" value={d.readyDate} aria-label={`Estimated ready date for ${label}`}
          onChange={(e) => setD({ ...d, readyDate: e.target.value })} />
      </td>
      <td>
        {steer && (
          <>
            <span className={"admin-chip" + (claimed > 1 ? " hot" : claimed === 1 ? " done" : "")}>
              {claimed === 0 ? "No orders linked" : `${steerCount(claimed)} of 1 claimed`}
            </span>
            {linked.map((o) => (
              <span key={o.code} className="admin-chip">{SHARES[o.share].label} · {o.name}</span>
            ))}
          </>
        )}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button className="btn btn-ghost" disabled={busy || !id || clash || weightBad || discountBad || !dirty} onClick={save}>
          {busy ? "Saving…" : steer ? "Save" : "Add steer"}
        </button>
        {onRemove && (
          <button className="small" style={{ textDecoration: "underline", marginLeft: 12 }} onClick={onRemove}>
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

/* The two numbers behind the front-page tracker. */
function SettingsForm({
  settings, online, disabled, onSave,
}: {
  settings: SeasonSettings;
  online: number;                  // steers' worth ordered on the site
  disabled: boolean;
  onSave: (next: SeasonSettings) => Promise<void> | void;
}) {
  const [capacity, setCapacity] = useState(String(settings.capacity));
  const [offline, setOffline] = useState(String(settings.offline));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setCapacity(String(settings.capacity));
    setOffline(String(settings.offline));
  }, [settings.capacity, settings.offline]);

  const next: SeasonSettings = {
    capacity: Math.round(Number(capacity)),
    offline: Math.round(Number(offline) * 4) / 4,   // shares come in quarters
  };
  const valid = next.capacity >= 1 && next.offline >= 0;
  const dirty = next.capacity !== settings.capacity || next.offline !== settings.offline;
  const season = SEASONS[CURRENT_SEASON].name;

  return (
    <div className="steer-settings-form">
      <span className="tag" style={{ color: "var(--navy)" }}>Steer tracker</span>
      <div className="pair">
        <div className="field">
          <label htmlFor="ss-cap">Steers this {season}</label>
          <input id="ss-cap" type="number" min="1" step="1" inputMode="numeric" value={capacity}
            disabled={disabled} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ss-off">Reserved outside Ranch Cuts</label>
          <input id="ss-off" type="number" min="0" step="0.25" inputMode="decimal" value={offline}
            disabled={disabled} onChange={(e) => setOffline(e.target.value)} />
        </div>
      </div>
      <p className="small mute">
        The tracker counts {season} orders placed through Ranch Cuts ({steerCount(online)} steers' worth
        right now), plus whatever the ranch has promised outside it. Enter that in steers: a half
        is 0.5, a quarter is 0.25.
      </p>
      <div>
        <button
          className="btn btn-dark"
          disabled={disabled || busy || !valid || !dirty}
          onClick={async () => { setBusy(true); try { await onSave(next); } finally { setBusy(false); } }}
        >
          {busy ? "Saving…" : "Save tracker"}
        </button>
      </div>
    </div>
  );
}

export default function Customers() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>("roster");
  const [tick, setTick] = useState(0);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);
  const [invoiceSent, setInvoiceSent] = useState<Record<string, boolean>>({});
  const [remote, setRemote] = useState<Office | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const adminKey = sessionStorage.getItem(KEY_KEY) ?? "";
  const live = backendConfigured();
  const local = useMemo(() => listOrders(), [tick]);
  const orders = remote?.orders ?? local;
  const steers = useMemo(() => (live ? remote?.steers ?? [] : listSteers()), [live, remote, tick]);
  const settings = useMemo(() => (live ? remote?.settings ?? DEFAULT_SETTINGS : getSettings()), [live, remote, tick]);
  /* an Apps Script from before steer tracking answers without these */
  const steersReady = !live || !remote || remote.steers !== undefined;
  const notes = useMemo(() => getNotes(), [tick]);

  /* pull the roster from the Ranch Cuts order system */
  useEffect(() => {
    if (!authed || !live) return;
    let alive = true;
    fetchOffice(adminKey)
      .then((office) => { if (alive) { setRemote(office); setLoadError(null); } })
      .catch((e) => { if (alive) setLoadError((e as Error).message); });
    return () => { alive = false; };
  }, [authed, adminKey, tick, live]);

  /* Apply a change here right away, send it to the order system, then
     re-read so the screen shows what was actually saved. */
  const commit = async (apply: () => void, send: () => Promise<unknown>, optimistic?: (o: Office) => Office) => {
    if (live) {
      if (optimistic) setRemote((o) => (o ? optimistic(o) : o));
      try { await send(); setLoadError(null); } catch (e) { setLoadError((e as Error).message); }
    } else {
      apply();
    }
    refreshAvailability();
    setTick((x) => x + 1);
  };

  const patchOrder = (code: string, patch: Partial<Order>) => (o: Office): Office =>
    ({ ...o, orders: o.orders.map((x) => (x.code === code ? { ...x, ...patch } : x)) });

  const changeStatus = (o: Order, status: OrderStatus) =>
    commit(() => updateOrderStatus(o.code, status), () => pushStatus(adminKey, o.code, status), patchOrder(o.code, { status }));

  const assign = (o: Order, patch: { steer?: string; season?: SeasonId }) =>
    commit(() => updateOrder(o.code, patch), () => pushAssignment(adminKey, o.code, patch), patchOrder(o.code, patch));

  const storeSteer = (next: Steer, originalId?: string) =>
    commit(() => saveSteer(next, originalId), () => pushSteer(adminKey, next, originalId));

  const dropSteer = (steer: Steer) => {
    if (!window.confirm(`Remove steer ${steer.id}? Orders linked to it go back to unassigned.`)) return;
    commit(() => deleteSteer(steer.id), () => removeSteer(adminKey, steer.id));
  };

  const storeSettings = (next: SeasonSettings) =>
    commit(() => saveSettings(next), () => pushSettings(adminKey, next), (o) => ({ ...o, settings: next }));

  /* The final invoice goes out from here, not automatically: the ranch
     decides when a steer's numbers are settled enough to bill on. */
  const emailInvoice = async (o: Order) => {
    const steer = steers.find((x) => x.id === o.steer);
    const price = finalPrice(o.share, steer);
    if (!price) return;
    const ask =
      `Email ${o.name} their final invoice? Due at pickup: ${money(price.animalBalance)} to ${LIVE.ranch.name}`
      + (price.discount > 0 ? ` (after a ${money(price.discount)} discount)` : "")
      + ` plus ${money2(price.processing)} processing to ${LIVE.butcher.name}.`;
    if (!window.confirm(ask)) return;
    setInvoiceBusy(o.code);
    setLoadError(null);
    try {
      await sendInvoice(adminKey, o.code);
      setInvoiceSent((m) => ({ ...m, [o.code]: true }));
    } catch (e) {
      setLoadError(`Couldn't send ${o.code}'s invoice: ${(e as Error).message}`);
    } finally {
      setInvoiceBusy(null);
    }
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = code.trim();
    if (backendConfigured()) {
      setChecking(true);
      setUnreachable(false);
      const result = await checkAdminKey(key);
      setChecking(false);
      if (result === "unreachable") { setUnreachable(true); return; }
      if (result === "bad") { setBad(true); return; }
      sessionStorage.setItem(KEY_KEY, key);
    } else if (key.toUpperCase() !== DEMO_PASSCODE) {
      setBad(true);
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
    setAuthed(true);
  };

  if (!authed) {
    return (
      <main className="page confirm-wrap" style={{ maxWidth: 420 }}>
        <div className="tag" style={{ color: "var(--navy)", marginBottom: "var(--space-md)" }}>Ranch office: {LISTING_NAME}</div>
        <h2 className="d">Ranch hands only.</h2>
        <form
          className="decision"
          style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-lg)", textAlign: "left" }}
          onSubmit={unlock}
        >
          <div className="field">
            <label htmlFor="pc">Passcode</label>
            <input id="pc" type="password" value={code} onChange={(e) => { setCode(e.target.value); setBad(false); setUnreachable(false); }} autoFocus />
          </div>
          {bad && <p className="small" style={{ color: "var(--navy)" }}>That's not it. Ask Max or Josh.</p>}
          {unreachable && <p className="small" style={{ color: "var(--navy)" }}>Couldn't reach the order system. Give it a minute and try again.</p>}
          <button className="btn btn-solid btn-wide" type="submit" disabled={checking}>
            {checking ? "Checking…" : "Open the books"}
          </button>
        </form>
      </main>
    );
  }

  const customers = Object.values(
    orders.reduce<Record<string, { name: string; email: string; phone: string; orders: Order[] }>>((acc, o) => {
      const k = o.email.toLowerCase();
      acc[k] ??= { name: o.name, email: o.email, phone: o.phone, orders: [] };
      acc[k].orders.push(o);
      return acc;
    }, {}),
  ).sort((a, b) => a.name.localeCompare(b.name));

  /* the two sellers, kept apart: animal shares are the ranch's sales,
     processing is the butcher's (estimate until each steer is weighed) */
  const totals = orders.reduce(
    (t, o) => {
      const p = finalPrice(o.share, steers.find((x) => x.id === o.steer));
      return {
        hanging: t.hanging + SHARES[o.share].hanging,
        animal: t.animal + (p?.animal ?? SHARES[o.share].animal),
        processing: t.processing + (p?.processing ?? SHARES[o.share].processing),
        deposits: t.deposits + DEPOSIT,
      };
    },
    { hanging: 0, animal: 0, processing: 0, deposits: 0 },
  );

  return (
    <main className="page order-main" style={{ maxWidth: 1100 }}>
      <div className="admin-bar">
        <div>
          <div className="tag" style={{ color: "var(--navy)" }}>
            {SEASONS[CURRENT_SEASON].label}. Beef from {LIVE.ranch.name}, cut at {LIVE.butcher.name}
          </div>
          <h2 className="d" style={{ fontSize: "2rem" }}>Ranch office: {LISTING_NAME}</h2>
          <p className="small mute" style={{ marginTop: 4 }}>
            {orders.length} orders, ~{totals.hanging.toLocaleString()} lb hanging equivalent committed.
            {" "}{money(totals.animal)} in animal shares to {LIVE.ranch.name} ({money(totals.deposits)} in deposits),
            {" "}about {money(totals.processing)} in processing to {LIVE.butcher.short}.
            {live && !remote && !loadError && " Loading from the order sheet…"}
            {!live && " Local demo mode."}
          </p>
          {loadError && <p className="small" style={{ color: "var(--navy)" }}>Order system: {loadError}</p>}
        </div>
        <div className="admin-actions">
          <button className="btn btn-ghost" onClick={() => setTick((x) => x + 1)}>Refresh</button>
          <button className="btn btn-ghost" onClick={() => exportCsv(orders, steers)}>Export CSV</button>
          <button className="btn btn-ghost" onClick={() => { sessionStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(KEY_KEY); setAuthed(false); }}>
            Lock up
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {(["roster", "steers", "customers"] as Tab[]).map((t) => (
          <button key={t} className={"admin-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>
            {t === "roster" ? `Harvest roster (${orders.length})`
              : t === "steers" ? `Steers (${steers.length})`
              : `Customers (${customers.length})`}
          </button>
        ))}
      </div>

      {tab === "roster" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Share</th><th>Harvest &amp; steer</th><th>Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const steer = steers.find((x) => x.id === o.steer);
                const price = finalPrice(o.share, steer);
                const actual = price?.total ?? null;
                return (
                <tr key={o.code}>
                  <td className="mono">{o.code}{o.sample && <span className="admin-chip">sample</span>}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.name}</div>
                    <div className="small mute">{o.email}{o.phone && ` · ${o.phone}`}</div>
                  </td>
                  <td>{SHARES[o.share].label}, ~{SHARES[o.share].takehome} lb</td>
                  <td>
                    <select
                      className="admin-select"
                      value={seasonOf(o).id}
                      disabled={!steersReady}
                      onChange={(e) => assign(o, { season: e.target.value as SeasonId })}
                      aria-label={`Harvest for ${o.code}`}
                    >
                      {Object.values(SEASONS).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                    <select
                      className="admin-select"
                      style={{ display: "block", marginTop: 6 }}
                      value={o.steer ?? ""}
                      disabled={!steersReady}
                      onChange={(e) => assign(o, { steer: e.target.value })}
                      aria-label={`Steer for ${o.code}`}
                    >
                      <option value="">No steer yet</option>
                      {o.steer && !steer && <option value={o.steer}>{o.steer} (removed)</option>}
                      {steers.map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}
                    </select>
                    {steer?.readyDate && <span className="admin-sub">ready ≈ {fmtDate(steer.readyDate)}</span>}
                  </td>
                  <td className="mono">
                    {money(actual ?? SHARES[o.share].total)}
                    <span className="admin-sub">
                      Ranch {money(price?.animal ?? SHARES[o.share].animal)}
                    </span>
                    <span className="admin-sub">
                      Butcher {price ? money2(price.processing) : `~${money(SHARES[o.share].processing)}`}
                    </span>
                    {price?.discount ? (
                      <span className="admin-chip done">{money(price.discount)} off the animal</span>
                    ) : !price && <span className="admin-sub">estimate</span>}
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                      aria-label={`Status for ${o.code}`}
                    >
                      {STATUS_STEPS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions">
                    <button
                      className="small" style={{ textDecoration: "underline" }}
                      disabled={pdfBusy === o.code}
                      onClick={async () => { setPdfBusy(o.code); try { await downloadCutSheet(o); } finally { setPdfBusy(null); } }}
                    >
                      {pdfBusy === o.code ? "…" : "Cut sheet PDF"}
                    </button>
                    <Link className="small" to={`/customers/ticket/${o.code}`}>Ticket</Link>
                    <button
                      className="small" style={{ textDecoration: "underline" }}
                      disabled={!price || !live || invoiceBusy === o.code}
                      title={
                        !price ? "Weigh this order's steer first"
                          : !live ? "Needs the live backend"
                            : `Email the final invoice to ${o.email}`
                      }
                      onClick={() => emailInvoice(o)}
                    >
                      {invoiceBusy === o.code ? "Sending…" : invoiceSent[o.code] ? "Invoice sent ✓" : "Email invoice"}
                    </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="mute" style={{ textAlign: "center", padding: "var(--space-xl)" }}>No orders yet.</td></tr>
              )}
            </tbody>
          </table>
          <p className="small mute" style={{ marginTop: "var(--space-sm)" }}>
            "Cut sheet PDF" downloads the customer's filled {PROCESSOR.name} cutting-instructions form,
            ready to email to {PROCESSOR.cutSheetEmail}. Status changes update the customer's tracking
            page immediately. Link an order to a steer and, once that steer's hanging weight is in, the
            processing line switches from the estimate to the butcher's posted rates on the real weight.
            The animal share stays fixed. "Email invoice" sends the customer both lines, including any
            discount you set on the steer.
          </p>
        </div>
      )}

      {tab === "steers" && (
        <div>
          {!steersReady && (
            <div className="group-note">
              <span className="tag">Setup</span>
              <span>
                Steer tracking needs the updated order script. Paste the new
                <span className="mono"> apps-script/Code.gs</span> into the Apps Script project and
                deploy a new version. Steps are at the top of that file.
              </span>
            </div>
          )}

          <div className="steer-settings">
            <SteerTracker compact />
            <SettingsForm
              settings={settings}
              online={reservedSteers(orders, { ...settings, offline: 0 })}
              disabled={!steersReady}
              onSave={storeSettings}
            />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ear tag</th><th>Harvest</th><th>Hanging weight</th><th>Animal discount ($ off whole)</th><th>Est. ready date</th><th>Orders</th><th></th>
                </tr>
              </thead>
              <tbody>
                {steers.map((st) => (
                  <SteerRow
                    key={st.id}
                    steer={st}
                    linked={orders.filter((o) => o.steer === st.id)}
                    taken={steers.filter((x) => x.id !== st.id).map((x) => x.id)}
                    onSave={storeSteer}
                    onRemove={() => dropSteer(st)}
                  />
                ))}
                {steers.length === 0 && (
                  <tr><td colSpan={7} className="mute" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
                    No steers entered yet. Add the first one below.
                  </td></tr>
                )}
              </tbody>
              {steersReady && (
                <tfoot>
                  <SteerRow linked={[]} taken={steers.map((x) => x.id)} onSave={storeSteer} />
                </tfoot>
              )}
            </table>
          </div>
          <p className="small mute" style={{ marginTop: "var(--space-sm)" }}>
            Enter each steer as you know it: the ear tag first, hanging weight and ready date when you
            have them. Link orders to a steer from the Harvest roster tab. A discount is optional and
            only lowers the animal share (dollars off a whole steer, split by share); processing is
            always the butcher's to bill.
          </p>
        </div>
      )}

      {tab === "customers" && (
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          {customers.map((c) => (
            <div key={c.email} className="admin-customer">
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="small mute">{c.email}{c.phone && ` · ${c.phone}`}</div>
                <div className="small" style={{ marginTop: 6 }}>
                  {c.orders.map((o) => (
                    <span key={o.code} className="admin-chip">{SHARES[o.share].label} · {o.code}</span>
                  ))}
                  <span className="mono mute" style={{ marginLeft: 6 }}>
                    {money(c.orders.reduce((s, o) => s + SHARES[o.share].total, 0))} lifetime
                  </span>
                </div>
              </div>
              <div className="field" style={{ minWidth: 260 }}>
                <label htmlFor={`note-${c.email}`}>Notes</label>
                <textarea
                  id={`note-${c.email}`} rows={2}
                  defaultValue={notes[c.email.toLowerCase()] ?? ""}
                  placeholder="Wants extra soup bones, referred the Shahs…"
                  onBlur={(e) => setNote(c.email.toLowerCase(), e.target.value)}
                />
              </div>
            </div>
          ))}
          {customers.length === 0 && <p className="mute">No customers yet.</p>}
        </div>
      )}
    </main>
  );
}
