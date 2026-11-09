import { Suspense, lazy, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import SignupForm from "../components/SignupForm";
import SignupBand from "../components/SignupBand";
import { LIVE, PLANNED } from "../data/partnerships";
import { SHARES, GROCERY_SOURCE, GROCERY_CUTS, ASSET, PREVIEW, money, money2 } from "../data/config";

const UsMap = lazy(() => import("../components/UsMap"));

/* The sign-up landing page: where the ads send people. One ask (a zip
   code and an email), repeated top and bottom, with the four reasons a
   family wants this in between. /signup/:metro says the same thing for
   one planned metro, so an ad aimed at Omaha lands on a page about Omaha.

   Every number is the Denver partnership's, and the page says so: each
   local ranch sets its own price. Sale barn vs store: see About.tsx. */
const SALE_BARN = 3270;
const AT_THE_STORE = 7233;

const STEPS = [
  { n: "1", t: "You sign up", b: "A zip code and an email. It's free, and it doesn't commit you to anything." },
  { n: "2", t: "We sign a ranch and a butcher", b: "In your state, within a drive of you. We go first where the most families have asked." },
  { n: "3", t: "You get one email", b: "The day shares open near you, with the ranch, the butcher and the prices." },
  { n: "4", t: "You reserve your beef", b: "A quarter, half or whole steer, cut to your own sheet and picked up at the butcher." },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What happens after I sign up?",
    a: "Your zip code is counted toward your area, and you get one email: the day a ranch and a butcher near you start taking reservations. No newsletter, and we don't sell or share your email.",
  },
  {
    q: "When will my area open?",
    a: "We can't promise a date. A partnership opens once we've signed a ranch and a butcher in your state, and we work first where the most families have asked. Signing up is how you ask.",
  },
  {
    q: "Does signing up cost anything?",
    a: "No. It's free and you aren't agreeing to buy. When your area opens you'll see the ranch, the butcher and the prices before you decide.",
  },
  {
    q: "What will it cost when it opens?",
    a: `Each ranch sets its own price, so it varies by area. In Denver, a quarter runs about ${money(SHARES.quarter.total)}, a half ${money(SHARES.half.total)} and a whole ${money(SHARES.whole.total)}, processing included. That works out to about ${money2(SHARES.whole.takehomeRate)} to ${money2(SHARES.quarter.takehomeRate)} a pound in your freezer for every cut.`,
  },
  {
    q: "Why can't you ship me beef from Denver?",
    a: "You own your share of the steer before it's harvested, and the rules that make that possible mean the beef can't be shipped. The ranch, the butcher and your pickup are always in the same state. So we bring the whole thing to you instead.",
  },
  {
    q: "I'm a rancher or a butcher. Can I be the one near them?",
    a: <>Yes, and we'd like to hear from you. <Link to="/about#partner">Here's how partnering works</Link>.</>,
  },
];

