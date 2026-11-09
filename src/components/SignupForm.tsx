import { useState } from "react";
import { Link } from "react-router-dom";
import { submitWaitlist } from "../lib/api";
import { lookupZip, coverageFor, type Coverage, type ZipPlace } from "../data/partnerships";
import { SIGNUPS_OPEN, PREVIEW, SITE_URL } from "../data/config";
import { SignupsClosed } from "./WaitlistForm";

/* The sign-up: a zip code and an email, nothing else. The zip decides
   which planned metro (or which state) the sign-up counts toward, and
   the answer comes back in place: no trip through /find. `source` names
   the form's spot on the site, so the sheet shows which prompts work. */
export default function SignupForm({ source, dark = false, cta = "Notify me", id = "signup", initialZip = "" }: {
  source: string; dark?: boolean; cta?: string; id?: string; initialZip?: string;
}) {
  const [zip, setZip] = useState(initialZip);
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");   // honeypot: people never see it, bots fill it
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ place: ZipPlace; cov: Coverage } | null>(null);

  const fail = (msg: string) => { setErr(msg); setStatus("error"); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const z = zip.trim();
    const em = email.trim();
    if (!/^\d{5}$/.test(z)) return fail("Enter a 5-digit zip code.");
    if (!/^\S+@\S+\.\S+$/.test(em)) return fail("Enter an email address.");
    setStatus("sending");
    const place = await lookupZip(z);
    if (!place) return fail(`We couldn't find ${z}. Try the zip code where you live.`);
    const cov = coverageFor(place);
    const nearest = cov.kind === "planned" ? cov.metro.slug : cov.kind === "waitlist" ? cov.nearestPlanned?.metro.slug : cov.partnership.slug;
    const r = trap ? { ok: true } : await submitWaitlist({ email: em, zip: z, place: place.place, state: place.state, nearest, source });
    if (!r.ok) return fail(("error" in r && r.error) || "That didn't go through. Try again in a minute.");
    setStatus("idle");
    setDone({ place, cov });
  };

  if (!SIGNUPS_OPEN) return <SignupsClosed />;
  if (done) return <SignupDone {...done} dark={dark} />;

  return (
    <form className={"signup-form" + (dark ? " dark" : "")} onSubmit={submit} noValidate aria-label="Get notified when Ranch Cuts opens near you">
      <div className="signup-fields">
        <div className="signup-zip">
          <label htmlFor={`${id}-zip`} className="tag">Zip code</label>
          <input id={`${id}-zip`} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]*" maxLength={5} placeholder="80202"
            value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} aria-invalid={status === "error"} />
        </div>
        <div className="signup-email">
          <label htmlFor={`${id}-email`} className="tag">Email</label>
          <input id={`${id}-email`} type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={status === "error"} />
        </div>
        <input className="signup-trap" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={trap} onChange={(e) => setTrap(e.target.value)} />
        <button className={dark ? "btn btn-on-dark" : "btn btn-solid"} disabled={status === "sending"}>
          {status === "sending" ? "Adding you..." : cta}
        </button>
      </div>
      {status === "error" && <p className="zip-err" role="alert">{err}</p>}
      <p className="signup-fine">One email, the day it opens near you. No newsletter. <Link to="/privacy">Privacy</Link></p>
    </form>
  );
}

/* The answer, said for where they live. */
function SignupDone({ place, cov, dark }: { place: ZipPlace; cov: Coverage; dark: boolean }) {
  const where = `${place.place}, ${place.state}`;
  const [copied, setCopied] = useState(false);
  const shareUrl = `${SITE_URL}/signup?utm_source=share&utm_medium=referral`;
  const share = async () => {
    const data = { title: "Ranch Cuts", text: "Beef from a local ranch, cut by a local butcher, for less than the store. Sign up so it opens near us.", url: shareUrl };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      /* share sheet dismissed, or clipboard blocked: nothing to do */
    }
  };

  let head: string;
  let body: React.ReactNode;
  if (cov.kind === "planned") {
    head = `You're on the list for Ranch Cuts ${cov.metro.city}.`;
    body = <>We'll email you once, the day a ranch and a butcher near {place.place} are signed. Every sign-up from your area moves {cov.metro.city} up the list.</>;
  } else if (cov.kind === "waitlist") {
    head = `You're on the list for ${where}.`;
    body = <>Nothing is planned near you yet, so your zip code now counts toward bringing a local ranch and butcher to {place.state}. We'll email you once, when it opens.</>;
  } else {
    const p = cov.partnership;
    head = PREVIEW ? `You're in Ranch Cuts ${p.city} country.` : `Good news: Ranch Cuts ${p.city} is already open near you.`;
    body = PREVIEW
      ? <>Your beef comes from {p.ranch.name}, cut at {p.butcher.name}. We'll email you the day reservations open. <Link to={`/local/${p.slug}?zip=${place.zip}`}>Meet your rancher and butcher</Link>.</>
      : <>Beef from {p.ranch.name}, cut at {p.butcher.name}. You don't have to wait. <Link to={`/local/${p.slug}?zip=${place.zip}`}>Meet your rancher and butcher</Link>.</>;
  }

  return (
    <div className={"signup-done" + (dark ? " dark" : "")} role="status">
      <b>{head}</b>
      <p>{body}</p>
      <div className="signup-share">
        <span>A steer splits up to four ways. Know a neighbor who'd want in?</span>
        <button type="button" className="btn btn-ghost" onClick={share}>{copied ? "Link copied" : "Share the sign-up"}</button>
      </div>
    </div>
  );
}
