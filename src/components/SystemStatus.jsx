import { useEffect, useRef, useState } from "react";
import { ArrowDown2, Refresh2 } from "iconsax-react";
import { SERVICES, useSystemStatus } from "../lib/systemStatus.jsx";

// One combined, honest "is any of this actually working right now" panel —
// collapsed to a single subtle dot by default (matches the rest of the
// masthead's restraint), expandable on click into a real per-service
// breakdown with a manual recheck, rather than two separate always-on
// chips competing for space. All the actual checking logic lives in
// SystemStatusProvider (src/lib/systemStatus.jsx) now — this component is
// just a view onto that one shared truth, same as every "Check now"
// button elsewhere in the app (see LiveCheck.jsx).
export default function SystemStatus() {
  const shared = useSystemStatus();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!shared) return null;
  const { status, checking, runCheck } = shared;

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
                <span className={`status-ring ${st.phase}`} aria-hidden="true" />
                <div className="sys-status-row-body">
                  <b>{s.label}</b>
                  <span>{st.message}{st.ms !== undefined ? ` · ${st.ms}ms` : ""}</span>
                </div>
              </div>
            );
          })}
          <div className="sys-status-panel-foot">Each row is a real network round trip, not a heartbeat — a green dot means that service actually answered just now, and this is the same status every "Check now" button on the site reads from.</div>
        </div>
      )}
    </div>
  );
}
