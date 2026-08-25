// Shared core logic for the "Generate" step's real LLM call — imported by
// both api/generate.js (the actual Vercel serverless function, used in
// production) and server/dev-api.mjs (a plain local server so `npm run
// dev` has something to talk to without needing the Vercel CLI). One
// implementation, two thin entry points, so the two never drift apart.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

// Prompt-tightening, baked in from the start rather than bolted on later:
// explicit refusal instruction is the single highest-leverage defense
// against the "her maiden sister" style hallucination flan-t5-small
// produced — a capable model still needs to be told not to guess.
const SYSTEM_PROMPT = `You are a careful research assistant. Answer the user's question using ONLY the evidence provided below — never use outside knowledge, never guess, never fill gaps with plausible-sounding facts.

Rules:
- If the evidence directly answers the question, give a clear, complete answer in 2-4 sentences, and reference which evidence number(s) — e.g. [1], [2] — you drew from.
- If the evidence does not contain the answer, respond with exactly this sentence and nothing else: "Not found in the retrieved sources."
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

  const evidence = results
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
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const err = new Error(`Groq API error (${res.status}): ${bodyText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content?.trim() || "";
  return { answer, model: MODEL, usage: data.usage || null };
}
