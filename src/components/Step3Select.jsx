import portfolioNode from "../../data/processed/portfolio.json";
import carsNode from "../../data/processed/cars-jdm-legends.json";
import sherlockNode from "../../data/processed/sherlock-holmes.json";
import portfolioPy from "../../data-py/processed/portfolio.json";
import carsPy from "../../data-py/processed/cars-jdm-legends.json";
import sherlockPy from "../../data-py/processed/sherlock-holmes.json";
import { ProseGlyph, BarGlyph, BookGlyph } from "./diagrams.jsx";
import StepNav from "./StepNav.jsx";

const BY_TRACK = {
  node: { career: portfolioNode, cars: carsNode, sherlock: sherlockNode },
  python: { career: portfolioPy, cars: carsPy, sherlock: sherlockPy },
};

// Static per-dataset copy (the "what it is" doesn't change between tracks —
// only the chunk count does, since the two tracks split the same files
// differently).
const META = [
  {
    id: "career",
    tag: "01 / 03 — PROSE, PERSONAL",
    from: "resume.md + the live portfolio site's own content.",
    signifies: "the authentic anchor dataset — real writeups of what shipped, and why.",
    Glyph: ProseGlyph,
  },
  {
    id: "cars",
    tag: "02 / 03 — NUMERIC, VERIFIED",
    from: "web-verified specs for 8 icons — Supra, GT-R, RX-7, both Fairlady Z generations, NSX, Evo VI, WRX STI.",
    signifies: "real numeric fields on every chunk, built for the chart tool coming later.",
    Glyph: BarGlyph,
  },
  {
    id: "sherlock",
    tag: "03 / 03 — NARRATIVE, PUBLIC DOMAIN",
    from: "Project Gutenberg — Arthur Conan Doyle, 1892. Unambiguous public domain.",
    signifies: "proof the pipeline generalizes — pure story retrieval, nothing like career facts or car specs.",
    Glyph: BookGlyph,
  },
];

export default function Step3Select({ track, selectedId, onSelectDataset, onBack }) {
  return (
    <section className="sheet">
      <div className="sheet-num">STEP 03</div>
      <h2>Fixed on purpose — no uploads, ever</h2>
      <p className="dek">
        Pick one of the three datasets below. Nothing else can be queried — that keeps cost at
        zero and means every dataset here was chosen and verified, not scraped on the fly. Chunk
        counts below match whichever track you picked in Step 01 — {track === "node" ? "Node's hand-rolled splitter" : "Python's LangChain splitter"} chunks these differently.
      </p>

      <div className="dataset-grid">
        {META.map((m) => {
          const d = BY_TRACK[track][m.id];
          return (
            <button
              key={m.id}
              className={`dcard dcard-select${selectedId === m.id ? " selected" : ""}`}
              onClick={() => onSelectDataset(m.id)}
            >
              <m.Glyph />
              <div className="tag">{m.tag}</div>
              <h3>{d.displayName}</h3>
              <p><b>From:</b> {m.from}</p>
              <p><b>Signifies:</b> {m.signifies}</p>
              <div className="stat"><span>CHUNKS ({track === "node" ? "Node.js" : "Python"})</span><b>{d.chunks.length}</b></div>
              <div className="dcard-cta">{selectedId === m.id ? "✓ Selected — see Step 04" : "Select this dataset →"}</div>
            </button>
          );
        })}
      </div>

      <StepNav onBack={onBack} backLabel="How it works" />
    </section>
  );
}
