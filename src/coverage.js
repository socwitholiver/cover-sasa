// CoverSasa — shared coverage engine.
//
// This is the single source of truth for the numbers CoverSasa shows. It is
// imported by BOTH the browser UI (interactive cards + receipts) and the
// backend demo answers (server/mock.js), so the tariffs can never drift apart.
//
// Everything here is derived from Kenya's Ministry of Health SHA/SHIF benefit
// package and the gazetted tariffs (health.go.ke, 2024/2025). Figures are the
// published tariffs SHA pays accredited facilities.
//
// The three features that set CoverSasa apart all live here:
//   1. Cost breakdown   — computeBreakdown() returns { shaCovers, youPay } so
//                          the UI can show a clean "SHA covers X | You pay Y".
//   2. Facility tiers    — the answer changes with the facility LEVEL. A CS is
//                          KES 0 at a Level-4 public hospital but simply not
//                          offered at a dispensary (you get referred up).
//   3. Confidence flag   — every service carries a confidence. Anything we
//                          can't map cleanly comes back "low" so the UI can say
//                          "not certain — confirm at the SHA office".

/* ------------------------------------------------------------------ *
 * Facility levels — the tier selector on every coverage card.
 * `level` is the numeric MOH level used for availability comparisons.
 * ------------------------------------------------------------------ */
export const FACILITY_LEVELS = [
  { id: "dispensary", level: 3, label: "Dispensary", sublabel: "Level 2–3", swahili: "Zahanati" },
  { id: "subcounty",  level: 4, label: "Sub-county", sublabel: "Level 4",   swahili: "Wilaya" },
  { id: "county",     level: 5, label: "County Referral", sublabel: "Level 5", swahili: "Kaunti" },
  { id: "national",   level: 6, label: "National Referral", sublabel: "Level 6", swahili: "Kitaifa" },
];

export const DEFAULT_LEVEL = "subcounty"; // most common admission point

export function levelById(id) {
  return FACILITY_LEVELS.find((l) => l.id === id) || FACILITY_LEVELS[1];
}

/* ------------------------------------------------------------------ *
 * Service catalog. `serviceKey` is what the backend emits on the card;
 * the UI looks the service up here to render the interactive breakdown.
 *
 *  kind:      "cost" (has a tariff + tier breakdown) | "info" (guidance only)
 *  fund:      PHF | SHIF | ECCIF
 *  minLevel:  lowest facility level that actually OFFERS the service
 *  shaTariff: what SHA pays the facility (KES). null for capitated/free care.
 *  perLevel:  optional { levelNum: tariff } when the tariff itself changes by
 *             level (e.g. inpatient bed-day rate).
 *  unit:      what the tariff is per ("session", "day", "delivery"…)
 *  youPayPublic: out-of-pocket at a PUBLIC facility (usually 0).
 *  cap:       annual/'household' limit string, shown as a note.
 *  confidence: high | medium | low
 * ------------------------------------------------------------------ */
