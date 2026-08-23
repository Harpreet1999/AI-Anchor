import { useEffect, useState } from "react";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import portfolioNode from "../../data/processed/portfolio.json";
import carsNode from "../../data/processed/cars-jdm-legends.json";
import sherlockNode from "../../data/processed/sherlock-holmes.json";
import portfolioPy from "../../data-py/processed/portfolio.json";
import carsPy from "../../data-py/processed/cars-jdm-legends.json";
import sherlockPy from "../../data-py/processed/sherlock-holmes.json";
import resumeRaw from "../../data/sources/resume.md?raw";
import carsRaw from "../../data/sources/cars-jdm-legends.md?raw";
import sherlockRaw from "../../data/sources/sherlock-holmes.txt?raw";
import { excerptChars } from "../lib/mdExcerpt.js";
import JsonBlock from "./JsonBlock.jsx";
import StepNav from "./StepNav.jsx";

const EXCERPT_LEN = 1800;

// The raw source excerpt is identical either way — both tracks read the
// same files (see data-py/README.md) — only the chunked/embedded output
// differs per track.
const RAW = {
  career: { fileName: "resume.md", raw: excerptChars(resumeRaw, "## Summary", EXCERPT_LEN) },
  cars: { fileName: "cars-jdm-legends.md", raw: excerptChars(carsRaw, "## Toyota Supra MK4 (A80) Turbo", EXCERPT_LEN) },
  sherlock: { fileName: "sherlock-holmes.txt", raw: excerptChars(sherlockRaw, "I. A SCANDAL IN BOHEMIA", EXCERPT_LEN) },
};

const BY_TRACK = {
  node: { career: portfolioNode, cars: carsNode, sherlock: sherlockNode },
  python: { career: portfolioPy, cars: carsPy, sherlock: sherlockPy },
};

export default function Step4Preview({ track, selectedId, processing, onBack, onNext }) {
  const raw = selectedId ? RAW[selectedId] : null;
  const dataset = selectedId ? BY_TRACK[track][selectedId] : null;
  const [index, setIndex] = useState(0);

  // Jump back to chunk 1 whenever a new dataset OR track is chosen — a
  // different track can have far fewer chunks, so the old index might not
  // even exist anymore.
  useEffect(() => {
    setIndex(0);
  }, [selectedId, track]);

  const total = dataset ? dataset.chunks.length : 0;
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  // Arrow-key navigation through every real chunk, only while this step
  // actually has something to navigate.
  useEffect(() => {
    if (!dataset || processing) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dataset, processing, total]);

  const chunk = dataset ? dataset.chunks[index] : null;
  const jsonFile = dataset ? `data${track === "python" ? "-py" : ""}/processed/${dataset.datasetId}.json` : null;

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 04</div>
      <h2>What chunking actually does to a file</h2>
      <p className="dek">
        Same underlying fact, two shapes. Left is a representative excerpt of the real source
        file — identical either way, both tracks read the same file. Right is every single real
        chunk from the {track === "node" ? "Node.js" : "Python"} track's actual output — use the arrows or
        the ← / → keys to page through all {total || "…"} of them, not a cherry-picked sample.
      </p>

      {!selectedId && (
        <div className="preview-placeholder">← Pick a dataset in Step 03 to see it processed here.</div>
      )}

      {selectedId && processing && (
        <div className="preview-processing" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <div>Chunking <b>{raw.fileName}</b>…</div>
        </div>
      )}

      {selectedId && !processing && (
        <div className="wide-panes">
          <div className="pane">
            <div className="pane-head"><span>SOURCE</span><span>{raw.fileName}</span></div>
            <div className="pane-body"><pre>{raw.raw}</pre></div>
          </div>
          <div className="divider" />
          <div className="pane">
            <div className="pane-head"><span>INDEXED</span><span>{jsonFile} · chunk {index + 1} of {total}</span></div>
            <div className="pane-body">
              <pre className="chunk-block"><JsonBlock value={chunk} /></pre>
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
        </div>
      )}

      {selectedId && !processing && (
        <div className="viewer-note">
          <b>Why so many chunks?</b> Every dataset is forced into the same small, individually
          retrievable pieces — small enough that a question about one fact retrieves that fact,
          not the whole file.
        </div>
      )}

      <StepNav
        onBack={onBack} backLabel="Choose a different dataset"
        onNext={selectedId ? onNext : undefined} nextLabel="See the embeddings"
      />
    </section>
  );
}
