// A plain local server so `npm run dev` has something to call at
// /api/generate, without needing the Vercel CLI or an account just to
// develop locally. Vite proxies /api/* to this (see vite.config.js).
// Uses the exact same generateAnswer() the real Vercel function
// (api/generate.js) uses — no separate logic to keep in sync.
import { createServer } from "node:http";
import { generateAnswer, checkHealth } from "../api/_lib/groq.mjs";

const PORT = process.env.API_PORT || 8787;

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    checkHealth(process.env.GROQ_API_KEY).then((result) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { question, results } = JSON.parse(body || "{}");
        const output = await generateAnswer({ question, results, apiKey: process.env.GROQ_API_KEY });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(output));
      } catch (err) {
        console.error(err);
        const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Generation failed" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn("[dev-api] GROQ_API_KEY is not set — requests to /api/generate will fail until it's set in .env");
  }
});
