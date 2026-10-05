import { useState } from "react";
import { Link } from "react-router-dom";
import ZipSearch from "../components/ZipSearch";
import RcMark from "../components/RcMark";
import { LIVE, PLANNED } from "../data/partnerships";
import {
  SHARES, DEPOSIT, GROCERY_SOURCE, GROCERY_BASKET_PER_LB, SEASONS, CURRENT_SEASON, IMAGES, PRIMALS, ASSET,
  savingsFor, money, money2, moneySigned, type ShareId,
} from "../data/config";

const STEPS = [
  { n: "1", t: "Enter your zip code", b: "We match you with the partner ranch and partner butcher closest to you, in your state." },
  { n: "2", t: "Reserve a share", b: `A quarter, half or whole of one ear-tagged steer. ${money(DEPOSIT)} holds it.` },
  { n: "3", t: "Build your cut sheet", b: "A guided walk-through, one plain-English question at a time. We fill in the butcher's form for you." },
  { n: "4", t: "Pick it up", b: "Your steer hangs, gets cut to your sheet, and comes out frozen, sealed and boxed with your name on it." },
];

const FAQ = [
  {
    q: "How much freezer space do I need?",
    a: `A quarter is about ${SHARES.quarter.takehome} lb of beef and needs ${SHARES.quarter.freezer} of freezer space. A half needs ${SHARES.half.freezer}, a whole ${SHARES.whole.freezer}.`,
  },
  {
    q: "Who am I actually buying from?",
    a: "The ranch. You buy a share of one live steer from the partner ranch, which is the seller on your bill of sale, and the partner butcher processes it for you. You pay Ranch Cuts once for everything, and we pay the ranch and the butcher. Ranch Cuts never owns the cattle or the beef.",
  },
  {
    q: "Can I split a steer with friends?",
    a: "Yes. A steer can have up to four owners, so a whole is often two halves or four quarters. Each owner gets their own cut sheet and their own boxes.",
  },
  {
    q: "Why can't you ship it to me?",
    a: "Custom-cut beef belongs to you before it's harvested, and the rules that make that possible also mean it can't be shipped. Pickup is at the butcher. That's also why every partnership stays inside one state.",
  },
  {
    q: "What if there isn't a partnership near me?",
    a: "Join the list from the zip code search. We open where families ask, and we'll email you once, when yours opens.",
  },
];

