import { useState } from "react";
import { Link } from "react-router-dom";
import SteerMap from "../components/SteerMap";
import ZipSearch from "../components/ZipSearch";
import { LIVE } from "../data/partnerships";
import {
  SHARES, DEPOSIT, SEASONS, CURRENT_SEASON, PRIMALS, money, money2, type ShareId,
} from "../data/config";

const SEASON = SEASONS[CURRENT_SEASON];

const STEPS = [
  {
    when: "Today",
    t: "Find your partnership",
    b: "Enter your zip code. We match you with the partner ranch and partner butcher nearest you, always in your own state. You'll see who they are, where pickup is, and what a share costs there before you commit to anything.",
  },
  {
    when: "Today",
    t: "Reserve a share of one steer",
    b: `Pick a quarter, half or whole. You're buying an undivided share of one specific, ear-tagged steer from the ranch, by bill of sale. A ${money(DEPOSIT)} deposit holds it and counts toward the price. Up to four households can share one steer.`,
  },
  {
    when: "Before harvest",
    t: "Build your cut sheet",
    b: "A guided walk-through asks one question at a time: steak thickness, roast sizes, ground beef packages, which cuts to keep and which to grind. Every option is explained in plain English. We fill out the butcher's own cutting form in your name.",
  },
  {
    when: "Harvest window",
    t: "Harvest, once every share is sold",
    b: "Your steer goes to the butcher only after all of its shares are sold. If one isn't spoken for in time, it waits for the next harvest window. Nobody ends up owning a share of a steer that's already been harvested.",
  },
  {
    when: "About 14 days",
    t: "The hang",
    b: "Your beef dry-ages on the rail for about two weeks, the tenderizing step most store beef never gets. Then it's cut to your sheet, vacuum sealed, labeled with your name and frozen.",
  },
  {
    when: SEASON.pickup,
    t: "Pick up at the butcher",
    b: "We tell you the day it's ready. Your boxes are labeled Not For Sale with your name on them: this is your beef, processed for you. Pay the balance to the ranch and the processing to the butcher, then load up.",
  },
];

const RULES = [
  ["One steer, identified", "Every share is a share of one ear-tagged animal. Not a blend, not a box of assorted beef."],
  ["Sold before harvest", "All shares are sold before the steer is harvested. Unsold steers wait for the next window."],
  ["Priced on the animal", "Your share of the steer has a fixed price. Hanging weight is only used to estimate, and for the butcher's processing bill."],
  ["Two sellers, two lines", "The ranch sells you the share. The butcher bills you for processing. You see both, every time."],
  ["Same state, start to finish", "The ranch, the butcher and your pickup are always in the same state."],
  ["Four owners at most", "A steer is sold as one whole, two halves or four quarters. Never smaller."],
  ["Ranch Cuts never owns your beef", "We run the website, the cut sheet and the booking. We never own the cattle or the beef and never hold it."],
  ["Brand inspected where required", "In states with brand inspection, the certificate is recorded for the steer before the first share is sold."],
];

