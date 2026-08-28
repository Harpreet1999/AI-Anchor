// Shared core logic for the "Generate" step's real LLM call — imported by
// both api/generate.js (the actual Vercel serverless function, used in
// production) and server/dev-api.mjs (a plain local server so `npm run
// dev` has something to talk to without needing the Vercel CLI). One
// implementation, two thin entry points, so the two never drift apart.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

// This account's Groq key caps a single request around 8000 tokens
// (discovered directly — a topK=10 request against the cookbook dataset,
// whose chunks run long, was rejected outright as too large). Evidence is
// trimmed to this character budget before it's sent, dropping from the
// end of `results` (the lowest-ranked matches) first — so raising topK in
// the UI is safe for every dataset, it just means "use up to this many,
// budget permitting" rather than "always use exactly this many."
const EVIDENCE_CHAR_BUDGET = 22000;

// Prompt-tightening, baked in from the start rather than bolted on later:
// explicit refusal instruction is the single highest-leverage defense
// against the "her maiden sister" style hallucination flan-t5-small
// produced — a capable model still needs to be told not to guess.
const SYSTEM_PROMPT = `You are a careful research assistant. Answer the user's question using ONLY the evidence provided below — never use outside knowledge, never guess, never fill gaps with plausible-sounding facts.

Formatting the answer (plain Markdown — no HTML):
- A short, narrow answer can be 2-4 plain sentences.
- An enumeration of several things should be a real Markdown bullet list — each item on its own "- " line, not comma-spliced into one paragraph.
- If the question explicitly asks for a table/tabular format, use a real Markdown table (header row, "|---|---|" separator, data rows).
- Reference which evidence number(s) you drew from using plain parenthetical text like "(evidence 1)" or "(evidence 1, 3)" — never bracket-and-symbol citation markup (no "[1]", no footnote/annotation-style markers like "【1†...】" or similar) — plain words only, so it renders as ordinary text everywhere.

Other rules:
- If the evidence directly answers the question, give a clear, complete answer.
- If the evidence does not contain the answer, say so in one short, natural sentence of your own — phrased for whatever the evidence actually is (e.g. "The retrieved excerpts from the story don't cover what happens to him after that." or "None of the retrieved sections mention his certifications."). Do not use a fixed stock phrase, and do not guess or reach for outside knowledge just to sound more complete.
- Never invent names, relationships, numbers, or facts that are not explicitly present in the evidence text.`;

// A cheap, real health check — not a ping that just says "the server is
// up." Actually confirms the configured key works against Groq (the
// models list endpoint costs no tokens), so "Live" means "a generation
// would actually succeed right now," not just "the process is running."
export async function checkHealth(apiKey) {
  if (!apiKey) {
    return { ok: false, message: "GROQ_API_KEY is not configured on the backend." };
  }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Groq rejected the API key — it may be invalid, revoked, or expired." };
    }
    if (!res.ok) {
      return { ok: false, message: `Groq API returned an unexpected error (${res.status}).` };
    }
    return { ok: true, model: MODEL };
  } catch (err) {
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
    return { ok: false, message: timedOut ? "Groq API timed out." : `Could not reach Groq: ${err.message}` };
  }
}

export async function generateAnswer({ question, results, apiKey }) {
  if (!apiKey) {
    const err = new Error("Server is missing GROQ_API_KEY.");
    err.status = 500;
    throw err;
  }
  if (!question || !Array.isArray(results) || results.length === 0) {
    const err = new Error("question and results are required.");
    err.status = 400;
    throw err;
  }

  // Keep results in their existing rank order, only dropping from the
  // bottom (lowest-ranked) if the combined evidence would run over
  // budget — see EVIDENCE_CHAR_BUDGET above for why this exists at all.
  const usedResults = [];
  let charTotal = 0;
  for (const r of results) {
    const chunkChars = r.title.length + r.text.length;
    if (usedResults.length > 0 && charTotal + chunkChars > EVIDENCE_CHAR_BUDGET) break;
    usedResults.push(r);
    charTotal += chunkChars;
  }

  const evidence = usedResults
    .map((r, i) => `[${i + 1}] ${r.title} · ${r.source}\n${r.text}`)
    .join("\n\n");
  const userPrompt = `Question: ${question}\n\nEvidence:\n${evidence}`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      // gpt-oss-120b is a reasoning model — its internal "thinking" tokens
      // are billed against the same max_tokens budget as the visible
      // answer, so a low budget can silently truncate the answer mid-
      // sentence after reasoning eats most of it. "low" effort keeps
      // reasoning short for a task this simple, and a bigger budget
      // gives the visible answer room even so. Raised from 600 — that was
      // cutting real multi-part answers off mid-sentence; EVIDENCE_CHAR_
      // BUDGET above is what actually keeps the total request safely
      // under this account's ~8000-token/request ceiling, not this.
      max_tokens: 900,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const err = new Error(`Groq API error (${res.status}): ${bodyText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  // Defensive cleanup, even with the prompt now explicitly forbidding
  // this: gpt-oss-120b occasionally emits its own built-in citation-
  // annotation tokens (e.g. "【1†L1-L4】") regardless of instructions —
  // stripped here so a stray one never reaches the UI as literal symbols.
  const answer = (choice?.message?.content || "").replace(/【[^】]*】/g, "").trim();
  // finish_reason "length" means we hit max_tokens — surface that instead
  // of silently returning a sentence that stops mid-word.
  const truncated = choice?.finish_reason === "length";
  return {
    answer,
    model: MODEL,
    usage: data.usage || null,
    truncated,
    contextChunksUsed: usedResults.length,
    contextChunksRequested: results.length,
  };
}
