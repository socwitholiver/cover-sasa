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

Alongside the plain reply, every answer renders a **Coverage card** — an at-a-glance
summary of status (covered / partial / not covered), the public vs. private
out-of-pocket cost, key limits, and the next step to take. The app also includes a
**Digital SHA Card** view and quick-action chips for the most common questions.

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
object describing the coverage. The frontend hides the raw JSON and renders it as
the Coverage card, so the structured data and the chat reply come from the same
stream.

### Demo mode (no API key)

If `ANTHROPIC_API_KEY` is **not** set, the backend automatically runs in **demo
mode** — it streams realistic, pre-written answers (with Coverage cards) from
[`server/mock.js`](server/mock.js) so the whole app can be run and demoed without a
key. Set a key to get live answers from Claude. The `/api/health` endpoint reports
which mode is active (`"live"` or `"demo"`).

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
│   ├── index.js          # Express API, holds the key, streams Claude (or demo)
│   ├── mock.js           # canned demo answers used when no API key is set
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
