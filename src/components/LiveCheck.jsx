import { useState } from "react";

// A small, reusable "prove it" button — hits a real health endpoint on
// click and reports exactly what came back, instead of asking the visitor
// to take "Live" on faith. Used in the pipeline stage drawer (Step 02) and
// the stack comparison table (Step 01).
export default function LiveCheck({ label, url }) {
  const [state, setState] = useState(null); // null | "checking" | {ok, message}

  const run = async () => {
    setState("checking");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      setState(
        res.ok && data.ok
          ? { ok: true, message: data.model ? `Confirmed live — ${data.model}` : "Confirmed live." }
          : { ok: false, message: data.message || `Returned an error (${res.status}).` }
      );
    } catch (err) {
      setState({ ok: false, message: err.name === "AbortError" ? "Timed out." : "Couldn't reach it right now." });
    }
  };

  return (
    <div className="stage-live-check">
      <button type="button" className="stage-live-check-btn" onClick={run} disabled={state === "checking"}>
        {state === "checking" ? "Checking…" : label}
      </button>
      {state && state !== "checking" && (
        <div className={`stage-live-result ${state.ok ? "up" : "down"}`}>
          <span className={`sys-status-dot small ${state.ok ? "up" : "down"}`} />
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
