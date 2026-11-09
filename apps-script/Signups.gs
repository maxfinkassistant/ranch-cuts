/**
 * @OnlyCurrentDoc
 *
 * Ranch Cuts sign-ups: "tell me when a ranch and butcher open near me."
 *
 * A small standalone web app, so sign-ups can run before the order backend
 * (Code.gs) is live. The site posts every sign-up form here (src/lib/api.ts,
 * submitWaitlist) and each one becomes a row on the "Sign-ups" sheet.
 *
 * Setup (about five minutes, once):
 *   1. Create a Google Sheet named "Ranch Cuts Sign-ups" (sheets.new).
 *   2. Extensions > Apps Script. Replace the starter code with this file. Save.
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as: Me.   Who has access: Anyone.
 *      Approve the permission when asked. It covers this one spreadsheet only
 *      (the @OnlyCurrentDoc line above), not the rest of your Drive.
 *   4. Copy the web app URL (ends in /exec) into the VITE_SIGNUP_URL repository
 *      variable, then re-run the "Deploy to GitHub Pages" workflow:
 *        gh variable set VITE_SIGNUP_URL -R maxfinkassistant/ranch-cuts --body "<url>"
 *        gh workflow run deploy.yml -R maxfinkassistant/ranch-cuts
 *   5. Open <url> in a browser: it should answer {"ok":true,"service":"ranch-cuts-signups"}.
 *
 * After editing this file: Deploy > Manage deployments > edit > Version "New version".
 * The URL stays the same.
 *
 * Endpoints
 *   GET                       health check.
 *   POST {action:"waitlist", email, zip, place?, state?, nearest?, source?,
 *         utmSource?, utmMedium?, utmCampaign?, utmContent?, referrer?, landing?, createdAt?}
 *                             appends a sign-up. The same email + zip twice is kept once.
 *
 * The full backend (Code.gs) answers the same POST, so VITE_SIGNUP_URL can point at
 * either. This script is the one to use until orders open.
 */

const SHEET = "Sign-ups";
const HEADERS = [
  "Created", "Email", "Zip", "Place", "State", "Nearest metro", "Form",
  "UTM source", "UTM medium", "UTM campaign", "UTM content", "Referrer", "Landing page",
];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  /* the spreadsheet this script was opened from (Extensions > Apps Script) */
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sh.getRange("C:C").setNumberFormat("@");   // keep leading zeros on zips
  }
  return sh;
}

function doGet() {
  return json_({ ok: true, service: "ranch-cuts-signups" });
}

function doPost(e) {
  try { return doPost_(e); } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}

function doPost_(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad json" }); }
  if (body.action !== "waitlist") return json_({ ok: false, error: "unknown action" });

  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const zip = String(body.zip || "").trim().slice(0, 10);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json_({ ok: false, error: "Please enter a valid email." });
  if (zip && !/^\d{5}$/.test(zip)) return json_({ ok: false, error: "Please enter a 5-digit zip code." });

  const created = body.createdAt ? new Date(body.createdAt) : new Date();
  /* a leading = + - or @ would make Sheets run the cell as a formula: store it as text */
  const text = (s) => (/^[=+\-@]/.test(s) ? "'" + s : s);
  const clip = (v) => text(String(v || "").trim().slice(0, 200));

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const last = sh.getLastRow();
    /* the same person signing up twice from the same zip stays one row */
    if (last > 1) {
      const seen = sh.getRange(2, 2, last - 1, 2).getValues();
      if (seen.some((r) => String(r[0]).toLowerCase() === email && String(r[1]) === zip)) return json_({ ok: true, repeat: true });
    }
    sh.appendRow([
      isNaN(created.getTime()) ? new Date() : created,
      text(email), zip, clip(body.place), clip(body.state), clip(body.nearest), clip(body.source),
      clip(body.utmSource), clip(body.utmMedium), clip(body.utmCampaign), clip(body.utmContent),
      clip(body.referrer), clip(body.landing),
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
