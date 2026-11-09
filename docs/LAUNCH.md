# Going live

**Status (2026-11-09):** the site is live at https://ranchcuts.com in preview mode (no orders). Sign-ups are on:
`VITE_SIGNUP_URL` was set on 2026-11-09 and rows land on the "Ranch Cuts Sign-ups" Google Sheet (next section). DNS is at
Squarespace (four apex A records to GitHub Pages, `www` CNAME to `maxfinkassistant.github.io`); the Pages custom domain
is set with HTTPS enforced; `public/CNAME` and the root `VITE_BASE` ship in the workflow. The Squarespace Email Security
preset publishes `v=spf1 -all`, so replace it before any @ranchcuts.com mailbox sends mail. Everything below from the
backend on is still open; set the `VITE_PREVIEW` repository variable to `0` to start taking orders once it is.

## Sign-ups (ahead of orders)

Sign-ups ("tell me when a ranch and butcher open near me") no longer wait for the order backend. They open as soon
as `VITE_SIGNUP_URL` is set, while preview mode keeps ordering off. Until it is set, every sign-up form on the live
site shows "sign-ups open when Ranch Cuts launches" and collects nothing. Step 1 was done on 2026-11-09; the steps stay
here for a rebuild or a move to another account.

1. **The sheet.** Follow the steps at the top of `apps-script/Signups.gs`: a Google Sheet, the script pasted into
   Extensions > Apps Script, deployed as a web app (execute as you, access: anyone). Put the `/exec` URL in the
   `VITE_SIGNUP_URL` repository variable and re-run the deploy workflow. Each sign-up is a row: email, zip, town,
   state, nearest metro, which form, and the ad it came from (utm tags).
2. **The page.** `/signup` is the landing page for ads; `/signup/<metro>` is the same page for one planned metro
   (and `/signup/denver` for the Front Range). The build writes real HTML files for these, so they answer 200 with
   their own link preview. Prompts to sign up sit on the home page, how it works, the map, about, the Denver page,
   the planned-metro pages, the order preview, the banner, the nav and the footer (`SignupBand`, `SignupForm`).
3. **Pixels (optional).** `VITE_META_PIXEL_ID` and `VITE_TIKTOK_PIXEL_ID` repository variables turn on the Meta and
   TikTok pixels: a page view per route and a lead per sign-up. No email or zip is sent to them.
4. **Privacy.** `/privacy` says what is collected and promises removal by email to `hello@ranchcuts.com`, so that
   mailbox has to exist before ads run. Counsel has not reviewed the page.
5. **The ads.** Stills, videos, copy and links: `~/Documents/RanchCuts/marketing/signup-campaign/LAUNCH-KIT.md`.

## Orders

What it takes:

1. **Accounts (Max).** A Ranch Cuts Google account for the Apps Script backend and the order sheet; a GitHub
   repo (or Vercel/Netlify project); the ranchcuts.com DNS.
2. **Backend.** New Apps Script project from `apps-script/Code.gs`, deployed as a web app. Run `doGet` once to
   grant Sheets and Mail scopes. Set `ADMIN_KEY` (and optionally `REPLY_TO`) in Script Properties. Put the web-app
   URL in `VITE_BACKEND_URL`.
3. **Payments.** Ranch Cuts handles all payments for shares (decision 2026-10-05). The family pays Ranch Cuts
   for everything: the $250 deposit at reservation, then the share balance plus processing at pickup. One payee,
   one receipt. Today's wiring is a Stripe Payment Link for the deposit (`VITE_STRIPE_PAYMENT_LINK`) on **Ranch
   Cuts' own** Stripe account; the pickup balance needs its own link or invoice on the same account. Ranch Cuts
   then pays out the partners: the ranch gets the share price less the Ranch Cuts fee, the butcher gets its
   processing at its posted rates. Payout rail is Max's call: Stripe Connect payouts to the ranch and butcher as
   connected accounts, or ACH from the Ranch Cuts bank account. Card fees now fall on Ranch Cuts on the full
   amount (about $184 a steer at 2.9% on ~$6,345). Counsel items before launch: Packers & Stockyards Act
   (collecting the livestock price for the rancher may make Ranch Cuts a market agency or dealer) and state
   money-transmitter rules. Without a payment link set, the site and emails say Ranch Cuts will email a
   payment link for the deposit.
4. **Hosting.** `bun run build` writes `dist/` with `404.html` (GitHub Pages), `_redirects` (Netlify) and
   `vercel.json` handle clean URLs. `.github/workflows/deploy.yml` builds on push to main for GitHub Pages.
5. **Email addresses.** The site shows `hello@ranchcuts.com` and `partners@ranchcuts.com` (`SUPPORT` in
   `src/data/config.ts`). Create them or change them.

6. **Partner CRM.** The same Apps Script serves `/crm` from a "CRM" sheet in the order book. Add `CRM_KEY` to
   Script Properties for a CRM passcode separate from the ranch office (without it, `ADMIN_KEY` opens both). To
   carry over work done locally, open `crm/crm.json` and post each doc to the deployed script (`crm-put`), or keep
   using the local file until the backend is live. The research seed (`src/data/crm-seed.json`) is git-ignored, so
   the Pages build from GitHub ships `/crm` with no prospect list. Never build and upload the site from a machine
   that has the seed: it would be bundled into the public `/crm` chunk. To use the research in production, serve
   the seed from the Apps Script behind the key, or deploy the CRM as a separate private build. The single-file
   demo already leaves `/crm` out.

## Before launch, check

- Counsel sign-off on the share standard, the disclosures in the order flow and the "Not For Sale" language.
- Josh and Colorado Custom Meat Co have seen their listing: ranch story and claims, the processing rate card
  ($135 kill, $1.10/lb hanging, $20 per quarter split, $0.50/lb patties), the 14-day hang, organs and bones.
- Pricing: the site shows the model's indexed prices, not Thunderbolt's live $6/lb. The processing line is a
  conservative $1,250/head estimate; CCMC's posted rates on a 900 lb carcass come to about $1,125-1,205.
- Photography: still the vintage Angus photo and Unsplash stand-ins. The photo shoot at Thunderbolt and CCMC
  is an open item.
- Planned metros are a plan, not signed partnerships. The site says so everywhere they appear.
