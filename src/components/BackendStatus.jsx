import { useEffect, useRef, useState } from "react";

const POLL_MS = 30000;
const TIMEOUT_MS = 6000;

// Polls the real /api/health endpoint (which itself calls Groq, not just
// "is the process up") and renders a subtle status dot in the masthead.
// Three honest states, not two — "unknown while checking", "reachable and
// working", and "reachable but broken", plus a distinct message for when
// the backend can't be reached at all (fetch itself fails).
export default function BackendStatus() {
  const [state, setState] = useState({ phase: "checking", message: "Checking backend…" });
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch("/api/health", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.ok) {
          setState({ phase: "up", message: `Backend live — ${data.model || "Groq"}` });
        } else {
          setState({ phase: "down", message: data.message || `Backend returned an error (${res.status}).` });
        }
      } catch (err) {
        if (cancelled) return;
        const timedOut = err.name === "AbortError";
        setState({
          phase: "down",
          message: timedOut
            ? "Backend did not respond in time."
            : "Can't reach the backend — is the API server running?",
        });
      }
    }

    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={`backend-status ${state.phase}`} title={state.message}>
      <span className="backend-status-dot" />
      <span className="backend-status-text">
        {state.phase === "up" ? "Backend live" : state.phase === "checking" ? "Checking backend…" : "Backend issue"}
      </span>
      {state.phase === "down" && <span className="backend-status-detail">{state.message}</span>}
    </div>
  );
}
