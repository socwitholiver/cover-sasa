import { useState, useRef, useEffect } from "react";

/* ------------------------------------------------------------------ *
 * CoverSasa — Instant SHA Benefits Navigator
 * Desktop web-app UI matching the Stitch design: emerald palette,
 * left navigator sidebar, verified-assistant chat, live coverage cards
 * rendered from the streamed answer, and a Digital SHA Card view.
 * Backend streaming (SSE via /api/chat) is preserved.
 * ------------------------------------------------------------------ */

// Real, ugly, real-person questions — the demo script. Tap one to fire it live.
const SUGGESTIONS = [
  "Je, SHA inalipa CS (operation ya kuzaa)?",
  "Does SHA cover dialysis? How much per session?",
  "Mtoto wangu ana homa, nikienda hospitali ya serikali nitalipa ngapi?",
  "Is an MRI scan covered by SHA?",
  "Inalipa chemotherapy ya cancer?",
];

// Quick-action chips shown above the composer (mirrors the Stitch mock).
const QUICK_CHIPS = [
  { label: "Find nearest hospital", text: "Which hospitals near me accept SHA?" },
  { label: "What about drugs?", text: "Does SHA cover my prescription medicines?" },
  { label: "Add dependents", text: "How do I add my dependents to SHA?" },
];

const GREETING = {
  role: "assistant",
  content:
    "👋 Karibu CoverSasa. Niulize kuhusu chochote kuhusu SHA — upasuaji, dawa, kujifungua, dialysis — kwa Kiswahili au Kiingereza.\n\nAsk me what SHA covers, and I'll tell you what you'll actually pay.",
};

// Sample card for the welcome / empty state (matches the Stitch mock).
const SAMPLE_CARD = {
  status: "covered",
  service: "MRI scan",
  publicCost: "Ksh 0",
  publicNote: "SHA pays 100% of the cost",
  privateCost: "Co-pay",
  privateNote: "Varies by facility tier",
  notes: [
    "Ensure you have your SHA card (Digital or Physical).",
    "An active referral from a Level 2 or 3 facility is required.",
  ],
  nextStep: "Get a referral, then bring your SHA card",
};

const NAV = [
  { id: "chat", label: "New Chat", icon: IconChat },
  { id: "recent", label: "Recent Coverage", icon: IconClock },
  { id: "finder", label: "Hospital Finder", icon: IconPin },
  { id: "benefits", label: "My Benefits", icon: IconShield },
];

const CARD_MARK = "§§CARD§§";

// Split a raw assistant message into its text + parsed coverage card.
function parseCard(raw) {
  const idx = raw.indexOf(CARD_MARK);
  if (idx === -1) return { text: raw, card: null };
  const text = raw.slice(0, idx).trim();
  let card = null;
  try {
    card = JSON.parse(raw.slice(idx + CARD_MARK.length).trim());
  } catch (e) {
    /* partial/invalid JSON — ignore */
  }
  return { text, card };
}

