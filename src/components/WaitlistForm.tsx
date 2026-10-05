import { useState } from "react";
import { submitWaitlist } from "../lib/api";
import { PREVIEW } from "../data/config";

/* Waitlist sign-ups are the demand map: they decide which planned
   metros open first. Email only, nothing else asked. */
export default function WaitlistForm({ zip, place, state, nearest, cta = "Tell me when it opens" }: {
  zip: string; place?: string; state?: string; nearest?: string; cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Enter an email address."); setStatus("error"); return; }
    setStatus("sending");
    const r = await submitWaitlist({ email: email.trim(), zip, place, state, nearest });
    if (r.ok) setStatus("done");
    else { setErr(r.error ?? "That didn't go through. Try again in a minute."); setStatus("error"); }
  };
  if (PREVIEW) {
    return (
      <p className="small find-note" role="note">
        <b>Sign-ups open when Ranch Cuts launches.</b> This site is a preview, so we aren't collecting emails yet. Check back at
        ranchcuts.com.
      </p>
    );
  }
  if (status === "done") {
    return (
      <div className="waitlist-done" role="status">
        <b>You're on the list for {place ? `${place}, ${state}` : zip}.</b>
        <p>We'll email you once, when a ranch and butcher near you are signed. Every sign-up from your area moves it up the list.</p>
      </div>
    );
  }
  return (
    <form className="waitlist" onSubmit={submit}>
      <label htmlFor="wl-email" className="tag">Your email</label>
      <div className="waitlist-row">
        <input id="wl-email" type="email" autoComplete="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={status === "error"} />
        <button className="btn btn-solid" disabled={status === "sending"}>{status === "sending" ? "Adding you..." : cta}</button>
      </div>
      {status === "error" && <p className="zip-err" role="alert">{err}</p>}
      <p className="small mute">One email when it opens. No newsletter.</p>
    </form>
  );
}
