// CoverSasa — DEMO answers used when no ANTHROPIC_API_KEY is set, so the full
// app (chat + interactive coverage cards + receipts) can be shown end-to-end
// without a key. Tariffs come from the shared coverage engine (src/coverage.js)
// so the demo can never drift from what the cards compute.
//
// Each answer ends with the reserved §§CARD§§ token followed by a single-line
// JSON card. The frontend hides the JSON and renders the interactive card:
//   { serviceKey, status, confidence, service, fund, shaTariff, summary }
// The per-facility-tier cost breakdown is computed on the client from serviceKey.

import { SERVICES, formatKES } from "../src/coverage.js";

const card = (o) => "\n§§CARD§§" + JSON.stringify(o);

// crude Swahili detector — enough to mirror language in the demo.
const SW = /\b(je|inalipa|nitalipa|ngapi|kuzaa|mtoto|homa|dawa|hospitali|serikali|kadi|gharama|bima|naomba|habari|za|figo|saratani|upasuaji)\b/i;

// Build the card payload for a service key straight from the shared engine.
function cardFor(serviceKey, serviceLabel) {
  const s = SERVICES[serviceKey] || {};
  return {
    serviceKey,
    status: s.status || "unknown",
    confidence: s.confidence || "low",
    service: serviceLabel || s.name || "Service",
    fund: s.fund || "—",
    shaTariff: s.shaTariff ?? null,
  };
}

