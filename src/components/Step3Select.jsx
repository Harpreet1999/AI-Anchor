import { useEffect, useRef, useState } from "react";
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

// Loaded on demand (dynamic import), only when someone actually opens a
// dataset's preview — not bundled eagerly into this step, since the raw
// text for these four files (especially the cookbook) is genuinely large.
// The career dataset is chunked from two files, not one (see
// scripts/build-datasets.mjs), so its preview shows both — showing only
// half of what actually gets embedded would be its own small overclaim.
async function loadRawFile(id) {
  if (id === "career") {
    const [resume, portfolio] = await Promise.all([
      import("../../data/sources/resume.md?raw"),
      import("../../data/sources/portfolio.md?raw"),
    ]);
    return `# resume.md\n\n${resume.default}\n\n\n# portfolio.md\n\n${portfolio.default}`;
  }
  const loaders = {
    cars: () => import("../../data/sources/cars-jdm-legends.md?raw"),
    sherlock: () => import("../../data/sources/sherlock-holmes.txt?raw"),
    cookbook: () => import("../../data/sources/boston-cooking-school-cookbook.txt?raw"),
  };
  const load = loaders[id];
  return load ? (await load()).default : "";
}

const FILE_LABELS = {
  cars: "cars-jdm-legends.md",
  sherlock: "sherlock-holmes.txt",
  cookbook: "boston-cooking-school-cookbook.txt",
  career: "resume.md + portfolio.md",
};

// A full-page stop before anything is actually selected — the real,
// complete, unmodified source file, not an excerpt — so "selecting a
// dataset" means having actually seen what's about to be chunked and
// embedded, not clicking a card and trusting it sight-unseen.
function DatasetPreviewModal({ title, fileLabel, loading, raw, error, onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="dataset-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Full source file preview — ${fileLabel}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dataset-preview-modal">
        <div className="dataset-preview-head">
          <div>
            <div className="dataset-preview-title">{title}</div>
            <div className="dataset-preview-file">{fileLabel}</div>
          </div>
          <button type="button" className="dataset-preview-close" onClick={onClose} aria-label="Close preview">✕</button>
        </div>
        <div className="dataset-preview-body">
          {loading ? (
            <div className="dcard-loading">Loading the real file…</div>
          ) : error ? (
            <div className="dcard-loading">{error}</div>
          ) : (
            <pre>{raw}</pre>
          )}
        </div>
        <div className="dataset-preview-foot">
          <p>
            The complete, unmodified source file — every word above is exactly what gets split
            into chunks and embedded next. Nothing here was trimmed for this preview.
          </p>
          <div className="dataset-preview-actions">
            <button type="button" className="step-nav-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="step-nav-btn next" onClick={onConfirm} disabled={loading || !!error}>
              Confirm selection →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Each card loads its own dataset independently (in parallel with the
// others) instead of the page eagerly bundling all of them — the cookbook
// alone is >10MB of embedded vectors per track.
function DatasetCard({ m, track, selected, onSelectDataset, onOpenPreview, isPreviewing, onTogglePreview }) {
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

          <button
            type="button"
            className="dcard-cta-btn"
            // Already selected: jump straight back to Step 04, same as
            // before. Not yet selected: this is the FIRST time selecting
            // it means anything, so it opens the full-file preview instead
            // of kicking off chunking/embedding immediately — confirming
            // there is the actual point where selection happens now.
            onClick={() => (selected ? onSelectDataset(m.id) : onOpenPreview(m.id, d.displayName))}
          >
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

  // The full-file confirm modal — separate from `previewId` above, which
  // is the small inline "peek at a real chunk" toggle on each card. This
  // one gates the actual selection: nothing gets chunked/embedded until
  // its Confirm button is clicked.
  const [pendingSelect, setPendingSelect] = useState(null); // { id, title } | null
  const [pendingRaw, setPendingRaw] = useState(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const loadTokenRef = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(PORTFOLIO_UNLOCK_KEY) === "1") setPortfolioUnlocked(true);
    } catch {
      // localStorage unavailable (private browsing, blocked) — the unlock
      // just won't persist across a reload, which is fine, not fatal.
    }
  }, []);

  const openPreview = (id, title) => {
    const token = ++loadTokenRef.current;
    setPendingSelect({ id, title });
    setPendingRaw(null);
    setPendingError(null);
    setPendingLoading(true);
    loadRawFile(id)
      .then((text) => {
        if (loadTokenRef.current !== token) return; // a newer preview opened meanwhile
        setPendingRaw(text);
        setPendingLoading(false);
      })
      .catch(() => {
        if (loadTokenRef.current !== token) return;
        setPendingError("Couldn't load this file for preview right now.");
        setPendingLoading(false);
      });
  };

  const closePreview = () => {
    loadTokenRef.current += 1; // invalidate any load still in flight
    setPendingSelect(null);
  };

  const confirmPreview = () => {
    if (!pendingSelect) return;
    onSelectDataset(pendingSelect.id);
    closePreview();
  };

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
            onOpenPreview={openPreview}
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
              onClick={() =>
                selectedId === "career"
                  ? onSelectDataset("career")
                  : openPreview("career", "Harpreet's Résumé & Portfolio")
              }
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

      {pendingSelect && (
        <DatasetPreviewModal
          title={pendingSelect.title}
          fileLabel={FILE_LABELS[pendingSelect.id]}
          loading={pendingLoading}
          raw={pendingRaw}
          error={pendingError}
          onConfirm={confirmPreview}
          onClose={closePreview}
        />
      )}
    </section>
  );
}
