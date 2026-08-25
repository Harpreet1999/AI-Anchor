import { useEffect, useMemo, useState } from "react";
import { pipeline } from "@huggingface/transformers";
import portfolioNode from "../../data/processed/portfolio.json";
import carsNode from "../../data/processed/cars-jdm-legends.json";
import sherlockNode from "../../data/processed/sherlock-holmes.json";
import retrievalDemo from "../../data-py/processed/retrieval-demo.json";
import StepNav from "./StepNav.jsx";
import RetrievalResults from "./RetrievalResults.jsx";
import { rankChunks } from "../lib/retrieval.js";

const DATASETS = {
  career: "Portfolio Data",
  cars: "JDM Legends",
  sherlock: "Sherlock Holmes",
};

// The Python-track dataset ids don't match the app's short ids one-to-one
// (the JSON files are named after the actual dataset, not the UI's short
// "career"/"cars"/"sherlock" keys) — this is the same mapping Step3/4/5 use.
const PY_DATASET_ID = { career: "portfolio", cars: "cars-jdm-legends", sherlock: "sherlock-holmes" };

const NODE_DATA = { career: portfolioNode, cars: carsNode, sherlock: sherlockNode };

// A single embedding pipeline, loaded once and reused — matches the
// caching pattern Step 08's generator already uses. Recreating this on
// every search (as an earlier version of this file did) reloads the whole
// model each time, which is slow and wasteful.
let embedderPromise;
function loadEmbedder() {
  embedderPromise ||= pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  return embedderPromise;
}

async function embedQuestion(question) {
  const extractor = await loadEmbedder();
  const output = await extractor(question, { pooling: "mean", normalize: true });
  if (typeof output?.tolist === "function") {
    const list = output.tolist();
    return Array.isArray(list[0]) ? list[0] : list;
  }
  if (output?.data) return Array.from(output.data);
  return [];
}

function PlanNode({ number, label, detail, active }) {
  return (
    <div className={`retrieval-node${active ? " active" : ""}`}>
      <span className="retrieval-node-num">{number}</span>
      <div>
        <b>{label}</b>
        <small>{detail}</small>
      </div>
    </div>
  );
}

