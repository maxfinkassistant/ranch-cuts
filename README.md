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
```

## Pages

| Route | Page |
|---|---|
| `/` | Home: zip search hero, the Ranch Cuts Denver listing card, how a share works, steak-forward price story, King Soopers comparison, sizes, FAQ, partner call-out |
| `/find`, `/find/:zip` | Zip search. Four outcomes: covered (same state, easy drive), reachable (same state, long drive), planned metro (waitlist), not yet (waitlist) |
| `/map` | National map (Albers USA SVG): the live partnership, 16 planned metros, zip lookup that zooms in, planned-metro list by state |
| `/local/:slug` | A partnership page: lockup, meet the ranch, meet the butcher (posted processing rates, directions), maps, prices with the two-line split, harvest calendar. Planned slugs (e.g. `/local/omaha`) show a waitlist page |
| `/how-it-works` | Who does what, six steps, who you pay (two charges, two sellers), what comes out of one steer, the share standard in plain English |
| `/about` | Why Ranch Cuts exists ($3,270 at the sale barn vs $7,233 at the store), what it is and isn't, the first partnership, how partners are chosen, rancher/butcher contact |
| `/order` | Share pick, 13-question cut-sheet wizard, review with the two-line price split and required disclosures, $250 deposit, confirmation with the filled CCMC PDF |
| `/track/:code` | Order status and itemized balance (sample: `RC-SAMPLE1`) |
| `/customers` | Ranch office for Ranch Cuts Denver (demo passcode `KERSEY`) |

## Data

- `src/data/partnerships.ts`: live partnerships (only Denver today) and planned metros. Add a partnership
  here and it appears on the map, in zip search and at `/local/<slug>`. Ranch locations are approximate
  regions; never publish a ranch address. The order flow is bound to `LIVE` (the first partnership) until
  there is a second one.
- `src/data/config.ts`: pricing (model base case, rev 4 final: quarter $7.34 / half $7.09 / whole $6.84 per lb
  hanging-equivalent at $220.67/cwt fed cattle), the share split (fixed animal price to the ranch + processing
  billed by the butcher), seasons, the cut-sheet wizard and the grocery basket.
- `public/zip/<prefix>.json`: 40,979 zip centroids split by first three digits (GeoNames, CC BY 4.0).
  `src/data/usStates.ts`: state outlines (us-atlas). Rebuild both with `bun run data` after downloading the
  sources into `data-src/` (URLs in the scripts).

## Backend

Same pattern as Thunderbolt: `apps-script/Code.gs` (Google Sheet CRM + emails, orders and the waitlist) and a
Stripe Payment Link for the deposit, wired by `VITE_BACKEND_URL` and `VITE_STRIPE_PAYMENT_LINK`. With neither
set the site runs in demo mode and keeps orders and waitlist sign-ups in the browser. See `docs/LAUNCH.md`.
