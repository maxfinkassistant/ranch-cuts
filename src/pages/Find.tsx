import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ZipSearch from "../components/ZipSearch";
import WaitlistForm from "../components/WaitlistForm";
import { lookupZip, coverageFor, PLANNED, type Coverage, type ZipPlace } from "../data/partnerships";
import { SHARES, SEASONS, CURRENT_SEASON, money, money2 } from "../data/config";

const UsMap = lazy(() => import("../components/UsMap"));

const driveTime = (miles: number) => {
  const mins = Math.round((miles / 55) * 60 / 5) * 5;
  return mins < 60 ? `${mins} minutes` : `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ""}`;
};

export default function Find() {
  const { zip = "" } = useParams();
  const [state, setState] = useState<{ loading: boolean; place: ZipPlace | null; cov: Coverage | null }>({ loading: !!zip, place: null, cov: null });

  useEffect(() => {
    if (!zip) { setState({ loading: false, place: null, cov: null }); return; }
    let alive = true;
    setState({ loading: true, place: null, cov: null });
    lookupZip(zip).then((place) => {
      if (!alive) return;
      setState({ loading: false, place, cov: place ? coverageFor(place) : null });
    });
    return () => { alive = false; };
  }, [zip]);

  const { loading, place, cov } = state;

  return (
    <main>
      <section className="page section find-top">
        <div className="wide find-head">
          <div>
            <span className="tag eyebrow">Find your ranch</span>
            <h1 className="d">Who raises your beef depends on where you live.</h1>
            <p className="lede">
              Every Ranch Cuts share comes from a ranch near you and is cut by a butcher near you, in your state.
              Enter your zip code to meet yours.
            </p>
          </div>
          <ZipSearch key={zip} initial={zip} />
        </div>
      </section>

      {zip && (
        <section className="page section section-tint" aria-live="polite">
          <div className="wide">
            {loading && <p className="mute">Looking up {zip}...</p>}
            {!loading && !place && (
              <div className="find-result">
                <h2 className="d">We couldn't find {zip}.</h2>
                <p>Check the number and try again. A few zip codes used only for PO boxes or businesses aren't on our list; try the zip code where you live.</p>
              </div>
            )}
            {!loading && place && cov && <Result place={place} cov={cov} />}
          </div>
        </section>
      )}

      {!zip && (
        <section className="page section section-tint">
          <div className="wide find-legend">
            <div>
              <span className="tag">Open now</span>
              <p className="d find-legend-big">Denver</p>
              <p className="small mute">Front Range, Colorado</p>
            </div>
            <div>
              <span className="tag">Planned next</span>
              <p className="find-planned">{PLANNED.map((m) => m.city).join(", ")}</p>
              <p className="small mute"><Link to="/map">See them on the map</Link></p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Result({ place, cov }: { place: ZipPlace; cov: Coverage }) {
  const where = `${place.place}, ${place.state}`;
  const you = { lat: place.lat, lon: place.lon };

  if (cov.kind === "covered" || cov.kind === "reachable") {
    const p = cov.partnership;
    const season = SEASONS[CURRENT_SEASON];
    return (
      <div className="find-grid">
        <div className="find-result">
          <span className="tag eyebrow">{where} · {cov.kind === "covered" ? "You're covered" : "In range, a longer drive"}</span>
          <h2 className="d">Your local partnership is Ranch Cuts {p.city}.</h2>
          <p className="find-lockup">Beef from <b>{p.ranch.name}</b>, cut at <b>{p.butcher.name}</b>.</p>
          <dl className="find-facts">
            <div><dt>Pickup</dt><dd>{p.butcher.name}, {p.butcher.address}</dd></div>
            <div><dt>From {place.place}</dt><dd>About {cov.drive} miles, roughly {driveTime(cov.drive)} each way</dd></div>
            <div><dt>Next harvest</dt><dd>{season.label}, pickup {season.pickupText}</dd></div>
            <div><dt>Shares</dt><dd>Quarter {money(SHARES.quarter.total)}, half {money(SHARES.half.total)}, whole {money(SHARES.whole.total)}, about {money2(SHARES.whole.rate)} to {money2(SHARES.quarter.rate)} a pound hanging weight, all in</dd></div>
          </dl>
          {cov.kind === "reachable" && (
            <p className="small find-note">
              That's a longer drive than most of our families make, but you're in {p.stateName}, so you can buy a share. Plenty of
              people make one trip a year for a freezer full of beef. Many split the drive with whoever shares their steer.
            </p>
          )}
          <div className="hero-actions">
            <Link to={`/local/${p.slug}`} className="btn btn-solid btn-big">Meet your ranch and butcher</Link>
            <Link to="/order" className="btn btn-ghost btn-big">Reserve a share</Link>
          </div>
        </div>
        <div className="find-map">
          <Suspense fallback={<div className="map-ph" />}>
            <UsMap
              aspect={1.2}
              minSpan={70}
              focus={[you, p.butcher, { lat: p.ranch.lat, lon: p.ranch.lon }]}
              highlight={[p.state]}
              lines={[{ from: { lat: p.ranch.lat, lon: p.ranch.lon }, to: p.butcher, kind: "route" }, { from: you, to: p.butcher, kind: "drive" }]}
              markers={[
                { id: "ranch", kind: "ranch", lat: p.ranch.lat, lon: p.ranch.lon, label: p.ranch.name, labelPos: "above" },
                { id: "butcher", kind: "butcher", lat: p.butcher.lat, lon: p.butcher.lon, label: `${p.butcher.short}, ${p.butcher.city}`, labelPos: "below" },
                { id: "you", kind: "you", lat: place.lat, lon: place.lon, label: place.place, labelPos: "left" },
              ]}
              label={`Map: ${place.place}, the butcher in ${p.butcher.city}, and ${p.ranch.name} in ${p.ranch.region}`}
            />
          </Suspense>
          <p className="diagram-hint">Ranch to butcher (dashed), and your drive to pickup.</p>
        </div>
      </div>
    );
  }

  if (cov.kind === "planned") {
    const m = cov.metro;
    return (
      <div className="find-grid">
        <div className="find-result">
          <span className="tag eyebrow">{where} · Planned</span>
          <h2 className="d">Ranch Cuts {m.city} is on the list. It isn't open yet.</h2>
          <p>
            There are {m.butchersNearby} beef plants within an hour of {m.city} that could cut for us. Now we need a ranch and a
            butcher who want to work together. Join the list and we'll tell you the day shares open. The more families who ask,
            the sooner {m.city} opens.
          </p>
          <WaitlistForm zip={place.zip} place={place.place} state={place.state} nearest={m.slug} />
          <p className="small mute find-note">
            Why not ship you beef from Denver? Shares are sold in-state only. The ranch, the butcher and your pickup are always in
            the same state, and custom-cut beef can't be shipped.
          </p>
        </div>
        <div className="find-map">
          <Suspense fallback={<div className="map-ph" />}>
            <UsMap aspect={1.2} focus={[you, m]} minSpan={260} highlight={m.states}
              markers={[
                { id: m.slug, kind: "planned", lat: m.lat, lon: m.lon, label: m.city, sub: "planned" },
                { id: "you", kind: "you", lat: place.lat, lon: place.lon, label: place.place },
              ]} />
          </Suspense>
          <p className="diagram-hint">About {Math.round(cov.miles)} miles from {place.place} to {m.city}.</p>
        </div>
      </div>
    );
  }

  const np = cov.nearestPlanned;
  return (
    <div className="find-grid">
      <div className="find-result">
        <span className="tag eyebrow">{where} · Not yet</span>
        <h2 className="d">No Ranch Cuts partnership near {place.place} yet.</h2>
        <p>
          We open where families ask. Leave your email and your zip code counts toward bringing a local ranch and butcher to
          {" "}{place.state}. We'll email you once, when it opens.
        </p>
        <WaitlistForm zip={place.zip} place={place.place} state={place.state} nearest={np?.metro.slug} />
        <p className="small mute find-note">
          Shares are sold in-state only: the ranch, the butcher and your pickup are always in the same state, and custom-cut beef
          can't be shipped. So the closest open partnership, Ranch Cuts {cov.nearestLive.partnership.city}, can't serve {place.state}.
          {np ? ` The nearest planned metro is ${np.metro.city}, about ${Math.round(np.miles)} miles away.` : ""}
        </p>
        <p className="small"><Link to="/about#partner">Know a rancher or butcher near you? Point them our way.</Link></p>
      </div>
      <div className="find-map">
        <Suspense fallback={<div className="map-ph" />}>
          <UsMap aspect={1.2} focus={np && np.miles < 500 ? [you, np.metro] : [you]} minSpan={320} highlight={[place.state]}
            markers={[
              ...(np ? [{ id: np.metro.slug, kind: "planned" as const, lat: np.metro.lat, lon: np.metro.lon, label: np.metro.city }] : []),
              { id: "you", kind: "you", lat: place.lat, lon: place.lon, label: place.place },
            ]} />
        </Suspense>
      </div>
    </div>
  );
}
