/* Printable ticket for one order, plus the filled CCMC PDF
   download. Print hides the site chrome. */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SHARES, PAYABLE_TO, RANCH_CONTACT, SUPPORT, LISTING_NAME, seasonOf, money, money2 } from "../data/config";
import { LIVE } from "../data/partnerships";
import { getOrder, listSteers, type Order, type Steer } from "../lib/store";
import { boxSummary, finalPrice, discountNote, shareCost } from "../lib/estimate";
import { downloadCutSheet } from "../lib/cutsheetPdf";
import { backendConfigured, fetchOrder, fetchOffice } from "../lib/api";

export default function CustomerTicket() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<Order | undefined>(() => getOrder(code));
  const [steers, setSteers] = useState<Steer[]>(() => (backendConfigured() ? [] : listSteers()));
  const [pdfBusy, setPdfBusy] = useState(false);

  /* the order sheet is the source of truth; the office key (kept for
     this browser session by the Ranch Office login) also brings the steers */
  useEffect(() => {
    if (!backendConfigured()) return;
    const key = sessionStorage.getItem("rc.admin.key");
    if (key) {
      fetchOffice(key)
        .then((office) => {
          const o = office.orders.find((x) => x.code.toUpperCase() === code.toUpperCase());
          if (o) setOrder(o);
          setSteers(office.steers ?? []);
        })
        .catch(() => {});
    } else {
      fetchOrder(code).then((o) => { if (o) setOrder(o); }).catch(() => {});
    }
  }, [code]);

  if (!order) {
    return (
      <main className="page confirm-wrap">
        <h2 className="d">No order {code.toUpperCase()}.</h2>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link to="/customers" className="btn btn-ghost">Back to the office</Link>
        </div>
      </main>
    );
  }

  const lines = boxSummary(order.cutSheet, order.share);
  const season = seasonOf(order);
  const steer = steers.find((s) => s.id === order.steer);
  /* real money once the steer has been weighed, the estimate until then */
  const price = finalPrice(order.share, steer);
  const note = discountNote(price);
  const est = shareCost(order.share);
  const readyOn = steer?.readyDate
    ? new Date(steer.readyDate + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <main className="page order-main" style={{ maxWidth: 680 }}>
      <div className="admin-bar no-print">
        <div className="tag" style={{ color: "var(--rust)" }}>Order ticket</div>
        <div className="admin-actions">
          <button
            className="btn btn-solid"
            disabled={pdfBusy}
            onClick={async () => { setPdfBusy(true); try { await downloadCutSheet(order); } finally { setPdfBusy(false); } }}
          >
            {pdfBusy ? "Building…" : "CCMC cut sheet PDF"}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <Link to="/customers" className="btn btn-ghost">Back</Link>
        </div>
      </div>

      <div className="ticket" style={{ marginTop: "var(--space-md)" }}>
        <div className="ticket-head">
          <span className="tag">{LISTING_NAME} · Order</span>
          <span className="mute">{order.code}</span>
        </div>
        <div className="ticket-row"><span className="k">Customer</span><span className="v">{order.name}</span></div>
        <div className="ticket-row"><span className="k">Phone</span><span className="v">{order.phone || "None given"}</span></div>
        <div className="ticket-row"><span className="k">Email</span><span className="v">{order.email}</span></div>
        <div className="ticket-row"><span className="k">Address</span><span className="v">{order.address || "None given"}</span></div>
        <div className="ticket-row"><span className="k">Ranch</span><span className="v">{LIVE.ranch.name}</span></div>
        <div className="ticket-row"><span className="k">Butcher</span><span className="v">{LIVE.butcher.name}, {LIVE.butcher.city}</span></div>
        <hr className="ticket-sep" />
        <div className="ticket-row"><span className="k">Share</span><span className="v">{SHARES[order.share].label} beef, {SHARES[order.share].owners}, ~{SHARES[order.share].hanging} lb hanging equivalent</span></div>
        <div className="ticket-row"><span className="k">Harvest</span><span className="v">{season.label}</span></div>
        <div className="ticket-row">
          <span className="k">Steer</span>
          <span className="v">
            {order.steer
              ? `${order.steer}${steer?.hangingWeight ? `, ${steer.hangingWeight} lb hanging` : ""}`
              : "Not assigned yet"}
          </span>
        </div>
        <div className="ticket-row"><span className="k">Pickup</span><span className="v">{readyOn ? `Est. ${readyOn}` : season.pickup}, {LIVE.butcher.city}</span></div>
        <hr className="ticket-sep" />
        {lines.map((l) => (
          <div className="ticket-row" key={l.name}>
            <span className="k">{l.name}</span>
            <span className="v">{l.detail}</span>
          </div>
        ))}
        {order.cutSheet.notes && (
          <div className="ticket-row"><span className="k">Notes</span><span className="v">{order.cutSheet.notes}</span></div>
        )}
        <hr className="ticket-sep" />
        {price ? (
          <>
            <div className="ticket-row">
              <span className="k">Share of the steer, {LIVE.ranch.name} (fixed)</span>
              <span className="v">
                {money(price.animal)}
                {price.discount > 0 && <>, {money(price.discount)} off {money(price.animalList)}</>}
              </span>
            </div>
            <div className="ticket-row">
              <span className="k">Processing, billed by {LIVE.butcher.name}</span>
              <span className="v">{money2(price.processing)}</span>
            </div>
            {price.processingLines.map((l) => (
              <div className="ticket-row" key={l.label}>
                <span className="k of-indent">{l.label}</span>
                <span className="v">{money2(l.amount)}</span>
              </div>
            ))}
            <div className="ticket-row"><span className="k">All in</span><span className="v">{money2(price.total)}</span></div>
            <div className="ticket-row"><span className="k">Deposit</span><span className="v">{money(price.deposit)}, paid to {PAYABLE_TO}</span></div>
            <div className="ticket-row"><span className="k">Animal balance to {PAYABLE_TO}</span><span className="v">{money(price.animalBalance)}</span></div>
            <div className="ticket-row"><span className="k">Processing to {LIVE.butcher.name}</span><span className="v">{money2(price.processing)}</span></div>
            <div className="ticket-total">
              <span>DUE AT PICKUP</span>
              <span className="v">{money2(price.balance)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="ticket-row">
              <span className="k">Share of the steer, {LIVE.ranch.name} (fixed)</span>
              <span className="v">{money(est.animal)}</span>
            </div>
            <div className="ticket-row">
              <span className="k">Processing, billed by {LIVE.butcher.name} (est.)</span>
              <span className="v">{money(est.processing)}</span>
            </div>
            <div className="ticket-row"><span className="k">All in (est.)</span><span className="v">{money(est.total)} at {money2(est.rate)}/lb equivalent</span></div>
            <div className="ticket-row"><span className="k">Deposit</span><span className="v">{money(est.deposit)}, paid to {PAYABLE_TO}</span></div>
            <div className="ticket-row"><span className="k">Animal balance to {PAYABLE_TO}</span><span className="v">{money(est.animalBalance)}</span></div>
            <div className="ticket-row"><span className="k">Processing to {LIVE.butcher.name} (est.)</span><span className="v">{money(est.processing)}</span></div>
            <div className="ticket-total">
              <span>DUE AT PICKUP (EST.)</span>
              <span className="v">{money(est.balance)}</span>
            </div>
          </>
        )}
      </div>

      {note && (
        <div className="rate-note">
          <span className="tag">Ranch discount on this steer</span>
          <p>{note}</p>
        </div>
      )}

      <p className="small mute" style={{ marginTop: "var(--space-md)" }}>
        Ranch questions: {RANCH_CONTACT.name}, {RANCH_CONTACT.phone}. Anything else: {SUPPORT.email}.{" "}
        {price === null
          ? "The share of the steer is a fixed price. Processing is estimated on a typical carcass; the butcher bills it on the actual hanging weight."
          : `Processing is figured at ${LIVE.butcher.name}'s posted rates on this steer's ${price.hangingLbs} lb hanging weight. The butcher's own invoice is final.`}
      </p>
    </main>
  );
}