export const SERVICES = {
  outpatient: {
    kind: "cost", fund: "PHF", status: "covered", confidence: "high",
    name: "Outpatient care", minLevel: 3, shaTariff: 0, unit: "visit",
    youPayPublic: 0,
    blurb: "Consultations, basic lab tests and essential medicines are capitated under the Primary Healthcare Fund — free at the point of care.",
    requires: [], cap: "Capitated at ~KES 900 per person / year (paid by government)",
    nextStep: "Visit your nearest Level 2–4 facility with your SHA card",
  },
  drugs: {
    kind: "cost", fund: "PHF", status: "partial", confidence: "medium",
    name: "Prescription medicines", minLevel: 3, shaTariff: 0, unit: "prescription",
    youPayPublic: 0,
    blurb: "Essential medicines on the SHA formulary are free at public facilities. Drugs outside the formulary can be out-of-pocket.",
    requires: [], cap: "Formulary drugs only — confirm your specific drug at the pharmacy",
    nextStep: "Ask the pharmacy whether your drug is on the SHA formulary",
  },
  delivery: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "Normal delivery", minLevel: 3, shaTariff: 10000, unit: "delivery",
    youPayPublic: 0,
    blurb: "A normal (vaginal) delivery is fully covered and includes about a 2-day stay. Free maternity applies at public facilities.",
    requires: [], cap: "Covers ~2 days of stay",
    nextStep: "Bring your SHA card and ID to any public maternity unit",
  },
  cs: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "Caesarean section (CS)", minLevel: 4, shaTariff: 30000, unit: "operation",
    youPayPublic: 0,
    blurb: "A Caesarean section is covered and includes about a 3-day stay. It needs a facility with a theatre (Level 4 and above).",
    requires: ["Valid SHA card & national ID at admission"],
    cap: "Covers ~3 days of stay",
    nextStep: "Bring your SHA card and ID; a Level 2–3 unit will refer you up",
  },
  dialysis: {
    kind: "cost", fund: "ECCIF", status: "covered", confidence: "high",
    name: "Haemodialysis", minLevel: 4, shaTariff: 10650, unit: "session",
    youPayPublic: 0,
    blurb: "Haemodialysis is fully covered under the Emergency, Chronic & Critical Illness Fund, commonly up to two sessions a week.",
    requires: ["Pre-authorisation from the treating unit"],
    cap: "Commonly up to 2 sessions / week",
    nextStep: "Register at a renal unit; SHA settles the sessions directly",
  },
  chemo: {
    kind: "cost", fund: "ECCIF", status: "covered", confidence: "high",
    name: "Chemotherapy", minLevel: 5, shaTariff: 5500, unit: "session",
    youPayPublic: 0,
    blurb: "Cancer treatment including chemotherapy is covered up to KES 400,000 per member per year, at accredited oncology centres.",
    requires: ["Referral to an oncology centre", "Pre-authorisation"],
    cap: "Up to KES 400,000 per member / year",
    nextStep: "Get a referral to a Level 5/6 oncology centre with your SHA card",
  },
  mri: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "MRI scan", minLevel: 4, shaTariff: 11000, unit: "scan",
    youPayPublic: 0,
    blurb: "An MRI scan is covered with a referral and pre-authorisation. Available at Level 4+ facilities with imaging.",
    requires: ["Referral", "Pre-authorisation"],
    cap: "Limit: 2 advanced scans (MRI/CT) per household / year",
    nextStep: "Get a referral, then bring your SHA card",
  },
  ct: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "CT scan", minLevel: 4, shaTariff: 6900, unit: "scan",
    youPayPublic: 0,
    blurb: "A CT scan is covered with a referral and pre-authorisation, at Level 4+ facilities with imaging.",
    requires: ["Referral", "Pre-authorisation"],
    cap: "Limit: 2 advanced scans (MRI/CT) per household / year",
    nextStep: "Get a referral, then bring your SHA card",
  },
  appendectomy: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "Appendix removal", minLevel: 4, shaTariff: 67200, unit: "operation",
    youPayPublic: 0,
    blurb: "Appendectomy is a covered surgical procedure at facilities with a theatre (Level 4 and above).",
    requires: ["Valid SHA card & national ID at admission"],
    cap: "",
    nextStep: "Bring your SHA card and ID; lower levels will refer you up",
  },
  admission: {
    kind: "cost", fund: "SHIF", status: "covered", confidence: "high",
    name: "Inpatient admission", minLevel: 3, shaTariff: 3360, unit: "day",
    // The bed-day rate is the clearest example of tier-dependent pricing.
    perLevel: { 3: 2240, 4: 3360, 5: 3920, 6: 4480 },
    youPayPublic: 0,
    blurb: "Inpatient bed and care are covered per day. The daily rate rises with the facility level.",
    requires: [], cap: "Up to 180 inpatient days per household / year",
    nextStep: "Bring your SHA card and ID at admission",
  },
  icu: {
    kind: "cost", fund: "ECCIF", status: "covered", confidence: "high",
    name: "ICU care", minLevel: 5, shaTariff: 35000, unit: "day",
    youPayPublic: 0,
    blurb: "Intensive care is covered under the critical-illness fund at referral facilities.",
    requires: [], cap: "Up to 14 ICU days",
    nextStep: "Emergencies are treated first — paperwork follows",
  },
  ambulance: {
    kind: "cost", fund: "ECCIF", status: "covered", confidence: "high",
    name: "Ambulance / evacuation", minLevel: 3, shaTariff: 4500, unit: "trip (≤25 km)",
    youPayPublic: 0,
    blurb: "Emergency road and air evacuation are covered. Within 25 km is a flat rate; beyond that adds KES 75 per extra km.",
    requires: [], cap: "KES 75 per km beyond 25 km",
    nextStep: "Call for evacuation first — it is treated as an emergency",
  },
  // ---- Informational (no per-tier cost breakdown) ----
  hospitals: {
    kind: "info", fund: "—", status: "unknown", confidence: "high",
    name: "SHA-accredited facilities",
    blurb: "All public facilities (Level 2–6) accept SHA, along with many registered private and faith-based facilities.",
    nextStep: "Open the Hospital Finder to see accredited facilities near you",
  },
  dependents: {
    kind: "info", fund: "—", status: "covered", confidence: "high",
    name: "Adding dependents",
    blurb: "Add your spouse and children to your household at no extra premium — they are covered under your registration.",
    nextStep: "Register dependents via *147# or the SHA app with their IDs / birth certificates",
  },
};

