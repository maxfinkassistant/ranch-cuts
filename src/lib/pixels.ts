/* Meta (Facebook, Instagram) and TikTok ad pixels. Nothing loads unless
   an id is set (META_PIXEL_ID, TIKTOK_PIXEL_ID in src/data/config.ts).
   Two events only: a page view on every route, and a lead when a
   sign-up goes through. No email or zip is ever passed to a pixel. */

import { META_PIXEL_ID, TIKTOK_PIXEL_ID } from "../data/config";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push: unknown; loaded: boolean; version: string };
type Ttq = unknown[] & { methods?: string[]; page: () => void; track: (event: string, props?: Record<string, unknown>) => void; load: (id: string) => void; [k: string]: unknown };

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq; ttq?: Ttq; TiktokAnalyticsObject?: string }
}

const addScript = (src: string) => {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

let started = false;

/** Load whichever pixels are configured. Safe to call more than once. */
export function initPixels(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  if (META_PIXEL_ID && !window.fbq) {
    /* Meta's standard queue stub: calls made before fbevents.js arrives are replayed */
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = window._fbq = fbq;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", META_PIXEL_ID);
  }

  if (TIKTOK_PIXEL_ID && !window.ttq) {
    /* TikTok's standard queue stub */
    const ttq = [] as unknown as Ttq;
    for (const m of ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"]) {
      ttq[m] = (...args: unknown[]) => { ttq.push([m, ...args]); };
    }
    window.TiktokAnalyticsObject = "ttq";
    window.ttq = ttq;
    const t = ttq as unknown as { _i: Record<string, unknown[]>; _t: Record<string, number>; _o: Record<string, unknown> };
    t._i = { [TIKTOK_PIXEL_ID]: Object.assign([], { _u: "https://analytics.tiktok.com/i18n/pixel/events.js" }) };
    t._t = { [TIKTOK_PIXEL_ID]: Date.now() };
    t._o = { [TIKTOK_PIXEL_ID]: {} };
    addScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${TIKTOK_PIXEL_ID}&lib=ttq`);
  }
}

/** One page view per route change (the site is a single-page app). */
export function trackPageView(): void {
  window.fbq?.("track", "PageView");
  window.ttq?.page();
}

/** A sign-up went through. `source` is the form's placement on the site. */
export function trackSignup(source?: string): void {
  window.fbq?.("track", "Lead", { content_name: "signup", content_category: source ?? "site" });
  window.ttq?.track("SubmitForm", { content_name: "signup", content_category: source ?? "site" });
}
