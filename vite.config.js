import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, /api/generate is served by server/dev-api.mjs (run via
    // `npm run dev:api`), not by Vite itself — proxied so the frontend
    // can fetch("/api/generate") the same way it will in production
    // (where Vercel serves api/generate.js at that exact path).
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // The Python retrieval service (service-py/) is a separate FastAPI
      // process, run locally with `uvicorn app:app --port 8000`. In
      // production there's no Vercel-side proxy for it — the frontend
      // calls its public URL directly (see VITE_PY_API_URL in
      // src/lib/pyApi.js) since it's a public, read-only, unauthenticated
      // demo endpoint with nothing for a proxy to protect.
      '/py-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/py-api/, ''),
      },
    },
  },
})
