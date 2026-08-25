import { useState } from "react";

function ResultRow({ result, index, isOpen, onToggle }) {
  return (
    <div className="evidence-item">
      <div
        className="evidence-row"
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <div className="evidence-placeholder">
          <span className="evidence-rank">{String(index + 1).padStart(2, '0')}</span>
          <span>{(result.score * 100).toFixed(1)}%</span>
          <span className="evidence-line" />
          <span className="evidence-title">{result.title} · {result.source}</span>
        </div>
        <button type="button" className="evidence-toggle" onClick={(event) => { event.stopPropagation(); onToggle(); }} aria-expanded={isOpen}>
          {isOpen ? "▾" : "▸"}
        </button>
      </div>
      {isOpen && (
        <div className="evidence-detail">
          <div className="evidence-detail-head">Chunk text</div>
          <p>{result.text}</p>
        </div>
      )}
    </div>
  );
}

export default function RetrievalResults({ results = [], loading = false }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  if (loading) {
    return (
      <div className="retrieval-panel evidence-panel">
        <div className="retrieval-panel-head"><span>RESULTS</span><span>SEARCHING…</span></div>
        <p className="retrieval-note">Looking up the closest chunks for your question.</p>
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="retrieval-panel evidence-panel">
        <div className="retrieval-panel-head"><span>RESULTS</span><span>NONE YET</span></div>
        <p className="retrieval-note">Ask a question to surface the nearest chunks.</p>
      </div>
    );
  }

  return (
    <div className="retrieval-panel evidence-panel">
      <div className="retrieval-panel-head"><span>RESULTS</span><span>TOP {results.length}</span></div>
      {results.map((result, index) => (
        (() => {
          const resultId = result.chunkId || `${result.title}-${index}`;
          return (
            <ResultRow
              key={resultId}
              result={result}
              index={index}
              isOpen={openIds.has(resultId)}
              onToggle={() => setOpenIds((current) => {
                const next = new Set(current);
                if (next.has(resultId)) next.delete(resultId);
                else next.add(resultId);
                return next;
              })}
            />
          );
        })()
      ))}
    </div>
  );
}
