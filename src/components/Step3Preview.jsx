import portfolioData from "../../data/processed/portfolio.json";
import carsData from "../../data/processed/cars-jdm-legends.json";
import sherlockData from "../../data/processed/sherlock-holmes.json";
import resumeRaw from "../../data/sources/resume.md?raw";
import carsRaw from "../../data/sources/cars-jdm-legends.md?raw";
import sherlockRaw from "../../data/sources/sherlock-holmes.txt?raw";
import { excerptChars } from "../lib/mdExcerpt.js";
import JsonBlock from "./JsonBlock.jsx";
import StepNav from "./StepNav.jsx";

const EXCERPT_LEN = 1800;
const PREVIEW_COUNT = 6;
const TEXT_TRUNCATE = 140;

// Trim the long `text` field for display only — keeps the multi-chunk list
// scannable. The real, untruncated field is what's actually in the file.
function forDisplay(chunk) {
  const text = chunk.text.length > TEXT_TRUNCATE ? chunk.text.slice(0, TEXT_TRUNCATE).trim() + "…" : chunk.text;
  return { ...chunk, text };
}

const SOURCES = {
  career: {
    fileName: "resume.md",
    raw: excerptChars(resumeRaw, "## Summary", EXCERPT_LEN),
    jsonFile: "portfolio.json",
    chunks: portfolioData.chunks.slice(0, PREVIEW_COUNT).map(forDisplay),
    total: portfolioData.chunks.length,
  },
  cars: {
    fileName: "cars-jdm-legends.md",
    raw: excerptChars(carsRaw, "## Toyota Supra MK4 (A80) Turbo", EXCERPT_LEN),
    jsonFile: "cars-jdm-legends.json",
    chunks: carsData.chunks.map(forDisplay), // only 8 total — show all of them
    total: carsData.chunks.length,
  },
  sherlock: {
    fileName: "sherlock-holmes.txt",
    raw: excerptChars(sherlockRaw, "I. A SCANDAL IN BOHEMIA", EXCERPT_LEN),
    jsonFile: "sherlock-holmes.json",
    chunks: sherlockData.chunks.slice(0, PREVIEW_COUNT).map(forDisplay),
    total: sherlockData.chunks.length,
  },
};

export default function Step3Preview({ selectedId, processing, onBack }) {
  const data = selectedId ? SOURCES[selectedId] : null;
  const remaining = data ? data.total - data.chunks.length : 0;

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 03</div>
      <h2>What chunking actually does to a file</h2>
      <p className="dek">
        Same underlying fact, two shapes. Left is what a person reads — pulled live from the real
        source file. Right is what the retrieval math will actually search — real chunks from the
        real processed JSON, not a single cherry-picked example.
      </p>

      {!selectedId && (
        <div className="preview-placeholder">← Pick a dataset in Step 02 to see it processed here.</div>
      )}

      {selectedId && processing && (
        <div className="preview-processing" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <div>Chunking <b>{data.fileName}</b>…</div>
        </div>
      )}

      {selectedId && !processing && (
        <div className="wide-panes">
          <div className="pane">
            <div className="pane-head"><span>SOURCE</span><span>{data.fileName}</span></div>
            <div className="pane-body"><pre>{data.raw}</pre></div>
          </div>
          <div className="divider" />
          <div className="pane">
            <div className="pane-head"><span>INDEXED</span><span>{data.jsonFile} · {data.chunks.length} of {data.total} shown</span></div>
            <div className="pane-body chunk-list">
              {data.chunks.map((c) => (
                <pre key={c.id} className="chunk-block"><JsonBlock value={c} /></pre>
              ))}
              {remaining > 0 && (
                <div className="chunk-remaining">+ {remaining} more chunks in {data.jsonFile}, not shown here</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedId && !processing && (
        <div className="viewer-note">
          <b>Why so many chunks?</b> Every dataset is forced into the same small, individually
          retrievable pieces — small enough that a question about one fact retrieves that fact,
          not the whole file.
        </div>
      )}

      <StepNav onBack={onBack} backLabel="Choose a different dataset" />
    </section>
  );
}
