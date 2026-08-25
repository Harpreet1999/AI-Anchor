import { useState } from "react";
import { useSystemStatus } from "../lib/systemStatus.jsx";

// A small, reusable "prove it" button — reports exactly what came back
// from a real health endpoint, instead of asking the visitor to take
// "Live" on faith. Used in the pipeline stage drawer (Step 02) and the
// stack comparison table (Step 01).
//
// When `serviceId` is given, this reads and triggers the one shared
// status tracker (src/lib/systemStatus.jsx) — the same one behind the
// masthead pill — so every "Check now" button on the site always agrees
// with every other one instead of running its own independent check.
// Without a serviceId it falls back to a fully standalone one-shot fetch,
// for any future use against a URL that isn't one of the tracked services.
export default function LiveCheck({ label, url, serviceId }) {
  const shared = useSystemStatus();
  const [localState, setLocalState] = useState(null); // null | "checking" | {ok, message}

  const runLocal = async () => {
    setLocalState("checking");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      setLocalState(
        res.ok && data.ok
          ? { ok: true, message: data.model ? `Confirmed live — ${data.model}` : "Confirmed live." }
          : { ok: false, message: data.message || `Returned an error (${res.status}).` }
      );
    } catch (err) {
      setLocalState({ ok: false, message: err.name === "AbortError" ? "Timed out." : "Couldn't reach it right now." });
    }
  };

  if (serviceId && shared) {
    const st = shared.status[serviceId] || { phase: "checking", message: "Checking…" };
    const isChecking = shared.checking && (st.phase === "checking" || st.phase === "waking");
    return (
      <div className="stage-live-check">
        <button type="button" className="stage-live-check-btn" onClick={shared.runCheck} disabled={isChecking}>
          {isChecking ? "Checking…" : label}
        </button>
        {/* Always shown, not just once a result lands — the ring itself
            carries the "still checking" meaning (a spinning arc) so this
            row never has to disappear and reappear. */}
        <div className={`stage-live-result ${st.phase}`}>
          <span className={`status-ring ${st.phase}`} aria-hidden="true" />
          <span>{st.message}{st.ms !== undefined ? ` · ${st.ms}ms` : ""}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-live-check">
      <button type="button" className="stage-live-check-btn" onClick={runLocal} disabled={localState === "checking"}>
        {localState === "checking" ? "Checking…" : label}
      </button>
      {localState && localState !== "checking" && (
        <div className={`stage-live-result ${localState.ok ? "up" : "down"}`}>
          <span className={`sys-status-dot small ${localState.ok ? "up" : "down"}`} />
          <span>{localState.message}</span>
        </div>
      )}
    </div>
  );
}