export default function Signup() {
  const { metro: slug } = useParams();
  const metro = PLANNED.find((m) => m.slug === slug);
  const denver = slug === LIVE.slug;
  const ribeye = GROCERY_CUTS.find((c) => c.id === "rib")!;
  const yours = SHARES.quarter.takehomeRate;
  const source = metro ? `signup-${metro.slug}` : denver ? `signup-${LIVE.slug}` : "signup-page";

  useEffect(() => {
    const was = document.title;
    document.title = metro ? `Bring Ranch Cuts to ${metro.city} | Ranch Cuts` : "Get notified when Ranch Cuts opens near you | Ranch Cuts";
    return () => { document.title = was; };
  }, [metro]);

  return (
    <main>
      {/* the ask, above everything */}
      <section className="rc-cover signup-cover">
        <div className="rc-cover-photo" style={{ backgroundImage: `url(${ASSET("photos/rancher-herd.jpg")})` }} aria-hidden="true" />
        <div className="page rc-cover-inner">
          <div className="wide">
            <div className="rc-cover-text rise">
              <span className="tag cover-kicker">
                {metro ? `${metro.city} · planned, not open yet` : denver ? `Ranch Cuts ${LIVE.city} · reservations open soon` : `Open in ${LIVE.city} · ${PLANNED.length} metros planned next`}
              </span>
              {metro ? (
                <h1 className="d">Bring Ranch Cuts to <em className="hl">{metro.city}.</em></h1>
              ) : denver ? (
                <h1 className="d">{LIVE.city} beef from a ranch <em className="hl">you can drive to.</em></h1>
              ) : (
                <h1 className="d">Beef from a ranch you can drive to. <em className="hl">For less than the store.</em></h1>
              )}
              <p className="lede">
                {metro ? (
                  <>
                    A quarter, half or whole steer from a ranch near you, cut your way by a butcher near you, for less than the store.
                    Sign-ups from {metro.city} decide how soon it opens.
                  </>
                ) : denver ? (
                  <>
                    A quarter, half or whole steer from {LIVE.ranch.name}, cut your way at {LIVE.butcher.name} in {LIVE.butcher.city}.
                    {PREVIEW ? " Reservations open soon. Leave your zip code and email and we'll tell you the day they do." : " Leave your zip code and email and we'll send you the details."}
                  </>
                ) : (
                  <>
                    A quarter, half or whole steer from a local ranch, cut your way by a local butcher. We're opening one city at a
                    time. Tell us where you live and we'll email you the day yours opens.
                  </>
                )}
              </p>
              <SignupForm source={source} dark id="signup-top" cta={metro ? `Count me in for ${metro.city}` : "Notify me"} />
              <p className="hero-fine">
                <span>Free to join</span>
                <span>One email, no newsletter</span>
                <span>Sign-ups decide which city opens next</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* the price */}
      <section className="page section">
        <div className="wide steak-grid">
          <div>
            <span className="tag eyebrow">Why families want this</span>
            <h2 className="d">Every cut costs the same per pound. Including the ribeye.</h2>
            <p className="lede" style={{ marginTop: "var(--space-md)" }}>
              In {LIVE.city}, our first city, ribeye runs {money2(ribeye.retail)} a pound at {GROCERY_SOURCE.store}. In a Ranch Cuts quarter,
              your ribeyes, filets, roasts and ground beef all land at about {money2(yours)} a pound in your freezer.
            </p>
            <p className="small mute" style={{ marginTop: "var(--space-md)", maxWidth: "60ch" }}>
              {LIVE.city} prices, {GROCERY_SOURCE.date}, processing included. Ground beef costs more in a share than store burger; the
              savings are in the steaks and roasts. Each local ranch sets its own price, so yours may differ.{" "}
              <Link to="/">See the full comparison</Link>.
            </p>
          </div>
          <div className="big-compare" role="img" aria-label={`Ribeye: ${money2(ribeye.retail)} a pound at ${GROCERY_SOURCE.store}, about ${money2(yours)} in a Ranch Cuts quarter`}>
            <div>
              <span className="tag">Ribeye at {GROCERY_SOURCE.store}</span>
              <div className="d compare-num store">{money2(ribeye.retail)}</div>
            </div>
            <div className="compare-bar"><i style={{ width: "100%" }} /></div>
            <div>
              <span className="tag">Ribeye in a Ranch Cuts quarter</span>
              <div className="d compare-num">{money2(yours)}</div>
            </div>
            <div className="compare-bar yours"><i style={{ width: `${(yours / ribeye.retail) * 100}%` }} /></div>
          </div>
        </div>
      </section>

      {/* local, your cuts, the rancher */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="prop-grid">
            <figure className="prop">
              <img src={ASSET("photos/ranch-road.jpg")} alt="A two-lane road running through open ranch country" loading="lazy" />
              <figcaption>
                <h3 className="d">A ranch you can drive to</h3>
                <p>One steer, from one ranch in your state, cut by a butcher near you. You know both of their names before you pay a dollar.</p>
              </figcaption>
            </figure>
            <figure className="prop">
              <img src={ASSET("photos/butcher-block.jpg")} alt="A butcher cutting beef on a wooden block" loading="lazy" />
              <figcaption>
                <h3 className="d">Cut exactly your way</h3>
                <p>Steak thickness, roast sizes, how the burger is packed. It comes out sealed, frozen and boxed with your name on it.</p>
              </figcaption>
            </figure>
            <figure className="prop">
              <img src={ASSET("photos/roundup.jpg")} alt="Ranchers on horseback moving a herd of cattle" loading="lazy" />
              <figcaption>
                <h3 className="d">The rancher gets paid</h3>
                <p>
                  A finished steer brings about {money(SALE_BARN)} at the sale barn. Its cuts sell for about {money(AT_THE_STORE)} at the
                  store. A share pays the ranch more and still costs you less.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* what happens next */}
      <section className="page section">
        <div className="wide">
          <h2 className="d deck-title">What happens after you sign up</h2>
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
          <p style={{ marginTop: "var(--space-xl)" }}><Link to="/how-it-works" className="btn btn-ghost">How a share works, step by step</Link></p>
        </div>
      </section>

      {/* where */}
      <section className="page section section-tint">
        <div className="wide signup-where">
          <div>
            <span className="tag eyebrow">Where we are</span>
            <h2 className="d">Open in {LIVE.city}. {PLANNED.length} metros planned next.</h2>
            <p style={{ marginTop: "var(--space-md)", color: "var(--ink-2)" }}>
              {metro ? `${metro.butchersNearby} butchers that process beef are within about an hour of ${metro.city}. ` : ""}Nothing on the
              planned list is signed yet, and the order isn't set. Sign-ups set it. Not on the list? Sign up anyway: enough zip codes
              from one place puts it there.
            </p>
            <div className="signup-metros">
              {PLANNED.map((m) => (
                <Link key={m.slug} to={`/signup/${m.slug}`} className={"chip" + (metro?.slug === m.slug ? " on" : "")}>{m.city}</Link>
              ))}
            </div>
            <p className="small" style={{ marginTop: "var(--space-md)" }}><Link to="/map">Open the full map</Link></p>
          </div>
          <div className="find-map signup-map">
            <Suspense fallback={<div className="map-ph" />}>
              <UsMap
                highlight={metro ? metro.states : [LIVE.state]}
                markers={[
                  ...PLANNED.map((m) => ({ id: m.slug, kind: "planned" as const, lat: m.lat, lon: m.lon, selected: metro?.slug === m.slug, label: metro?.slug === m.slug ? m.city : undefined })),
                  { id: LIVE.slug, kind: "live" as const, lat: LIVE.center.lat, lon: LIVE.center.lon, label: `Ranch Cuts ${LIVE.city}`, labelPos: "left" as const },
                ]}
                label={`Map: Ranch Cuts is open in ${LIVE.city}, with ${PLANNED.length} more metros planned`}
              />
            </Suspense>
          </div>
        </div>
      </section>

      {/* questions */}
      <section className="page section">
        <div className="wide faq-wrap">
          <h2 className="d">Before you sign up</h2>
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

      {/* the ask again */}
      <section className="page section" style={{ paddingTop: 0 }}>
        <div className="wide">
          <SignupBand source={`${source}-bottom`} title={metro ? `Put ${metro.city} at the top of the list.` : "Put your zip code on the map."}>
            It takes ten seconds and it's free. You get one email, the day a ranch and a butcher open near you.
          </SignupBand>
        </div>
      </section>
    </main>
  );
}
