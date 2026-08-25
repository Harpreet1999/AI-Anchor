// The Python retrieval service (service-py/) is a separately-hosted
// FastAPI process — not something Vercel serves, so there's no shared
// "/api/*" convention to lean on the way api/generate.js works.
//
// In production, set VITE_PY_API_URL to the deployed service's URL
// (e.g. a Hugging Face Space — see service-py/README.md). In dev, it
// falls back to Vite's /py-api proxy, which forwards to a local
// `uvicorn app:app --port 8000` (see vite.config.js).
export function pyApiUrl(path) {
  const base = import.meta.env.VITE_PY_API_URL?.replace(/\/$/, "") || "/py-api";
  return `${base}${path}`;
}
