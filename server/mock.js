// CoverSasa — DEMO answers used when no ANTHROPIC_API_KEY is set, so the full
// app (chat + coverage cards) can be test-run without a key. Figures mirror
// server/sha-data.js. Each answer ends with the §§CARD§§ JSON the UI renders.

const card = (o) => "\n§§CARD§§" + JSON.stringify(o);

// crude Swahili detector — enough to mirror language in the demo.
const SW = /\b(je|inalipa|nitalipa|ngapi|kuzaa|mtoto|homa|dawa|hospitali|serikali|kadi|gharama|bima|naomba|habari|za)\b/i;

const ANSWERS = [
  {
    match: /dialysis|dialisis|figo|kidney/i,
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — SHA inalipia dialysis kikamilifu kupitia ECCIF. Katika hospitali ya umma utalipa **Ksh 0**. SHA hulipa Ksh 10,650 kwa kila kipindi (haemodialysis), mara mbili kwa wiki. Leta kadi yako ya SHA na kitambulisho."
        : "Yes ✅ — SHA covers dialysis in full through the ECCIF fund. At a public hospital you pay **Ksh 0**. SHA pays Ksh 10,650 per haemodialysis session (commonly up to 2 sessions/week). Bring your SHA card and ID.",
      json: {
        status: "covered",
        service: sw ? "Dialysis (figo)" : "Dialysis",
        publicCost: "Ksh 0",
        publicNote: sw ? "SHA hulipa 100%" : "SHA pays 100%",
        privateCost: "Co-pay",
        privateNote: sw ? "Ziada juu ya Ksh 10,650/kipindi" : "Balance above Ksh 10,650/session",
        notes: [
          sw ? "Kikomo: kawaida vipindi 2 kwa wiki" : "Usually up to 2 sessions/week",
          sw ? "Uidhinishaji wa awali unahitajika" : "Pre-authorisation required",
        ],
        nextStep: sw ? "Leta kadi ya SHA na kitambulisho" : "Bring your SHA card & ID",
      },
    }),
  },
  {
    match: /\bcs\b|c-section|caesar|cesar|kuzaa|operation ya kuzaa|delivery|kujifungua/i,
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — upasuaji wa kuzaa (CS) unalipiwa na SHA. Katika hospitali ya umma utalipa **Ksh 0**. SHA hulipa Ksh 30,000 (inajumuisha takriban siku 3 za kulazwa). Leta kadi yako ya SHA na kitambulisho."
        : "Yes ✅ — a Caesarean section (CS) is covered by SHA. At a public hospital you pay **Ksh 0**. SHA pays Ksh 30,000, which covers about a 3-day stay. Bring your SHA card and ID.",
      json: {
        status: "covered",
        service: sw ? "Upasuaji wa kuzaa (CS)" : "Caesarean section (CS)",
        publicCost: "Ksh 0",
        publicNote: sw ? "SHA hulipa 100%" : "SHA pays 100%",
        privateCost: "Co-pay",
        privateNote: sw ? "Ziada juu ya Ksh 30,000" : "Balance above Ksh 30,000",
        notes: [
          sw ? "Inajumuisha ~siku 3 za kulazwa" : "Covers ~3 days of stay",
          sw ? "Uzazi wa kawaida pia hulipiwa" : "Normal delivery is also covered",
        ],
        nextStep: sw ? "Leta kadi ya SHA na kitambulisho" : "Bring your SHA card & ID",
      },
    }),
  },
  {
    match: /mri|scan|ct scan|imaging|x-ray|xray/i,
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — MRI inalipiwa. Katika hospitali ya umma (Level 4+) utalipa **Ksh 0**; SHA hulipa Ksh 11,000. Unahitaji rufaa na uidhinishaji wa awali. Kikomo: skani 2 kwa kaya kwa mwaka."
        : "Yes ✅ — an MRI scan is covered. At a public hospital (Level 4+) you pay **Ksh 0**; SHA pays Ksh 11,000. It needs a referral and pre-authorisation. Limit: 2 scans per household per year.",
      json: {
        status: "covered",
        service: sw ? "Skani ya MRI" : "MRI scan",
        publicCost: "Ksh 0",
        publicNote: sw ? "SHA hulipa 100%" : "SHA pays 100%",
        privateCost: "Co-pay",
        privateNote: sw ? "Hutofautiana na kituo" : "Varies by facility tier",
        notes: [
          sw ? "Rufaa + uidhinishaji unahitajika" : "Referral + pre-authorisation required",
          sw ? "Kikomo: skani 2 kwa mwaka" : "Limit: 2 scans per year",
        ],
        nextStep: sw ? "Pata rufaa kisha leta kadi ya SHA" : "Get a referral, then bring your SHA card",
      },
    }),
  },
  {
    match: /chemo|cancer|saratani|oncology|tumor/i,
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — matibabu ya saratani (chemotherapy) yanalipiwa kupitia ECCIF, hadi Ksh 400,000 kwa mwaka. Hospitali ya umma: **Ksh 0**. SHA hulipa Ksh 5,500 kwa kila kipindi cha chemo. Leta kadi na rufaa."
        : "Yes ✅ — cancer treatment including chemotherapy is covered through ECCIF, up to Ksh 400,000 per member per year. At a public hospital: **Ksh 0**. SHA pays Ksh 5,500 per chemo session. Bring your card and referral.",
      json: {
        status: "covered",
        service: sw ? "Chemotherapy (saratani)" : "Chemotherapy",
        publicCost: "Ksh 0",
        publicNote: sw ? "Ndani ya kikomo cha mwaka" : "Within annual limit",
        privateCost: "Co-pay",
        privateNote: sw ? "Baada ya Ksh 400,000/mwaka" : "After Ksh 400,000/year cap",
        notes: [
          sw ? "Kikomo: Ksh 400,000 kwa mwaka" : "Cap: Ksh 400,000 per year",
          sw ? "Uidhinishaji wa awali unahitajika" : "Pre-authorisation required",
        ],
        nextStep: sw ? "Leta kadi ya SHA na rufaa" : "Bring your SHA card & referral",
      },
    }),
  },
  {
    match: /homa|fever|malaria|mtoto|child|outpatient|clinic|consultation/i,
    build: (sw) => ({
      text: sw
        ? "Ndio ✅ — matibabu ya nje (outpatient) kwa mtoto kama homa yanalipiwa na PHF katika Level 2–4. Hospitali ya umma: **Ksh 0** — hakuna unayolipa kwa uchunguzi, vipimo vya msingi na dawa za msingi. Leta kadi ya SHA."
        : "Yes ✅ — outpatient care for a child (like fever) is covered by the PHF fund at Level 2–4 facilities. At a public hospital: **Ksh 0** — you pay nothing for the consultation, basic tests and essential medicines. Bring your SHA card.",
      json: {
        status: "covered",
        service: sw ? "Matibabu ya nje (homa)" : "Outpatient care (fever)",
        publicCost: "Ksh 0",
        publicNote: sw ? "PHF hulipia huduma za msingi" : "PHF covers primary care",
        privateCost: "Co-pay",
        privateNote: sw ? "Inaweza kutozwa kwa vituo binafsi" : "May apply at private facilities",
        notes: [
          sw ? "Inajumuisha dawa za msingi za formulary" : "Includes essential formulary medicines",
          sw ? "Level 2–4 vituo vya umma" : "Level 2–4 public facilities",
        ],
        nextStep: sw ? "Nenda kituo cha karibu na kadi ya SHA" : "Visit your nearest facility with your SHA card",
      },
    }),
  },
  {
    match: /drug|dawa|medicine|prescription|pharmacy|meds/i,
    build: (sw) => ({
      text: sw
        ? "Kwa kiasi ✅ — dawa muhimu zilizo kwenye orodha ya SHA (formulary) zinalipiwa katika vituo vya umma kwa **Ksh 0**. Dawa zilizo nje ya orodha unaweza kununua mwenyewe. Uliza dawati la SHA kituoni."
        : "Partly ✅ — essential medicines on the SHA formulary are covered at public facilities for **Ksh 0**. Medicines outside the formulary may be out-of-pocket. Ask the SHA desk at your facility to confirm your specific drug.",
      json: {
        status: "partial",
        service: sw ? "Dawa (prescription)" : "Prescription medicines",
        publicCost: "Ksh 0",
        publicNote: sw ? "Dawa za formulary" : "Formulary drugs",
        privateCost: "Varies",
        privateNote: sw ? "Dawa nje ya orodha" : "Non-formulary drugs",
        notes: [
          sw ? "Tegemea dawa mahususi" : "Depends on the specific drug",
          sw ? "Thibitisha kwenye dawati la SHA" : "Confirm at the SHA desk",
        ],
        nextStep: sw ? "Uliza dawati la SHA kwa dawa yako" : "Ask the SHA desk about your drug",
      },
    }),
  },
  {
    match: /hospital|near|nearest|facility|kituo|karibu/i,
    build: (sw) => ({
      text: sw
        ? "Vituo vyote vya umma vya SHA (Level 2–6) vinakubali SHA, pamoja na vituo vingi vya binafsi na vya kidini vilivyosajiliwa. Tafuta kituo kilichosajiliwa cha SHA karibu nawe na uende na kadi yako."
        : "All SHA public facilities (Level 2–6) accept SHA, plus many registered private and faith-based facilities. Look for an SHA-contracted facility near you and go with your SHA card.",
      json: {
        status: "unknown",
        service: sw ? "Vituo vinavyokubali SHA" : "SHA-accredited hospitals",
        publicCost: "Ksh 0",
        publicNote: sw ? "Vituo vya umma Level 2–6" : "Public facilities Level 2–6",
        privateCost: "Co-pay",
        privateNote: sw ? "Vituo binafsi vilivyosajiliwa" : "Registered private facilities",
        notes: [
          sw ? "Tafuta kituo kilichosajiliwa cha SHA" : "Choose an SHA-contracted facility",
        ],
        nextStep: sw ? "Nenda na kadi yako ya SHA" : "Go with your SHA card",
      },
    }),
  },
  {
    match: /dependent|tegemezi|family|add member|watoto|mke|mume/i,
    build: (sw) => ({
      text: sw
        ? "Unaweza kuongeza wategemezi (mke/mume na watoto) kwenye akaunti yako ya SHA bila malipo ya ziada — wanaingia chini ya kaya yako. Sajili kupitia app ya SHA (*147#) au kituo cha Huduma, ukiwa na vitambulisho/vyeti vya kuzaliwa."
        : "You can add dependents (spouse and children) to your SHA account at no extra premium — they fall under your household. Register via the SHA app, *147#, or a Huduma centre with their IDs / birth certificates.",
      json: {
        status: "covered",
        service: sw ? "Kuongeza wategemezi" : "Adding dependents",
        publicCost: "Ksh 0",
        publicNote: sw ? "Hakuna ada ya ziada" : "No extra premium",
        privateCost: "—",
        privateNote: sw ? "Wanaingia kwenye kaya yako" : "Covered under your household",
        notes: [
          sw ? "Sajili kupitia *147# au SHA app" : "Register via *147# or the SHA app",
          sw ? "Beba vitambulisho / vyeti vya kuzaliwa" : "Bring IDs / birth certificates",
        ],
        nextStep: sw ? "Sajili wategemezi kupitia *147#" : "Register dependents via *147#",
      },
    }),
  },
];

