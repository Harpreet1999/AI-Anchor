import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown2, Refresh2 } from "iconsax-react";
import { pyApiUrl } from "../lib/pyApi.js";

const POLL_MS = 30000;
const TIMEOUT_MS = 6000;

async function checkEndpoint(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = performance.now();
    const res = await fetch(url, { signal: controller.signal });
    const ms = Math.round(performance.now() - started);
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { phase: "up", message: data.model ? `Live — ${data.model}` : "Live", ms };
    return { phase: "down", message: data.message || `Returned an error (${res.status}).`, ms };
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return { phase: "down", message: timedOut ? "Timed out." : "Couldn't reach it — may be waking up from idle." };
  }
}

const SERVICES = [
  { id: "groq", label: "Groq LLM (Generate)", url: "/api/health" },
  { id: "py", label: "Python retrieval (ChromaDB)", url: pyApiUrl("/health") },
];

// One combined, honest "is any of this actually working right now" panel —
// collapsed to a single subtle dot by default (matches the rest of the
// masthead's restraint), expandable on click into a real per-service
// breakdown with a manual recheck, rather than two separate always-on
// chips competing for space.
export default function SystemStatus() {
  const [status, setStatus] = useState(() =>
    Object.fromEntries(SERVICES.map((s) => [s.id, { phase: "checking", message: "Checking…" }]))
  );
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef(null);
  const rootRef = useRef(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    const results = await Promise.all(SERVICES.map((s) => checkEndpoint(s.url)));
    setStatus(Object.fromEntries(SERVICES.map((s, i) => [s.id, results[i]])));
    setChecking(false);
  }, []);

  useEffect(() => {
    runCheck();
    timerRef.current = setInterval(runCheck, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [runCheck]);

  // Close the dropdown on an outside click — standard popover behavior.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const upCount = SERVICES.filter((s) => status[s.id]?.phase === "up").length;
  const overallPhase = upCount === SERVICES.length ? "up" : upCount === 0 ? "down" : "partial";
  const overallLabel = `${upCount}/${SERVICES.length} live`;

  return (
    <div className="sys-status" ref={rootRef}>
      <button
        type="button"
        className={`sys-status-trigger ${overallPhase}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Live backend status"
      >
        <span className="sys-status-dot" />
        <span className="sys-status-text">{overallLabel}</span>
        <ArrowDown2 size={11} variant="Outline" color="currentColor" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>

      {open && (
        <div className="sys-status-panel" role="dialog" aria-label="System status">
          <div className="sys-status-panel-head">
            <span>LIVE BACKEND STATUS</span>
            <button type="button" className="sys-status-recheck" onClick={runCheck} disabled={checking}>
              <Refresh2 size={12} variant="Outline" color="currentColor" className={checking ? "spin-icon" : undefined} /> Recheck
            </button>
          </div>
          {SERVICES.map((s) => {
            const st = status[s.id] || { phase: "checking", message: "Checking…" };
            return (
              <div key={s.id} className="sys-status-row">
                <span className={`sys-status-dot small ${st.phase}`} />
                <div className="sys-status-row-body">
                  <b>{s.label}</b>
                  <span>{st.message}{st.ms !== undefined ? ` · ${st.ms}ms` : ""}</span>
                </div>
              </div>
            );
          })}
          <div className="sys-status-panel-foot">Each row is a real network round trip, not a heartbeat — a green dot means that service actually answered just now.</div>
        </div>
      )}
    </div>
  );
}
