import { useEffect, useState } from "react";
import { Code1, DocumentCode } from "iconsax-react";
import { BarGlyph, BookGlyph, CookGlyph } from "./diagrams.jsx";
import { useDataset } from "../lib/useDataset.js";
import StepNav from "./StepNav.jsx";

// The portfolio dataset is deliberately not one of the default three cards
// below — it's real personal data, and defaulting to showing it off felt
// like the wrong call for a portfolio piece. It's still fully built (same
// chunking, same embeddings, same live retrieval as everything else) —
// just gated behind a quiet, optional path further down the page.
const PORTFOLIO_UNLOCK_KEY = "ai-anchor-portfolio-unlocked";

// Static per-dataset copy (the "what it is" doesn't change between tracks —
// only the chunk count does, since the two tracks split the same files
// differently).
const META = [
  {
    id: "cars",
    tag: "01 / 03 — NUMERIC, VERIFIED",
    from: "web-verified specs for 63 real cars across 8 categories — JDM Legends, Muscle, Track & Hypercar, Luxury, Lowrider and more.",
    signifies: "real numeric fields on every chunk, built for the chart tool coming later.",
    Glyph: BarGlyph,
  },
  {
    id: "sherlock",
    tag: "02 / 03 — NARRATIVE, PUBLIC DOMAIN",
    from: "Project Gutenberg — Arthur Conan Doyle, 1892. Unambiguous public domain.",
    signifies: "proof the pipeline generalizes to pure story retrieval, nothing like flat specs.",
    Glyph: BookGlyph,
  },
  {
    id: "cookbook",
    tag: "03 / 03 — INSTRUCTIONAL, PUBLIC DOMAIN",
    from: "Project Gutenberg — Fannie Merritt Farmer's Boston Cooking-School Cook Book, 1896.",
    signifies: "a third shape entirely — recipes and technique, neither flat specs nor a story.",
    Glyph: CookGlyph,
  },
];

// Each card loads its own dataset independently (in parallel with the
// others) instead of the page eagerly bundling all of them — the cookbook
// alone is >10MB of embedded vectors per track.
function DatasetCard({ m, track, selected, onSelectDataset, isPreviewing, onTogglePreview }) {
  const d = useDataset(track, m.id);

  return (
    <div className={`dcard dcard-select${selected ? " selected" : ""}`}>
      <m.Glyph />
      <div className="tag">{m.tag}</div>
      {!d ? (
        <div className="dcard-loading">Loading…</div>
      ) : (
        <>
          <h3>{d.displayName}</h3>
          <p><b>From:</b> {m.from}</p>
          <p><b>Signifies:</b> {m.signifies}</p>

          <button type="button" className="dcard-preview-toggle" onClick={onTogglePreview} aria-expanded={isPreviewing}>
            {isPreviewing ? "▾ Hide a real chunk" : "▸ Peek at a real chunk"}
          </button>
          {isPreviewing && (() => {
            const previewChunk = d.chunks[Math.floor(d.chunks.length / 3)];
            return (
              <div className="dcard-preview-body">
                <span className="dcard-preview-title">{previewChunk.title}</span>
                <p>{previewChunk.text.length > 220 ? previewChunk.text.slice(0, 220).trim() + "…" : previewChunk.text}</p>
              </div>
            );
          })()}

          <button type="button" className="dcard-cta-btn" onClick={() => onSelectDataset(m.id)}>
            {selected ? "✓ Selected — see Step 04" : "Select this dataset →"}
          </button>
        </>
      )}
    </div>
  );
}

export default function Step3Select({ track, selectedId, onSelectDataset, onSelectTrack, onBack }) {
  const [previewId, setPreviewId] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [portfolioUnlocked, setPortfolioUnlocked] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PORTFOLIO_UNLOCK_KEY) === "1") setPortfolioUnlocked(true);
    } catch {
      // localStorage unavailable (private browsing, blocked) — the unlock
      // just won't persist across a reload, which is fine, not fatal.
    }
  }, []);

  const unlockPortfolio = () => {
    setPortfolioUnlocked(true);
    try { localStorage.setItem(PORTFOLIO_UNLOCK_KEY, "1"); } catch { /* non-fatal */ }
  };

  // No track yet — the dataset cards below can't render at all without one
  // (each one loads real chunk/embedding JSON keyed by track), so rather
  // than let that fail, show the one thing actually needed to continue:
  // a track picker, right here, big enough to not be missed.
  if (!track) {
    return (
      <section className="sheet">
        <div className="sheet-num">STEP 03</div>
        <h2>Pick a track to continue</h2>
        <p className="dek">
          Datasets are chunked and embedded differently per track, so there's nothing to show
          here until one's picked. Pick it here, or back in Step 01 — either way lands you back
          on this page with the real dataset cards.
        </p>
        <div className="track-pick-big">
          <button type="button" className="track-pick-big-btn node" onClick={() => onSelectTrack?.("node")}>
            <Code1 size={34} variant="Outline" color="currentColor" />
            <span className="track-pick-big-name">Node.js</span>
            <span className="track-pick-big-sub">Hand-rolled splitter · Xenova embeddings · cosine search, all client-side</span>
          </button>
          <button type="button" className="track-pick-big-btn python" onClick={() => onSelectTrack?.("python")}>
            <DocumentCode size={34} variant="Outline" color="currentColor" />
            <span className="track-pick-big-name">Python + LangChain</span>
            <span className="track-pick-big-sub">LangChain splitter · Sentence-Transformers · live ChromaDB retrieval</span>
          </button>
        </div>
        <StepNav onBack={onBack} backLabel="How it works" />
      </section>
    );
  }

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
        {META.map((m) => (
          <DatasetCard
            key={m.id}
            m={m}
            track={track}
            selected={selectedId === m.id}
            onSelectDataset={onSelectDataset}
            isPreviewing={previewId === m.id}
            onTogglePreview={() => setPreviewId(previewId === m.id ? null : m.id)}
          />
        ))}
      </div>

      <div className="about-builder">
        <button
          type="button"
          className="about-builder-toggle"
          onClick={() => setShowAbout((v) => !v)}
          aria-expanded={showAbout}
        >
          {showAbout ? "▾" : "▸"} About the person who built this
        </button>
        {showAbout && (
          <div className="about-builder-body">
            <p>
              If you want to know more about the person who developed and crafted this project — his
              work and portfolio — visit{" "}
              <a href="https://harpreetsingh.xyz" target="_blank" rel="noopener noreferrer" onClick={unlockPortfolio}>
                harpreetsingh.xyz
              </a>{" "}
              to see the portfolio in action. Once you've had a look, his portfolio unlocks here as a
              fourth dataset — chunked, embedded, and retrievable exactly like the three above.
            </p>
            <button
              type="button"
              className="about-builder-select"
              disabled={!portfolioUnlocked}
              onClick={() => onSelectDataset("career")}
              title={portfolioUnlocked ? undefined : "Visit harpreetsingh.xyz above first"}
            >
              {portfolioUnlocked
                ? (selectedId === "career" ? "✓ Selected — see Step 04" : "Select Harpreet's portfolio as a dataset →")
                : "🔒 Visit the site above to unlock this dataset"}
            </button>
          </div>
        )}
      </div>

      <StepNav onBack={onBack} backLabel="How it works" />
    </section>
  );
}