/* ------------------------------------------------------------------ *
 * Cost breakdown for a service at a given facility level.
 * This is what powers the live tier toggle on each card.
 * ------------------------------------------------------------------ */
export function computeBreakdown(serviceKey, facilityId) {
  const svc = SERVICES[serviceKey];
  const lvl = levelById(facilityId);
  if (!svc || svc.kind !== "cost") return null;

  const offeredHere = lvl.level >= svc.minLevel;
  const tariff = svc.perLevel ? svc.perLevel[lvl.level] ?? svc.shaTariff : svc.shaTariff;

  // What SHA pays the facility, and what the member pays out of pocket.
  const shaCovers = offeredHere ? tariff : svc.perLevel ? svc.perLevel[svc.minLevel] : tariff;
  const youPayPublic = svc.youPayPublic ?? 0;

  // Where the member would actually receive care.
  const referTo = offeredHere ? null : FACILITY_LEVELS.find((l) => l.level >= svc.minLevel);

  return {
    offeredHere,
    referTo, // null when offered at the chosen level
    fund: svc.fund,
    unit: svc.unit,
    status: svc.status,
    confidence: svc.confidence,
    shaCovers, // number (KES SHA pays the facility)
    youPayPublic, // number (KES the member pays at a PUBLIC facility)
    // Coverage ratio for the little proportion bar (public facility view).
    coveredPct:
      shaCovers + youPayPublic === 0 ? 100 : Math.round((shaCovers / (shaCovers + youPayPublic)) * 100),
    cap: svc.cap,
    requires: svc.requires || [],
  };
}

/* ------------------------------------------------------------------ *
 * Formatting + share helpers.
 * ------------------------------------------------------------------ */
export function formatKES(n) {
  if (n === null || n === undefined || n === "") return "—";
  if (typeof n === "string") return n; // already formatted (e.g. "Varies")
  if (n === 0) return "KES 0";
  return "KES " + Number(n).toLocaleString("en-KE");
}

// A short human reference code for the receipt (deterministic-ish, demo only).
export function receiptRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `CS-${t}-${r}`;
}

// Plain-text summary used for WhatsApp / clipboard sharing.
export function buildShareText({ service, level, shaCovers, youPay, status, ref, confidence }) {
  const lines = [
    "🩺 *CoverSasa — SHA coverage check*",
    "",
    `*Service:* ${service}`,
    `*Facility:* ${level}`,
    `*Status:* ${statusLabel(status)}`,
    `*SHA covers:* ${typeof shaCovers === "number" ? formatKES(shaCovers) : shaCovers}`,
    `*You pay (public):* ${typeof youPay === "number" ? formatKES(youPay) : youPay}`,
  ];
  if (confidence === "low") lines.push("", "⚠️ Not certain — please confirm at the SHA office.");
  lines.push("", `Ref: ${ref}`, "Generated by CoverSasa · not medical advice");
  return lines.join("\n");
}

export function statusLabel(status) {
  return (
    {
      covered: "Covered",
      partial: "Partly covered",
      not_covered: "Not covered",
      unknown: "Check at facility",
    }[status] || "Check at facility"
  );
}
