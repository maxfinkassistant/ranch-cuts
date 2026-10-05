import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ZipSearch from "../components/ZipSearch";
import ColoradoMap from "../components/ColoradoMap";
import SteerTracker from "../components/SteerTracker";
import WaitlistForm from "../components/WaitlistForm";
import { PLANNED, partnershipBySlug, PARTNERSHIPS, lookupZip, coverageFor, type ZipPlace, type Coverage } from "../data/partnerships";
import "../styles/local.css";
import {
  SHARES, DEPOSIT, SEASONS, CURRENT_SEASON, NEXT_SEASON, STORAGE_NOTE, ASSET, IMAGES,
  money, money2,
} from "../data/config";

const UsMap = lazy(() => import("../components/UsMap"));

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const driveTime = (miles: number) => {
  const mins = Math.round(((miles / 55) * 60) / 5) * 5;
  return mins < 60 ? `${mins} minutes` : `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ""}`;
};

/* ?zip=80202 personalizes the page: the zip search links here with it. */
function useZip() {
  const [params, setParams] = useSearchParams();
  const zip = params.get("zip") ?? "";
  const [res, setRes] = useState<{ place: ZipPlace; cov: Coverage } | null>(null);
  useEffect(() => {
    let alive = true;
    setRes(null);
    if (zip) lookupZip(zip).then((place) => { if (alive && place) setRes({ place, cov: coverageFor(place) }); });
    return () => { alive = false; };
  }, [zip]);
  return { zip, res, setZip: (z: string) => setParams({ zip: z }, { replace: true }) };
}

