/**
 * Ranch Cuts: order backend (Google Apps Script web app)
 *
 * Ranch Cuts is the marketplace and booking platform: it never takes
 * title to an animal or holds funds. Each order is a share of one
 * ear-tagged live steer sold by the partner ranch (seller of record),
 * with processing billed separately by the partner butcher.
 * Today there is one live partnership: Ranch Cuts Denver
 * (Thunderbolt Ranch + Colorado Custom Meat Co, Kersey CO).
 *
 * What it does:
 *   POST {action:"order", ...}    appends the order to a Google Sheet (the CRM),
 *                                  emails the partners a notification, emails the
 *                                  customer a confirmation with the deposit link.
 *   POST {action:"waitlist", email, zip, place?, state?, nearest?, createdAt?}
 *                                  appends a zip-search sign-up to the "Waitlist" sheet.
 *   GET  ?action=order&code=RC-...  returns one order (customer tracking page).
 *   GET  ?action=list&key=...       returns all orders, steers and the season
 *                                  settings (ranch office; key required).
 *   GET  ?action=availability     how many of this season's steers are reserved
 *                                  (public; drives the steer tracker).
 *   POST {action:"status", key, code, status}  updates an order's status.
 *   POST {action:"assign", key, code, steer?, season?}  links an order to a steer
 *                                  and/or moves it to another season.
 *   POST {action:"steer", key, steer, originalId?}  adds or edits a steer.
 *   POST {action:"steer-delete", key, id}           removes a steer.
 *   POST {action:"settings", key, capacity, offline}  steers this season, and
 *                                  how many were reserved outside Ranch Cuts.
 *   POST {action:"invoice", key, code}  emails one customer the final invoice.
 *
 * Setup (once, about 3 minutes), from the Ranch Cuts Google account:
 *   1. script.google.com > New project > paste this file > save.
 *   2. Project Settings > Script Properties > add:
 *        ADMIN_KEY      = a passcode for the ranch office
 *        NOTIFY_EMAILS  = comma-separated emails to notify on each order
 *                         (Ranch Cuts ops + the ranch)
 *        REPLY_TO       = (optional) where customer replies go; default hello@ranchcuts.com
 *        SHEET_ID       = (optional) an existing spreadsheet id; leave blank to auto-create
 *   3. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
 *   4. Copy the /exec URL into VITE_BACKEND_URL in the site config.
 *
 * Updating later: paste the new file over the old one, save, then
 *   Deploy > Manage deployments > pencil > Version: New version > Deploy.
 *   (Editing the existing deployment keeps the same /exec URL.)
 */

/* Seasons: keep in step with SEASONS in the site's src/data/config.ts. */
const CURRENT_SEASON = "winter-2027";
const NEXT_SEASON = "spring-2027";
const SEASON_COPY = {
  "fall-2026": { name: "fall", pickup: "estimated mid-October" },          // history only
  "winter-2027": { name: "winter", pickup: "estimated January" },
  "spring-2027": { name: "spring", pickup: "on a date to be announced" },
};
const DEFAULT_CAPACITY = 7;   // steers this season, until the ranch office says otherwise

/* The live partnership. Mirrors LIVE in src/data/partnerships.ts. */
const PARTNERSHIP = {
  slug: "denver",
  listing: "Ranch Cuts Denver",
  ranch: "Thunderbolt Ranch",
  sellerOfRecord: "Thunderbolt Ranch LLC",
  ranchContact: { name: "Josh", phone: "402-245-8195" },
  butcher: "Colorado Custom Meat Co",
  butcherAddress: "443 4th Street, Kersey CO 80644",
  butcherCity: "Kersey",
  butcherPhone: "970-356-2333",
  /* the butcher's posted rates, billed by the butcher to each owner */
  rates: { kill: 135, perLbHanging: 1.1, perQuarterSplit: 20 },
};
const SUPPORT_EMAIL = "hello@ranchcuts.com";

/* Pricing: mirrors the top of src/data/config.ts. All-in $/lb of
   hanging-weight EQUIVALENT per share size; the animal share is a
   fixed price (total minus the processing estimate). */
