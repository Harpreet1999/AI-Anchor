import { Code1, InfoCircle, DocumentText, CodeCircle, Chart2, SearchNormal1, Layer, Magicpen, LockCircle } from "iconsax-react";

const STEPS = [
  { n: 1, no: "STEP 01", name: "Pick a Stack", Icon: Code1 },
  { n: 2, no: "STEP 02", name: "How It Works", Icon: InfoCircle },
  { n: 3, no: "STEP 03", name: "Pick a Dataset", Icon: DocumentText },
  { n: 4, no: "STEP 04", name: "See It Chunked", Icon: CodeCircle },
  { n: 5, no: "STEP 05", name: "See the Embeddings", Icon: Chart2 },
  { n: 6, no: "STEP 06", name: "Plan Retrieval", Icon: SearchNormal1 },
  { n: 7, no: "STEP 07", name: "Augment Context", Icon: Layer },
  { n: 8, no: "STEP 08", name: "Generate Answer", Icon: Magicpen },
];

// `maxStep` is optional — omitting it (or passing Infinity) leaves every
// step clickable, same as before this existed.
export default function Sidebar({ active, onNavigate, maxStep = Infinity, liveCount, totalStages }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-head">
        <div className="proj">AI ANCHOR</div>
        <div className="sub">DRAWING SET — DATA LAYER</div>
      </div>
      {STEPS.map((s) => {
        const locked = s.n > maxStep;
        // Deliberately NOT aria-disabled — it still does something on
        // click (explains why it's locked via the toast in App.jsx), so
        // telling assistive tech it's disabled would be a lie. The lock
        // icon + dimmed style carry the "not yet reachable" meaning
        // instead, backed by a real label for anyone not seeing the icon.
        return (
          <button
            key={s.n}
            className={`sheet-link${active === s.n ? " active" : ""}${locked ? " locked" : ""}`}
            onClick={() => onNavigate(s.n)}
            aria-current={active === s.n ? "step" : undefined}
            title={locked ? "Not reachable yet — click for why" : undefined}
          >
            <span className="sheet-link-icon">
              {locked ? <LockCircle size={17} variant="Outline" color="currentColor" /> : <s.Icon size={17} variant="Outline" color="currentColor" />}
            </span>
            <span className="sheet-link-text">
              <span className="no">{s.no}</span>
              <span className="name">{s.name}</span>
            </span>
          </button>
        );
      })}
      <div className="sidebar-status">
        STATUS<br /><b>{liveCount} of {totalStages} pipeline stages live</b><br /><br />
        REV. E · 2026-08-23
      </div>
    </nav>
  );
}

export { STEPS };
