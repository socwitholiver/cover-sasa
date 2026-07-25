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

## Tech stack

| Layer     | Tech                                                             |
| --------- | --------------------------------------------------------------- |
| Frontend  | Vite · React 18 · Tailwind CSS (light "Navigator" design system) |
| Backend   | Node · Express · Server-Sent Events streaming                   |
| AI        | Anthropic Claude (`claude-opus-5`) via the official SDK          |

## Getting started

**Prerequisites:** Node.js 18+ and an [Anthropic API key](https://console.anthropic.com/).

### 1. Install

```bash
npm install
```

### 2. Add your API key

```bash
cp .env.example .env
```

Open `.env` and set your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm run dev
```

This starts both the frontend and backend together. Open the URL it prints
(default **http://localhost:5173**) and start asking.

<sub>Prefer to run them separately? `npm run server` (API on :3001) and
`npm run web` (UI on :5173) in two terminals.</sub>

## Try it

Tap a suggestion chip in the app, or type one of these live:

- _"Je, SHA inalipa CS?"_ → covered, **Ksh 0** at a public hospital.
- _"Does SHA cover dialysis? How much per session?"_ → **Ksh 10,650** per session.
- _"Mtoto ana homa, nikienda hospitali ya serikali nitalipa ngapi?"_ → outpatient covered, **Ksh 0**.

## Project structure

```
cover-sasa/
├── index.html            # app shell, fonts, favicon
├── src/
│   ├── App.jsx           # chat UI + streaming client
│   ├── main.jsx          # React entry
│   └── index.css         # Tailwind + design-system styles
├── server/
│   ├── index.js          # Express API, holds the key, streams Claude
│   └── sha-data.js        # the entire SHA benefits knowledge base
├── tailwind.config.js    # brand / ink / mist design tokens
├── vite.config.js        # dev server + /api proxy to :3001
└── .env.example          # copy to .env and add your key
```

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
