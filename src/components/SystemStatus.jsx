import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown2, Refresh2 } from "iconsax-react";
import { pyApiUrl } from "../lib/pyApi.js";

// A service on free hosting can take 100+ seconds to wake from cold —
// far longer than makes sense to block a status check on. So this
// doesn't just wait-then-give-up once: it makes one quick check, and if
// that fails, keeps retrying itself every 10s in the background (inside
// checkEndpoint, not via a second overlapping interval out here) for up
// to WAKE_BUDGET_MS before actually reporting "down". A cold service
// reads "waking up" (true) rather than "unreachable" (misleading), and
// the panel updates the moment it actually answers, not on the next
// idle-cadence tick.
const POLL_MS = 30000;
const QUICK_TIMEOUT_MS = 6000; // first attempt — fast path for an already-warm service
const WAKE_BUDGET_MS = 130000; // total time a cold start is allowed before we call it actually down

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
  // Fast path: most checks hit an already-warm service and should feel
  // instant, not wait out a multi-second budget for no reason.
  try {
    const r = await fetchWithTimeout(url, QUICK_TIMEOUT_MS);
    if (r.ok) return { phase: "up", message: r.data.model ? `Live — ${r.data.model}` : "Live", ms: r.ms };
    return { phase: "down", message: r.data.message || `Returned an error (${r.status}).`, ms: r.ms };
  } catch {
    // Didn't answer in 6s — genuinely could be a cold start, not
    // necessarily broken. Say so, then keep trying with patience instead
    // of immediately reporting a false "down".
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

  // Guards against a slow (up to ~2 minute) in-flight check overlapping
  // with the next scheduled poll — only one round of checks runs at a
  // time, each service hammered with one request at a time, not several
  // stacked retry loops in parallel.
  const inFlightRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setChecking(true);
    const results = await Promise.all(
      SERVICES.map((s) =>
        checkEndpoint(s.url, {
          // Flip to an honest "waking up" reading the moment the fast
          // path fails, rather than leaving the old stale reading up for
          // the ~2 minutes the patient retry can take.
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
  const anyWaking = SERVICES.some((s) => status[s.id]?.phase === "waking");
  const overallPhase = upCount === SERVICES.length ? "up" : upCount > 0 ? "partial" : anyWaking ? "waking" : "down";
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