const ANSWERS = [
  {
    match: /dialysis|dialisis|figo|kidney|renal/i,
    key: "dialysis",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — SHA inalipia dialysis kikamilifu kupitia ECCIF. Katika hospitali ya umma **utalipa Ksh 0**. SHA hulipa Ksh 10,650 kwa kila kipindi, mara mbili kwa wiki. Inapatikana Level 4+."
        : "Yes ✅ — SHA covers dialysis in full through the ECCIF fund. At a public hospital **you pay Ksh 0**. SHA pays Ksh 10,650 per session, commonly twice a week. Offered at Level 4+.",
      label: sw ? "Dialysis (figo)" : "Haemodialysis",
    }),
  },
  {
    match: /\bcs\b|c-section|caesar|cesar|operation ya kuzaa/i,
    key: "cs",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — upasuaji wa kuzaa (CS) unalipiwa. Katika hospitali ya umma **utalipa Ksh 0**. SHA hulipa Ksh 30,000 (siku ~3 za kulazwa). Unahitaji kituo cha Level 4+ chenye theatre."
        : "Yes ✅ — a Caesarean section (CS) is covered. At a public hospital **you pay Ksh 0**. SHA pays Ksh 30,000 (covers ~3-day stay). Needs a Level 4+ facility with a theatre.",
      label: sw ? "Upasuaji wa kuzaa (CS)" : "Caesarean section (CS)",
    }),
  },
  {
    match: /delivery|kujifungua|normal birth|kuzaa/i,
    key: "delivery",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — kujifungua kwa kawaida kunalipiwa. Hospitali ya umma: **Ksh 0**. SHA hulipa Ksh 10,000 (siku ~2). Huduma ya uzazi bila malipo inapatikana Level 2/3."
        : "Yes ✅ — a normal delivery is covered. Public hospital: **Ksh 0**. SHA pays Ksh 10,000 (~2-day stay). Free maternity applies from Level 2/3.",
      label: sw ? "Kujifungua kawaida" : "Normal delivery",
    }),
  },
  {
    match: /mri/i,
    key: "mri",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — MRI inalipiwa. Hospitali ya umma (Level 4+): **Ksh 0**; SHA hulipa Ksh 11,000. Unahitaji rufaa + uidhinishaji. Kikomo: skani 2 kwa kaya kwa mwaka."
        : "Yes ✅ — an MRI scan is covered. Public hospital (Level 4+): **Ksh 0**; SHA pays Ksh 11,000. Needs a referral + pre-authorisation. Limit: 2 scans per household / year.",
      label: sw ? "Skani ya MRI" : "MRI scan",
    }),
  },
  {
    match: /ct scan|ct-scan|\bct\b|cat scan/i,
    key: "ct",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — CT scan inalipiwa. Hospitali ya umma (Level 4+): **Ksh 0**; SHA hulipa Ksh 6,900. Unahitaji rufaa + uidhinishaji."
        : "Yes ✅ — a CT scan is covered. Public hospital (Level 4+): **Ksh 0**; SHA pays Ksh 6,900. Needs a referral + pre-authorisation.",
      label: sw ? "Skani ya CT" : "CT scan",
    }),
  },
  {
    match: /chemo|cancer|saratani|oncology|tumor|radiotherapy/i,
    key: "chemo",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — chemotherapy inalipiwa kupitia ECCIF, hadi Ksh 400,000 kwa mwaka. Hospitali ya umma: **Ksh 0**. SHA hulipa Ksh 5,500 kwa kipindi. Inapatikana Level 5/6."
        : "Yes ✅ — chemotherapy is covered through ECCIF, up to Ksh 400,000 per year. Public hospital: **Ksh 0**. SHA pays Ksh 5,500 per session. Offered at Level 5/6.",
      label: sw ? "Chemotherapy (saratani)" : "Chemotherapy",
    }),
  },
  {
    match: /appendix|appendectomy|appendisitis|appendicitis/i,
    key: "appendectomy",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — upasuaji wa kuondoa appendix unalipiwa. Hospitali ya umma (Level 4+): **Ksh 0**. SHA hulipa Ksh 67,200. Level 2/3 watakupa rufaa."
        : "Yes ✅ — an appendectomy is covered. Public hospital (Level 4+): **Ksh 0**. SHA pays Ksh 67,200. A Level 2/3 unit will refer you up.",
      label: sw ? "Kuondoa appendix" : "Appendix removal",
    }),
  },
  {
    match: /admission|admit|inpatient|bed|kulazwa|ward/i,
    key: "admission",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — kulazwa kunalipiwa kwa siku. Hospitali ya umma: **Ksh 0**. Kiwango cha kila siku hupanda na kiwango cha kituo (Level 3: 2,240 → Level 6: 4,480). Hadi siku 180 kwa mwaka."
        : "Yes ✅ — inpatient admission is covered per day. Public hospital: **Ksh 0**. The daily rate rises with facility level (Level 3: 2,240 → Level 6: 4,480). Up to 180 days / year.",
      label: sw ? "Kulazwa (inpatient)" : "Inpatient admission",
    }),
  },
  {
    match: /icu|intensive care|critical care|hdu/i,
    key: "icu",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — ICU inalipiwa kupitia ECCIF. Hospitali ya umma: **Ksh 0**. SHA hulipa Ksh 35,000 kwa siku, hadi siku 14. Inapatikana Level 5/6."
        : "Yes ✅ — ICU care is covered through ECCIF. Public hospital: **Ksh 0**. SHA pays Ksh 35,000/day, up to 14 days. Offered at Level 5/6.",
      label: sw ? "Huduma ya ICU" : "ICU care",
    }),
  },
  {
    match: /ambulance|evacuation|gari la wagonjwa/i,
    key: "ambulance",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — ambulance ya dharura inalipiwa. Ndani ya km 25: Ksh 4,500; zaidi ya hapo Ksh 75 kwa kila km. Hospitali ya umma: **Ksh 0**."
        : "Yes ✅ — emergency ambulance is covered. Within 25 km: Ksh 4,500; beyond that Ksh 75 per extra km. Public facility: **Ksh 0**.",
      label: sw ? "Ambulance ya dharura" : "Ambulance / evacuation",
    }),
  },
  {
    match: /homa|fever|malaria|mtoto|child|outpatient|clinic|consultation/i,
    key: "outpatient",
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — matibabu ya nje (kama homa ya mtoto) yanalipiwa na PHF Level 2–4. Hospitali ya umma: **Ksh 0** kwa uchunguzi, vipimo vya msingi na dawa za msingi."
        : "Yes ✅ — outpatient care (like a child's fever) is covered by the PHF fund at Level 2–4. Public hospital: **Ksh 0** for the consultation, basic tests and essential medicines.",
      label: sw ? "Matibabu ya nje (homa)" : "Outpatient care",
    }),
  },
  {
    match: /drug|dawa|medicine|prescription|pharmacy|meds/i,
    key: "drugs",
    build: (sw) => ({
      text: sw
        ? "Kwa kiasi ✅ — dawa muhimu za orodha ya SHA (formulary) ni **Ksh 0** vituo vya umma. Dawa nje ya orodha unaweza kununua mwenyewe. Uliza dawati la SHA kwa dawa yako."
        : "Partly ✅ — essential medicines on the SHA formulary are **Ksh 0** at public facilities. Drugs outside the formulary may be out-of-pocket. Ask the SHA desk about your specific drug.",
      label: sw ? "Dawa (prescription)" : "Prescription medicines",
    }),
  },
  {
    match: /hospital|near|nearest|facility|kituo|karibu|accredit/i,
    key: "hospitals",
    build: (sw) => ({
      text: sw
        ? "Vituo vyote vya umma (Level 2–6) vinakubali SHA, pamoja na vituo vingi vya binafsi/kidini vilivyosajiliwa. Fungua Hospital Finder uone vilivyo karibu nawe."
        : "All public facilities (Level 2–6) accept SHA, plus many registered private and faith-based facilities. Open the Hospital Finder to see the ones near you.",
      label: sw ? "Vituo vinavyokubali SHA" : "SHA-accredited facilities",
    }),
  },
  {
    match: /dependent|tegemezi|family|add member|watoto|mke|mume|household/i,
    key: "dependents",
    build: (sw) => ({
      text: sw
        ? "Unaweza kuongeza wategemezi (mke/mume na watoto) bila ada ya ziada — wako chini ya kaya yako. Sajili kupitia *147# au SHA app ukiwa na vitambulisho/vyeti vya kuzaliwa."
        : "You can add dependents (spouse and children) at no extra premium — they fall under your household. Register via *147# or the SHA app with their IDs / birth certificates.",
      label: sw ? "Kuongeza wategemezi" : "Adding dependents",
    }),
  },
];

// Confidence-flag fallback: we don't recognise the service, so say so honestly
// rather than inventing a figure. This is the "responsible AI" behaviour.
const FALLBACK = (sw) => ({
  text: sw
    ? "Sijui kwa uhakika kuhusu huduma hiyo mahususi kutoka kwa data niliyonayo. **Sina uhakika** — tafadhali thibitisha na afisi ya SHA au dawati la SHA kituoni. Kwa ujumla, huduma zilizolipiwa hospitali ya umma ni Ksh 0."
    : "I'm not certain about that specific service from the data I have. **Please confirm at the SHA office** or the SHA desk at your facility. In general, covered services at a public hospital are Ksh 0.",
  card: {
    serviceKey: null,
    status: "unknown",
    confidence: "low",
    service: sw ? "Huduma uliyoiuliza" : "Your requested service",
    fund: "—",
    shaTariff: null,
  },
});

export function mockAnswer(question) {
  const sw = SW.test(question || "");
  const hit = ANSWERS.find((a) => a.match.test(question || ""));
  if (!hit) {
    const fb = FALLBACK(sw);
    return fb.text + card(fb.card);
  }
  const { text, label } = hit.build(sw);
  return text + card(cardFor(hit.key, label));
}
