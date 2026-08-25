const STEPS = [
  { n: 1, name: "Pick a Stack" },
  { n: 2, name: "How It Works" },
  { n: 3, name: "Pick a Dataset" },
  { n: 4, name: "See It Chunked" },
  { n: 5, name: "See the Embeddings" },
  { n: 6, name: "Plan Retrieval" },
  { n: 7, name: "Augment Context" },
  { n: 8, name: "Generate Answer" },
];

// `maxStep` is optional — omitting it (or passing Infinity) leaves every
// block clickable, same as before this existed.
export default function TopProgress({ active, onNavigate, maxStep = Infinity }) {
  const pct = Math.round((active / STEPS.length) * 100);

  return (
    <div className="topprogress">
      <div className="progress-blocks">
        {STEPS.map((s) => {
          const locked = s.n > maxStep;
          const state = locked ? "locked" : s.n < active ? "done" : s.n === active ? "current" : "upcoming";
          // Each block carries its own running percentage right underneath
          // it — where THIS step sits in the overall 8-step run — instead
          // of one lone number off in the corner of the whole bar.
          const segPct = Math.round((s.n / STEPS.length) * 100);
          return (
            <button
              key={s.n}
              className={`progress-block ${state}`}
              onClick={() => onNavigate(s.n)}
              aria-current={state === "current" ? "step" : undefined}
              title={locked ? "Not reachable yet — click for why" : undefined}
            >
              <span className="progress-block-main">
                <span className="progress-no">{String(s.n).padStart(2, "0")}</span>
                <span className="progress-name">{s.name}</span>
              </span>
              <span className="progress-block-pct">{segPct}%</span>
            </button>
          );
        })}
      </div>

      <div
        className="progress-track-row"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall progress"
      >
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
          {STEPS.slice(0, -1).map((s) => (
            <span
              key={s.n}
              className="progress-tick"
              style={{ left: `${(s.n / STEPS.length) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