export default function HowItWorks() {
  const [active, setActive] = useState<string | null>("chuck");
  const [share, setShare] = useState<ShareId>("half");
  const half = SHARES.half;

  const pick = (id: string) => {
    setActive(id);
    if (window.matchMedia("(max-width: 980px)").matches) {
      document.getElementById(`primal-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  return (
    <main>
      {/* intro */}
      <section className="page section" style={{ paddingBottom: "var(--space-xl)" }}>
        <div className="wide">
          <span className="tag eyebrow">How it works</span>
          <h1 className="d" style={{ maxWidth: "16ch" }}>One steer. Two local businesses. Your cut sheet.</h1>
          <p className="lede" style={{ marginTop: "var(--space-lg)", maxWidth: "40rem" }}>
            Buying a share of a steer used to mean knowing a rancher, finding a butcher with an open slot, and filling out a cutting
            form full of words nobody explains. Ranch Cuts puts all of that in one place. Here's the whole thing, start to finish.
          </p>
        </div>
      </section>

      {/* who does what */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Who does what</h2>
            <p>Every partnership is one ranch and one butcher who work together. In Denver, that's {LIVE.ranch.name} and {LIVE.butcher.name}.</p>
          </div>
          <div className="roles">
            <div className="role role-ranch">
              <span className="tag">The partner ranch</span>
              <h3 className="d">Raises the steer and sells you your share</h3>
              <p>Sets the price, tags the animal, signs your bill of sale. The ranch is the seller of record on every share, and the person to call about the cattle.</p>
            </div>
            <div className="role role-butcher">
              <span className="tag">The partner butcher</span>
              <h3 className="d">Harvests, hangs and cuts it your way</h3>
              <p>Commits harvest slots, cuts to each owner's sheet, packages and freezes, and bills each owner for processing. Pickup is at the butcher's shop.</p>
            </div>
            <div className="role role-rc">
              <span className="tag">Ranch Cuts</span>
              <h3 className="d">Brings it together</h3>
              <p>The website, the zip code match, the cut sheet, payments to the ranch and butcher, the harvest calendar and the reminders. We never own the cattle or the beef.</p>
            </div>
          </div>
        </div>
      </section>

      {/* the steps */}
      <section className="page section">
        <div className="wide hiw-steps-grid">
          <div className="hiw-steps-side">
            <h2 className="d">Six steps, zip code to freezer</h2>
            <p className="mute" style={{ marginTop: "var(--space-sm)" }}>Your part is a handful of decisions and one drive to the butcher. The ranch and the butcher handle the rest.</p>
            <div style={{ marginTop: "var(--space-xl)" }}><ZipSearch size="small" id="hiw-zip" cta="Start with your zip" /></div>
          </div>
          <div>
            {STEPS.map((s, i) => (
              <div className="tl-step done" key={s.t} style={{ gridTemplateColumns: "36px 1fr" }}>
                <div className="tl-marker">
                  <div className="step-tag small-tag">{i + 1}</div>
                  {i < STEPS.length - 1 && <div className="tl-line" style={{ background: "var(--line-strong)" }} />}
                </div>
                <div className="tl-body" style={{ paddingBottom: "var(--space-xl)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", alignItems: "baseline", flexWrap: "wrap" }}>
                    <h3 className="d" style={{ color: "var(--ink)" }}>{s.t}</h3>
                    <span className="tl-when">{s.when}</span>
                  </div>
                  <p style={{ maxWidth: "60ch", color: "var(--ink-2)" }}>{s.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who you pay */}
      <section className="page section section-tint">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">Who you pay, with a half as the example</h2>
            <p>Two charges, two sellers, both on your order from day one. One checkout collects them and sends each one where it belongs.</p>
          </div>
          <div className="pay-explainer">
            <div className="pay-line">
              <span className="tag">To {LIVE.ranch.name}</span>
              <div className="d pay-num">{money(half.animal)}</div>
              <p><b>Your half of the steer.</b> A fixed price, set by the ranch. Your {money(DEPOSIT)} deposit counts toward it.</p>
            </div>
            <div className="pay-plus" aria-hidden="true">+</div>
            <div className="pay-line">
              <span className="tag">To {LIVE.butcher.name}</span>
              <div className="d pay-num">about {money(half.processing)}</div>
              <p><b>Processing.</b> Harvest, hang, cut, wrap and freeze, at the butcher's posted rates on your steer's actual hanging weight.</p>
            </div>
            <div className="pay-plus" aria-hidden="true">=</div>
            <div className="pay-line total">
              <span className="tag">All in</span>
              <div className="d pay-num">about {money(half.total)}</div>
              <p>About {half.takehome} lb of beef in your freezer, roughly {money2(half.takehomeRate)} a pound for every cut.</p>
            </div>
          </div>
          <p className="small mute" style={{ marginTop: "var(--space-lg)", maxWidth: "72ch" }}>
            Ranch Cuts is paid a small share of each sale by the ranch and butcher. It's already inside these prices; there's no
            separate fee to you. Prices shown are for Ranch Cuts {LIVE.city}. Each ranch sets its own.
          </p>
        </div>
      </section>

      {/* what comes out of one animal */}
      <section className="page section">
        <div className="wide">
          <div className="section-head">
            <h2 className="d">What comes out of one steer</h2>
            <p>Nine sections, nine decisions on your cut sheet. Tap the steer or a card, and switch the size to see your share.</p>
          </div>
          <div className="primal-grid">
            <div className="primal-map">
              <div className="diagram-card">
                <SteerMap active={active} onPick={pick} />
                <p className="diagram-hint">Tap a section of the steer.</p>
              </div>
            </div>
            <div>
              <div className="primal-head">
                <span className="tag">What's in a</span>
                <div className="chips" role="group" aria-label="Share size">
                  {Object.values(SHARES).map((s) => (
                    <button key={s.id} className={"chip" + (share === s.id ? " on" : "")} aria-pressed={share === s.id} onClick={() => setShare(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="primal-list">
                {PRIMALS.map((p) => (
                  <button
                    key={p.id}
                    id={`primal-${p.id}`}
                    className={"primal-row" + (active === p.id ? " on" : "")}
                    onClick={() => setActive(p.id)}
                    onMouseEnter={() => setActive(p.id)}
                    aria-pressed={active === p.id}
                  >
                    <img src={p.photo} alt={p.photoAlt} loading="lazy" />
                    <div>
                      <div className="name">{p.name}</div>
                      <p className="where">{p.where}</p>
                      <div className="yield">{p.counts[share]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* the standard */}
      <section className="page section dark-section">
        <div className="wide">
          <div className="section-head">
            <span className="tag" style={{ color: "var(--tag)" }}>The Ranch Cuts share standard</span>
            <h2 className="d" style={{ marginTop: "var(--space-sm)" }}>The same rules in every partnership</h2>
            <p>Buying a share of a live animal is an old, legal way to get beef straight from a ranch. These rules keep it that way, wherever you live.</p>
          </div>
          <ol className="rules">
            {RULES.map(([t, b], i) => (
              <li key={t}>
                <span className="rule-n">{String(i + 1).padStart(2, "0")}</span>
                <div><b>{t}</b><p>{b}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* close */}
      <section className="page section">
        <div className="wide" style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/find" className="btn btn-solid btn-big">Find your ranch</Link>
          <Link to="/track/RC-SAMPLE1" className="btn btn-ghost btn-big">See a finished cut sheet</Link>
        </div>
      </section>
    </main>
  );
}
