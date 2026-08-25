// Real Vercel serverless function — the production health endpoint the
// frontend's status indicator polls.
import { checkHealth } from "./_lib/groq.mjs";

export default async function handler(req, res) {
  const result = await checkHealth(process.env.GROQ_API_KEY);
  res.status(200).json(result);
}
