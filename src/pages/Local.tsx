import { Suspense, lazy } from "react";
import { Link, useParams } from "react-router-dom";
import ColoradoMap from "../components/ColoradoMap";
import SteerTracker from "../components/SteerTracker";
import WaitlistForm from "../components/WaitlistForm";
import { PLANNED, partnershipBySlug, PARTNERSHIPS } from "../data/partnerships";
import {
  SHARES, DEPOSIT, SEASONS, CURRENT_SEASON, NEXT_SEASON, STORAGE_NOTE, ASSET, IMAGES,
  money, money2,
} from "../data/config";

const UsMap = lazy(() => import("../components/UsMap"));

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function Local() {
  const { slug } = useParams();
  const p = partnershipBySlug(slug);
  const planned = PLANNED.find((m) => m.slug === slug);

  if (!p && planned) return <PlannedPage slug={planned.slug} />;
  if (!p) {
    return (
      <main className="page section">
        <div className="wide">
          <h1 className="d">We don't have a partnership called that.</h1>
          <p className="lede" style={{ marginTop: "var(--space-md)" }}>
            <Link to="/find">Search by zip code</Link> or <Link to="/map">browse the map</Link>.
          </p>
        </div>
      </main>
    );
  }

  const season = SEASONS[CURRENT_SEASON];
  const next = SEASONS[NEXT_SEASON];
  const r = p.butcher.rates;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${p.butcher.name}, ${p.butcher.address}`)}`;

  return (
    <main>
      {/* lockup */}
      <section className="page local-hero">
        <div className="wide local-hero-grid">
          <div>
            <span className="tag eyebrow">Open now · {p.stateName}</span>
            <h1 className="d local-title">Ranch Cuts<br />{p.city}</h1>
            <p className="local-lockup">
              Beef from <b>{p.ranch.name}</b>,<br />cut at <b>{p.butcher.name}</b>.
            </p>
            <p className="lede">
              Serving {p.serves.slice(0, -1).join(", ")} and {p.serves[p.serves.length - 1]}. Your share is one steer from a ranch
              in {lowerFirst(p.ranch.region)}, cut by a butcher in {p.butcher.city}, picked up about an hour from {p.city}.
            </p>
            <div className="hero-actions">
              <Link to="/order" className="btn btn-solid btn-big">Reserve a share</Link>
              <a href="#meet" className="btn btn-ghost btn-big">Meet them</a>
            </div>
          </div>
          <div className="local-side">
            <SteerTracker />
            <div className="local-photo" style={{ backgroundImage: `url(${ASSET("angus-steer.jpg")})` }} role="img" aria-label="An Angus steer in profile" />
          </div>
        </div>
      </section>

      {/* meet the ranch / meet the butcher */}
      <section id="meet" className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Two local businesses, named on every share</h2>
            <p>
              {p.ranch.name} sells you the share of the steer and is the seller on your bill of sale. {p.butcher.name} harvests
              it, hangs it, cuts it to your sheet and bills you for that work. Ranch Cuts books it all and stays out of the way.
            </p>
          </div>
          <div className="meet-grid">
            <article className="meet ranch">
              <div className="meet-top">
                {p.ranch.logo && <img src={ASSET(p.ranch.logo)} alt="" className="meet-logo" />}
                <div>
                  <span className="tag">The ranch</span>
                  <h3 className="d">{p.ranch.name}</h3>
                  <p className="small mute">{p.ranch.region}</p>
                </div>
              </div>
              <p>{p.ranch.story}</p>
              <ul className="claims">
                {p.ranch.claims.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <p className="small">
                Questions about the cattle? Call or text {p.ranch.contact.name} at{" "}
                <a href={`tel:${p.ranch.contact.phone}`}>{p.ranch.contact.phone}</a>.
              </p>
            </article>

            <article className="meet butcher">
              <div className="meet-top">
                <div className="meet-icon" aria-hidden="true">
                  <svg viewBox="-24 -30 48 56" width="48" height="56"><path d="M-18 2 L-18 -12 L0 -26 L18 -12 L18 2 Z" /><rect x="-18" y="2" width="36" height="20" /><rect className="door" x="-5" y="8" width="10" height="14" /></svg>
                </div>
                <div>
                  <span className="tag">The butcher</span>
                  <h3 className="d">{p.butcher.name}</h3>
                  <p className="small mute">{p.butcher.city}, {p.stateName}</p>
                </div>
              </div>
              <p>{p.butcher.about}</p>
              <table className="rate-table">
                <caption className="tag">Processing, billed by the butcher to you</caption>
                <tbody>
                  <tr><td>Harvest fee, per steer</td><td className="n">{money(r.kill)}</td></tr>
                  <tr><td>Cut, wrap and freeze</td><td className="n">{money2(r.perLbHanging)}/lb hanging</td></tr>
                  <tr><td>Splitting a steer into quarters</td><td className="n">{money(r.perQuarterSplit)} per quarter</td></tr>
                  <tr><td>Patties (optional)</td><td className="n">$0.50/lb</td></tr>
                </tbody>
              </table>
              <p className="small">
                Pickup: <b>{p.butcher.address}</b>, <a href={`tel:${p.butcher.phone}`}>{p.butcher.phone}</a>.{" "}
                <a href={directions} target="_blank" rel="noreferrer">Get directions</a>
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* the map */}
      <section className="page section">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Where your beef comes from, and where you get it</h2>
            <p>
              All of it happens in {p.stateName}. The steer goes from the ranch to {p.butcher.city}; you drive to {p.butcher.city} once,
              when your beef is ready. It comes out frozen, vacuum sealed and boxed.
            </p>
          </div>
          <div className="co-map-grid local-maps">
            <ColoradoMap />
            <div className="local-zoom">
              <Suspense fallback={<div className="map-ph" />}>
                <UsMap aspect={1.25} focus={[p.butcher, { lat: p.ranch.lat, lon: p.ranch.lon }, p.center]} minSpan={80} highlight={[p.state]}
                  lines={[{ from: { lat: p.ranch.lat, lon: p.ranch.lon }, to: p.butcher }]}
                  markers={[
                    { id: "ranch", kind: "ranch", lat: p.ranch.lat, lon: p.ranch.lon, label: p.ranch.name, labelPos: "above" },
                    { id: "butcher", kind: "butcher", lat: p.butcher.lat, lon: p.butcher.lon, label: p.butcher.city, labelPos: "below" },
                    { id: "metro", kind: "live", lat: p.center.lat, lon: p.center.lon, label: p.city, labelPos: "left" },
                  ]}
                  label={`Map of ${p.stateName}: ${p.ranch.name}, ${p.butcher.name} and ${p.city}`} />
              </Suspense>
              <p className="diagram-hint">Ranch location shown as a region. We don't publish ranch addresses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* prices for this partnership */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Prices in {p.city}</h2>
            <p>
              Two charges, both shown up front: a fixed price for your share of the steer, paid to {p.ranch.name}, and processing,
              billed by {p.butcher.name} at the rates above. A {money(DEPOSIT)} deposit holds your share.
            </p>
          </div>
          <div className="share-grid">
            {Object.values(SHARES).map((s) => (
              <div className="share-card price-card" key={s.id}>
                {s.id === "half" && <span className="share-badge">Most popular</span>}
                <div className="d">{s.label}</div>
                <div className="d price-big">{money(s.total)}<sup>*</sup></div>
                <p className="small mute">{money2(s.rate)}/lb hanging weight, about {money2(s.takehomeRate)}/lb in your freezer</p>
                <div className="price-lines">
                  <div><span>Share of the steer, to {p.ranch.short}</span><b>{money(s.animal)}</b></div>
                  <div><span>Processing, to {p.butcher.short}<sup>*</sup></span><b>{money(s.processing)}</b></div>
                </div>
                <div className="share-specs">
                  <span>About {s.takehome} lb take-home<sup>*</sup></span>
                  <span>Freezer {s.freezer}</span>
                </div>
                <p className="share-feeds">You're {s.owners} of the steer. Feeds {s.feeds}.</p>
              </div>
            ))}
          </div>
          <p className="small mute" style={{ marginTop: "var(--space-md)", maxWidth: "75ch" }}>
            <sup>*</sup>Estimates for a typical 1,500 lb steer with a 900 lb hanging weight. The share price is fixed. Processing is
            billed on your steer's actual hanging weight, so that line can land a little above or below.
          </p>
        </div>
      </section>

      {/* calendar + logistics */}
      <section className="page section">
        <div className="wide dark-panel">
          <div>
            <span className="tag">Harvest</span>
            <p>{season.label}: pickup {season.pickupText}. {p.steersPerSeason} steers a season.</p>
            <p className="dim">When those are spoken for, new orders go to {next.label} ({next.pickupText}). A steer is only harvested once all its shares are sold.</p>
          </div>
          <div>
            <span className="tag">Pickup</span>
            <p>{p.butcher.name}<br />{p.butcher.address}</p>
            <p className="dim">{STORAGE_NOTE}</p>
          </div>
          <div>
            <span className="tag">Questions</span>
            <p>The cattle: {p.ranch.contact.name}, {p.ranch.contact.phone}.<br />Cuts and pickup: {p.butcher.short}, {p.butcher.phone}.</p>
            <p className="dim">Orders and the website: hello@ranchcuts.com.</p>
          </div>
        </div>
        <div className="wide" style={{ marginTop: "var(--space-xl)", display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <Link to="/order" className="btn btn-solid btn-big">Reserve a share in {p.city}</Link>
          <Link to="/how-it-works" className="btn btn-ghost btn-big">How it works</Link>
        </div>
      </section>

      <section className="photo-band" style={{ backgroundImage: `url(${IMAGES.heroPlains})` }}>
        <div className="photo-band-inner wide" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ padding: "0 var(--page-x)" }}>
            <span className="tag">Never crosses a state line</span>
            <h2 className="d" style={{ marginTop: "var(--space-sm)" }}>Raised, cut and picked up in {p.stateName}.</h2>
            <p>Every Ranch Cuts share stays in one state, from the ranch to the butcher to your freezer.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function PlannedPage({ slug }: { slug: string }) {
  const m = PLANNED.find((x) => x.slug === slug)!;
  const open = PARTNERSHIPS[0];
  return (
    <main>
      <section className="page section">
        <div className="wide local-hero-grid">
          <div>
            <span className="tag eyebrow">Planned · not open yet</span>
            <h1 className="d local-title">Ranch Cuts<br />{m.city}</h1>
            <p className="lede">
              {m.city} is on our list: {m.butchersNearby} butchers that process beef are within about an hour.
              We haven't signed a ranch or a butcher yet. Sign-ups from {m.city} decide how soon we do.
            </p>
            <WaitlistForm zip="" state={m.states[0]} nearest={m.slug} cta={`Bring it to ${m.city}`} />
            <p className="small" style={{ marginTop: "var(--space-lg)" }}>
              See how it works in our first partnership, <Link to={`/local/${open.slug}`}>Ranch Cuts {open.city}</Link>. Or{" "}
              <Link to="/about#partner">tell a rancher or butcher about us</Link>.
            </p>
          </div>
          <div className="local-zoom">
            <Suspense fallback={<div className="map-ph" />}>
              <UsMap aspect={1.2} focus={[m]} minSpan={300} highlight={m.states}
                markers={[{ id: m.slug, kind: "planned", lat: m.lat, lon: m.lon, label: m.city, selected: true }]} />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
