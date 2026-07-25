import { useState, useRef, useEffect } from "react";

// Real, ugly, real-person questions — the demo script. Tap one to fire it live.
const SUGGESTIONS = [
  "Je, SHA inalipa CS (operation ya kuzaa)?",
  "Does SHA cover dialysis? How much per session?",
  "Mtoto wangu ana homa, nikienda hospitali ya serikali nitalipa ngapi?",
  "Is an MRI scan covered by SHA?",
  "Inalipa chemotherapy ya cancer?",
];

const GREETING = {
  role: "assistant",
  content:
    "👋 Karibu CoverSasa. Niulize kuhusu chochote kuhusu SHA — upasuaji, dawa, kujifungua, dialysis — kwa Kiswahili au Kiingereza.\n\nAsk me what SHA covers, and I'll tell you what you'll actually pay.",
};

export default function App() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

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
      setMessages((prev) => {
        const next = [...prev];
        if (next.length) next[next.length - 1] = { ...next[next.length - 1], streaming: false };
        return next;
      });
      setBusy(false);
    }
  }

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full w-full items-center justify-center bg-mist p-0 sm:p-6">
      {/* App card */}
      <div className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-card ring-1 ring-line sm:h-[90vh] sm:rounded-3xl">
        {/* Header */}
        <header className="flex items-center gap-3 bg-brand-600 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="white" fillOpacity="0.9" />
              <path d="m9 12 2 2 4-4" stroke="#0C8E50" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <h1 className="text-[16px] font-semibold text-white">CoverSasa</h1>
            <p className="text-[11px] font-medium text-brand-100">
              Instant SHA Benefits Navigator
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-200" /> SHIF · 🇰🇪
          </span>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="dot-grid scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} streaming={m.streaming} />
          ))}

          {showSuggestions && (
            <div className="space-y-2 pt-1">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                Jaribu · Try one
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-left text-[13px] font-medium text-ink shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-line bg-white px-3 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Andika swali lako… / Type your question…"
            className="flex-1 rounded-full border border-line bg-mist px-4 py-2.5 text-[14px] text-ink placeholder:text-ink/40 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-500 disabled:opacity-40"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-[1px] fill-current">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ role, content, streaming }) {
  const isUser = role === "user";
  return (
    <div className={`rise flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
          isUser
            ? "rounded-br-md bg-brand-600 text-white shadow-sm"
            : "rounded-bl-md border border-line bg-white text-ink shadow-card"
        }`}
      >
        {content}
        {streaming && !content && (
          <span className="inline-flex gap-1 py-1">
            <span className="dot h-2 w-2 rounded-full bg-brand-400" />
            <span className="dot h-2 w-2 rounded-full bg-brand-400" />
            <span className="dot h-2 w-2 rounded-full bg-brand-400" />
          </span>
        )}
      </div>
    </div>
  );
}
