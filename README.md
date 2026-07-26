<div align="center">

# 🛡️ CoverSasa

### Instant SHA Benefits Navigator

**Jua SHA inayolipa — papo hapo.** &nbsp;·&nbsp; _Know what SHA covers — right now._

</div>

---

CoverSasa is a chat tool that has already "read" Kenya's **SHA (Social Health
Authority)** benefits package for you. A patient or a hospital clerk types a real,
everyday question — in **Swahili or English** — and gets a plain-language answer in
seconds: **covered or not, and the one number that matters — what you'll actually
pay out of pocket.**

> **The problem it solves:** at the hospital counter, nobody — not the patient,
> often not even the clerk — knows what SHA covers for the exact procedure or drug
> in front of them. So people get told _"lipa kwanza"_ (pay first) when they were
> covered all along, or get blindsided by a bill. CoverSasa closes that gap.

## What makes it different

It doesn't answer in insurance-speak. It answers in the words a worried patient
would actually use, and it always ends with the out-of-pocket number:

> _"Yes — SHA covers a C-section. At a public hospital you pay **Ksh 0**. SHA pays
> the hospital Ksh 30,000, covering about 3 days. Bring your SHA card and ID."_

Alongside the plain reply, every answer renders an **interactive Coverage card**.
Five things competitors usually skip — all built in:

### 1. 💰 Cost breakdown, not just yes/no

Every card shows a clean money split — **SHA covers: KES X | You pay: KES Y** — with
a proportion bar, instead of a wall of text. The number that matters is on screen in
big type.

### 2. 🏥 Facility-level answers (the precision layer)

Cover changes with the facility tier, so the card does too. A **facility-level
toggle** (Dispensary → Sub-county → County → National referral) recomputes the
answer _live_:

- A **C-section** is KES 0 at a Level-4 public hospital, but simply **not offered at
  a dispensary** — so the card says _"you'll be referred to a Sub-county (Level 4)
  hospital"_ instead of a misleading number.
- An **inpatient bed** rises KES 2,240 → 4,480 per day as you move up the levels —
  the card shows the exact rate for the tier you pick.

This runs entirely client-side from a shared coverage engine, so it's instant.

### 3. 🧾 Shareable receipt-style answer

One tap turns any answer into a **receipt card** you can **share on WhatsApp**, copy
as text, or **download as a PNG** — so a patient or clerk can show it at the counter
as proof. Built for the WhatsApp-first Kenyan reality.

### 4. ⚠️ Confidence flag (responsible AI)

If the benefits data doesn't clearly cover a case, CoverSasa **won't guess a
figure**. It flags **"Not certain — please confirm at the SHA office"** rather than
inventing a number, and marks medium-confidence answers as indicative.

### 5. 🗺️ Hospital Finder (Google Maps)

An interactive map of SHA-accredited facilities across Kenya, colour-coded by
level, with search, level filters, and a **"What's covered here?"** action that jumps
back into chat scoped to that facility's tier.

Plus a **Digital SHA Card** view, a **Recent Coverage** history drawer, and bilingual
Swahili/English throughout.

## How it works

```
 Browser (React UI)        Express backend           Claude (Opus)
 ┌────────────────┐  /api  ┌──────────────────┐      ┌──────────────────┐
 │  chat, streams │ ─────► │ holds API key +  │ ───► │ answers from the │
 │  the reply     │  SSE   │ full SHA data as │      │ benefits data in │
 │                │ ◄───── │ system context   │ ◄─── │ plain language   │
 └────────────────┘        └──────────────────┘      └──────────────────┘
```

**No database, no vector store.** The entire SHA benefits package is small enough
to live directly in the prompt ([`server/sha-data.js`](server/sha-data.js)) — so
answers stay accurate and fast with zero retrieval plumbing. To update coverage,
edit that one file.

Each answer also carries a reserved `§§CARD§§` token followed by a one-line JSON
object: `{ serviceKey, status, confidence, service, fund, shaTariff }`. The frontend
hides the raw JSON and, from `serviceKey`, looks the service up in the **shared
coverage engine** ([`src/coverage.js`](src/coverage.js)) to render the interactive,
facility-tier cost breakdown. That one module is imported by **both** the UI and the
backend demo answers, so the tariffs on the cards can never drift from the data.

### Demo mode (no API key)

If `ANTHROPIC_API_KEY` is **not** set, the backend automatically runs in **demo
mode** — it streams realistic, pre-written answers (with Coverage cards) from
[`server/mock.js`](server/mock.js) so the whole app can be run and demoed without a
key. Set a key to get live answers from Claude. The `/api/health` endpoint reports
which mode is active (`"live"` or `"demo"`).

## Tech stack

| Layer     | Tech                                                             |
| --------- | --------------------------------------------------------------- |
| Frontend  | Vite · React 18 · Tailwind CSS (emerald + lavender Stitch design system) |
| Backend   | Node · Express · Server-Sent Events streaming                   |
| AI        | Anthropic Claude (`claude-opus-5`) via the official SDK          |
| Maps      | Google Maps JavaScript API (Hospital Finder)                    |
| Engine    | Shared client/server coverage engine — one source of truth for tariffs |