export default function Local() {
  const { slug } = useParams();
  const { zip, res, setZip } = useZip();
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
      {/* lockup on the deck cover: navy, the steer bleeding off the right */}
      <section className="rc-cover local-cover">
        <div className="rc-cover-photo" style={{ backgroundImage: `url(${ASSET("angus-steer.jpg")})` }} aria-hidden="true" />
        <div className="page rc-cover-inner">
          <div className="wide">
            <div className="rc-cover-text">
              <span className="tag cover-kicker">
                {res && (res.cov.kind === "covered" || res.cov.kind === "reachable") && res.cov.partnership.slug === p.slug
                  ? `Your rancher and butcher for ${res.place.place} ${res.place.zip}`
                  : `Open now · ${p.stateName}`}
              </span>
              <h1 className="local-title"><img src={ASSET("brand/ranchcuts-horizontal-cream.svg")} alt="Ranch Cuts" width={438} height={106} /><span className="city">{p.city}</span></h1>
              <p className="local-lockup">
                Beef from <b>{p.ranch.name}</b>,<br />cut at <b>{p.butcher.name}</b>.
              </p>
              <p className="lede">
                Serving {p.serves.slice(0, -1).join(", ")} and {p.serves[p.serves.length - 1]}. Your share is one steer from a ranch
                in {lowerFirst(p.ranch.region)}, cut by a butcher in {p.butcher.city}, picked up about an hour from {p.city}.
              </p>
              <div className="hero-actions">
                <Link to="/order" className="btn btn-on-dark btn-big">Reserve a share</Link>
                <a href="#meet" className="btn btn-ghost on-navy btn-big">Meet them</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page local-tracker">
        <div className="wide trip-grid">
          <TripPanel p={p} zip={zip} res={res} onZip={setZip} />
          <SteerTracker />
        </div>
      </section>

      {/* meet your rancher and butcher */}
      <section id="meet" className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Meet your rancher and butcher</h2>
            <p>
              {p.ranch.name} raises your steer and sells you your share; it's the seller on your bill of sale.{" "}
              {p.butcher.name} harvests it, hangs it and cuts it to your sheet. You pay Ranch Cuts once, and we pay them both.
            </p>
          </div>
          <div className="meet-grid">
            <article className="meet ranch">
              <div className="meet-top">
                {p.ranch.logo && <img src={ASSET(p.ranch.logo)} alt="" className="meet-logo" />}
                <div>
                  <span className="tag">Your rancher</span>
                  <h3 className="d">{p.ranch.name}</h3>
                  <p className="small mute">{p.ranch.region}</p>
                </div>
              </div>
              <p>{p.ranch.story}</p>
              <dl className="profile">
                {p.ranch.facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
              </dl>
              <div className="meet-contact">
                <span className="tag">Questions about the cattle</span>
                <p>Call or text {p.ranch.contact.name} at <a href={`tel:${p.ranch.contact.phone}`}>{p.ranch.contact.phone}</a>.</p>
                <p className="small mute">We don't publish ranch addresses. The ranch is in {lowerFirst(p.ranch.region)}.</p>
              </div>
            </article>

            <article className="meet butcher">
              <div className="meet-top">
                <div className="meet-icon" aria-hidden="true">
                  <svg viewBox="-24 -30 48 56" width="48" height="56"><path d="M-18 2 L-18 -12 L0 -26 L18 -12 L18 2 Z" /><rect x="-18" y="2" width="36" height="20" /><rect className="door" x="-5" y="8" width="10" height="14" /></svg>
                </div>
                <div>
                  <span className="tag">Your butcher</span>
                  <h3 className="d">{p.butcher.name}</h3>
                  <p className="small mute">{p.butcher.city}, {p.stateName}</p>
                </div>
              </div>
              <p>{p.butcher.about}</p>
              <dl className="profile">
                {p.butcher.facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
              </dl>
              <table className="rate-table">
                <caption className="tag">Processing, at the butcher's posted rates</caption>
                <tbody>
                  <tr><td>Harvest fee, per steer</td><td className="n">{money(r.kill)}</td></tr>
                  <tr><td>Cut, wrap and freeze</td><td className="n">{money2(r.perLbHanging)}/lb hanging</td></tr>
                  <tr><td>Splitting a steer into quarters</td><td className="n">{money(r.perQuarterSplit)} per quarter</td></tr>
                  <tr><td>Patties (optional)</td><td className="n">$0.50/lb</td></tr>
                </tbody>
              </table>
              <div className="meet-contact">
                <span className="tag">Pickup</span>
                <p><b>{p.butcher.address}</b>, <a href={`tel:${p.butcher.phone}`}>{p.butcher.phone}</a></p>
                <p className="small"><a href={directions} target="_blank" rel="noreferrer">Get directions to {p.butcher.city}</a></p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* the season, start to finish */}
      <section className="page section">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Your {season.name} harvest, start to finish</h2>
            <p>Every steer for {season.label} is harvested together. A steer goes to the butcher only once all of its shares are sold.</p>
          </div>
          <ol className="season-steps">
            <li><span className="deck-num">1</span><b>Reserve</b><p>A {money(DEPOSIT)} deposit holds your share. Build your cut sheet any time before harvest.</p></li>
            <li><span className="deck-num">2</span><b>Harvest</b><p>Your steer goes from {p.ranch.name} to {p.butcher.name} in {p.butcher.city}.</p></li>
            <li><span className="deck-num">3</span><b>14-day hang</b><p>It dry-ages on the rail for two weeks to tenderize.</p></li>
            <li><span className="deck-num">4</span><b>Cut to your sheet</b><p>Vacuum sealed, labeled with your name, frozen and boxed.</p></li>
            <li><span className="deck-num">5</span><b>Pickup</b><p>{season.pickup} in {p.butcher.city}. We tell you the day it's ready.</p></li>
          </ol>
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
              One payment to Ranch Cuts, with both parts shown up front: a fixed price for your share of the steer, which goes to
              {" "}{p.ranch.name}, and processing at the rates above, which goes to {p.butcher.name}. A {money(DEPOSIT)} deposit holds your share.
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
                  <div><span>Share of the steer, goes to {p.ranch.short}</span><b>{money(s.animal)}</b></div>
                  <div><span>Processing, goes to {p.butcher.short}<sup>*</sup></span><b>{money(s.processing)}</b></div>
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
            figured on your steer's actual hanging weight, so that line can land a little above or below.
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
            <p className="dim">Orders and payments: hello@ranchcuts.com.</p>
          </div>
        </div>
        <div className="wide" style={{ marginTop: "var(--space-xl)", display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <Link to="/order" className="btn btn-accent btn-big">Reserve a share in {p.city}</Link>
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

type P = NonNullable<ReturnType<typeof partnershipBySlug>>;

/* "Your trip": the drive from the family's zip to pickup, or a zip checker. */
function TripPanel({ p, zip, res, onZip }: { p: P; zip: string; res: { place: ZipPlace; cov: Coverage } | null; onZip: (z: string) => void }) {
  if (res && (res.cov.kind === "covered" || res.cov.kind === "reachable") && res.cov.partnership.slug === p.slug) {
    const { place, cov } = res;
    const from = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${place.zip}`)}&destination=${encodeURIComponent(`${p.butcher.name}, ${p.butcher.address}`)}`;
    return (
      <div className="trip">
        <span className="tag">Your trip to pickup</span>
        <p className="d trip-big">About {cov.drive} miles</p>
        <p>From {place.place} ({place.zip}) to {p.butcher.name} in {p.butcher.city}, roughly {driveTime(cov.drive)} each way. You make the drive once, when your beef is ready.</p>
        {cov.kind === "reachable" && <p className="small mute">That's a longer drive than most of our families make. Many split it with whoever shares their steer.</p>}
        <p className="small"><a href={from} target="_blank" rel="noreferrer">Directions from {place.zip}</a> · <button className="linkish" onClick={() => onZip("")}>Use a different zip</button></p>
      </div>
    );
  }
  if (res) {
    return (
      <div className="trip">
        <span className="tag">{res.place.place}, {res.place.state}</span>
        <p>Ranch Cuts {p.city} serves {p.stateName} only: the ranch, the butcher and your pickup are always in the same state.</p>
        <p className="small"><Link to={`/find/${res.place.zip}`}>See what's near {res.place.zip}</Link></p>
      </div>
    );
  }
  return (
    <div className="trip">
      <span className="tag">How far is pickup from you?</span>
      <p>Enter your zip code to see the drive to {p.butcher.city}.{zip ? ` We couldn't find ${zip}.` : ""}</p>
      <ZipSearch size="small" id="trip-zip" cta="Check" onZip={onZip} />
    </div>
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
            <h1 className="local-title"><img src={ASSET("brand/ranchcuts-horizontal-navy.svg")} alt="Ranch Cuts" width={438} height={106} /><span className="city">{m.city}</span></h1>
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
