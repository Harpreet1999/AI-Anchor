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

export default function TopProgress({ active, onNavigate }) {
  const pct = Math.round((active / STEPS.length) * 100);

  return (
    <div className="topprogress">
      <div className="progress-blocks">
        {STEPS.map((s) => {
          const state = s.n < active ? "done" : s.n === active ? "current" : "upcoming";
          return (
            <button
              key={s.n}
              className={`progress-block ${state}`}
              onClick={() => onNavigate(s.n)}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="progress-no">{String(s.n).padStart(2, "0")}</span>
              <span className="progress-name">{s.name}</span>
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
        <span className="progress-pct">{pct}%</span>
      </div>
    </div>
  );
}
