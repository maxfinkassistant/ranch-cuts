import { Link } from "react-router-dom";
import { SUPPORT } from "../data/config";

/* Plain-language privacy notice for the sign-up list. Ad platforms
   require one on any page that collects an email. Counsel has not
   reviewed this yet (docs/LAUNCH.md). */
export default function Privacy() {
  return (
    <main className="page section">
      <div className="wide prose-page">
        <span className="tag eyebrow">Privacy</span>
        <h1 className="d">What we collect, and what we do with it.</h1>
        <p className="lede">The short version: we ask for a zip code and an email so we can tell you when Ranch Cuts opens near you. That's what we use them for.</p>

        <h2 className="d">What we collect when you sign up</h2>
        <ul>
          <li>Your email address and your zip code.</li>
          <li>The town and state that zip code belongs to, and the nearest metro on our list.</li>
          <li>Which page you signed up on and, if you came from an ad or a shared link, which one.</li>
        </ul>

        <h2 className="d">What we do with it</h2>
        <ul>
          <li>Count sign-ups by area. That count decides where we look for a ranch and a butcher next.</li>
          <li>Email you once, when a ranch and a butcher near you start taking reservations.</li>
          <li>Show a rancher or butcher how many families near them have asked. They see counts by area, never your email.</li>
        </ul>
        <p>We don't sell your email, rent it or share it with anyone for their marketing. We don't send a newsletter.</p>

        <h2 className="d">Ads and measurement</h2>
        <p>
          We advertise on Facebook, Instagram and TikTok. Those companies' measurement tools on this site tell us that a visit or a
          sign-up happened after an ad, so we can see which ads work. Your email and zip code are not sent to them. You can limit
          this in your Facebook, Instagram and TikTok ad settings, or with your browser's tracking protection.
        </p>

        <h2 className="d">Getting off the list</h2>
        <p>
          Email <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent("Remove me from the Ranch Cuts list")}`}>{SUPPORT.email}</a> from
          the address you signed up with and we'll delete it.
        </p>

        <h2 className="d">Who we are</h2>
        <p>
          Ranch Cuts runs ranchcuts.com. Questions about any of this: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>.
        </p>
        <p className="small mute">Last updated November 9, 2026.</p>
        <p><Link to="/signup" className="btn btn-solid">Back to the sign-up</Link></p>
      </div>
    </main>
  );
}