const RATE = { quarter: 7.34, half: 7.09, whole: 6.84 };
const SHARE_FRAC = { quarter: 0.25, half: 0.5, whole: 1 };
const HANGING_TYP = 900;            // lb, typical carcass
const PROCESSING_PER_HEAD = 1250;   // butcher estimate, whole steer
const DEPOSIT = 250;                // flat, every share size, applies to the animal share
const STORAGE_NOTE = "Please pick up within a week of the ready date; the butcher charges $10 a day for storage after the grace period.";

/* The estimate for one share size, same math as mkShare() in config.ts. */
function share_(id) {
  const frac = SHARE_FRAC[id] || 0;
  const hanging = HANGING_TYP * frac;
  const total = Math.round(hanging * (RATE[id] || 0));
  const processing = Math.round(PROCESSING_PER_HEAD * frac);
  const animal = total - processing;
  return {
    frac: frac, hanging: hanging, takehome: Math.round(hanging * 0.7), rate: RATE[id] || 0,
    total: total, animal: animal, processing: processing,
    deposit: DEPOSIT, animalBalance: animal - DEPOSIT, balance: total - DEPOSIT,
  };
}

const SHEET_NAME = "Orders";
const HEADERS = [
  "Code", "Created", "Status", "Name", "Email", "Phone", "Address",
  "Share", "Total (est.)", "Deposit", "Due at pickup (est.)", "Summary", "Notes", "Order JSON",
  "Steer", "Season", "Partnership", "Animal to ranch (fixed)", "Processing to butcher (est.)",
];
const COL_STATUS = 3, COL_STEER = 15, COL_SEASON = 16;

const STEER_SHEET = "Steers";
const STEER_HEADERS = ["Ear tag", "Season", "Hanging weight (lb)", "Est. ready date", "Animal discount ($ off a whole steer)"];

const WAITLIST_SHEET = "Waitlist";
const WAITLIST_HEADERS = ["Created", "Email", "Zip", "Place", "State", "Nearest"];

function props_() { return PropertiesService.getScriptProperties(); }

function isAdmin_(key) {
  const want = String(props_().getProperty("ADMIN_KEY") || "").trim();
  return !!want && String(key || "").trim() === want;
}

function book_() {
  const p = props_();
  const id = p.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create("Ranch Cuts: Orders");
  p.setProperty("SHEET_ID", ss.getId());
  return ss;
}

function sheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  } else if (sh.getLastColumn() < HEADERS.length) {
    /* an older sheet: add the new column headings */
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  }
  return sh;
}

function steerSheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(STEER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(STEER_SHEET);
    sh.appendRow(STEER_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, STEER_HEADERS.length).setFontWeight("bold");
    /* IDs and dates stay exactly as typed: no "007" to 7, no timezone drift */
    sh.getRange("A:A").setNumberFormat("@");
    sh.getRange("D:D").setNumberFormat("@");
  } else if (sh.getLastColumn() < STEER_HEADERS.length) {
    /* an older Steers sheet: add the heading */
    sh.getRange(1, 1, 1, STEER_HEADERS.length).setValues([STEER_HEADERS]).setFontWeight("bold");
  }
  return sh;
}

/* yyyy-mm-dd to "October 16, 2026" for anything a customer reads. */
function prettyDate_(ymd) {
  const parts = String(ymd || "").split("-");
  if (parts.length !== 3) return String(ymd || "");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return String(ymd || "");
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "MMMM d, yyyy");
}

/* A date cell comes back as a Date; hand the site a plain yyyy-mm-dd. */
function dateText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v || "");
}

function steers_() {
  const sh = steerSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STEER_HEADERS.length).getValues()
    .filter(r => String(r[0]).trim() !== "")
    .map(r => {
      const steer = { id: String(r[0]).trim(), season: String(r[1] || CURRENT_SEASON) };
      if (Number(r[2]) > 0) steer.hangingWeight = Number(r[2]);
      if (r[3]) steer.readyDate = dateText_(r[3]);
      if (Number(r[4]) > 0) steer.discount = Number(r[4]);
      return steer;
    });
}

function settings_() {
  const p = props_();
  const capacity = Number(p.getProperty("SEASON_CAPACITY"));
  const offline = Number(p.getProperty("SEASON_OFFLINE"));
  return { capacity: capacity >= 1 ? capacity : DEFAULT_CAPACITY, offline: offline > 0 ? offline : 0 };
}

/* Steers' worth reserved this season: every order's share, plus
   what the ranch sold outside Ranch Cuts. */
