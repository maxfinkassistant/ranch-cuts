/* Turn cut-sheet answers into a human-readable estimated box,
   and the money math. All counts are estimates for a typical
   1,500 lb animal, scaled by share and steak thickness. */

import {
  SHARES, MAIN_CUTS, EXTRA_GROUPS, THICKNESS_OPTIONS,
  RIB_CHOICES, LOIN_CHOICES, RIB_YIELD, RIB_ROAST_LBS,
  TBONE_YIELD, STRIP_YIELD, FILET_YIELD,
  steakCount, roastCount,
  DEPOSIT, money, money2,
  type ShareId,
} from "../data/config";
import { LIVE } from "../data/partnerships";
import { effectiveExtra, type CutSheetAnswers, type Steer } from "./store";

const inches = (id?: string) =>
  THICKNESS_OPTIONS.find((t) => t.id === id)?.inches ?? 1;

const range = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo}-${hi}`);

export interface BoxLine {
  name: string;
  detail: string;
}

/** The estimated contents of the box, one line per decision. */
export function boxSummary(a: CutSheetAnswers, share: ShareId): BoxLine[] {
  const frac = SHARES[share].frac;
  const lines: BoxLine[] = [];
  let groundLbs: [number, number] = [
    Math.round(60 * frac),  // trim that always grinds, typical whole about 60-90 lb
    Math.round(90 * frac),
  ];
  const addGround = (lbs: [number, number]) => {
    groundLbs = [groundLbs[0] + Math.round(lbs[0] * frac), groundLbs[1] + Math.round(lbs[1] * frac)];
  };

  /* rib */
  const ribChoice = RIB_CHOICES.find((c) => c.id === a.rib.choice)!;
  if (a.rib.choice === "prime") {
    lines.push({ name: "Rib", detail: share === "whole" ? "2 prime rib roasts" : share === "half" ? "1 prime rib roast" : "1 small prime rib roast" });
  } else {
    const [lo, hi] = steakCount(RIB_YIELD, frac, inches(a.rib.thickness));
    lines.push({ name: "Rib", detail: `${range([lo, hi])} ${ribChoice.label.toLowerCase()}, ${a.rib.thickness}", ${a.rib.perPackage} per pack` });
  }

  /* loin */
  if (a.loin.choice === "tbone") {
    const c = steakCount(TBONE_YIELD, frac, inches(a.loin.thickness));
    lines.push({ name: "Short loin", detail: `${range(c)} T-bones, ${a.loin.thickness}", ${a.loin.perPackage} per pack` });
  } else {
    const s = steakCount(STRIP_YIELD, frac, inches(a.loin.thickness));
    const f = steakCount(FILET_YIELD, frac, inches(a.filetThickness ?? "1 1/2"));
    lines.push({ name: "Short loin", detail: `${range(s)} NY strips at ${a.loin.thickness}", plus ${range(f)} filets at ${a.filetThickness ?? '1 1/2'}"` });
  }

  /* main cuts */
  for (const cut of MAIN_CUTS) {
    const ans = a.main[cut.id];
    if (!ans) continue;
    if (ans.mode === "grind") {
      if (cut.roastLbs) addGround(cut.roastLbs);
      lines.push({ name: cut.name, detail: "Ground" });
    } else if (ans.mode === "roast" && cut.roastLbs) {
      const lb = parseInt(ans.roastSize ?? "3") || 3;
      lines.push({ name: cut.name, detail: `${range(roastCount(cut.roastLbs, frac, lb))} roasts, ${ans.roastSize ?? "3 lb"} each` });
    } else if (ans.mode === "steak" && cut.yield) {
      const c = steakCount(cut.yield, frac, inches(ans.thickness));
      lines.push({ name: cut.name, detail: `${range(c)} steaks, ${ans.thickness}", ${ans.perPackage} per pack` });
    }
  }

  /* extras */
  const kept: string[] = [];
  for (const g of EXTRA_GROUPS) {
    for (const c of g.cuts) {
      if (effectiveExtra(a, c.id) === "yes") kept.push(c.name);
      else addGround([2, 5]);
    }
  }
  if (kept.length) lines.push({ name: "Kept whole", detail: kept.join(", ") });

  /* ground */
  lines.push({
    name: "Ground beef",
    detail: `≈ ${groundLbs[0]}-${groundLbs[1]} lb in ${a.groundPack} lb packs${a.patties ? `, ${a.pattyLbs ?? "40 lb"} of it as ${a.pattySize} patties` : ""}`,
  });

  if (a.organs.length) {
    lines.push({ name: "Organs & bones", detail: a.organs.join(", ") });
  }
  if (a.tallow) {
    lines.push({ name: "Fat for tallow", detail: "Requested" });
  }

  return lines;
}

/** Pounds of ground left loose after the patty run, for the ground
    beef question. Returns null when no patties were asked for. */
export function looseGround(a: CutSheetAnswers, share: ShareId): [number, number] | null {
  if (!a.patties) return null;
  const [lo, hi] = groundEstimate(a, share);
  const patty = parseInt(a.pattyLbs ?? "40") || 40;
  return [Math.max(0, lo - patty), Math.max(0, hi - patty)];
}