export default function App() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shaCardOpen, setShaCardOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;

    const history = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    setSidebarOpen(false);

    // API only needs user/assistant turns (drop the local greeting nicety).
    const apiMessages = history
      .filter((m, i) => !(i === 0 && m === GREETING))
      .map((m) => ({ role: m.role, content: m.content }));

    // Placeholder assistant bubble we stream into.
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          const payload = JSON.parse(line);
          if (payload.text) {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: next[next.length - 1].content + payload.text,
              };
              return next;
            });
          }
          if (payload.error) throw new Error(payload.error);
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "⚠️ Samahani, imeshindikana. Hakikisha backend inaendesha, kisha jaribu tena.",
        };
        return next;
      });
    } finally {
      // Finalise: pull the coverage card out of the raw text.
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          const { text, card } = parseCard(last.content);
          next[next.length - 1] = { ...last, content: text, card, streaming: false };
        }
        return next;
      });
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    setMessages([GREETING]);
    setInput("");
    setActive("chat");
    setSidebarOpen(false);
  }

  function onNav(id) {
    setActive(id);
    if (id === "chat") reset();
    else if (id === "benefits") {
      setShaCardOpen(true);
      setSidebarOpen(false);
    } else setSidebarOpen(false);
  }

  const isWelcome = messages.length <= 1;

  return (
    <div className="flex h-full w-full overflow-hidden bg-mist text-ink">
      {/* Mobile scrim */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-ink/30 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`fixed z-30 flex h-full w-72 flex-col border-r border-line bg-white/80 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">
              Cover<span className="text-brand-600">Sasa</span>
            </p>
            <p className="text-[11px] font-medium text-slate-400">Health Navigator</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-2 space-y-1 px-3">
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <button
                key={id}
                onClick={() => onNav(id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ${
                  on
                    ? "bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgba(12,142,80,0.6)]"
                    : "text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                    on ? "text-white" : "text-slate-400 group-hover:text-brand-600"
                  }`}
                />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Digital SHA Card teaser */}
        <button
          onClick={() => setShaCardOpen(true)}
          className="group mx-3 mt-4 overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 to-brand-800 p-3.5 text-left text-white shadow-[0_12px_28px_-14px_rgba(12,142,80,0.9)] transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-100">
              Digital SHA Card
            </span>
            <IconShield className="h-4 w-4 text-brand-100" />
          </div>
          <p className="mt-1.5 text-[13px] font-bold">Wanjiru Kamau</p>
          <p className="font-mono text-[11px] tracking-wider text-brand-100">SHA-0042-8817-3</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-brand-100 opacity-80 transition group-hover:opacity-100">
            Tap to view <IconArrow className="h-3 w-3" />
          </span>
        </button>

        {/* CTA + footer links */}
        <div className="mt-auto space-y-3 px-4 pb-5">
          <button
            onClick={() => send("Am I covered by SHA right now, and what will I pay?")}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(12,142,80,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-12px_rgba(12,142,80,0.9)] active:translate-y-0"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <IconSpark className="h-4 w-4" />
              Check Coverage Now
            </span>
            <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
          </button>

          <div className="space-y-1 border-t border-line pt-3">
            <MiniLink icon={IconGear} label="Settings" />
            <MiniLink icon={IconHelp} label="Help & Support" />
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="z-10 flex items-center gap-3 border-b border-line bg-white/70 px-4 py-3 backdrop-blur-xl md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 md:hidden"
            aria-label="Menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-inner">
              <IconStethoscope className="h-5 w-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-500 opacity-60" />
            </span>
          </div>

          <div className="leading-tight">
            <h1 className="text-[15px] font-bold">SHA Assistant</h1>
            <p className="flex items-center gap-1 text-[11.5px] font-medium text-brand-600">
              <IconVerified className="h-3.5 w-3.5" />
              Online &amp; Verified
            </p>
          </div>

          <div className="ml-auto hidden items-center gap-1 rounded-full border border-line bg-white/60 p-1 text-[12px] font-medium text-slate-500 sm:flex">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">Ask</span>
            <span className="cursor-pointer rounded-full px-3 py-1 transition hover:text-brand-700">History</span>
            <span className="cursor-pointer rounded-full px-3 py-1 transition hover:text-brand-700">Profile</span>
          </div>
          <span className="ml-auto rounded-full border border-line bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-brand-700 sm:ml-0">
            🇰🇪 SHIF
          </span>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="dot-grid scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {messages.map((m, i) => (
              <MessageRow key={i} m={m} />
            ))}

            {/* Sample coverage card + demo chips, shown before the first question */}
            {isWelcome && (
              <>
                <div className="rise">
                  <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Example answer
                  </p>
                  <CoverageCard data={SAMPLE_CARD} />
                </div>

                <div className="rise space-y-2 pt-1">
                  <p className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Jaribu · Try a real question
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="group flex items-center gap-2 rounded-xl border border-line bg-white/70 px-3.5 py-3 text-left text-[13px] text-slate-600 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-ink hover:shadow-card"
                      >
                        <IconArrow className="h-3.5 w-3.5 shrink-0 text-brand-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {busy && <TypingRow />}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-white/70 px-4 pb-4 pt-3 backdrop-blur-xl md:px-8">
          <div className="mx-auto w-full max-w-2xl">
            {/* Quick chips */}
            <div className="mb-2.5 flex flex-wrap gap-2">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => send(c.text)}
                  disabled={busy}
                  className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {c.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-card transition-all duration-200 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your SHA benefits…  ·  Andika swali lako…"
                className="flex-1 bg-transparent px-3 py-2.5 text-[14px] text-ink placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                aria-label="Voice"
                title="Voice input"
              >
                <IconMic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_8px_18px_-8px_rgba(12,142,80,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-8px_rgba(12,142,80,1)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
                aria-label="Send"
              >
                <IconSend className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-2 text-center text-[10.5px] text-slate-400">
              CoverSasa gives SHA coverage info, not medical advice · Powered by official MOH SHA/SHIF tariffs
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Digital SHA Card modal ---------- */}
      {shaCardOpen && <ShaCardModal onClose={() => setShaCardOpen(false)} />}
    </div>
  );
}

