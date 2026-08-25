import { Fragment } from "react";
import { Code1, DocumentCode } from "iconsax-react";
import { StackFlowDiagram } from "./diagrams.jsx";
import LiveCheck from "./LiveCheck.jsx";
import StepNav from "./StepNav.jsx";

// The forked rows differ by track and belong in the Node-vs-Python
// comparison grid below. Orchestration and the live LLM call don't fork
// at all — they stay in JS either way, so the deployed app never needs a
// second runtime — which is exactly why they're pulled out into their own
// small "shared runtime" table instead of being squeezed into the
// per-track grid as odd full-width spanning rows.
const ROWS = [
  { stage: "Data Prep", node: ["Node.js", "Built — wired to the files in this repo"], python: ["Python", "Done — the same 3 datasets, chunked and embedded, run once locally"] },
  { stage: "Chunking", node: ["Hand-rolled splitter", "Structure-aware — one chunk per real unit (a cert, a car, a story paragraph)"], python: ["LangChain Text Splitters", "RecursiveCharacterTextSplitter — the standard generic approach"] },
  { stage: "Embeddings", node: ["Xenova (transformers.js)", "all-MiniLM-L6-v2, runs once locally — $0, one language"], python: ["Sentence-Transformers", "Same model, the industry-standard Python runtime for it"] },
  { stage: "Vector Search", node: ["Cosine similarity / Upstash Vector", "No server needed at this scale — fits a stateless deploy"], python: ["ChromaDB", "A real vector DB, live on a small FastAPI service — free-tier hosted, so it can sleep and wake"], pythonCheck: { label: "Check now", serviceId: "py" } },
];

const SHARED_COLS = [
  { stage: "Orchestration", name: "LangChain.js + LangGraph.js", detail: "Kept in JS either way — no second runtime on the deployed app" },
  { stage: "Live LLM Call", name: "Groq — GPT-OSS 120B", detail: "Free tier, fastest available inference — the only part that isn't fully $0 by construction, kept on a free tier by design", check: { label: "Check now", serviceId: "groq" } },
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

      <div className="track-pick-big" role="tablist" aria-label="Processing track">
        <button
          type="button"
          className={`track-pick-big-btn node${track === "node" ? " active" : ""}`}
          role="tab"
          aria-selected={track === "node"}
          onClick={() => onSelectTrack("node")}
        >
          <Code1 size={34} variant="Outline" color="currentColor" />
          <span className="track-pick-big-name">Node.js <span className="track-status live">Live</span></span>
          <span className="track-pick-big-sub">Hand-rolled splitter · Xenova embeddings · cosine search, all client-side</span>
        </button>
        <button
          type="button"
          className={`track-pick-big-btn python${track === "python" ? " active" : ""}`}
          role="tab"
          aria-selected={track === "python"}
          onClick={() => onSelectTrack("python")}
        >
          <DocumentCode size={34} variant="Outline" color="currentColor" />
          <span className="track-pick-big-name">Python + LangChain <span className="track-status live">Live</span></span>
          <span className="track-pick-big-sub">LangChain splitter · Sentence-Transformers · live ChromaDB retrieval</span>
        </button>
      </div>

      <div className="fig-frame" style={{ marginTop: 8 }}>
        <div className="fig-frame-inner">
          <StackFlowDiagram track={track} />
          <div className="fig-caption">
            {track ? (
              <><span className="status live">Live</span> This is the currently-selected track</>
            ) : (
              <span style={{ color: "var(--text-dim)" }}>Pick a track above to highlight its path through the pipeline</span>
            )}
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
            <div className={`stack-cell${track === "node" ? " active" : ""}`}>
              <b>{r.node[0]}</b>
              <p>{r.node[1]}</p>
              {r.nodeCheck && <LiveCheck label={r.nodeCheck.label} serviceId={r.nodeCheck.serviceId} />}
            </div>
            <div className={`stack-cell${track === "python" ? " active" : ""}`}>
              <b>{r.python[0]}</b>
              <p>{r.python[1]}</p>
              {r.pythonCheck && <LiveCheck label={r.pythonCheck.label} serviceId={r.pythonCheck.serviceId} />}
            </div>
          </Fragment>
        ))}
      </div>

      <div className="shared-runtime" style={{ marginTop: 20 }}>
        <div className="shared-runtime-head">Shared runtime — identical either way, no fork</div>
        <div className="shared-runtime-grid">
          {SHARED_COLS.map((c) => (
            <div key={c.stage} className="shared-runtime-col">
              <div className="shared-runtime-stage">{c.stage}</div>
              <b>{c.name}</b>
              <p>{c.detail}</p>
              {c.check && <LiveCheck label={c.check.label} serviceId={c.check.serviceId} />}
            </div>
          ))}
        </div>
      </div>

      <StepNav onNext={onNext} nextLabel="How it works" />
    </section>
  );
}
