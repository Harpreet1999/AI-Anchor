import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { pyApiUrl } from "./pyApi.js";

// One shared "is this actually up right now" truth for the whole app —
// previously the masthead pill (SystemStatus.jsx) ran its own poll loop
// while every "Check now" button (LiveCheck.jsx, used in the Step 01
// table and the Step 02 stage drawer) ran its own separate one-shot
// fetch. Two independent trackers meant they could — and did — disagree:
// a manual check could say "confirmed live" while the pill still said
// "down" from a stale poll, or vice versa. Now there's exactly one
// poller, and every surface in the app reads from it.
//
// A service on free hosting can take 100+ seconds to wake from cold —
// far longer than makes sense to block a status check on. So this
// doesn't just wait-then-give-up once: it makes one quick check, and if
// that fails, keeps retrying every 10s in the background for up to
// WAKE_BUDGET_MS before actually reporting "down". A cold service reads
// "waking up" (not misleadingly "unreachable"), and the panel updates
// the moment it actually answers, not on the next idle-cadence tick.
const POLL_MS = 30000;
const QUICK_TIMEOUT_MS = 6000;
const WAKE_BUDGET_MS = 130000;

export const SERVICES = [
  { id: "groq", label: "Groq LLM (Generate)", url: "/api/health" },
  { id: "py", label: "Python retrieval (ChromaDB)", url: pyApiUrl("/health") },
];

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const ms = Math.round(performance.now() - started);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, status: res.status, data, ms };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEndpoint(url, { onWaking } = {}) {
  try {
    const r = await fetchWithTimeout(url, QUICK_TIMEOUT_MS);
    if (r.ok) return { phase: "up", message: r.data.model ? `Live — ${r.data.model}` : "Live", ms: r.ms };
    return { phase: "down", message: r.data.message || `Returned an error (${r.status}).`, ms: r.ms };
  } catch {
    onWaking?.();
  }

  const deadline = performance.now() + WAKE_BUDGET_MS;
  while (performance.now() < deadline) {
    try {
      const r = await fetchWithTimeout(url, 10000);
      if (r.ok) return { phase: "up", message: r.data.model ? `Live — ${r.data.model}` : "Live", ms: r.ms };
      return { phase: "down", message: r.data.message || `Returned an error (${r.status}).`, ms: r.ms };
    } catch {
      // still nothing — loop and try again until the wake budget runs out
    }
  }
  return { phase: "down", message: `Still hadn't answered after ${Math.round(WAKE_BUDGET_MS / 1000)}s — likely actually down, not just slow to wake.` };
}

const SystemStatusContext = createContext(null);

export function SystemStatusProvider({ children }) {
  const [status, setStatus] = useState(() =>
    Object.fromEntries(SERVICES.map((s) => [s.id, { phase: "checking", message: "Checking…" }]))
  );
  const [checking, setChecking] = useState(false);
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setChecking(true);
    const results = await Promise.all(
      SERVICES.map((s) =>
        checkEndpoint(s.url, {
          onWaking: () =>
            setStatus((prev) => ({
              ...prev,
              [s.id]: { phase: "waking", message: "Not answering yet — likely waking up from idle. Retrying…" },
            })),
        })
      )
    );
    setStatus(Object.fromEntries(SERVICES.map((s, i) => [s.id, results[i]])));
    setChecking(false);
    inFlightRef.current = false;
  }, []);

  // Called by a real feature succeeding on its own (a retrieval that
  // actually returned chunks, a generation that actually answered) so the
  // badge reflects reality the instant it's proven true, instead of
  // waiting up to POLL_MS for the next scheduled check to catch up. This
  // is what closes the exact gap reported live: the Python track working
  // perfectly while the pill still said "down" because the last poll
  // happened to land mid-cold-start.
  const markUp = useCallback((id, extra = {}) => {
    setStatus((prev) => ({ ...prev, [id]: { phase: "up", message: "Live", ...extra } }));
  }, []);

  useEffect(() => {
    runCheck();
    timerRef.current = setInterval(runCheck, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [runCheck]);

  return (
    <SystemStatusContext.Provider value={{ status, checking, runCheck, markUp }}>
      {children}
    </SystemStatusContext.Provider>
  );
}

// Returns null outside a provider (harmless — consumers fall back to
// their own standalone behavior) rather than throwing, since a couple of
// call sites (LiveCheck's default mode) are meant to work either way.
export function useSystemStatus() {
  return useContext(SystemStatusContext);
}
