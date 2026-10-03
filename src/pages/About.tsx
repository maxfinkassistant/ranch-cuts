import { Link } from "react-router-dom";
import RcMark from "../components/RcMark";
import { LIVE, PLANNED } from "../data/partnerships";
import { SUPPORT, ASSET } from "../data/config";

/* Every number here is sourced in ~/Documents/RanchCuts (research/ and
   the model). Sale barn vs store: wiki/10-Business/Pricing.md. */
const SALE_BARN = 3270;
const AT_THE_STORE = 7233;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function About() {
  return (
    <main>
      {/* opener */}
      <section className="page section about-hero">
        <div className="wide about-hero-grid">
          <div>
            <span className="tag eyebrow">About us</span>
            <h1 className="d">Beef should come from somebody you can name.</h1>
          </div>
          <p className="lede">
            Ranch Cuts connects families with a ranch near them and a butcher near them, so they can buy a share of one steer, cut
            their way. We started with one ranch and one butcher in Colorado. We're building the same partnership in every metro that
            has the ranches and butchers to support it.
          </p>
        </div>
      </section>

      {/* the gap */}
      <section className="page section dark-section">
        <div className="wide gap-grid">
          <div>
            <span className="tag" style={{ color: "var(--muted-on-navy)" }}>Why we started</span>
            <h2 className="d" style={{ marginTop: "var(--space-sm)" }}>The same steer is worth twice as much at the store as it is at the sale barn.</h2>
            <p style={{ marginTop: "var(--space-md)" }}>
              When a rancher sells a finished steer at the sale barn, it brings about ${SALE_BARN.toLocaleString()}. By the time its
              cuts reach a grocery case in Denver, the same animal sells for about ${AT_THE_STORE.toLocaleString()}. The difference
              goes to the packer, the trucks, the distributor and the store. The rancher sees none of it, and the family buying a
              ribeye pays for all of it.
            </p>
            <p style={{ marginTop: "var(--space-md)" }}>
              Ranch Cuts closes that gap. Families pay less than the store. The rancher earns more than the sale barn. The local
              butcher fills harvest slots with families who've already paid a deposit.
            </p>
          </div>
          <div className="gap-bars" role="img" aria-label={`One steer: about $${SALE_BARN} at the sale barn, about $${AT_THE_STORE} at the grocery store`}>
            <div className="gap-row">
              <span className="tag">At the sale barn</span>
              <div className="gap-bar"><i style={{ width: `${(SALE_BARN / AT_THE_STORE) * 100}%` }} /></div>
              <b className="d">${SALE_BARN.toLocaleString()}</b>
            </div>
            <div className="gap-row">
              <span className="tag">Its cuts at the store</span>
              <div className="gap-bar store"><i style={{ width: "100%" }} /></div>
              <b className="d">${AT_THE_STORE.toLocaleString()}</b>
            </div>
            <p className="small">One finished steer, fall 2026. Store figure uses King Soopers Denver shelf prices for the same cuts.</p>
          </div>
        </div>
      </section>

      {/* what we are */}
      <section className="page section">
        <div className="wide what-grid">
          <div>
            <h2 className="d">What Ranch Cuts is</h2>
            <ul className="about-list">
              <li><b>A marketplace for steer shares.</b> One website where families find their local ranch and butcher, reserve a share and build a cut sheet.</li>
              <li><b>A partnership in every place.</b> One partner ranch and one partner butcher who work together, named on every share.</li>
              <li><b>The paperwork.</b> Bills of sale, cut sheets in each owner's name, the harvest calendar, payments to the ranch and butcher, reminders and pickup.</li>
              <li><b>One standard everywhere.</b> The same <Link to="/how-it-works">share rules</Link> in every state, written to the strictest one.</li>
            </ul>
          </div>
          <div>
            <h2 className="d">What it isn't</h2>
            <ul className="about-list not">
              <li><b>A meat company.</b> We never own the cattle or the beef, and we never handle it. The ranch sells the share; the butcher processes it for you.</li>
              <li><b>A blend.</b> Your beef is one steer from one ranch. Not trim from many animals, not a box of assorted cuts.</li>
              <li><b>Shipped.</b> Custom-cut beef stays in its state and goes from the butcher to you. No warehouses, no couriers.</li>
              <li><b>A middleman's markup.</b> Ranch Cuts earns a small share of each sale from the ranch and the butcher. It's inside the price, not added on top.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* the first partnership */}
      <section className="page section section-tint">
        <div className="wide first-grid">
          <div className="first-photo" style={{ backgroundImage: `url(${ASSET("angus-steer.jpg")})` }} role="img" aria-label="An Angus steer" />
          <div>
            <span className="tag eyebrow">Where it started</span>
            <h2 className="d">Ranch Cuts <span className="city">{LIVE.city}</span></h2>
            <p style={{ marginTop: "var(--space-md)" }}>
              Our first partnership is {LIVE.ranch.name}, which raises Angus cattle on pasture in {lowerFirst(LIVE.ranch.region)} and
              grain-finishes them on its own Colorado pens, and {LIVE.butcher.name}, a butcher in {LIVE.butcher.city}. The ranch keeps
              ownership of every animal from conception to harvest. The butcher hangs every steer for 14 days and cuts it to each
              owner's sheet.
            </p>
            <p style={{ marginTop: "var(--space-md)" }}>
              Everything on this website, from the cut sheet to the pickup reminders, was built and tested with them first.
            </p>
            <p style={{ marginTop: "var(--space-lg)" }}><Link to={`/local/${LIVE.slug}`} className="btn btn-dark">Meet them</Link></p>
          </div>
        </div>
      </section>

      {/* how we pick partners */}
      <section className="page section">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">How we choose partners</h2>
            <p>We sign a ranch and its butcher together, in person. Here's what we look for.</p>
          </div>
          <div className="pick-grid">
            <div>
              <span className="tag">Ranches</span>
              <ul className="about-list">
                <li>Raises and finishes its own cattle, and can tell you how</li>
                <li>Can commit steers to a harvest calendar a season ahead</li>
                <li>Sets its own price and stands behind it as seller of record</li>
                <li>In the same state as the butcher and the families it serves</li>
              </ul>
            </div>
            <div>
              <span className="tag">Butchers</span>
              <ul className="about-list">
                <li>Holds a current custom-exempt permit or license, USDA-inspected preferred</li>
                <li>Keeps owner records and labels every package Not For Sale</li>
                <li>Hangs beef before cutting, and works from each owner's own cut sheet</li>
                <li>Can hold a slot or two a week for Ranch Cuts steers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* partner with us */}
      <section id="partner" className="page section">
        <div className="wide partner-panel">
          <div>
            <RcMark width={96} color="var(--on-navy)" />
            <h2 className="d">Ranchers and butchers: let's work together.</h2>
            <p>
              We're looking for ranch and butcher partners in {PLANNED.slice(0, 6).map((m) => m.city).join(", ")} and {PLANNED.length - 6} more metros
              across Nebraska, Kansas, Missouri, Iowa, Oklahoma, Texas, Minnesota and Wisconsin. If you're near one of them, or near a
              place that should be next, we'd like to hear from you.
            </p>
          </div>
          <div className="partner-cols">
            <div>
              <span className="tag">For ranchers</span>
              <p>Sell your finished steers by the share at a price you set, well above what the sale barn pays. We bring the families, the deposits and the paperwork. You keep your name on every share.</p>
            </div>
            <div>
              <span className="tag">For butchers</span>
              <p>Fill harvest slots with steers whose owners have already paid a deposit and sent a clean cut sheet. You bill your own processing at your own rates. No extra insurance asked.</p>
            </div>
            <a href={`mailto:${SUPPORT.partnersEmail}?subject=${encodeURIComponent("Partnering with Ranch Cuts")}`} className="btn btn-on-dark btn-big">Email {SUPPORT.partnersEmail}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
