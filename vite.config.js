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
    },
  },
})
