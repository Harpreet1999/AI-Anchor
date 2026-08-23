import { Code1, InfoCircle, DocumentText, CodeCircle, Chart2 } from "iconsax-react";

const STEPS = [
  { n: 1, no: "STEP 01", name: "Pick a Stack", Icon: Code1 },
  { n: 2, no: "STEP 02", name: "How It Works", Icon: InfoCircle },
  { n: 3, no: "STEP 03", name: "Pick a Dataset", Icon: DocumentText },
  { n: 4, no: "STEP 04", name: "See It Chunked", Icon: CodeCircle },
  { n: 5, no: "STEP 05", name: "See the Embeddings", Icon: Chart2 },
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
          <span className="sheet-link-icon"><s.Icon size={17} variant="Outline" color="currentColor" /></span>
          <span className="sheet-link-text">
            <span className="no">{s.no}</span>
            <span className="name">{s.name}</span>
          </span>
        </button>
      ))}
      <div className="sidebar-status">
        STATUS<br /><b>{liveCount} of {totalStages} pipeline stages live</b><br /><br />
        REV. E · 2026-08-23
      </div>
    </nav>
  );
}

export { STEPS };
