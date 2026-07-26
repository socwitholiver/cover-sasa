import { useState, useRef, useEffect, useMemo } from "react";
import {
  FACILITY_LEVELS,
  DEFAULT_LEVEL,
  levelById,
  computeBreakdown,
  formatKES,
  SERVICES,
  buildShareText,
  statusLabel,
  receiptRef,
} from "./coverage.js";
import { GOOGLE_MAPS_KEY, FACILITIES } from "./config.js";

/* ------------------------------------------------------------------ *
 * CoverSasa — Instant SHA Benefits Navigator
 * Emerald + lavender Stitch aesthetic. Interactive coverage cards with a
 * live facility-tier cost breakdown (SHA covers | You pay), a confidence
 * flag, a shareable WhatsApp receipt, and a Google-Maps Hospital Finder.
 * Backend streaming (SSE via /api/chat) is preserved; demo mode needs no key.
 * ------------------------------------------------------------------ */

// Real, ugly, real-person questions — the demo script. Tap one to fire it live.
const SUGGESTIONS = [
  "Je, SHA inalipa CS (operation ya kuzaa)?",
  "Does SHA cover dialysis? How much per session?",
  "Mtoto wangu ana homa, nikienda hospitali ya serikali nitalipa ngapi?",
  "Is an MRI scan covered by SHA?",
  "Inalipa chemotherapy ya cancer?",
  "How much is an inpatient bed per day?",
];

const QUICK_CHIPS = [
  { label: "Find nearest hospital", text: "Which hospitals near me accept SHA?" },
  { label: "What about drugs?", text: "Does SHA cover my prescription medicines?" },
  { label: "Add dependents", text: "How do I add my dependents to SHA?" },
];

const GREETING = {
  role: "assistant",
  content:
    "👋 Karibu CoverSasa. Niulize kuhusu chochote kuhusu SHA — upasuaji, dawa, kujifungua, dialysis — kwa Kiswahili au Kiingereza.\n\nAsk me what SHA covers, and I'll show you exactly what SHA pays and what you pay — for your facility level.",
};

// Sample card for the welcome / empty state — renders the interactive card.
const SAMPLE_CARD = {
  serviceKey: "cs",
  status: "covered",
  confidence: "high",
  service: "Caesarean section (CS)",
  fund: "SHIF",
  shaTariff: 30000,
};

const NAV = [
  { id: "chat", label: "New Chat", icon: IconChat },
  { id: "recent", label: "Recent Coverage", icon: IconClock },
  { id: "finder", label: "Hospital Finder", icon: IconPin },
  { id: "benefits", label: "My Benefits", icon: IconShield },
];

