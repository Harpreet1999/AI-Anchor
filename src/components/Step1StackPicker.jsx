import { Fragment } from "react";
import { Code1, DocumentCode } from "iconsax-react";
import { StackFlowDiagram } from "./diagrams.jsx";
import StepNav from "./StepNav.jsx";

// The forked rows differ by track; the shared rows don't fork at all —
// orchestration and the live LLM call stay in JS either way, so the
// deployed app never needs a second runtime. See the chat history around
// 2026-08-22 for the full reasoning.
const ROWS = [
  { stage: "Data Prep", shared: false, node: ["Node.js", "Built — wired to the files in this repo"], python: ["Python", "Done — the same 3 datasets, chunked and embedded, run once locally"] },
  { stage: "Chunking", shared: false, node: ["Hand-rolled splitter", "Structure-aware — one chunk per real unit (a cert, a car, a story paragraph)"], python: ["LangChain Text Splitters", "RecursiveCharacterTextSplitter — the standard generic approach"] },
  { stage: "Embeddings", shared: false, node: ["Xenova (transformers.js)", "all-MiniLM-L6-v2, runs once locally — $0, one language"], python: ["Sentence-Transformers", "Same model, the industry-standard Python runtime for it"] },
  { stage: "Vector Search", shared: false, node: ["Cosine similarity / Upstash Vector", "No server needed at this scale — fits a stateless deploy"], python: ["ChromaDB", "A real vector DB, run locally for comparison"] },
  { stage: "Orchestration", shared: true, both: ["LangChain.js + LangGraph.js", "Kept in JS either way — no second runtime on the deployed app"] },
  { stage: "Live LLM Call", shared: true, both: ["Groq — GPT-OSS 120B", "Free tier, fastest available inference — the only part that isn't fully $0 by construction, kept on a free tier by design"] },
];

export default function Step1StackPicker({ track, onSelectTrack, onNext }) {
  return (
    <section className="sheet">
      <div className="sheet-num">STEP 01</div>
      <h2>Pick a stack</h2>
      <p className="dek">
        Two ways to build the same pipeline, side by side. Both tracks are real through embedding
        now, and both are wired into Steps 03–05 — pick one here and the dataset browser, chunk
        counts, and embeddings you see later all match it. Python is a parallel experiment for
        comparison, not a replacement. Whichever you pick recolors the rest of this site until you
        switch back.
      </p>

      <div className="track-toggle" role="tablist" aria-label="Processing track">
        <button
          className={`track-btn${track === "node" ? " active" : ""}`}
          onClick={() => onSelectTrack("node")}
        >
          <Code1 size={16} variant="Outline" color="currentColor" /> Node.js <span className="track-status live">Live</span>
        </button>
        <button
          className={`track-btn${track === "python" ? " active" : ""}`}
          onClick={() => onSelectTrack("python")}
        >
          <DocumentCode size={16} variant="Outline" color="currentColor" /> Python + LangChain <span className="track-status">Chunked + Embedded</span>
        </button>
      </div>

      <div className="fig-frame" style={{ marginTop: 8 }}>
        <div className="fig-frame-inner">
          <StackFlowDiagram track={track} />
          <div className="fig-caption">
            <span className={`status${track === "node" ? " live" : ""}`}>{track === "node" ? "Live" : "Chunked + Embedded"}</span> This is the currently-selected track
          </div>
        </div>
      </div>

      <div className="stack-table" style={{ marginTop: 32 }}>
        <div className="stack-head">Stage</div>
        <div className={`stack-head${track === "node" ? " active" : ""}`}>Node.js</div>
        <div className={`stack-head${track === "python" ? " active" : ""}`}>Python + LangChain</div>

        {ROWS.map((r) => (
          <Fragment key={r.stage}>
            <div className="stack-label">{r.stage}</div>
            {r.shared ? (
              <div className="stack-cell shared" style={{ gridColumn: "span 2" }}>
                <b>{r.both[0]}</b>
                <p>{r.both[1]}</p>
              </div>
            ) : (
              <>
                <div className={`stack-cell${track === "node" ? " active" : ""}`}>
                  <b>{r.node[0]}</b>
                  <p>{r.node[1]}</p>
                </div>
                <div className={`stack-cell${track === "python" ? " active" : ""}`}>
                  <b>{r.python[0]}</b>
                  <p>{r.python[1]}</p>
                </div>
              </>
            )}
          </Fragment>
        ))}
      </div>

      <StepNav onNext={onNext} nextLabel="How it works" />
    </section>
  );
}
