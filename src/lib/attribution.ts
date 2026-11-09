/* Where a visitor came from: the utm_* tags on the ad link they clicked,
   kept for the browser session so a sign-up made three pages later still
   credits the ad. Rides along with every sign-up (src/lib/api.ts). */

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  landing?: string;
}

const KEY = "rc.attribution";
const clip = (v: string | null) => (v ? v.trim().slice(0, 120) : undefined);

/** Call once at startup. A tagged link always wins; an untagged visit only
    records the referrer and landing page the first time. */
export function captureAttribution(): void {
  try {
    const q = new URLSearchParams(window.location.search);
    const tagged = ["utm_source", "utm_medium", "utm_campaign", "utm_content"].some((k) => q.get(k));
    if (!tagged && sessionStorage.getItem(KEY)) return;
    const a: Attribution = {
      utmSource: clip(q.get("utm_source")),
      utmMedium: clip(q.get("utm_medium")),
      utmCampaign: clip(q.get("utm_campaign")),
      utmContent: clip(q.get("utm_content")),
      referrer: clip(document.referrer),
      landing: clip(window.location.pathname),
    };
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage blocked (private window): the sign-up still goes through, uncredited */
  }
}

export function attribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Attribution;
  } catch {
    return {};
  }
}