export default function Step6RetrievalPlan({ track, selectedId, onBack, onNext }) {
  const isNode = track === "node";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";
  const searchName = isNode ? "Cosine similarity / in-memory index" : "ChromaDB (local, cosine)";

  // Node: live free-text search against the real in-memory vectors.
  const nodeDataset = useMemo(() => (selectedId ? NODE_DATA[selectedId] : null), [selectedId]);
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topK, setTopK] = useState(3);

  // Python: a small, fixed set of real questions already run through a
  // real ChromaDB collection offline — see data-py/scripts/retrieve_local.py.
  // Not a live arbitrary-question search (ChromaDB has no browser story and
  // there's no backend yet) — a genuinely different, honest retrieval path,
  // not a disguised copy of Node's.
  const pyEntries = selectedId ? retrievalDemo.datasets[PY_DATASET_ID[selectedId]] || [] : [];
  const [pyPickedIndex, setPyPickedIndex] = useState(null);

  useEffect(() => {
    setQuestion("");
    setResults([]);
    setError("");
    setPyPickedIndex(null);
  }, [selectedId, track]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!selectedId || !nodeDataset) return;

    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please enter a question to search.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const queryVector = await embedQuestion(trimmed);
      const ranked = rankChunks(queryVector, nodeDataset.chunks, topK);
      setResults(ranked);
    } catch (searchError) {
      console.error(searchError);
      setError("Retrieval failed. The embedding model could not load in the browser. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pickPyQuestion = (index) => {
    setPyPickedIndex(index);
    setResults(pyEntries[index]?.results || []);
  };

  const activeQuestion = isNode ? question.trim() : (pyPickedIndex !== null ? pyEntries[pyPickedIndex]?.question : "");

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 06</div>
      <div className="planned-title-row">
        <h2>Retrieval, running against real chunk vectors</h2>
        <span className="status live">LIVE · {isNode ? "NODE PATH" : "PYTHON PATH"}</span>
      </div>
      <p className="dek">
        {isNode
          ? "Ask anything. The question is embedded live and compared against every chunk in the selected dataset, in your browser."
          : "Python's retrieval runs through real ChromaDB — but locally, offline, and only for a small fixed set of pre-verified questions (ChromaDB has no browser story, and there's no backend yet to call it live)."}
      </p>

      <div className="retrieval-context">
        <span className={`status${isNode ? " live" : ""}`}>{isNode ? "NODE.JS" : "PYTHON"}</span>
        <span>Target index: <b>{searchName}</b></span>
        <span>Collection: <b>{datasetName}</b></span>
      </div>

      <div className="retrieval-flow" aria-label="Retrieval flow">
        <PlanNode number="01" label="Question" detail={isNode ? "Any question, typed live." : "One of a few pre-verified questions."} active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="02" label="Embed" detail="Same MiniLM model used at indexing." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="03" label="Search index" detail={isNode ? "Score against in-memory chunk vectors, live." : "Real ChromaDB query, run once, offline."} active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="04" label="Top K evidence" detail="Return chunks, scores, and source IDs." active />
      </div>

      <div className="retrieval-layout">
        {isNode ? (
          <form className="retrieval-panel query-panel" onSubmit={handleSearch}>
            <div className="retrieval-panel-head"><span>INPUT</span><span>NODE DEMO — LIVE</span></div>
            <label className="query-label" htmlFor="retrieval-question">Question</label>
            <textarea
              id="retrieval-question"
              className="query-field"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setResults([]);
                setError("");
              }}
              rows={4}
              placeholder={`Ask a precise question about ${datasetName}…`}
            />
            <div className="query-meta">
              <span>MODEL</span><b>all-MiniLM-L6-v2</b>
              <span>OUTPUT</span><b>384 dimensions</b>
            </div>
            <div className="topk-row">
              <span className="topk-label">Top K</span>
              <button type="button" className={`chunk-nav-btn topk-button${topK === 3 ? " active" : ""}`} onClick={() => { setTopK(3); setResults([]); }}>3</button>
              <button type="button" className={`chunk-nav-btn topk-button${topK === 5 ? " active" : ""}`} onClick={() => { setTopK(5); setResults([]); }}>5</button>
            </div>
            <button className="chunk-nav-btn retrieve-button" type="submit" disabled={loading || !nodeDataset}>
              {loading ? "Searching…" : "Run retrieval"}
            </button>
            {error && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{error}</p>}
          </form>
        ) : (
          <div className="retrieval-panel query-panel">
            <div className="retrieval-panel-head"><span>INPUT</span><span>PYTHON — 6 PRE-VERIFIED</span></div>
            <label className="query-label">Pick a question</label>
            <div className="demo-question-list">
              {pyEntries.map((entry, i) => (
                <button
                  key={entry.question}
                  type="button"
                  className={`demo-question${pyPickedIndex === i ? " active" : ""}`}
                  onClick={() => pickPyQuestion(i)}
                >
                  {entry.question}
                </button>
              ))}
              {pyEntries.length === 0 && <p className="retrieval-note">No pre-verified questions for this dataset yet.</p>}
            </div>
            <div className="query-meta">
              <span>MODEL</span><b>{retrievalDemo.model}</b>
              <span>ENGINE</span><b>{retrievalDemo.generatedWith}</b>
            </div>
          </div>
        )}

        <div className="retrieval-panel index-panel">
          <div className="retrieval-panel-head"><span>INDEX</span><span>{isNode ? "NODE PATH" : "PYTHON PATH"}</span></div>
          {isNode ? (
            <>
              <h3>Small collection first. Local cosine search.</h3>
              <p>With one selected dataset loaded into memory, each chunk is already a normalized vector. The question is embedded and compared against every chunk in that dataset, producing a fast, zero-cost retrieval pass.</p>
              <div className="index-specs"><span>LOCAL</span><b>cosine similarity</b><span>MODEL</span><b>all-MiniLM-L6-v2</b></div>
            </>
          ) : (
            <>
              <h3>A real ChromaDB collection, queried offline.</h3>
              <p>Chunks are embedded with Sentence-Transformers and added to a persistent local ChromaDB collection. Each question on the left was actually queried against it once — this is real ChromaDB output, not a simulation, just not a live arbitrary-question endpoint yet.</p>
              <div className="index-specs"><span>VECTOR DB</span><b>ChromaDB (local)</b><span>QUESTIONS</span><b>{pyEntries.length} pre-verified</b></div>
            </>
          )}
        </div>
      </div>

      <RetrievalResults results={results} loading={loading} />

      <StepNav
        onBack={onBack}
        backLabel="See the embeddings"
        onNext={results.length ? () => onNext({ question: activeQuestion, results }) : undefined}
        nextLabel="Augment context"
      />
    </section>
  );
}