## Getting started

**Prerequisites:** Node.js 18+ and an [Anthropic API key](https://console.anthropic.com/).

### 1. Install

```bash
npm install
```

### 2. Add your API key _(optional)_

```bash
cp .env.example .env
```

Open `.env` and set your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Skip this step to run in **demo mode** — the app still works end-to-end with
pre-written answers (see [Demo mode](#demo-mode-no-api-key) above).

### 3. Run

```bash
npm run dev
```

This starts both the frontend and backend together. Open the URL it prints
(default **http://localhost:5173**) and start asking. Stop the servers with
`Ctrl+C`.

<sub>Prefer to run them separately? `npm run server` (API on :3001) and
`npm run web` (UI on :5173) in two terminals.</sub>

#### Run it from Command Prompt (Windows)

One line — `cd` into the project and start it (adjust the path if yours differs):

```bat
cd /d "C:\Users\HP\Desktop\Cover Sasa" && npm run dev
```

First time only, install dependencies as well:

```bat
cd /d "C:\Users\HP\Desktop\Cover Sasa" && npm install && npm run dev
```

### Troubleshooting

**`Error: listen EADDRINUSE ... :::3001`** — a previous backend is still holding
port 3001 (usually from closing the window without pressing `Ctrl+C`). Free it,
then run again.

- **Command Prompt (cmd):**

  ```bat
  for /f "tokens=5" %a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %a
  ```

- **PowerShell:**

  ```powershell
  Get-NetTCPConnection -LocalPort 3001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

The same trick works for the Vite dev server on port **5173** — swap `3001` for
`5173`. To avoid it, always stop the dev server with `Ctrl+C` so it releases the
ports cleanly.

**`'npm' is not recognized`** — Node.js isn't installed or isn't on your PATH.
Install the Node.js 18+ LTS from [nodejs.org](https://nodejs.org/) and reopen the
terminal.

**`Cannot find module` / missing dependencies** — run `npm install` in the project
folder before `npm run dev`.

## Try it

Tap a suggestion chip in the app, or type one of these live:

- _"Je, SHA inalipa CS?"_ → covered, **Ksh 0** at a public hospital — then toggle the
  card to **Dispensary** and watch it switch to a referral.
- _"How much is an inpatient bed per day?"_ → drag the facility level and watch the
  rate change **KES 2,240 → 4,480**.
- _"Does SHA cover dialysis? How much per session?"_ → **Ksh 10,650** per session.
- _"Does SHA cover botox?"_ → **"Not certain — confirm at the SHA office"** (no guessing).

Then tap **Share receipt** on any card to get a WhatsApp-ready proof card, or open the
**Hospital Finder** to explore accredited facilities on the map.

## Project structure

```
cover-sasa/
├── index.html            # app shell, fonts, favicon
├── src/
│   ├── App.jsx           # chat UI, interactive cards, receipt, Hospital Finder
│   ├── coverage.js       # SHARED coverage engine — tiers, cost split, confidence
│   ├── config.js         # Google Maps key + demo facility dataset
│   ├── main.jsx          # React entry
│   └── index.css         # Tailwind + design-system styles
├── server/
│   ├── index.js          # Express API, holds the key, streams Claude (or demo)
│   ├── mock.js           # canned demo answers (imports the shared engine)
│   └── sha-data.js        # the SHA benefits knowledge base (live-mode context)
├── tailwind.config.js    # brand / ink / lavender design tokens
├── vite.config.js        # dev server + /api proxy to :3001
└── .env.example          # copy to .env and add your keys
```

### Google Maps key

The Hospital Finder uses the Google Maps JavaScript API. For the demo a key is
inlined in [`src/config.js`](src/config.js) so the app works out of the box. For
production, set `VITE_GOOGLE_MAPS_KEY` in `.env` and **restrict the key by HTTP
referrer** in the Google Cloud console. If the map can't load (e.g. offline), the
Finder degrades gracefully to the accredited-facility list.

## Data source

Figures come from Kenya's Ministry of Health SHA/SHIF benefit package and the
gazetted _Tariffs to the Benefit Package to the Social Health Insurance_
(health.go.ke, 2024/2025). Tariffs are periodically revised by SHA — always
confirm the latest at the facility.

## Notes & disclaimer

- CoverSasa provides **SHA coverage information, not medical advice**.
- The listed figure is the tariff SHA pays the facility. At a **public** hospital a
  covered service is typically **Ksh 0** out of pocket; at a private/faith-based
  facility you may pay a balance above the SHA tariff — always ask at the counter.
- You must be registered with SHA with contributions up to date to use benefits.

---

<div align="center">
<sub>Built for the Afya (health) track — one simple tool that plugs a hole everyone's hit personally.</sub>
</div>
