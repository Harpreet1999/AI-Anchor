import { useEffect, useMemo, useState } from "react";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import CopyButton from "./CopyButton.jsx";
import portfolioNode from "../../data/processed/portfolio.json";
import carsNode from "../../data/processed/cars-jdm-legends.json";
import sherlockNode from "../../data/processed/sherlock-holmes.json";
import portfolioPy from "../../data-py/processed/portfolio.json";
import carsPy from "../../data-py/processed/cars-jdm-legends.json";
import sherlockPy from "../../data-py/processed/sherlock-holmes.json";
import StepNav from "./StepNav.jsx";

const BY_TRACK = {
  node: { career: portfolioNode, cars: carsNode, sherlock: sherlockNode },
  python: { career: portfolioPy, cars: carsPy, sherlock: sherlockPy },
};

// Vectors from both tracks are already normalized (unit length) at
// embed-time, so a plain dot product IS the cosine similarity — no need
// to divide by magnitudes.
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function EmbeddingStrip({ vector }) {
  const max = Math.max(...vector.map(Math.abs)) || 1;
  return (
    <svg viewBox={`0 0 ${vector.length} 40`} preserveAspectRatio="none" className="embed-strip">
      <line x1="0" y1="20" x2={vector.length} y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      {vector.map((v, i) => {
        const h = (Math.abs(v) / max) * 19;
        const y = v >= 0 ? 20 - h : 20;
        return (
          <rect
            key={i} x={i} y={y} width="1" height={Math.max(h, 0.4)}
            fill="currentColor" className={v >= 0 ? "accent-mark" : undefined}
            opacity={0.35 + 0.65 * (Math.abs(v) / max)}
          />
        );
      })}
    </svg>
  );
}

export default function Step5Embeddings({ track, selectedId, onBack, onNext }) {
  const dataset = selectedId ? BY_TRACK[track][selectedId] : null;
  const [index, setIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    setIndex(0);
    setShowFull(false);
  }, [selectedId, track]);

  const total = dataset ? dataset.chunks.length : 0;
  const chunk = dataset ? dataset.chunks[index] : null;
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  useEffect(() => {
    if (!dataset) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dataset, total]);

  const nearest = useMemo(() => {
    if (!dataset || !chunk) return [];
    return dataset.chunks
      .map((c, i) => ({ c, i, score: i === index ? -Infinity : dot(chunk.embedding, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [dataset, chunk, index]);

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 05</div>
      <h2>Watch a chunk become a vector</h2>
      <p className="dek">
        This is the last stop for now — both tracks stop at Embed, on purpose, not further. Every
        bar below is a real number from the real {track === "node" ? "Xenova (JS)" : "Sentence-Transformers (Python)"} run
        against this exact chunk. "Nearest chunks" is computed live, right here, by comparing this
        vector against every other one in the dataset — a small, honest preview of what retrieval
        will do once it's built. Step 06 maps that next stage without pretending it is wired yet.
      </p>

      {!selectedId && (
        <div className="preview-placeholder">← Pick a dataset in Step 03 to see its embeddings here.</div>
      )}

      {selectedId && (
        <>
          <div className="embed-track-chip">
            <span className={`status${track === "node" ? " live" : ""}`}>{track === "node" ? "Node.js" : "Python"}</span>
            {dataset.embeddingModel} · {chunk.embedding.length} dimensions
          </div>

          <div className="embed-card">
            <div className="embed-card-head">
              <span>{chunk.title}</span>
              <span className="chunk-nav-pos">{index + 1} / {total}</span>
            </div>
            <p className="embed-chunk-text">{chunk.text.length > 260 ? chunk.text.slice(0, 260).trim() + "…" : chunk.text}</p>

            <EmbeddingStrip vector={chunk.embedding} />
            <div className="embed-numbers-row">
              <div className="embed-numbers">
                {showFull
                  ? `[${chunk.embedding.map((n) => n.toFixed(4)).join(", ")}]`
                  : `[${chunk.embedding.slice(0, 8).map((n) => n.toFixed(4)).join(", ")}, …]`}
              </div>
              <div className="embed-numbers-actions">
                <button type="button" className="copy-btn" onClick={() => setShowFull((v) => !v)}>
                  {showFull ? `Show first 8` : `Show all ${chunk.embedding.length}`}
                </button>
                <CopyButton getText={() => JSON.stringify(chunk.embedding)} label="Copy vector" />
              </div>
            </div>

            <div className="chunk-nav">
              <button className="chunk-nav-btn" onClick={goPrev} disabled={index === 0}>
                <ArrowLeft2 size={15} variant="Outline" color="currentColor" /> Back
              </button>
              <span className="chunk-nav-pos">{index + 1} / {total}</span>
              <button className="chunk-nav-btn" onClick={goNext} disabled={index === total - 1}>
                Next <ArrowRight2 size={15} variant="Outline" color="currentColor" />
              </button>
            </div>
          </div>

          <div className="nearest-panel">
            <div className="nearest-head">Nearest chunks by cosine similarity</div>
            <div className="nearest-list">
              {nearest.map(({ c, i, score }) => (
                <button key={c.id} className="nearest-item" onClick={() => setIndex(i)}>
                  <span className="nearest-score">{(score * 100).toFixed(1)}%</span>
                  <span className="nearest-title">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <StepNav onBack={onBack} backLabel="See it chunked" onNext={onNext} nextLabel="Plan retrieval" />
    </section>
  );
}
