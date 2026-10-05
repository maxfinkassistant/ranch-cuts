import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SHARES, PAYABLE_TO, RANCH_CONTACT, SUPPORT, LISTING_NAME, seasonOf, money, money2, type ShareId } from "../data/config";
import { LIVE } from "../data/partnerships";
import { getOrder, listOrders, listSteers, STATUS_STEPS, statusIndex, type Order } from "../lib/store";
import { boxSummary, finalPrice, discountNote, shareCost } from "../lib/estimate";
import { downloadCutSheet } from "../lib/cutsheetPdf";
import { backendConfigured, fetchTracking, type PublicPricing } from "../lib/api";

export default function Track() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [order, setOrder] = useState<Order | undefined>(() => (code ? getOrder(code) : undefined));
  const [pricing, setPricing] = useState<PublicPricing | undefined>();
  const [loading, setLoading] = useState(false);
  const mine = listOrders();

  /* local cache first; then the Ranch Cuts order system if configured */
  useEffect(() => {
    if (!code) return;
    const local = getOrder(code);
    setOrder(local);
    setPricing(undefined);
    if (!backendConfigured()) return;
    let alive = true;
    setLoading(true);
    fetchTracking(code)
      .then(({ order: remote, pricing: p }) => {
        if (!alive) return;
        if (remote) setOrder(remote);
        if (p) setPricing(p);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  /* ---------- lookup ---------- */
  if (!code || !order) {
    if (code && loading) {
      return (
        <main className="page order-main" style={{ maxWidth: 760 }}>
          <p className="mute">Looking up {code.toUpperCase()}…</p>
        </main>
      );
    }
    return (
      <main className="page order-main" style={{ maxWidth: 760 }}>
        <div className="section-head">
          <h2 className="d">Track your order</h2>
          <p>Enter the order code from your confirmation email. It looks like RC-4F7K2M.</p>
        </div>

        {code && !order && (
          <p className="small" style={{ color: "var(--navy)", marginBottom: "var(--space-md)" }}>
            No order found for <span className="mono">{code.toUpperCase()}</span>. Check the code and try again.
          </p>
        )}

        <form
          className="lookup"
          onSubmit={(e) => { e.preventDefault(); if (query.trim()) navigate(`/track/${query.trim().toUpperCase()}`); }}
        >
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="RC-______" aria-label="Order code" />
          <button className="btn btn-solid" type="submit">Look up</button>
        </form>

        {mine.length > 0 && (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <h3 className="d" style={{ marginBottom: "var(--space-md)" }}>Orders on this device</h3>
            <div className="member-list">
              {mine.map((o) => (
                <Link key={o.code} to={`/track/${o.code}`} className="member" style={{ textDecoration: "none" }}>
                  <span className="who">{o.name}{o.sample ? " · sample" : ""}</span>
                  <span className="what">{o.code} · {SHARES[o.share].label.toUpperCase()}, {seasonOf(o).label.toUpperCase()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  /* ---------- order detail ---------- */
  /* the sample order can be re-scoped from the pricing cards */
  const asked = params.get("share");
  const viewShare: ShareId =
    order.sample && asked && asked in SHARES ? (asked as ShareId) : order.share;

  const season = seasonOf(order);
  const idx = statusIndex(order.status);
  const lines = boxSummary(order.cutSheet, viewShare);

  /* the live backend hands back this order's own animal; in local demo
     mode the steers are right here in the browser */
  const weighed = pricing ?? (backendConfigured() ? undefined : listSteers().find((s) => s.id === order.steer));
  const price = finalPrice(viewShare, weighed);
  const note = discountNote(price);
  const est = shareCost(viewShare);
  const whenFor = (stepId: string): string => {
    switch (stepId) {
      case "reserved": return new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      case "processing": return "14-day hang";
      case "ready": return season.pickup;
      default: return "";
    }
  };

  return (
    <main className="page order-main">
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "var(--space-md)", maxWidth: "none" }}>
        <div>
          <div className="tag" style={{ color: "var(--navy)", marginBottom: "var(--space-xs)" }}>Order {order.code}</div>
          <h2 className="d">{SHARES[viewShare].label} beef · {season.label}</h2>
          <p className="mute" style={{ marginTop: "var(--space-xs)" }}>
            {LISTING_NAME}. Beef from {LIVE.ranch.name}, cut at {LIVE.butcher.name}.
          </p>
          <p className="mute" style={{ marginTop: 2 }}>
            {order.name}{order.sample && ", sample order for demonstration"}
          </p>
          {order.sample && (
            <div className="group-note" style={{ marginTop: "var(--space-md)", marginBottom: 0 }}>
              <span className="tag">Sample</span>
              <span>
                This is an example order so you can see what a finished cut sheet looks like.
                Nothing here is reserved.{" "}
                <Link to="/order"><b>Build your own →</b></Link>
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <button
            className="btn btn-ghost"
            disabled={pdfBusy}
            onClick={async () => { setPdfBusy(true); try { await downloadCutSheet(order); } finally { setPdfBusy(false); } }}
          >
            {pdfBusy ? "Building…" : "Cut sheet PDF"}
          </button>
          <Link to="/track" className="btn btn-ghost">Different order</Link>
        </div>
      </div>

      <div className="cutsheet-grid">
        {/* timeline */}
        <div>
          <div className="timeline">
            {STATUS_STEPS.map((s, i) => {
              const state = i < idx ? "done" : i === idx ? "now" : "";
              return (
                <div className={"tl-step " + state} key={s.id}>
                  <div className="tl-marker">
                    <div className="tl-dot" />
                    {i < STATUS_STEPS.length - 1 && <div className="tl-line" />}
                  </div>
                  <div className="tl-body">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", alignItems: "baseline" }}>
                      <h4>{s.label}</h4>
                      <span className="tl-when">{whenFor(s.id)}</span>
                    </div>
                    <p>{s.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {order.status === "reserved" && (
            <div className="group-note" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
              <span className="tag">Held</span>
              <span>
                Your cut sheet can be adjusted until <strong>your steer goes to the butcher</strong>.
                Call or text {RANCH_CONTACT.name} at {LIVE.ranch.name}, {RANCH_CONTACT.phone}.
              </span>
            </div>
          )}
        </div>

        {/* estimated box */}
        <div className="ticket" style={{ alignSelf: "start" }}>
          <div className="ticket-head">
            <span className="tag">Your estimated box</span>
            <span className="mute">{order.code}</span>
          </div>
          <div className="ticket-row"><span className="k">Share</span><span className="v">{SHARES[viewShare].label} beef</span></div>
          <div className="ticket-row"><span className="k">Harvest</span><span className="v">{season.label}</span></div>
          <div className="ticket-row"><span className="k">Pickup</span><span className="v">{season.pickup}, {LIVE.butcher.city}</span></div>
          <hr className="ticket-sep" />
          {lines.map((l) => (
            <div className="ticket-row" key={l.name}>
              <span className="k">{l.name}</span>
              <span className="v">{l.detail}</span>
            </div>
          ))}
          <div className="ticket-total">
            <span>ESTIMATED TAKE-HOME</span>
            <span className="v">≈ {SHARES[viewShare].takehome} LB</span>
          </div>
        </div>
      </div>

      {price ? (
        <div className="owed">
          <div className="owed-head">
            <span className="tag">Your final total</span>
            <span className="small">Your steer weighed in at {price.hangingLbs} lb hanging</span>
          </div>
          <div className="owed-rows">
            <div className="owed-row">
              <span>Your share of the steer, goes to {LIVE.ranch.name} (fixed)</span>
              <b>
                {money(price.animal)}
                {price.discount > 0 && <s className="owed-was">{money(price.animalList)}</s>}
              </b>
            </div>
            <div className="owed-row">
              <span>
                Processing by {LIVE.butcher.name} at its posted rates, goes to the butcher
                <span className="of-sub">{price.processingLines.map((l) => `${l.label} ${money2(l.amount)}`).join("; ")}</span>
              </span>
              <b>{money2(price.processing)}</b>
            </div>
            <div className="owed-row">
              <span>All in</span>
              <b>{money2(price.total)}</b>
            </div>
            <div className="owed-row">
              <span>Deposit already paid to {PAYABLE_TO}</span>
              <b>- {money(price.deposit)}</b>
            </div>
            <div className="owed-row total">
              <span>
                Due at pickup
                <span className="of-sub">
                  Paid to {PAYABLE_TO}: {money(price.animalBalance)} for your share (goes to {LIVE.ranch.name}), {money2(price.processing)} processing (goes to {LIVE.butcher.name})
                </span>
              </span>
              <b>{money2(price.balance)}</b>
            </div>
          </div>
          {note && (
            <div className="rate-note on-dark">
              <span className="tag">Good news on your price</span>
              <p>{note}</p>
            </div>
          )}
          <p className="owed-fine">
            Processing is at the butcher's posted rates on your steer's actual hanging weight. You pay
            {" "}{PAYABLE_TO}, and Ranch Cuts pays the ranch and the butcher. Ranch questions: {RANCH_CONTACT.name},
            {" "}{RANCH_CONTACT.phone}. Anything else: {SUPPORT.email}.
          </p>
        </div>
      ) : (
        <div className="owed">
          <div className="owed-head">
            <span className="tag">What you'll pay {PAYABLE_TO}</span>
            <span className="small">Estimate until your steer is weighed</span>
          </div>
          <div className="owed-rows">
            <div className="owed-row">
              <span>Your share of the steer, goes to {LIVE.ranch.name} (fixed)</span>
              <b>{money(est.animal)}</b>
            </div>
            <div className="owed-row">
              <span>Processing by {LIVE.butcher.name} at its posted rates, goes to the butcher (estimate)</span>
              <b>{money(est.processing)}</b>
            </div>
            <div className="owed-row">
              <span>All in (estimate)</span>
              <b>{money(est.total)}</b>
            </div>
            <div className="owed-row">
              <span>Deposit paid to {PAYABLE_TO}, applies to your share of the steer</span>
              <b>- {money(est.deposit)}</b>
            </div>
            <div className="owed-row total">
              <span>
                Due at pickup
                <span className="of-sub">
                  Paid to {PAYABLE_TO}: {money(est.animalBalance)} for your share (goes to {LIVE.ranch.name}), about {money(est.processing)} processing (goes to {LIVE.butcher.name})
                </span>
              </span>
              <b>{money(est.balance)}</b>
            </div>
          </div>
          <p className="owed-fine">
            Your share of the steer is a fixed price. Processing is priced on your steer's actual hanging
            weight, so that line can move a little either way. You pay {PAYABLE_TO} for both. Ranch questions: {RANCH_CONTACT.name},
            {" "}{RANCH_CONTACT.phone}. Anything else: {SUPPORT.email}.
          </p>
        </div>
      )}
    </main>
  );
}
