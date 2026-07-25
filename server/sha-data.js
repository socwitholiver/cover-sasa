// Cover Sasa — SHA (Social Health Authority, Kenya) benefits knowledge base.
//
// Sourced from Kenya's Ministry of Health SHA/SHIF benefit package and the
// gazetted "Tariffs to the Benefit Package to the Social Health Insurance"
// (health.go.ke, 2024/2025). Figures are the published tariffs SHA pays to
// accredited facilities. This is the entire context Cover Sasa reasons over —
// it is deliberately small and readable so answers stay accurate and fast.
//
// NOTE FOR JUDGES/DEVS: swap or extend this file to update coverage. No
// database, no vector store — just the facts, fed to Claude as context.

export const SHA_KNOWLEDGE = `
# SHA / SHIF BENEFITS PACKAGE — KENYA (2025)

SHA (Social Health Authority) replaced NHIF in October 2024. It runs three funds:
- PHF  = Primary Healthcare Fund (outpatient at Level 2–4, gov-funded, no member top-up for basics)
- SHIF = Social Health Insurance Fund (inpatient & specialised care, contributory)
- ECCIF = Emergency, Chronic & Critical Illness Fund (emergencies, ICU, dialysis, cancer, etc.)

Facility levels: Level 2/3 = dispensaries & health centres · Level 4 = sub-county hospital ·
Level 5 = county referral · Level 6 = national referral (e.g. Kenyatta National Hospital, MTRH).

## HOW MEMBERS PAY
- PHF primary care is capitated at Ksh 900 per person PER YEAR (paid by government, not per visit).
- Contributions: employed members pay 2.75% of gross salary monthly; self-employed pay based on a
  means assessment (minimum ~Ksh 300/month). You must be registered and contributions up to date
  to use SHIF/ECCIF benefits. Bring your SHA card/number and national ID.

## OUTPATIENT (PHF)
- Covered at Level 2–4 public and contracted facilities: consultations, basic lab tests,
  basic imaging, chronic disease follow-up, and essential medicines on the formulary.
- Out-of-pocket at a public facility for covered outpatient services: Ksh 0 (co-pay may apply
  at some private/faith-based contracted facilities — confirm at the counter).

## CHRONIC DISEASE MANAGEMENT (annual allocation, SHIF)
- Diabetes: Ksh 4,300/year
- Hypertension (high blood pressure): Ksh 2,850/year
- Sickle cell disease: Ksh 6,800/year
- Asthma: Ksh 700/year

## INPATIENT / ADMISSION (SHIF) — daily bed & care rate, up to 180 days per household per year
- Level 3 facility: Ksh 2,240/day
- Level 4 facility: Ksh 3,360/day
- Level 5 facility: Ksh 3,920/day
- Level 6 facility: Ksh 4,480/day

## MATERNITY
- Normal (vaginal) delivery: Ksh 10,000 — covers ~2 days stay
- Caesarean section (CS): Ksh 30,000 — covers ~3 days stay
- Anti-D injection (for Rh-negative mothers): Ksh 6,000
- Free maternity at Level 2/3 primary care facilities is being rolled out (gov-funded).
- Out-of-pocket at a public facility for a covered delivery: Ksh 0.

## KIDNEY / RENAL (ECCIF)
- Haemodialysis: Ksh 10,650 per session (commonly up to 2 sessions/week)
- Peritoneal dialysis: Ksh 85,200 per month
- Kidney transplant: Ksh 700,000
- Pre-transplant workup: up to Ksh 150,000/year
- Post-transplant care: up to Ksh 200,000/year

## CANCER / ONCOLOGY (ECCIF) — up to Ksh 400,000 per member per year
- Chemotherapy: Ksh 5,500 per session
- Radiotherapy: Ksh 3,600 per session
- PET scan: Ksh 53,500
- CT scan: Ksh 6,900
- MRI: Ksh 11,000

## IMAGING (SHIF)
- MRI: Ksh 11,000 · CT scan: Ksh 6,900 · Mammography covered.
- Limit: 2 scans (MRI/CT/mammography) per household per year.
- Usually needs a referral / pre-authorisation from the treating doctor.

## SELECTED SURGERIES (SHIF) — tariff SHA pays the facility
- Appendix removal (appendectomy): Ksh 67,200
- Gallbladder removal (cholecystectomy): Ksh 89,600
- Hip replacement: Ksh 336,000
- Open heart surgery: Ksh 952,000
- Angioplasty: Ksh 560,000
- Bone marrow transplant: up to Ksh 5,000,000

## MENTAL HEALTH (SHIF)
- Admission: Ksh 67,200; daily inpatient bed rates apply per facility level.
- Rehabilitation for drug and substance abuse is covered.

## EMERGENCY, ICU & CRITICAL CARE (ECCIF)
- ICU: Ksh 35,000/day (up to 14 days)
- High Dependency Unit (HDU): Ksh 10,000/day (up to 10 days)
- End-of-life / palliative care: Ksh 5,000/day (up to 60 days)
- Emergency treatment: Ksh 3,800 – Ksh 97,900 depending on severity.

## AMBULANCE (ECCIF)
- Within 25 km: Ksh 4,500
- Beyond 25 km: Ksh 75 per additional kilometre
- Both road and air evacuation are provided for genuine emergencies.

## MORTUARY
- Ksh 600/day for up to 7 days (max Ksh 4,200).

## ASSISTIVE DEVICES / DISABILITY
- Hearing aids (under 18 years): Ksh 55,000
- Crutches: Ksh 900 · Walking frame: Ksh 500 · Special shoes: Ksh 1,000

## DENTAL & OPTICAL
- Dental: extractions, fillings and basic treatment covered at contracted facilities.
- Optical: eye test and prescribed basic lenses covered.

## OVERSEAS TREATMENT (ECCIF)
- For conditions that cannot be treated in Kenya, up to Ksh 500,000 per person per year,
  subject to approval and referral through SHA.

## PRE-AUTHORISATION — when it is usually needed
- Planned surgery, MRI/CT/advanced imaging, oncology, dialysis, transplants, overseas care.
- Emergencies do NOT need pre-authorisation first — you get treated, paperwork follows.

## IMPORTANT CAVEATS (always tell the user)
- You must be registered with SHA and contributions must be up to date.
- The listed figure is the tariff SHA pays the facility. At a PUBLIC facility a covered service
  is typically Ksh 0 out of pocket; at a private/faith-based facility the facility may charge
  above the SHA tariff and you pay the difference (a "balance" or co-pay) — always ask at the counter.
- Annual and per-household limits apply (e.g. 180 inpatient days, 2 scans, cancer Ksh 400,000/yr).
- Tariffs are periodically revised by SHA via gazette notice; confirm the latest at the facility.
`;