/* ---------------- Message + Bubble ---------------- */

function MessageRow({ m }) {
  const isUser = m.role === "user";
  return (
    <div className="rise flex flex-col gap-2">
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="mr-2 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <IconStethoscope className="h-4 w-4" />
          </div>
        )}
        <div
          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white"
              : "rounded-bl-md border border-line bg-white text-ink"
          }`}
        >
          {isUser ? m.content : <Rich text={displayText(m.content)} />}
          {m.streaming && !m.content && (
            <span className="inline-flex gap-1 py-1.5">
              <span className="dot h-2 w-2 rounded-full bg-brand-400" />
              <span className="dot h-2 w-2 rounded-full bg-brand-400" />
              <span className="dot h-2 w-2 rounded-full bg-brand-400" />
            </span>
          )}
        </div>
      </div>

      {/* Live coverage card rendered from the streamed answer */}
      {!isUser && m.card && (
        <div className="ml-10 max-w-[calc(85%-0px)]">
          <CoverageCard data={m.card} />
        </div>
      )}
    </div>
  );
}

// Hide the reserved card marker (and any partial JSON) while streaming.
function displayText(raw = "") {
  const cut = raw.indexOf("§");
  return cut === -1 ? raw : raw.slice(0, cut).trim();
}

// Lightweight **bold** rendering for streamed answers.
function Rich({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-brand-700">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function TypingRow() {
  return (
    <div className="rise flex justify-start">
      <div className="mr-2 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <IconStethoscope className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 shadow-sm">
        <span className="inline-flex gap-1">
          <span className="dot h-2 w-2 rounded-full bg-brand-400" />
          <span className="dot h-2 w-2 rounded-full bg-brand-400" />
          <span className="dot h-2 w-2 rounded-full bg-brand-400" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- Dynamic Coverage Card ---------------- */

const STATUS = {
  covered: { label: "Coverage Confirmed", head: "bg-brand-50/80 border-brand-100", text: "text-brand-700", Icon: IconVerified, iconClass: "text-brand-600" },
  partial: { label: "Partially Covered", head: "bg-amber-50/80 border-amber-100", text: "text-amber-700", Icon: IconInfo, iconClass: "text-amber-500" },
  not_covered: { label: "Not Covered", head: "bg-rose-50/80 border-rose-100", text: "text-rose-700", Icon: IconInfo, iconClass: "text-rose-500" },
  unknown: { label: "Check at the Facility", head: "bg-slate-100/80 border-slate-200", text: "text-slate-600", Icon: IconInfo, iconClass: "text-slate-400" },
};

function CoverageCard({ data }) {
  const s = STATUS[data.status] || STATUS.unknown;
  const goodPublic = data.status === "covered" || data.status === "partial";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/90 shadow-card backdrop-blur">
      {/* Status header */}
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${s.head}`}>
        <s.Icon className={`h-4 w-4 ${s.iconClass}`} />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
        {data.service && <span className="ml-auto text-[11px] font-medium text-slate-400">{data.service}</span>}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl border p-3.5 ${goodPublic ? "border-brand-200 bg-brand-50/60" : "border-line bg-slate-50/70"}`}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
              Public Hospital (Level 4+)
            </p>
            <p className={`mt-1 text-2xl font-extrabold ${goodPublic ? "text-brand-600" : "text-ink"}`}>
              {data.publicCost || "—"}
            </p>
            <p className="text-[12px] text-slate-500">{data.publicNote}</p>
          </div>
          <div className="rounded-xl border border-line bg-slate-50/70 p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
              Private Hospital
            </p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{data.privateCost || "—"}</p>
            <p className="text-[12px] text-slate-500">{data.privateNote}</p>
          </div>
        </div>

        {Array.isArray(data.notes) && data.notes.length > 0 && (
          <ul className="mt-3.5 space-y-1.5 text-[12.5px] text-slate-600">
            {data.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                {i === 0 ? (
                  <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                ) : (
                  <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}

        {data.nextStep && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50/70 px-3 py-2 text-[12.5px] font-medium text-brand-700">
            <IconArrow className="h-3.5 w-3.5 shrink-0" />
            {data.nextStep}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Digital SHA Card modal ---------------- */

function ShaCardModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      style={{ animation: "rise .2s ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-[13px] font-bold text-ink">Digital SHA Card</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            aria-label="Close"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* The card itself */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[0_20px_40px_-20px_rgba(10,90,53,0.9)]">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo className="h-7 w-7" />
                <span className="text-[13px] font-extrabold tracking-tight">
                  Cover<span className="text-brand-200">Sasa</span>
                </span>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Active
              </span>
            </div>

            <div className="relative mt-6">
              <p className="text-[10px] uppercase tracking-widest text-brand-200">Member</p>
              <p className="text-lg font-bold">Wanjiru Kamau</p>
              <p className="mt-2 font-mono text-[15px] tracking-[0.2em]">SHA-0042-8817-3</p>
            </div>

            <div className="relative mt-5 flex items-end justify-between">
              <div className="space-y-2 text-[11px]">
                <div>
                  <p className="text-brand-200">Household</p>
                  <p className="font-semibold">4 members</p>
                </div>
                <div>
                  <p className="text-brand-200">Valid thru</p>
                  <p className="font-semibold">12 / 2026</p>
                </div>
              </div>
              <FakeQR />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Fund" value="SHIF" />
            <Stat label="Status" value="Paid" />
            <Stat label="Cover" value="Full" />
          </div>

          <p className="mt-4 text-center text-[10.5px] text-slate-400">
            Demo card · Show this at any SHA-accredited facility with your national ID.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-[13px] font-bold text-brand-700">{value}</p>
    </div>
  );
}

function FakeQR() {
  // Deterministic pseudo-QR so it looks like a scannable code.
  const cells = Array.from({ length: 49 }, (_, i) => (i * 7 + 3) % 5 < 2);
  return (
    <div className="grid grid-cols-7 gap-[2px] rounded-lg bg-white p-1.5">
      {cells.map((on, i) => (
        <span key={i} className={`h-2 w-2 rounded-[1px] ${on ? "bg-brand-800" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

function MiniLink({ icon: Icon, label }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-400 transition hover:bg-brand-50 hover:text-brand-700">
      <Icon className="h-[17px] w-[17px]" />
      {label}
    </button>
  );
}

/* ---------------- Logo + Icons (inline SVG) ---------------- */

function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12A75F" />
          <stop offset="1" stopColor="#0A7241" />
        </linearGradient>
      </defs>
      <path d="M20 3 6 8v11c0 8.5 6 13.5 14 17 8-3.5 14-8.5 14-17V8L20 3Z" fill="url(#lg)" />
      <path
        d="m13.5 20 4.5 4.5L27 15.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStethoscope({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

function IconChat({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconClock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconPin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function IconGear({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function IconHelp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconMenu({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconVerified({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1 9.6 3.4 6.3 3l-.9 3.2L2.4 7.5 4 10.5 2.4 13.5l3 1.3.9 3.2 3.3-.4L12 20l2.4-2.4 3.3.4.9-3.2 3-1.3-1.6-3 1.6-3-3-1.3-.9-3.2-3.3.4L12 1Z" />
      <path d="m8.5 12 2.3 2.3L15.5 9.6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrow({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconSpark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.5L19 9l-5.2 1.5L12 16l-1.8-5.5L5 9l5.2-1.5L12 2Z" />
      <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14Z" />
    </svg>
  );
}

function IconMic({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </svg>
  );
}

function IconSend({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2 .4 6.4Z" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconInfo({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function IconClose({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