function availability_() {
  const s = settings_();
  const online = rows_().map(orderFromRow_).filter(Boolean)
    .filter(o => o.season === CURRENT_SEASON)
    .reduce((t, o) => t + (SHARE_FRAC[o.share] || 0), 0);
  return { season: CURRENT_SEASON, capacity: s.capacity, reserved: online + s.offline };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function rows_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function orderFromRow_(r) {
  try {
    const o = JSON.parse(r[13]);
    o.status = r[2] || o.status;
    o.steer = String(r[14] || "").trim() || undefined;
    /* orders from before seasons existed belong to the current one */
    o.season = String(r[15] || "") || o.season || CURRENT_SEASON;
    return o;
  } catch (e) {
    return null;
  }
}

/* ---------------- GET ---------------- */

function doGet(e) {
  try { return doGet_(e); } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}

function doGet_(e) {
  const q = (e && e.parameter) || {};
  if (q.action === "order" && q.code) {
    const code = String(q.code).toUpperCase();
    const row = rows_().find(r => String(r[0]).toUpperCase() === code);
    const order = row ? orderFromRow_(row) : null;
    /* their own animal's weight and discount, never the whole roster */
    const steer = order ? steerFor_(order) : null;
    const out = { ok: true, order: order };
    if (steer && Number(steer.hangingWeight) > 0) {
      out.pricing = { hangingWeight: Number(steer.hangingWeight) };
      if (Number(steer.discount) > 0) out.pricing.discount = Number(steer.discount);
      if (steer.readyDate) out.pricing.readyDate = steer.readyDate;
    }
    return json_(out);
  }
  if (q.action === "list") {
    if (!isAdmin_(q.key)) return json_({ ok: false, error: "bad key" });
    return json_({
      ok: true,
      orders: rows_().map(orderFromRow_).filter(Boolean),
      steers: steers_(),
      settings: settings_(),
    });
  }
  if (q.action === "availability") {
    const a = availability_();
    return json_({ ok: true, season: a.season, capacity: a.capacity, reserved: a.reserved });
  }
  return json_({ ok: true, service: "ranch-cuts", time: new Date().toISOString() });
}

/* ---------------- POST ---------------- */

function doPost(e) {
  try { return doPost_(e); } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}

function doPost_(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad json" }); }

  if (["status", "assign", "steer", "steer-delete", "settings", "invoice"].indexOf(body.action) >= 0) {
    if (!isAdmin_(body.key)) return json_({ ok: false, error: "bad key" });
    return adminPost_(body);
  }

  if (body.action === "waitlist") return waitlist_(body);

  if (body.action === "order") {
    const o = body.order;
    if (!o || !o.code || !o.email) return json_({ ok: false, error: "missing order" });
    if (!SHARE_FRAC[o.share]) return json_({ ok: false, error: "unknown share" });
    o.email = String(o.email).trim();
    o.partnership = String(body.partnership || o.partnership || PARTNERSHIP.slug);
    const summary = (body.summary || []).map(l => l.name + ": " + l.detail).join("\n");
    /* the money is recomputed here from the share; the browser's copy is not trusted */
    const cost = share_(o.share);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      /* this season while the share still fits in what's left, otherwise the next */
      const a = availability_();
      o.season = a.reserved + (SHARE_FRAC[o.share] || 0) <= a.capacity + 1e-6 ? CURRENT_SEASON : NEXT_SEASON;
      sheet_().appendRow([
        o.code, new Date(o.createdAt || Date.now()), o.status || "reserved",
        o.name, o.email, o.phone, o.address,
        o.share, cost.total, cost.deposit, cost.balance,
        summary, (o.cutSheet && o.cutSheet.notes) || "", JSON.stringify(o),
        "", o.season, o.partnership, cost.animal, cost.processing,
      ]);
    } finally {
      lock.releaseLock();
    }
    const emailErrors = [];
    try { notifyPartners_(o, summary, cost); } catch (err) { emailErrors.push("partners: " + (err && err.message || err)); }
    try { confirmCustomer_(o, summary, cost, body.depositLink); } catch (err) { emailErrors.push("customer: " + (err && err.message || err)); }
    return json_({ ok: true, code: o.code, season: o.season, emailErrors: emailErrors });
  }

  return json_({ ok: false, error: "unknown action" });
}

/* ---------------- waitlist ---------------- */

function waitlistSheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(WAITLIST_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WAITLIST_SHEET);
    sh.appendRow(WAITLIST_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, WAITLIST_HEADERS.length).setFontWeight("bold");
    sh.getRange("C:C").setNumberFormat("@");   // keep leading zeros on zips
  }
  return sh;
}

function waitlist_(body) {
  const email = String(body.email || "").trim();
  const zip = String(body.zip || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return json_({ ok: false, error: "Please enter a valid email." });
  const created = body.createdAt ? new Date(body.createdAt) : new Date();
  const clip = (v) => String(v || "").trim().slice(0, 200);
  waitlistSheet_().appendRow([
    isNaN(created.getTime()) ? new Date() : created,
    email.slice(0, 200), zip.slice(0, 10), clip(body.place), clip(body.state), clip(body.nearest),
  ]);
  return json_({ ok: true });
}

/* ---------------- ranch office writes (key already checked) ---------------- */

function orderRow_(code) {
  const i = rows_().findIndex(r => String(r[0]).toUpperCase() === String(code).toUpperCase());
  return i < 0 ? -1 : i + 2;
}

function adminPost_(body) {
  if (body.action === "status") {
    const row = orderRow_(body.code);
    if (row < 0) return json_({ ok: false, error: "not found" });
    sheet_().getRange(row, COL_STATUS).setValue(body.status);
    return json_({ ok: true });
  }

  if (body.action === "assign") {
    const row = orderRow_(body.code);
    if (row < 0) return json_({ ok: false, error: "not found" });
    const sh = sheet_();
    if (body.steer !== undefined) sh.getRange(row, COL_STEER).setNumberFormat("@").setValue(String(body.steer || "").trim());
    if (body.season) {
      if (!SEASON_COPY[body.season]) return json_({ ok: false, error: "unknown season" });
      sh.getRange(row, COL_SEASON).setValue(body.season);
    }
    return json_({ ok: true });
  }

  if (body.action === "steer") {
    const st = body.steer || {};
    const id = String(st.id || "").trim();
    if (!id) return json_({ ok: false, error: "steer needs an ID" });
    const was = String(body.originalId || id).trim();
    const sh = steerSheet_();
    const ids = steers_().map(x => x.id);
    if (id !== was && ids.indexOf(id) >= 0) return json_({ ok: false, error: "that steer ID is already used" });
    const values = [
      id,
      SEASON_COPY[st.season] ? st.season : CURRENT_SEASON,
      Number(st.hangingWeight) > 0 ? Number(st.hangingWeight) : "",
      st.readyDate || "",
      Number(st.discount) > 0 ? Number(st.discount) : "",
    ];
    const at = steerRow_(was);
    if (at < 0) sh.appendRow(values);
    else sh.getRange(at, 1, 1, STEER_HEADERS.length).setValues([values]);
    if (id !== was) relink_(was, id);
    return json_({ ok: true });
  }

  if (body.action === "steer-delete") {
    const id = String(body.id || "").trim();
    const at = steerRow_(id);
    if (at < 0) return json_({ ok: false, error: "not found" });
    steerSheet_().deleteRow(at);
    relink_(id, "");
    return json_({ ok: true });
  }

  if (body.action === "invoice") {
    const code = String(body.code || "").toUpperCase();
    const row = rows_().find(r => String(r[0]).toUpperCase() === code);
    if (!row) return json_({ ok: false, error: "no order " + code });
    const order = orderFromRow_(row);
    const steer = steerFor_(order);
    const price = priceFor_(order, steer);
    /* the browser asks; the sheet decides what the bill actually is */
    if (!price) return json_({ ok: false, error: "that order's steer has no hanging weight yet" });
    if (!order.email) return json_({ ok: false, error: "that order has no email address" });
    invoiceCustomer_(order, steer, price);
    return json_({ ok: true });
  }

  if (body.action === "settings") {
    const capacity = Math.round(Number(body.capacity));
    const offline = Math.round(Number(body.offline) * 4) / 4;
    if (!(capacity >= 1) || !(offline >= 0)) return json_({ ok: false, error: "bad settings" });
    props_().setProperties({ SEASON_CAPACITY: String(capacity), SEASON_OFFLINE: String(offline) });
    return json_({ ok: true });
  }

  return json_({ ok: false, error: "unknown action" });
}

/* Sheet row of a steer by ID, or -1. */
function steerRow_(id) {
  const sh = steerSheet_();
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const i = sh.getRange(2, 1, last - 1, 1).getValues().findIndex(r => String(r[0]).trim() === id);
  return i < 0 ? -1 : i + 2;
}

/* Point every order linked to steer `from` at `to` ("" = unassigned). */
function relink_(from, to) {
  const sh = sheet_();
  rows_().forEach((r, i) => {
    if (String(r[14] || "").trim() === from) sh.getRange(i + 2, COL_STEER).setNumberFormat("@").setValue(to);
  });
}

/* ---------------- money + email ---------------- */

const cents_ = (n) => Math.round(n * 100) / 100;

/* The final money for one order, once its steer has a weight. Mirrors
   finalPrice() in src/lib/estimate.ts: keep the two in step.
   - animal share: fixed, less any ranch discount on the steer
     (dollars off a whole steer, prorated by share)
   - processing: the butcher's posted rates on actual hanging weight:
     kill x share + $/lb x the share's hanging lbs + split fee if split
   Returns null while the animal is still unweighed. */
function priceFor_(order, steer) {
  if (!steer || !(Number(steer.hangingWeight) > 0)) return null;
  const s = share_(order.share);
  const r = PARTNERSHIP.rates;
  const hangingLbs = Number(steer.hangingWeight);
  const shareLbs = Math.round(hangingLbs * s.frac);
  const discount = Math.min(s.animal, Math.max(0, Math.round((Number(steer.discount) || 0) * s.frac)));
  const animal = s.animal - discount;
  const lines = [
    [s.frac < 1 ? "Kill fee, your " + shareLabel_(order.share).toLowerCase() + " of " + money_(r.kill) : "Kill fee", cents_(r.kill * s.frac)],
    [shareLbs + " lb hanging at " + money2_(r.perLbHanging) + "/lb", cents_(r.perLbHanging * shareLbs)],
  ];
  if (s.frac < 1) lines.push(["Split fee", cents_(r.perQuarterSplit)]);
  const processing = cents_(lines.reduce((t, l) => t + l[1], 0));
  const total = cents_(animal + processing);
  return {
    hangingLbs: hangingLbs,
    shareLbs: shareLbs,
    animalList: s.animal,
    discount: discount,
    animal: animal,
    processing: processing,
    processingLines: lines,
    processingEstimate: s.processing,
    total: total,
    deposit: DEPOSIT,
    animalBalance: animal - DEPOSIT,
    balance: cents_(total - DEPOSIT),
  };
}

function discountNote_(p) {
  if (!p || !(p.discount > 0)) return "";
  return PARTNERSHIP.ranch + " took " + money_(p.discount) + " off your share of the steer, so you owe the ranch "
    + money_(p.animal) + " instead of " + money_(p.animalList) + ".";
}

function steerFor_(order) {
  if (!order || !order.steer) return null;
  const all = steers_();
  for (let i = 0; i < all.length; i++) if (all[i].id === order.steer) return all[i];
  return null;
}

function shareLabel_(s) { return { quarter: "Quarter", half: "Half", whole: "Whole" }[s] || s; }
function ownersLabel_(s) { return { quarter: "one of four owners", half: "one of two owners", whole: "the only owner" }[s] || ""; }
function seasonCopy_(id) { return SEASON_COPY[id] || SEASON_COPY[CURRENT_SEASON]; }
function seasonLabel_(id) { const n = seasonCopy_(id).name; return n.charAt(0).toUpperCase() + n.slice(1); }
function money_(n) { return "$" + Math.round(Number(n || 0)).toLocaleString(); }
function money2_(n) { return "$" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function replyTo_() { return props_().getProperty("REPLY_TO") || SUPPORT_EMAIL; }

/* The two-line pricing block every email shares. */
function pricingLines_(cost) {
  return [
    "Your share of the steer, sold by " + PARTNERSHIP.ranch + " (fixed): " + money_(cost.animal),
    "Processing by " + PARTNERSHIP.butcher + ", billed by the butcher at its posted rates (estimate): " + money_(cost.processing),
    "All in (estimate): " + money_(cost.total),
    "Deposit to " + PARTNERSHIP.ranch + ", applies to your share of the steer: " + money_(cost.deposit),
    "Due at pickup: " + money_(cost.animalBalance) + " to " + PARTNERSHIP.sellerOfRecord
      + ", plus processing (about " + money_(cost.processing) + ") to " + PARTNERSHIP.butcher + ".",
  ];
}

const DISCLOSURES = [
  "GOOD TO KNOW",
  "Custom processed, for you: your beef is custom processed for you as an owner of the animal. It is not inspected for resale, and every package is labeled Not For Sale. It's for your household and your non-paying guests.",
  "Handling and storage: it comes home frozen. Bring coolers or leave room in the vehicle, keep it frozen at 0\u00B0F or colder, and thaw it in the fridge.",
  "Pickup: pickup only, at " + PARTNERSHIP.butcher + ", " + PARTNERSHIP.butcherAddress + ". " + STORAGE_NOTE,
];

function notifyPartners_(o, summary, cost) {
  const to = props_().getProperty("NOTIFY_EMAILS");
  if (!to) return;
  const subject = PARTNERSHIP.listing + ": new order " + o.code + ", " + shareLabel_(o.share) + ", " + o.name;
  const bodyText = [
    "New order on Ranch Cuts for " + PARTNERSHIP.listing + ".",
    "",
    "Order: " + o.code,
    "Partnership: " + (o.partnership || PARTNERSHIP.slug),
    "Share: " + shareLabel_(o.share) + " (" + ownersLabel_(o.share) + ")",
    "Harvest: " + seasonLabel_(o.season) + (o.season !== CURRENT_SEASON ? "  (didn't fit in what's left of this season)" : ""),
    "",
    "Animal share to " + PARTNERSHIP.sellerOfRecord + " (fixed): " + money_(cost.animal) + ". Deposit " + money_(cost.deposit) + ", balance " + money_(cost.animalBalance) + " at pickup.",
    "Processing to " + PARTNERSHIP.butcher + " (estimate): " + money_(cost.processing) + ", billed by the butcher on actual hanging weight.",
    "",
    "Customer: " + o.name,
    "Email: " + o.email,
    "Phone: " + o.phone,
    "Address: " + o.address,
    "",
    "Ranch: please confirm the bill of sale and assign an ear tag in the ranch office.",
    "",
    "CUT SHEET",
    summary,
    o.cutSheet && o.cutSheet.notes ? "\nNotes: " + o.cutSheet.notes : "",
    "",
    "The full order is in the Orders sheet. Download the filled cut sheet PDF from the ranch office.",
  ].join("\n");
  MailApp.sendEmail({ to: to, subject: subject, body: bodyText, name: "Ranch Cuts", replyTo: o.email });
}

function confirmCustomer_(o, summary, cost, depositLink) {
  const subject = "Your " + PARTNERSHIP.listing + " beef is reserved, " + o.code;
  const payLine = depositLink
    ? "Pay your " + money_(cost.deposit) + " deposit here: " + depositLink
    : PARTNERSHIP.ranchContact.name + " at " + PARTNERSHIP.ranch + " will reach out shortly to collect your " + money_(cost.deposit) + " deposit.";
  const season = seasonCopy_(o.season);
  const rolled = o.season !== CURRENT_SEASON;
  const share = shareLabel_(o.share).toLowerCase();
  const bodyText = [
    "Hi " + (o.name || "").split(" ")[0] + ",",
    "",
    "Thanks for reserving a " + share + " share through " + PARTNERSHIP.listing + ". Beef from " + PARTNERSHIP.ranch + ", cut at " + PARTNERSHIP.butcher + ". Your order code is " + o.code + ".",
    rolled
      ? "The " + seasonCopy_(CURRENT_SEASON).name + " harvest doesn't have a " + share + " left, so your share is reserved from the " + season.name + " harvest, with pickup " + season.pickup + "."
      : "Your share comes from the " + season.name + " harvest, with pickup " + season.pickup + ".",
    "",
    "You're buying a " + share + " share of one ear-tagged steer, as " + ownersLabel_(o.share) + ". " + PARTNERSHIP.ranch + " will confirm your bill of sale and your steer's tag.",
    "",
    payLine,
    "",
    "WHAT YOU'LL PAY",
  ].concat(pricingLines_(cost), [
    "Your share of the steer is a fixed price. Processing is billed by the butcher on your steer's actual hanging weight, so that line can move a little either way.",
    "",
    "WHAT HAPPENS NEXT",
    "Now: your deposit holds your share. You can adjust your cut sheet until your steer goes to the butcher.",
    "Bill of sale: " + PARTNERSHIP.ranch + " confirms your bill of sale and your steer's ear tag.",
    "This " + season.name + ": harvest. Your beef dry-ages 14 days at " + PARTNERSHIP.butcher + " in " + PARTNERSHIP.butcherCity + ".",
    "After the hang: cut and packaged to your cut sheet, vacuum sealed, and labeled Not For Sale with your name.",
    "Pickup, " + season.pickup + ": at " + PARTNERSHIP.butcher + ", " + PARTNERSHIP.butcherAddress + ". We'll confirm the date.",
    "",
  ], DISCLOSURES, [
    "",
    "YOUR CUT SHEET",
    summary,
    "",
    "Questions about your steer or the ranch? Call or text " + PARTNERSHIP.ranchContact.name + " at " + PARTNERSHIP.ranch + ", " + PARTNERSHIP.ranchContact.phone + ".",
    "Anything else, just reply to this email or write " + SUPPORT_EMAIL + ".",
    "",
    "Ranch Cuts",
    "Your local ranch. Your local butcher. Your cuts.",
  ]).join("\n");
  MailApp.sendEmail({ to: o.email, subject: subject, body: bodyText, name: "Ranch Cuts", replyTo: replyTo_() });
}

/* ---------------- the final invoice ----------------
   Sent by hand from the ranch office once a steer's numbers are
   settled. Everything in it is recomputed here from the sheet. */

function invoiceCustomer_(o, steer, price) {
  const subject = "Your " + PARTNERSHIP.listing + " final invoice, " + o.code;
  const note = discountNote_(price);
  const share = shareLabel_(o.share).toLowerCase();
  const readyLine = steer.readyDate
    ? "Ready for pickup: " + prettyDate_(steer.readyDate) + " at " + PARTNERSHIP.butcher + ", " + PARTNERSHIP.butcherAddress + "."
    : "Pickup at " + PARTNERSHIP.butcher + ", " + PARTNERSHIP.butcherAddress + ". We'll confirm the date.";

  const lines = [
    "Hi " + (o.name || "").split(" ")[0] + ",",
    "",
    "Your " + share + " share is cut and weighed, so here's your final invoice. Two charges, two sellers.",
    "",
    "YOUR STEER",
    "Ear tag: " + (o.steer || "not assigned"),
    "Hanging weight: " + price.hangingLbs + " lb (your " + share + ": " + price.shareLbs + " lb)",
    "",
    "1. YOUR SHARE OF THE STEER, sold by " + PARTNERSHIP.sellerOfRecord + " (fixed)",
    price.discount > 0
      ? money_(price.animalList) + " less a " + money_(price.discount) + " discount = " + money_(price.animal)
      : money_(price.animal),
    "Deposit already paid: " + money_(price.deposit),
    "Due to " + PARTNERSHIP.sellerOfRecord + " at pickup: " + money_(price.animalBalance),
    "",
    "2. PROCESSING by " + PARTNERSHIP.butcher + ", billed by the butcher at its posted rates",
  ];
  price.processingLines.forEach(function (l) { lines.push(l[0] + ": " + money2_(l[1])); });
  lines.push(
    "Processing total: " + money2_(price.processing),
    "",
    "ALL IN: " + money2_(price.total),
    "DUE AT PICKUP: " + money2_(price.balance) + " (" + money_(price.animalBalance) + " to the ranch, " + money2_(price.processing) + " to the butcher)",
    "",
  );

  if (note) lines.push("GOOD NEWS ON YOUR PRICE", note, "");

  lines.push(
    readyLine,
    "Everything comes out frozen, vacuum sealed, labeled Not For Sale and boxed, so leave room in the vehicle.",
    STORAGE_NOTE,
    "The butcher's own invoice is final for processing.",
    "",
    "Questions about your steer? Call or text " + PARTNERSHIP.ranchContact.name + " at " + PARTNERSHIP.ranch + ", " + PARTNERSHIP.ranchContact.phone + ".",
    "Anything else, just reply here or write " + SUPPORT_EMAIL + ".",
    "",
    "Ranch Cuts",
  );

  MailApp.sendEmail({
    to: o.email,
    subject: subject,
    body: lines.join("\n"),
    name: "Ranch Cuts",
    replyTo: replyTo_(),
  });
}
