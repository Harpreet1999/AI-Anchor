// The actual Vercel serverless function — this is what runs in
// production. Keeps the Groq API key server-side only; it's read from
// the GROQ_API_KEY environment variable, never sent to or present in any
// browser code.
import { generateAnswer } from "./_lib/groq.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { question, results } = req.body || {};
    const output = await generateAnswer({ question, results, apiKey: process.env.GROQ_API_KEY });
    res.status(200).json(output);
  } catch (err) {
    console.error(err);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: err.message || "Generation failed" });
  }
}
