// CoverSasa — runtime config.
//
// The Google Maps key powers the Hospital Finder. For the hackathon demo it is
// inlined so the app works out of the box; in production set VITE_GOOGLE_MAPS_KEY
// in your .env and RESTRICT the key by HTTP referrer in the Google Cloud console.
export const GOOGLE_MAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyDwLoeLNvChVU_gEteh9vgks1oKLrN8iK8";

// Demo synthesized dataset of SHA-accredited facilities across Kenya.
// Every facility here is fictional/representative sample data for the demo —
// coordinates are approximate town centres. tier = MOH level.
export const FACILITIES = [
  { id: "knh", name: "Kenyatta National Hospital", county: "Nairobi", level: 6, lat: -1.3018, lng: 36.8065, services: "Everything incl. transplants, oncology, ICU" },
  { id: "mtrh", name: "Moi Teaching & Referral (MTRH)", county: "Uasin Gishu", level: 6, lat: 0.5203, lng: 35.2699, services: "National referral · oncology · cardiac" },
  { id: "coast", name: "Coast General Referral", county: "Mombasa", level: 5, lat: -4.0546, lng: 39.6636, services: "County referral · surgery · maternity" },
  { id: "nakuru", name: "Nakuru County Referral", county: "Nakuru", level: 5, lat: -0.2900, lng: 36.0700, services: "County referral · dialysis · imaging" },
  { id: "kakamega", name: "Kakamega County Referral", county: "Kakamega", level: 5, lat: 0.2827, lng: 34.7519, services: "County referral · maternity · surgery" },
  { id: "kisumu", name: "Jaramogi Oginga Odinga (JOOTRH)", county: "Kisumu", level: 6, lat: -0.0917, lng: 34.7680, services: "Regional referral · oncology · ICU" },
  { id: "thika", name: "Thika Level 5 Hospital", county: "Kiambu", level: 5, lat: -1.0333, lng: 37.0693, services: "County referral · CS · imaging" },
  { id: "machakos", name: "Machakos Level 5 Hospital", county: "Machakos", level: 5, lat: -1.5177, lng: 37.2634, services: "County referral · maternity · surgery" },
  { id: "embu", name: "Embu Level 4 Hospital", county: "Embu", level: 4, lat: -0.5310, lng: 37.4575, services: "Sub-county · CS · admission · lab" },
  { id: "kajiado", name: "Kajiado Sub-county Hospital", county: "Kajiado", level: 4, lat: -1.8524, lng: 36.7767, services: "Sub-county · maternity · minor surgery" },
  { id: "ongata", name: "Ongata Rongai Health Centre", county: "Kajiado", level: 3, lat: -1.3961, lng: 36.7519, services: "Outpatient · immunisation · basic lab" },
  { id: "dagoretti", name: "Dagoretti Dispensary", county: "Nairobi", level: 3, lat: -1.2884, lng: 36.7286, services: "Outpatient · consultations · essential drugs" },
  { id: "meru", name: "Meru Teaching & Referral", county: "Meru", level: 5, lat: 0.0463, lng: 37.6559, services: "County referral · surgery · imaging" },
  { id: "garissa", name: "Garissa County Referral", county: "Garissa", level: 5, lat: -0.4536, lng: 39.6461, services: "County referral · maternity · admission" },
];