/** Rough ground-beef total, for the wizard's running tally. */
export function groundEstimate(a: CutSheetAnswers, share: ShareId): [number, number] {
  const line = boxSummary(a, share).find((l) => l.name === "Ground beef")!;
  const m = line.detail.match(/(\d+)-(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : [0, 0];
}

/* ---------------- money ----------------
   The share standard: two charges, two sellers.
   1. The live-animal share, a FIXED price, sold by the ranch (seller
      of record). The deposit applies to this line.
   2. Processing, billed by the butcher to each owner at its posted
      rates on the steer's actual hanging weight. Before harvest it
      is an estimate.
   Ranch Cuts never takes title or holds funds.                    */

export interface Cost {
  total: number;          // all-in estimate
  animal: number;         // fixed, to the ranch
  processing: number;     // estimate, to the butcher
  deposit: number;        // to the ranch, applies to the animal share
  animalBalance: number;  // animal - deposit, to the ranch at pickup
  balance: number;        // everything due at pickup: animal balance + processing
  hangingLbs: number;     // hanging-weight equivalent, typical
  takehomeLbs: number;
  rate: number;           // all-in $/lb hanging equivalent
}

export function shareCost(share: ShareId): Cost {
  const s = SHARES[share];
  return {
    total: s.total,
    animal: s.animal,
    processing: s.processing,
    deposit: DEPOSIT,
    animalBalance: s.animal - DEPOSIT,
    balance: s.total - DEPOSIT,
    hangingLbs: s.hanging,
    takehomeLbs: s.takehome,
    rate: s.rate,
  };
}

/* ============================================================
   FINAL PRICING
   Until a steer is weighed, an order is priced off the typical
   animal (SHARES[...]). Once it is on the hook:
   - the animal share stays at its fixed price, less any discount
     the ranch chose to give on that steer (dollars off a whole
     steer, prorated by share);
   - processing becomes the butcher's posted rates on the actual
     hanging weight: kill fee x share + $/lb x the share's hanging
     lbs + the split fee when the carcass is split (quarter, half).

   Every surface that shows money after harvest (the order ticket,
   the invoice email, the customer's tracking page) reads this one
   function, so they can't drift apart. apps-script/Code.gs mirrors
   it in priceFor_(); keep the two in step.
   ============================================================ */

export const BUTCHER_RATES = LIVE.butcher.rates;

export interface ProcessingLine {
  label: string;
  amount: number;
}

export interface FinalPrice {
  hangingLbs: number;       // the whole animal
  shareLbs: number;         // this owner's portion of it
  animalList: number;       // the bill-of-sale price for this share
  discount: number;         // the ranch's discount on this steer, prorated
  animal: number;           // what the ranch is owed for the share
  processing: number;       // the butcher's bill, to the cent
  processingLines: ProcessingLine[];
  processingEstimate: number;
  total: number;
  deposit: number;
  animalBalance: number;    // to the ranch at pickup
  balance: number;          // everything due at pickup
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** The butcher's bill for one share, at its posted rates. */
export function processingFor(share: ShareId, hangingLbs: number): { total: number; lines: ProcessingLine[]; shareLbs: number } {
  const frac = SHARES[share].frac;
  const r = BUTCHER_RATES;
  const shareLbs = Math.round(hangingLbs * frac);
  const lines: ProcessingLine[] = [
    { label: frac < 1 ? `Kill fee, your ${SHARES[share].label.toLowerCase()} of ${money(r.kill)}` : "Kill fee", amount: cents(r.kill * frac) },
    { label: `${shareLbs} lb hanging at ${money2(r.perLbHanging)}/lb`, amount: cents(r.perLbHanging * shareLbs) },
  ];
  if (frac < 1) lines.push({ label: "Split fee", amount: cents(r.perQuarterSplit) });
  return { total: cents(lines.reduce((t, l) => t + l.amount, 0)), lines, shareLbs };
}

/** Null until the steer has been weighed: there's no real number
    before that, only the estimate. */
export function finalPrice(
  share: ShareId,
  steer?: Pick<Steer, "hangingWeight" | "discount"> | null,
): FinalPrice | null {
  const hangingLbs = steer?.hangingWeight;
  if (!hangingLbs || hangingLbs <= 0) return null;

  const s = SHARES[share];
  const discount = Math.min(s.animal, Math.max(0, Math.round((steer?.discount ?? 0) * s.frac)));
  const animal = s.animal - discount;
  const proc = processingFor(share, hangingLbs);
  const total = cents(animal + proc.total);

  return {
    hangingLbs,
    shareLbs: proc.shareLbs,
    animalList: s.animal,
    discount,
    animal,
    processing: proc.total,
    processingLines: proc.lines,
    processingEstimate: s.processing,
    total,
    deposit: DEPOSIT,
    animalBalance: animal - DEPOSIT,
    balance: cents(total - DEPOSIT),
  };
}

/** The customer-facing line for a ranch discount. Null when there's
    nothing to explain. */
export function discountNote(p: FinalPrice | null): string | null {
  if (!p || p.discount <= 0) return null;
  return `${LIVE.ranch.name} took ${money(p.discount)} off your share of the steer, `
    + `so you owe the ranch ${money(p.animal)} instead of ${money(p.animalList)}.`;
}
