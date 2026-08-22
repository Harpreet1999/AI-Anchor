import portfolioData from "../../data/processed/portfolio.json";
import carsData from "../../data/processed/cars-jdm-legends.json";
import sherlockData from "../../data/processed/sherlock-holmes.json";
import { ProseGlyph, BarGlyph, BookGlyph } from "./diagrams.jsx";
import StepNav from "./StepNav.jsx";

export const DATASETS = [
  {
    id: "career",
    tag: "01 / 03 — PROSE, PERSONAL",
    name: portfolioData.displayName,
    from: "resume.md + the live portfolio site's own content.",
    signifies: "the authentic anchor dataset — real writeups of what shipped, and why.",
    count: portfolioData.chunks.length,
    Glyph: ProseGlyph,
  },
  {
    id: "cars",
    tag: "02 / 03 — NUMERIC, VERIFIED",
    name: carsData.displayName,
    from: "web-verified specs for 8 icons — Supra, GT-R, RX-7, both Fairlady Z generations, NSX, Evo VI, WRX STI.",
    signifies: "real numeric fields on every chunk, built for the chart tool coming later.",
    count: carsData.chunks.length,
    Glyph: BarGlyph,
  },
  {
    id: "sherlock",
    tag: "03 / 03 — NARRATIVE, PUBLIC DOMAIN",
    name: sherlockData.displayName,
    from: "Project Gutenberg — Arthur Conan Doyle, 1892. Unambiguous public domain.",
    signifies: "proof the pipeline generalizes — pure story retrieval, nothing like career facts or car specs.",
    count: sherlockData.chunks.length,
    Glyph: BookGlyph,
  },
];

export default function Step2Select({ selectedId, track, onSelectTrack, onSelectDataset, onBack }) {
  return (
    <section className="sheet">
      <div className="sheet-num">STEP 02</div>
      <h2>Fixed on purpose — no uploads, ever</h2>
      <p className="dek">
        Pick one of the three datasets below. Nothing else can be queried — that keeps cost at
        zero and means every dataset here was chosen and verified, not scraped on the fly.
      </p>

      <div className="track-toggle" role="tablist" aria-label="Processing track">
        <button
          className={`track-btn${track === "node" ? " active" : ""}`}
          onClick={() => onSelectTrack("node")}
        >
          Node.js <span className="track-status live">Live</span>
        </button>
        <button className="track-btn disabled" disabled title="Queued — not built yet">
          Python + LangChain <span className="track-status">Coming soon</span>
        </button>
      </div>

      <div className="dataset-grid">
        {DATASETS.map((d) => (
          <button
            key={d.id}
            className={`dcard dcard-select${selectedId === d.id ? " selected" : ""}`}
            onClick={() => onSelectDataset(d.id)}
          >
            <d.Glyph />
            <div className="tag">{d.tag}</div>
            <h3>{d.name}</h3>
            <p><b>From:</b> {d.from}</p>
            <p><b>Signifies:</b> {d.signifies}</p>
            <div className="stat"><span>CHUNKS</span><b>{d.count}</b></div>
            <div className="dcard-cta">{selectedId === d.id ? "✓ Selected — see Step 03" : "Select this dataset →"}</div>
          </button>
        ))}
      </div>

      <StepNav onBack={onBack} backLabel="How it works" />
    </section>
  );
}
