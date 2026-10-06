# Ranch Cuts website

*Your local ranch. Your local butcher. Your cuts.*

The one national ranchcuts.com site. A family enters a zip code, meets the partner ranch and
partner butcher nearest them (always in their own state), reserves a quarter, half or whole share of
one ear-tagged steer, builds a cut sheet, and picks up at the butcher.

Forked on 2026-10-02 from the live Thunderbolt storefront (`~/projects/christensen-ranch`,
thunderboltbeef.com). The cut-sheet wizard and the CCMC PDF fill are carried over unchanged.
Business context, pricing, the share standard and the brand live in `~/Documents/RanchCuts`
(start at `wiki/00-Start-Here.md`).

## Run it

```bash
bun install
bun run dev        # http://localhost:5177
bun run build      # dist/, plus dist/404.html for static hosts
bun run demo       # demo/RanchCuts-Website-Demo.html, one self-contained file
```

**The demo file** opens by double-click, no server needed. Everything is inlined (JS, CSS, logos, the steer photo,
the cut-sheet PDF and all 40,979 zip codes, ~3.3 MB). It uses hash URLs (`#/find/80202`). Orders and waitlist
sign-ups stay in that browser (demo mode). Only Google Fonts and the Unsplash cut photos come from the web, so
offline it falls back to Georgia and shows blank cut tiles.

## Pages

| Route | Page |
|---|---|
| `/` | Home: zip search hero, the Ranch Cuts Denver listing card, how a share works, steak-forward price story, King Soopers comparison, sizes, FAQ, partner call-out |
| `/find`, `/find/:zip` | Zip search. Four outcomes: covered (same state, easy drive), reachable (same state, long drive), planned metro (waitlist), not yet (waitlist) |
| `/map` | National map (Albers USA SVG): the live partnership, 16 planned metros, zip lookup that zooms in, planned-metro list by state |
| `/local/:slug` | A partnership page: lockup, meet the ranch, meet the butcher (posted processing rates, directions), maps, prices with the two-line split, harvest calendar. Planned slugs (e.g. `/local/omaha`) show a waitlist page |
| `/how-it-works` | Who does what, six steps, who you pay (one payment to Ranch Cuts, itemized by where it goes), what comes out of one steer, the share standard in plain English |
| `/about` | Why Ranch Cuts exists ($3,270 at the sale barn vs $7,233 at the store), what it is and isn't, the first partnership, how partners are chosen, rancher/butcher contact |
| `/order` | Share pick, 13-question cut-sheet wizard, review with the two-line price split and required disclosures, $250 deposit, confirmation with the filled CCMC PDF |
| `/track/:code` | Order status and itemized balance (sample: `RC-SAMPLE1`) |
| `/customers` | Ranch office for Ranch Cuts Denver (demo passcode `KERSEY`) |
| `/crm` | Partner CRM, Ranch Cuts staff only (demo passcode `PARTNERS`; not in the demo file). See below |

## Data

- `src/data/partnerships.ts`: live partnerships (only Denver today) and planned metros. Add a partnership
  here and it appears on the map, in zip search and at `/local/<slug>`. Ranch locations are approximate
  regions; never publish a ranch address. The order flow is bound to `LIVE` (the first partnership) until
  there is a second one.
- `src/data/config.ts`: pricing (model base case, rev 4 final: quarter $7.34 / half $7.09 / whole $6.84 per lb
  hanging-equivalent at $220.67/cwt fed cattle), the share split (fixed animal price that goes to the ranch +
  processing that goes to the butcher, both paid to Ranch Cuts), seasons, the cut-sheet wizard and the grocery basket.
- `public/zip/<prefix>.json`: 40,979 zip centroids split by first three digits (GeoNames, CC BY 4.0).
  `src/data/usStates.ts`: state outlines (us-atlas). Rebuild both with `bun run data` after downloading the
  sources into `data-src/` (URLs in the scripts).

## Partner CRM (`/crm`)

Where Ranch Cuts signs ranches and butchers. Not linked from the site.

- **Call lists** (home tab): pick Ranchers or Butchers, pick a tier, call top to bottom. Follow-ups that are due
  float to the top and also collect in *Due now*.
  - Ranchers: **T1 ready-made pairs** (already use or own a butcher on our list), **T2 strong finishers** (fit A),
    **T3 worth a call** (fit B), **T4 research first** (fit C or no phone/email).
  - Butchers: **T1 paired**, **T2 launch metros**, **T3 other metros**, **T4 skip** (disqualified in research).
  - Any record's tier can be overridden in its drawer.
- **Record drawer**: phone/email/site, stage, owner, tier, interest, a one-tap call logger (talked / no answer /
  voicemail / email / text / visit / note, next step, follow-up date). Logging bumps attempts and last contact and
  moves the stage forward. Also: *Confirm on the call* fields (rancher: finishes on own place, head a year, who kills
  for them, price OK; butcher: takes shares, slots a week, confirmed rates, lead time), notes, **Call prep** (Tier 1
  briefs: owners, background, how they sell, reputation, openers, cautions, sources), **Connections** (our live
  partners nearby, ranches on our list within 40 mi, ranches sharing a butcher, each with its stage), pairs,
  history and the original research.
- **Ranchers / Butchers**: sortable tables, stage and finishing filters, CSV export, *Add a ranch / butcher*.
- **Pairs**: the ranch + butcher pipeline (Proposed → Both talked → Visit 1 → Visit 2 → Visit 3: signing → Signed →
  Live). The 18 ranches already using a Tier 1 butcher start as proposed pairs; Thunderbolt × CCMC is Live.
- **Metros**: per launch metro, ranchers and butchers within 90 mi contacted / warm, the furthest pair, and gaps.

**Data.** Research lives in `src/data/crm-seed.json`, built by `python3 scripts/build-crm-seed.py` from
`~/Documents/RanchCuts/call-list` (rancher prospects, the Tier 1 butcher list, Tier 1 briefs). The seed is git-ignored
because this repo is public and `main` deploys to Pages: run the script once after cloning. Without it the CRM builds
and runs with no research records. The store holds only
what the team enters (stages, notes, confirmed numbers, pairs, calls, added records), so rebuilding the seed never
loses work. Store by environment: Apps Script "CRM" sheet when `VITE_BACKEND_URL` is set; `crm/crm.json` on
`bun run dev` (git-ignored; a Vite middleware at `/__crm`); this browser's localStorage otherwise.

## Backend

Same pattern as Thunderbolt: `apps-script/Code.gs` (Google Sheet CRM + emails, orders and the waitlist) and a
Stripe Payment Link for the deposit on Ranch Cuts' own Stripe account (Ranch Cuts collects every payment and
pays out the ranch and the butcher), wired by `VITE_BACKEND_URL` and `VITE_STRIPE_PAYMENT_LINK`. With neither
set the site runs in demo mode and keeps orders and waitlist sign-ups in the browser. See `docs/LAUNCH.md`.
