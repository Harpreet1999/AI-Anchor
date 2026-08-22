const STEPS = [
  { n: 1, no: "STEP 01", name: "How It Works" },
  { n: 2, no: "STEP 02", name: "Pick a Dataset" },
  { n: 3, no: "STEP 03", name: "See It Chunked" },
];

export default function Sidebar({ active, onNavigate, liveCount, totalStages }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-head">
        <div className="proj">AI ANCHOR</div>
        <div className="sub">DRAWING SET — DATA LAYER</div>
      </div>
      {STEPS.map((s) => (
        <button
          key={s.n}
          className={`sheet-link${active === s.n ? " active" : ""}`}
          onClick={() => onNavigate(s.n)}
        >
          <span className="no">{s.no}</span>
          <span className="name">{s.name}</span>
        </button>
      ))}
      <div className="sidebar-status">
        STATUS<br /><b>{liveCount} of {totalStages} stages live</b><br /><br />
        REV. C · 2026-08-22
      </div>
    </nav>
  );
}

export { STEPS };
