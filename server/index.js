// Cover Sasa — backend. Holds the ANTHROPIC_API_KEY and answers coverage
// questions by feeding the SHA benefits data to Claude as context, then
// streaming a plain-language answer back to the chat UI.
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { SHA_KNOWLEDGE } from "./sha-data.js";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = `You are Cover Sasa, a friendly assistant that helps a patient or a hospital clerk at a Kenyan public hospital counter instantly understand what SHA (Social Health Authority) covers for the exact procedure or drug in front of them right now.

You have been given the official SHA benefits package below. Answer ONLY from it. This is the single source of truth:

<sha_benefits>
${SHA_KNOWLEDGE}
</sha_benefits>

HOW TO ANSWER — this is the whole point of the product:
- Answer in the SAME language the person used. If they write in Swahili (or Sheng), reply in Swahili. If English, reply in English. If mixed, mirror them.
- Talk like a helpful person at the counter, NOT like an insurance document. No jargon, no Act sections.
- Lead with a clear YES / NO / PARTLY on whether SHA covers it.
- Then give the ONE number that matters most: what the person will pay out of pocket. At a public hospital a covered service is usually "Ksh 0 — hakuna unayolipa" / "Ksh 0 — you pay nothing". Say it plainly.
- If a tariff figure exists, mention it briefly as what SHA pays the hospital, and explain that at a private/faith facility they may pay a balance above it.
- Mention pre-authorisation, referral, facility level, or annual limits ONLY when they actually apply to what was asked — keep it to one short line.
- End with the practical next step ("Bring your SHA card and ID" / "Leta kadi yako ya SHA na kitambulisho").
- Keep it SHORT — a few sentences, like a real WhatsApp reply. Under ~90 words.

RULES:
- If the specific service is not in the benefits data, say honestly that you can't confirm it and they should ask the SHA desk at the facility — do NOT invent a figure.
- You give SHA coverage information, not medical advice. If asked what treatment they need, gently redirect them to a clinician.
- Reassure, don't alarm. Many people are told to "lipa kwanza" (pay first) when they were actually covered — your job is to give them the confidence to ask.`;

// Streaming chat endpoint (Server-Sent Events).
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" }, // snappy answers for the counter
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    });

    await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Samahani, kuna hitilafu. Try again." })}\n\n`);
    res.end();
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Cover Sasa backend on http://localhost:${PORT}`));