export default function Landing() {
  const [savingsShare, setSavingsShare] = useState<ShareId>("half");
  const sv = savingsFor(savingsShare);
  const season = SEASONS[CURRENT_SEASON];
  const ribeye = sv.rows.find((r) => r.cut.id === "rib")!;

  return (
    <main>
      {/* hero: the deck cover. Navy, the steer bleeding off the right edge */}
      <section className="rc-cover">
        <div className="rc-cover-photo" style={{ backgroundImage: `url(${ASSET("angus-steer.jpg")})` }} aria-hidden="true" />
        <div className="page rc-cover-inner">
          <div className="wide">
            <div className="rc-cover-text rise">
              <span className="tag cover-kicker">Open now in {LIVE.city} · {PLANNED.length} more metros planned</span>
              <h1 className="d">Your local ranch.<br />Your local butcher.<br /><em className="hl">Your cuts.</em></h1>
              <p className="lede">
                Buy a quarter, half or whole steer from a ranch near you, cut exactly your way by a butcher near you. Steaks, roasts
                and burger all at one price a pound, and you know who raised it.
              </p>
              <ZipSearch dark />
              <p className="hero-fine">
                <span>Shares from {money(SHARES.quarter.total)}</span>
                <span>{money(DEPOSIT)} holds any size</span>
                <span>Pickup at your local butcher</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* four steps, as on the deck's solution slide */}
      <section className="page section">
        <div className="wide">
          <h2 className="d deck-title">One website.<br />Your local ranch. Your local butcher.</h2>
          <ol className="deck-steps">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <span className="deck-num" aria-hidden="true">{s.n}</span>
                {i < STEPS.length - 1 && <span className="deck-arrow" aria-hidden="true" />}
                <h3 className="d">{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
          <div className="statement-band">
            <p className="d statement">Ribeye and filet under {money2(Math.ceil(SHARES.quarter.takehomeRate * 2) / 2)}/lb. Every cut, one price.</p>
            <p className="statement-side">
              Open now: <b>Ranch Cuts {LIVE.city}</b>, beef from {LIVE.ranch.name}, cut at {LIVE.butcher.name}.{" "}
              <Link to={`/local/${LIVE.slug}`}>Meet them</Link>
            </p>
          </div>
          <p style={{ marginTop: "var(--space-xl)" }}><Link to="/how-it-works" className="btn btn-ghost">The whole process, step by step</Link></p>
        </div>
      </section>

      {/* the live partnership */}
      <section className="page section section-tint">
        <div className="wide">
          <Link to={`/local/${LIVE.slug}`} className="listing-card listing-wide" aria-label={`Ranch Cuts ${LIVE.city}: see the partnership`}>
            <div className="listing-photo" style={{ backgroundImage: `url(${ASSET("angus-steer.jpg")})` }} />
            <div className="listing-body">
              <div className="listing-tag"><span className="tag">Open now</span></div>
              <div className="listing-name"><img src={ASSET("brand/ranchcuts-horizontal-cream.svg")} alt="Ranch Cuts" width={438} height={106} /><span className="city">{LIVE.city}</span></div>
              <p className="listing-lockup">Beef from <b>{LIVE.ranch.name}</b>, cut at <b>{LIVE.butcher.name}</b>.</p>
              <dl className="listing-facts">
                <div><dt>Harvest</dt><dd>{season.label}</dd></div>
                <div><dt>Pickup</dt><dd>{LIVE.butcher.city}, CO</dd></div>
                <div><dt>Whole</dt><dd>{money2(SHARES.whole.rate)}/lb</dd></div>
              </dl>
              <span className="listing-cta">Meet the ranch and the butcher</span>
            </div>
          </Link>
        </div>
      </section>

      {/* the steak story */}
      <section className="page section">
        <div className="wide steak-grid">
          <div>
            <h2 className="d">Every cut costs the same per pound. Including the ribeye.</h2>
            <p className="lede" style={{ marginTop: "var(--space-md)" }}>
              At the store, ribeye runs {money2(ribeye.cut.retail)} a pound and burger {money2(sv.rows.find((r) => r.cut.id === "ground")!.cut.retail)}.
              In a share, your ribeyes, filets, roasts and ground beef all land at about {money2(SHARES[savingsShare].takehomeRate)} a pound in
              your freezer. Most of the savings is in the steaks.
            </p>
            <p className="small mute" style={{ marginTop: "var(--space-md)" }}>
              Across a whole steer's worth of cuts, the same beef costs about {money2(GROCERY_BASKET_PER_LB)}/lb at {GROCERY_SOURCE.store}.
            </p>
          </div>
          <div className="big-compare" role="img" aria-label={`Ribeye: ${money2(ribeye.cut.retail)} a pound at ${GROCERY_SOURCE.store}, about ${money2(SHARES[savingsShare].takehomeRate)} in a Ranch Cuts ${SHARES[savingsShare].label.toLowerCase()}`}>
            <div>
              <span className="tag">Ribeye at {GROCERY_SOURCE.store}</span>
              <div className="d compare-num store">{money2(ribeye.cut.retail)}</div>
            </div>
            <div className="compare-bar"><i style={{ width: "100%" }} /></div>
            <div>
              <span className="tag">Ribeye in a Ranch Cuts {SHARES[savingsShare].label.toLowerCase()}</span>
              <div className="d compare-num">{money2(SHARES[savingsShare].takehomeRate)}</div>
            </div>
            <div className="compare-bar yours"><i style={{ width: `${(SHARES[savingsShare].takehomeRate / ribeye.cut.retail) * 100}%` }} /></div>
          </div>
        </div>
      </section>

      {/* versus the grocery store */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Versus the grocery store</h2>
            <p>
              The same pounds of the same cuts, priced at {GROCERY_SOURCE.store} in {GROCERY_SOURCE.where}. Pick a size.
            </p>
          </div>

          <div className="savings-switch" role="group" aria-label="Share size">
            {Object.values(SHARES).map((s) => (
              <button key={s.id} className={"chip" + (savingsShare === s.id ? " on" : "")} aria-pressed={savingsShare === s.id}
                onClick={() => setSavingsShare(s.id)}>{s.label}</button>
            ))}
          </div>

          <div className="savings-headline">
            <div>
              <span className="tag">At {GROCERY_SOURCE.store}</span>
              <div className="d savings-big savings-store">{money(sv.totals.store)}</div>
              <p className="small mute">about {money2(sv.totals.storePerLb)}/lb across {sv.totals.lbs} lb</p>
            </div>
            <div>
              <span className="tag">A Ranch Cuts {SHARES[savingsShare].label.toLowerCase()}</span>
              <div className="d savings-big">{money(sv.totals.yours)}</div>
              <p className="small mute">{money2(SHARES[savingsShare].takehomeRate)}/lb, every cut, processing included</p>
            </div>
            <div>
              <span className="tag">You keep</span>
              <div className="d savings-big">{money(sv.totals.saved)}</div>
              <p className="small mute">on a {SHARES[savingsShare].label.toLowerCase()}</p>
            </div>
          </div>

          <div className="savings-table-wrap">
            <table className="savings-table">
              <thead>
                <tr>
                  <th>Cut</th>
                  <th className="n">Lbs</th>
                  <th className="n">Your $/lb</th>
                  <th className="n">{GROCERY_SOURCE.store} $/lb</th>
                  <th className="n">Difference</th>
                </tr>
              </thead>
              <tbody>
                {sv.rows.map((r) => (
                  <tr key={r.cut.id}>
                    <td>
                      <span className="cut-name">{r.cut.name}</span>
                      <span className="cut-store">vs. {r.cut.store}</span>
                    </td>
                    <td className="n mono">{r.lbs}</td>
                    <td className="n mono">{money2(SHARES[savingsShare].takehomeRate)}</td>
                    <td className="n mono">{money2(r.cut.retail)}</td>
                    <td className={"n mono" + (r.saved >= 10 ? " save" : " even")}>{moneySigned(r.saved)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="n mono">{sv.totals.lbs}</td>
                  <td className="n mono">{money(sv.totals.yours)}</td>
                  <td className="n mono">{money(sv.totals.store)}</td>
                  <td className="n mono save">{money(sv.totals.saved)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small mute" style={{ marginTop: "var(--space-md)", maxWidth: "72ch" }}>
            Pounds are estimates for a typical steer. Store prices are {GROCERY_SOURCE.store}'s regular shelf prices
            in {GROCERY_SOURCE.where} on {GROCERY_SOURCE.date}, no sale or loyalty pricing, for the closest comparable cut, using a typical
            steer's mix of cuts. Ground beef costs more in a share than a tray of store burger. The steaks are where a share pays off.
          </p>
        </div>
      </section>

      {/* why it costs less */}
      <section className="photo-band" style={{ backgroundImage: `url(${IMAGES.heroPlains})` }}>
        <div className="photo-band-inner wide" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ padding: "0 var(--page-x)" }}>
            <span className="tag">Why it costs less</span>
            <h2 className="d" style={{ marginTop: "var(--space-sm)" }}>Ranch, butcher, freezer. That's the whole supply chain.</h2>
            <p>
              Store beef passes through a sale barn, a packer, a distributor and a grocery store, and each one takes a cut. A share
              skips all of them. You pay less than the store, and the rancher earns more than the sale barn would pay.
            </p>
          </div>
        </div>
      </section>

      {/* sizes */}
      <section className="page section">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Three sizes</h2>
            <p>
              Prices in Denver, all in. The bigger the share, the lower the price a pound. A {money(DEPOSIT)} deposit holds any size.
            </p>
          </div>
          <div className="share-grid">
            {Object.values(SHARES).map((s) => (
              <div className="share-card price-card" key={s.id}>
                {s.id === "half" && <span className="share-badge">Most popular</span>}
                <div className="d">{s.label}</div>
                <div className="d price-big">{money(s.total)}<sup>*</sup></div>
                <p className="small mute">{money2(s.rate)}/lb hanging weight · about {money2(s.takehomeRate)}/lb take-home</p>
                <div className="share-specs">
                  <span>About {s.takehome} lb of beef<sup>*</sup></span>
                  <span>Freezer {s.freezer}</span>
                </div>
                <p className="share-feeds">Feeds {s.feeds}.</p>
              </div>
            ))}
          </div>
          <p className="small mute" style={{ marginTop: "var(--space-md)", maxWidth: "72ch" }}>
            <sup>*</sup>Estimates for a typical 1,500 lb steer. Each total covers your share of the steer, a fixed price that goes to
            the ranch, and processing, which goes to the butcher at its posted rates on your steer's actual hanging weight. You pay
            Ranch Cuts once; we pay them both.{" "}
            <Link to={`/local/${LIVE.slug}`}>See the Denver breakdown</Link>.
          </p>
        </div>
      </section>

      {/* what's in it */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Your beef, your way</h2>
            <p>
              Steak thickness, roast sizes, ground beef packages, the brisket, the bones. The cut sheet asks one question at a time and
              explains every cut in plain English.
            </p>
          </div>
          <div className="cut-strip">
            {PRIMALS.filter((p) => ["rib", "loin", "brisket", "plate", "chuck", "flank"].includes(p.id)).map((p) => (
              <figure className="cut-tile" key={p.id}>
                <img src={p.photo} alt={p.photoAlt} loading="lazy" />
                <figcaption>{p.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="page section">
        <div className="wide faq-wrap">
          <h2 className="d">Questions families ask</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <div className="a"><p>{f.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* closing zip + partners */}
      <section className="page">
        <div className="wide closing">
          <div className="closing-main">
            <RcMark width={120} color="var(--on-navy)" />
            <h2 className="d">Find the ranch closest to you.</h2>
            <ZipSearch dark id="zip-bottom" />
          </div>
          <div className="closing-side">
            <span className="tag">Ranchers and butchers</span>
            <p>Sell your steers by the share and fill your kill slots with booked families. We bring the customers, collect every payment and pay you.</p>
            <Link to="/about#partner" className="btn btn-on-dark">Partner with us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