const FALLBACK = (sw) => ({
  text: sw
    ? "Siwezi kuthibitisha huduma hiyo mahususi kutoka kwa data niliyonayo. Tafadhali uliza dawati la SHA kituoni kwako ili wakuthibitishie. Kwa ujumla, huduma zilizolipiwa katika hospitali ya umma ni **Ksh 0**."
    : "I can't confirm that specific service from the data I have. Please ask the SHA desk at your facility to confirm. In general, covered services at a public hospital are **Ksh 0**.",
  json: {
    status: "unknown",
    service: sw ? "Huduma uliyoiuliza" : "Your requested service",
    publicCost: "—",
    publicNote: sw ? "Thibitisha kituoni" : "Confirm at the facility",
    privateCost: "—",
    privateNote: sw ? "Thibitisha kituoni" : "Confirm at the facility",
    notes: [sw ? "Data ya demo — ongeza API key kwa majibu kamili" : "Demo data — add an API key for full answers"],
    nextStep: sw ? "Uliza dawati la SHA" : "Ask the SHA desk",
  },
});

export function mockAnswer(question) {
  const sw = SW.test(question || "");
  const hit = ANSWERS.find((a) => a.match.test(question || ""));
  const { text, json } = hit ? hit.build(sw) : FALLBACK(sw);
  return text + card(json);
}