const CARD_MARK = "§§CARD§§";

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
  const [view, setView] = useState("chat"); // "chat" | "finder"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shaCardOpen, setShaCardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [receipt, setReceipt] = useState(null); // receipt modal data
  const [dark, setDark] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Theme: restore saved choice, else follow the OS preference.
  useEffect(() => {
    const saved = localStorage.getItem("cs-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(saved ? saved === "dark" : !!prefersDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("cs-theme", dark ? "dark" : "light");
  }, [dark]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;

    setView("chat");
    setActive("chat");
    const history = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    setSidebarOpen(false);
    setHistoryOpen(false);

    const apiMessages = history
      .filter((m, i) => !(i === 0 && m === GREETING))
      .map((m) => ({ role: m.role, content: m.content }));

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
    setView("chat");
    setSidebarOpen(false);
  }

  function onNav(id) {
    setActive(id);
    setSidebarOpen(false);
    if (id === "chat") reset();
    else if (id === "benefits") setShaCardOpen(true);
    else if (id === "finder") setView("finder");
    else if (id === "recent") setHistoryOpen(true);
  }

  const isWelcome = messages.length <= 1;
  const askedQuestions = messages.filter((m) => m.role === "user").map((m) => m.content);

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface text-ink">
      {/* Mobile scrim */}
      {(sidebarOpen || historyOpen) && (
        <div
          onClick={() => {
            setSidebarOpen(false);
            setHistoryOpen(false);
          }}
          className="fixed inset-0 z-20 bg-ink/30 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`fixed z-30 flex h-full w-72 flex-col border-r border-line bg-white/85 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">
              Cover<span className="text-brand-600">Sasa</span>
            </p>
            <p className="text-[11px] font-medium text-slate-400">Health Navigator</p>
          </div>
        </div>

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
            <h1 className="text-[15px] font-bold">
              {view === "finder" ? "Hospital Finder" : "SHA Assistant"}
            </h1>
            <p className="flex items-center gap-1 text-[11.5px] font-medium text-brand-600">
              <IconVerified className="h-3.5 w-3.5" />
              Online &amp; Verified
            </p>
          </div>

          <div className="ml-auto hidden items-center gap-1 rounded-full border border-line bg-white/60 p-1 text-[12px] font-medium text-slate-500 sm:flex">
            <button
              onClick={() => onNav("chat")}
              className={`rounded-full px-3 py-1 transition ${
                view === "chat" ? "bg-brand-50 text-brand-700" : "hover:text-brand-700"
              }`}
            >
              Ask
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="rounded-full px-3 py-1 transition hover:text-brand-700"
            >
              History
            </button>
            <button
              onClick={() => onNav("finder")}
              className={`rounded-full px-3 py-1 transition ${
                view === "finder" ? "bg-brand-50 text-brand-700" : "hover:text-brand-700"
              }`}
            >
              Facilities
            </button>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/60 text-slate-500 transition hover:text-brand-700 sm:ml-0"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
          </button>
          <span className="rounded-full border border-line bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            🇰🇪 SHIF
          </span>
        </header>

        {/* ---- View: Hospital Finder ---- */}
        {view === "finder" && (
          <HospitalFinder onAsk={send} onBack={() => onNav("chat")} />
        )}

        {/* ---- View: Chat ---- */}
        {view === "chat" && (
          <>
            <div
              ref={scrollRef}
              className="dot-grid scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8"
            >
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                {messages.map((m, i) => (
                  <MessageRow key={i} m={m} onShare={setReceipt} onAsk={send} />
                ))}

                {isWelcome && (
                  <>
                    <div className="rise">
                      <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Example answer · drag the facility level
                      </p>
                      <CoverageCard data={SAMPLE_CARD} onShare={setReceipt} onAsk={send} />
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
          </>
        )}
      </div>

      {/* ---------- History drawer ---------- */}
      {historyOpen && (
        <HistoryDrawer
          questions={askedQuestions}
          onPick={(q) => send(q)}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* ---------- Digital SHA Card modal ---------- */}
      {shaCardOpen && <ShaCardModal onClose={() => setShaCardOpen(false)} />}

      {/* ---------- Shareable receipt modal ---------- */}
      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/* ---------------- Message + Bubble ---------------- */

function MessageRow({ m, onShare, onAsk }) {
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

      {!isUser && m.card && (
        <div className="ml-10 max-w-[calc(100%-2.5rem)]">
          <CoverageCard data={m.card} onShare={onShare} onAsk={onAsk} />
        </div>
      )}
    </div>
  );
}

function displayText(raw = "") {
  const cut = raw.indexOf("§");
  return cut === -1 ? raw : raw.slice(0, cut).trim();
}

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

/* ---------------- Interactive Coverage Card ---------------- */

const STATUS = {
  covered: { label: "YES, COVERED", head: "bg-brand-50 border-brand-100", text: "text-brand-700", Icon: IconVerified, iconClass: "text-brand-600", ring: "ring-brand-100" },
  partial: { label: "PARTLY COVERED", head: "bg-amber-50 border-amber-100", text: "text-amber-700", Icon: IconInfo, iconClass: "text-amber-500", ring: "ring-amber-100" },
  not_covered: { label: "NOT COVERED", head: "bg-rose-50 border-rose-100", text: "text-rose-700", Icon: IconInfo, iconClass: "text-rose-500", ring: "ring-rose-100" },
  unknown: { label: "CHECK AT THE SHA DESK", head: "bg-slate-100 border-slate-200", text: "text-slate-600", Icon: IconInfo, iconClass: "text-slate-400", ring: "ring-slate-100" },
};

function CoverageCard({ data, onShare, onAsk }) {
  const svc = data?.serviceKey ? SERVICES[data.serviceKey] : null;

  // No mapped service, or low confidence → the honest "confirm at SHA" card.
  if (!svc) return <UnknownCard data={data} onAsk={onAsk} />;
  if (svc.kind === "info") return <InfoCard data={data} svc={svc} onAsk={onAsk} />;
  return <CostCard data={data} svc={svc} onShare={onShare} />;
}

// Roll a number from 0 up to its target (easeOutCubic). Non-numbers (e.g.
// "Varies") render as-is; honors prefers-reduced-motion.
function useCountUp(target, duration = 560) {
  const isNum = typeof target === "number";
  const [val, setVal] = useState(isNum ? 0 : target);
  useEffect(() => {
    if (typeof target !== "number") {
      setVal(target);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setVal(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function AnimatedKES({ value, className }) {
  const n = useCountUp(value);
  return <span className={className}>{formatKES(n)}</span>;
}

function CostCard({ data, svc, onShare }) {
  const [facilityId, setFacilityId] = useState(DEFAULT_LEVEL);
  const lvl = levelById(facilityId);
  const bd = computeBreakdown(data.serviceKey, facilityId);
  const s = STATUS[data.status] || STATUS.unknown;

  const share = () =>
    onShare?.({
      service: data.service,
      serviceKey: data.serviceKey,
      levelLabel: `${lvl.label} · ${lvl.sublabel}`,
      shaCovers: bd.shaCovers,
      youPay: bd.youPayPublic,
      unit: bd.unit,
      status: data.status,
      confidence: data.confidence,
      fund: bd.fund,
      offeredHere: bd.offeredHere,
      referTo: bd.referTo,
    });

  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-white shadow-card ring-1 ${s.ring}`}>
      {/* Status header */}
      <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${s.head}`}>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/70 ${s.iconClass}`}>
          <s.Icon className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className={`text-[13px] font-extrabold tracking-wide ${s.text}`}>{s.label}</p>
          <p className="text-[11px] font-medium text-slate-500">{data.service}</p>
        </div>
        <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {bd.fund}
        </span>
      </div>

      <div className="p-4">
        {/* Facility-level selector — the precision competitors skip */}
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
          Facility level · answer adjusts live
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FACILITY_LEVELS.map((f) => {
            const on = f.id === facilityId;
            return (
              <button
                key={f.id}
                onClick={() => setFacilityId(f.id)}
                className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all duration-200 ${
                  on
                    ? "border-brand-500 bg-brand-500 text-white shadow-[0_6px_14px_-6px_rgba(12,142,80,0.7)]"
                    : "border-line bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                <span className="text-[11.5px] font-bold leading-none">{f.label}</span>
                <span className={`text-[9.5px] ${on ? "text-brand-100" : "text-slate-400"}`}>{f.sublabel}</span>
              </button>
            );
          })}
        </div>

        {/* Cost breakdown split */}
        <div key={facilityId} className="pop mt-3.5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-700/70">
              SHA covers
            </p>
            <AnimatedKES
              value={bd.shaCovers}
              className="stat-gradient mt-0.5 block text-[26px] font-extrabold leading-none text-brand-600"
            />
            <p className="mt-1 text-[11px] text-slate-500">per {bd.unit} · paid to facility</p>
          </div>
          <div className="rounded-xl border border-line bg-slate-50 p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
              You pay
            </p>
            <AnimatedKES
              value={bd.youPayPublic}
              className={`mt-0.5 block text-[26px] font-extrabold leading-none ${
                bd.youPayPublic === 0 ? "text-brand-600" : "text-ink"
              }`}
            />
            <p className="mt-1 text-[11px] text-slate-500">at a public facility</p>
          </div>
        </div>

        {/* Coverage proportion bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-400">
            <span>SHA pays {bd.coveredPct}%</span>
            <span>You {100 - bd.coveredPct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bar-fill h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
              style={{ width: `${bd.coveredPct}%` }}
            />
          </div>
        </div>

        {/* Availability at this level */}
        {bd.offeredHere ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50/70 px-3 py-2 text-[12px] font-medium text-brand-700">
            <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Offered at {lvl.label} ({lvl.sublabel}).</span>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Not offered at {lvl.label}. You'll be referred to {bd.referTo?.label} ({bd.referTo?.sublabel})
              — cover still applies there.
            </span>
          </div>
        )}

        {/* Requirements + limits */}
        <ul className="mt-3 space-y-1.5 text-[12.5px] text-slate-600">
          {(bd.requires || []).map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <IconShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span>{r}</span>
            </li>
          ))}
          {bd.cap && (
            <li className="flex items-start gap-2">
              <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{bd.cap}</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>At a private/faith facility you may pay a balance above the SHA tariff.</span>
          </li>
        </ul>

        {/* Confidence flag */}
        {data.confidence !== "high" && <ConfidenceBanner level={data.confidence} />}

        {/* Footer actions */}
        <div className="mt-3.5 flex items-center gap-2 border-t border-line pt-3">
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[12.5px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(12,142,80,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            <IconReceipt className="h-4 w-4" />
            Share receipt
          </button>
          <span className="ml-auto flex items-center gap-1">
            <FeedbackButton up />
            <FeedbackButton />
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ data, svc, onAsk }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card ring-1 ring-info-100">
      <div className="flex items-center gap-2.5 border-b border-info-100 bg-info-50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-info-600">
          <IconInfo className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-extrabold tracking-wide text-info-700">GOOD TO KNOW</p>
          <p className="text-[11px] font-medium text-slate-500">{data.service}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[13px] leading-relaxed text-slate-600">{svc.blurb}</p>
        {data.confidence !== "high" && <ConfidenceBanner level={data.confidence} />}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50/70 px-3 py-2 text-[12.5px] font-medium text-brand-700">
          <IconArrow className="h-3.5 w-3.5 shrink-0" />
          {svc.nextStep}
        </div>
        {data.serviceKey === "hospitals" && (
          <button
            onClick={() => onAsk?.("Which hospitals near me accept SHA?")}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <IconPin className="h-4 w-4" /> Open Hospital Finder
          </button>
        )}
      </div>
    </div>
  );
}

function UnknownCard({ data, onAsk }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-card ring-1 ring-amber-100">
      <div className="flex items-center gap-2.5 border-b border-amber-100 bg-amber-50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-amber-500">
          <IconInfo className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-extrabold tracking-wide text-amber-700">NOT CERTAIN</p>
          <p className="text-[11px] font-medium text-slate-500">{data?.service || "Your question"}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[13px] leading-relaxed text-slate-600">
          I couldn't confirm this specific service from the SHA benefits data I have, so I won't guess a
          figure. Please confirm at the <strong className="text-ink">SHA office</strong> or the SHA desk at
          your facility.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-700">
          <IconInfo className="h-3.5 w-3.5 shrink-0" />
          Tip: covered services at a public hospital are usually KES 0 out of pocket.
        </div>
        <button
          onClick={() => onAsk?.("Which hospitals near me accept SHA?")}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          <IconPin className="h-4 w-4" /> Find an SHA facility to ask
        </button>
      </div>
    </div>
  );
}

function ConfidenceBanner({ level }) {
  const low = level === "low";
  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] font-medium ${
        low ? "bg-amber-50 text-amber-700" : "bg-info-50 text-info-700"
      }`}
    >
      <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {low
          ? "Confidence: low — please confirm this at the SHA office before relying on it."
          : "Confidence: medium — figures are indicative; confirm your specific case at the SHA desk."}
      </span>
    </div>
  );
}

function FeedbackButton({ up }) {
  const [picked, setPicked] = useState(false);
  return (
    <button
      onClick={() => setPicked((p) => !p)}
      className={`rounded-lg p-1.5 transition ${
        picked ? "bg-brand-50 text-brand-600" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
      }`}
      aria-label={up ? "Helpful" : "Not helpful"}
    >
      {up ? <IconThumbUp className="h-4 w-4" /> : <IconThumbDown className="h-4 w-4" />}
    </button>
  );
}

/* ---------------- Shareable Receipt modal ---------------- */

function ReceiptModal({ data, onClose }) {
  const ref = useMemo(() => receiptRef(), []);
  const dateStr = useMemo(
    () =>
      new Date().toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText({
    service: data.service,
    level: data.levelLabel,
    shaCovers: data.shaCovers,
    youPay: data.youPay,
    status: data.status,
    ref,
    confidence: data.confidence,
  });

  const onWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      /* clipboard blocked — ignore */
    }
  };

  const onDownload = () => downloadReceipt(data, ref, dateStr);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      style={{ animation: "rise .2s ease-out" }}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        {/* The receipt itself */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-4 text-white">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <div className="leading-tight">
                <p className="text-[13px] font-extrabold">CoverSasa</p>
                <p className="text-[10px] text-brand-100">SHA Coverage Receipt</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15"
              aria-label="Close"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4">
            <Row label="Service" value={data.service} />
            <Row label="Facility level" value={data.levelLabel} />
            <Row label="Fund" value={data.fund} />
            <Row label="Status" value={statusLabel(data.status)} strong />

            <div className="my-3 border-t border-dashed border-line" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700/70">
                  SHA covers
                </p>
                <p className="text-[22px] font-extrabold text-brand-600">{formatKES(data.shaCovers)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">You pay</p>
                <p
                  className={`text-[22px] font-extrabold ${
                    data.youPay === 0 ? "text-brand-600" : "text-ink"
                  }`}
                >
                  {formatKES(data.youPay)}
                </p>
              </div>
            </div>

            {!data.offeredHere && data.referTo && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
                Referred to {data.referTo.label} ({data.referTo.sublabel}) for this service.
              </p>
            )}
            {data.confidence === "low" && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
                ⚠️ Not certain — confirm at the SHA office.
              </p>
            )}

            <div className="my-3 border-t border-dashed border-line" />

            <div className="flex items-end justify-between">
              <div className="text-[10.5px] leading-relaxed text-slate-400">
                <p className="font-mono font-semibold text-slate-500">{ref}</p>
                <p>{dateStr}</p>
                <p className="mt-1">Show this at the counter · not medical advice</p>
              </div>
              <FakeQR />
            </div>
          </div>
        </div>

        {/* Share actions */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={onWhatsApp}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2.5 text-[12.5px] font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
          >
            <IconWhatsApp className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <IconCopy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <IconDownload className="h-4 w-4" /> PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[12.5px]">
      <span className="text-slate-400">{label}</span>
      <span className={strong ? "font-bold text-brand-700" : "font-medium text-ink"}>{value}</span>
    </div>
  );
}

// Draw the receipt to a canvas and trigger a PNG download. Self-contained so it
// works offline with no external libraries.
function downloadReceipt(data, ref, dateStr) {
  const W = 560;
  const H = 620;
  const dpr = 2;
  const c = document.createElement("canvas");
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // header band
  ctx.fillStyle = "#0A7241";
  ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText("CoverSasa", 40, 46);
  ctx.font = "400 14px Inter, sans-serif";
  ctx.fillStyle = "#CFF4DF";
  ctx.fillText("SHA Coverage Receipt", 40, 70);

  let y = 140;
  const line = (label, value, opts = {}) => {
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(label, 40, y);
    ctx.font = (opts.bold ? "700 " : "600 ") + "15px Inter, sans-serif";
    ctx.fillStyle = opts.color || "#0D1C2E";
    ctx.textAlign = "right";
    ctx.fillText(String(value), W - 40, y);
    ctx.textAlign = "left";
    y += 32;
  };
  line("Service", data.service);
  line("Facility level", data.levelLabel);
  line("Fund", data.fund);
  line("Status", statusLabel(data.status), { bold: true, color: "#0A7241" });

  // dashed divider
  y += 6;
  ctx.strokeStyle = "#E2E8F5";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(W - 40, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 40;

  // big split
  ctx.font = "600 12px Inter, sans-serif";
  ctx.fillStyle = "#0A7241";
  ctx.fillText("SHA COVERS", 40, y);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("YOU PAY", 320, y);
  y += 34;
  ctx.font = "800 30px Inter, sans-serif";
  ctx.fillStyle = "#0C8E50";
  ctx.fillText(formatKES(data.shaCovers), 40, y);
  ctx.fillStyle = data.youPay === 0 ? "#0C8E50" : "#0D1C2E";
  ctx.fillText(formatKES(data.youPay), 320, y);
  y += 40;

  if (data.confidence === "low") {
    ctx.font = "600 13px Inter, sans-serif";
    ctx.fillStyle = "#b45309";
    ctx.fillText("⚠  Not certain — confirm at the SHA office.", 40, y);
    y += 30;
  }

  // dashed divider
  y += 4;
  ctx.strokeStyle = "#E2E8F5";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(W - 40, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 34;

  ctx.font = "700 14px monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText(ref, 40, y);
  y += 24;
  ctx.font = "400 13px Inter, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(dateStr, 40, y);
  y += 22;
  ctx.fillText("Show this at the counter · not medical advice", 40, y);

  const url = c.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `coversasa-${ref}.png`;
  a.click();
}

/* ---------------- Hospital Finder (Google Maps) ---------------- */

let _mapsPromise;
function loadGoogleMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    // Reuse an existing tag (e.g. across HMR reloads) instead of adding another.
    const existing = document.querySelector('script[data-coversasa-maps]');
    const s = existing || document.createElement("script");
    const done = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error("maps-failed")));
    s.addEventListener("load", done);
    s.addEventListener("error", () => {
      _mapsPromise = null; // never cache a failure — allow a later retry
      reject(new Error("maps-failed"));
    });
    if (!existing) {
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
      s.async = true;
      s.dataset.coversasaMaps = "1";
      document.head.appendChild(s);
    } else if (window.google?.maps) {
      resolve(window.google.maps);
    }
  });
  return _mapsPromise;
}

const LEVEL_META = {
  3: { color: "#12A75F", label: "Level 2–3 · Dispensary / Health Centre" },
  4: { color: "#0EA5E9", label: "Level 4 · Sub-county Hospital" },
  5: { color: "#F59E0B", label: "Level 5 · County Referral" },
  6: { color: "#0A5A35", label: "Level 6 · National Referral" },
};

function HospitalFinder({ onAsk }) {
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);
  const info = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(0); // 0 = all
  const [selected, setSelected] = useState(null);

  const filtered = FACILITIES.filter(
    (f) =>
      (levelFilter === 0 || f.level === levelFilter) &&
      (query.trim() === "" ||
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.county.toLowerCase().includes(query.toLowerCase()))
  );

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    const init = (maps) => {
      if (cancelled || !mapEl.current) return;
      if (!mapObj.current) {
        mapObj.current = new maps.Map(mapEl.current, {
          center: { lat: -0.6, lng: 37.3 },
          zoom: 6,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        info.current = new maps.InfoWindow();
      }
      setStatus("ready");
    };
    loadGoogleMaps(GOOGLE_MAPS_KEY)
      .then(init)
      .catch(() => {
        // If the API is actually present (stale rejected promise), recover.
        if (!cancelled && window.google?.maps) init(window.google.maps);
        else if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // (Re)draw markers when the filter changes and the map is ready.
  useEffect(() => {
    if (status !== "ready" || !window.google?.maps) return;
    const maps = window.google.maps;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = filtered.map((f) => {
      const marker = new maps.Marker({
        position: { lat: f.lat, lng: f.lng },
        map: mapObj.current,
        title: f.name,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: LEVEL_META[f.level].color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelected(f);
        info.current.setContent(
          `<div style="font-family:Inter,sans-serif"><strong style="color:#0D1C2E">${f.name}</strong><br/><span style="color:#64748b;font-size:12px">${f.county} · ${LEVEL_META[f.level].label}</span></div>`
        );
        info.current.open(mapObj.current, marker);
        mapObj.current.panTo({ lat: f.lat, lng: f.lng });
      });
      return marker;
    });
  }, [status, levelFilter, query]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(f) {
    setSelected(f);
    if (mapObj.current) {
      mapObj.current.panTo({ lat: f.lat, lng: f.lng });
      mapObj.current.setZoom(11);
    }
  }

  return (
    <div className="scroll-thin flex-1 overflow-y-auto bg-surface px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-card md:p-8">
          <h2 className="text-2xl font-extrabold md:text-3xl">Facility Coverage Guide</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-brand-100">
            Find out where your cover works across Kenya's healthcare levels. Search a hospital, county, or
            level to see accredited facilities near you.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-card">
            <IconSearch className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital name or county…"
              className="flex-1 bg-transparent px-1 py-2 text-[14px] text-ink placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Level filter chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterChip on={levelFilter === 0} onClick={() => setLevelFilter(0)} label="All levels" />
          {[3, 4, 5, 6].map((l) => (
            <FilterChip
              key={l}
              on={levelFilter === l}
              onClick={() => setLevelFilter(l)}
              label={l === 3 ? "Level 2–3" : `Level ${l}`}
              dot={LEVEL_META[l].color}
            />
          ))}
          <span className="ml-auto text-[12px] font-medium text-slate-400">
            {filtered.length} facilities
          </span>
        </div>

        {/* Map + list */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative h-[360px] overflow-hidden rounded-2xl border border-line bg-lav shadow-card md:h-[460px]">
            <div ref={mapEl} className="h-full w-full" />
            {status !== "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-lav text-center">
                {status === "loading" ? (
                  <>
                    <span className="inline-flex gap-1">
                      <span className="dot h-2.5 w-2.5 rounded-full bg-brand-400" />
                      <span className="dot h-2.5 w-2.5 rounded-full bg-brand-400" />
                      <span className="dot h-2.5 w-2.5 rounded-full bg-brand-400" />
                    </span>
                    <p className="text-[12.5px] text-slate-500">Loading the map…</p>
                  </>
                ) : (
                  <div className="px-6">
                    <IconPin className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-[13px] font-semibold text-slate-600">Map unavailable offline</p>
                    <p className="text-[12px] text-slate-400">
                      Browse the accredited facilities in the list on the right.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List */}
          <div className="scroll-thin max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => pick(f)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                  selected?.id === f.id
                    ? "border-brand-400 bg-brand-50 shadow-card"
                    : "border-line bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
                }`}
              >
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: LEVEL_META[f.level].color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-ink">{f.name}</span>
                  <span className="block text-[11.5px] text-slate-500">
                    {f.county} · {LEVEL_META[f.level].label.split(" · ")[0]}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{f.services}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected facility action */}
        {selected && (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: LEVEL_META[selected.level].color }}
            >
              <IconPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">{selected.name}</p>
              <p className="text-[12px] text-slate-500">
                {selected.county} · {LEVEL_META[selected.level].label} · accepts SHA ✅
              </p>
            </div>
            <button
              onClick={() =>
                onAsk?.(`Which SHA services are covered at a Level ${selected.level} facility like ${selected.name}?`)
              }
              className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(12,142,80,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              What's covered here?
            </button>
          </div>
        )}

        {/* Tier explainer cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <TierCard
            color="#12A75F"
            title="Level 2–3 Facilities"
            sub="Dispensaries & Health Centres"
            heading="Full cover for outpatient."
            items={["General consultations", "Basic lab tests", "Immunisations & essential drugs"]}
            tag="Imekubaliwa"
          />
          <TierCard
            color="#0EA5E9"
            title="Level 4–5 Facilities"
            sub="Sub-county & County Hospitals"
            heading="Inpatient & specialist care."
            items={["Surgical procedures (CS, appendix)", "Maternity & admission", "Diagnostic imaging (MRI/CT)"]}
            tag="Imekubaliwa"
          />
          <TierCard
            color="#F59E0B"
            title="Level 6 Facilities"
            sub="National Referral Hospitals"
            heading="Specialised, referral-based."
            items={["Cancer treatment", "Organ transplants", "ICU & cardiac care"]}
            tag="Referral"
            muted
          />
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Demo dataset · representative SHA-accredited facilities across Kenya · Map © Google
        </p>
      </div>
    </div>
  );
}

function FilterChip({ on, onClick, label, dot }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
        on
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-line bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
    </button>
  );
}

function TierCard({ color, title, sub, heading, items, tag, muted }) {
  return (
    <div
      className="rounded-2xl border border-line bg-white p-5 shadow-card"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22` }}>
          <IconHospital className="h-5 w-5" style={{ color }} />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            muted ? "bg-slate-100 text-slate-500" : "bg-brand-600 text-white"
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="mt-3 text-[16px] font-extrabold text-ink">{title}</p>
      <p className="text-[12px] text-slate-500">{sub}</p>
      <div className="mt-3 rounded-xl bg-lav p-3">
        <p className="text-[13px] font-bold text-ink">{heading}</p>
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[12.5px] text-slate-600">
              <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} />
              {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- History drawer ---------------- */

function HistoryDrawer({ questions, onPick, onClose }) {
  const unique = [...new Set(questions)].reverse();
  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <IconClock className="h-4 w-4 text-brand-600" />
          <p className="text-[14px] font-bold">Recent Coverage</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink">
          <IconClose className="h-4 w-4" />
        </button>
      </div>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-4">
        {unique.length === 0 && (
          <p className="mt-8 text-center text-[13px] text-slate-400">
            No questions yet. Ask about a service and it'll appear here.
          </p>
        )}
        {unique.map((q, i) => (
          <button
            key={i}
            onClick={() => onPick(q)}
            className="flex w-full items-start gap-2 rounded-xl border border-line bg-white p-3 text-left text-[12.5px] text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-ink"
          >
            <IconChat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
            {q}
          </button>
        ))}
      </div>
    </aside>
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
  const cells = Array.from({ length: 49 }, (_, i) => (i * 7 + 3) % 5 < 2);
  return (
    <div className="grid grid-cols-7 gap-[2px] rounded-lg bg-[white] p-1.5">
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
      <path d="m13.5 20 4.5 4.5L27 15.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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

function IconShieldCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconHospital({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M12 7v6M9 10h6" />
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

function IconMoon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function IconSun({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
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

function IconCheck({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconReceipt({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function IconDownload({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function IconCopy({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconWhatsApp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.5.5c-.2.2-.3.3-.1.6.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.3.1 1.6.8 1.8.9.3.1.4.2.5.3.1.2.1.7-.1 1.1Z" />
    </svg>
  );
}

function IconThumbUp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4.5-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.2 21H7" />
    </svg>
  );
}

function IconThumbDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Zm0 0-4.5 7a2 2 0 0 1-2-2v-3h-5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.8 3H17" />
    </svg>
  );
}
