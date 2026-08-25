import { useEffect, useState } from "react";
import { pipeline } from "@huggingface/transformers";
import retrievalDemo from "../../data-py/processed/retrieval-demo.json";
import StepNav from "./StepNav.jsx";
import RetrievalResults from "./RetrievalResults.jsx";
import { rankChunks } from "../lib/retrieval.js";
import { pyApiUrl } from "../lib/pyApi.js";
import { useDataset } from "../lib/useDataset.js";
import { useSystemStatus } from "../lib/systemStatus.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "Car Legends",
  sherlock: "Sherlock Holmes",
  cookbook: "Boston Cooking-School Cook Book",
};

// The Python-track dataset ids don't match the app's short ids one-to-one
// (the JSON files are named after the actual dataset, not the UI's short
// "career"/"cars"/"sherlock"/"cookbook" keys) — this is the same mapping
// Step3/4/5 use.
const PY_DATASET_ID = { career: "portfolio", cars: "cars-jdm-legends", sherlock: "sherlock-holmes", cookbook: "cookbook" };

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
  const systemStatus = useSystemStatus();
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";
  const searchName = isNode ? "Cosine similarity / in-memory index" : "ChromaDB (live, cosine)";

  // Node: live free-text search against the real in-memory vectors. Only
  // fetched when the Node track is actually active — no point loading a
  // multi-MB embedded dataset for a track that isn't in view.
  const nodeDataset = useDataset("node", isNode ? selectedId : null);
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topK, setTopK] = useState(3);

  // Python: live retrieval too, now — but against a real FastAPI + ChromaDB
  // service (service-py/), not the browser. That service has no on-disk
  // persistence and free-tier hosting sleeps when idle, so a first request
  // after a while can take tens of seconds to wake — surfaced honestly as
  // its own state below rather than hidden behind a generic spinner.
  // The handful of pre-verified questions from data-py/scripts/retrieve_local.py
  // are kept as one-click examples, not the only option anymore.
  const pyExamples = selectedId ? (retrievalDemo.datasets[PY_DATASET_ID[selectedId]] || []).map((e) => e.question) : [];
  const [pyQuestion, setPyQuestion] = useState("");
  const [pyResults, setPyResults] = useState([]);
  const [pyLoading, setPyLoading] = useState(false);
  const [pyWaking, setPyWaking] = useState(false);
  const [pyError, setPyError] = useState("");
  const [pyTopK, setPyTopK] = useState(5);
  // Collapsed by default — free typing is the primary interaction on both
  // tracks; these are optional inspiration, not the only way in, and
  // showing them open by default read as if typing were secondary.
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    setQuestion("");
    setResults([]);
    setError("");
    setPyQuestion("");
    setPyResults([]);
    setPyError("");
    setPyWaking(false);
    setShowExamples(false);
  }, [selectedId, track]);

  const handlePySearch = async (event) => {
    event.preventDefault();
    if (!selectedId) return;

    const trimmed = pyQuestion.trim();
    if (!trimmed) {
      setPyError("Please enter a question to search.");
      return;
    }

    setPyLoading(true);
    setPyError("");
    setPyWaking(false);

    // The free-tier host sleeps when idle. A slow first response almost
    // always means it's waking up, not that anything is broken — say so
    // instead of leaving a bare spinner up for 30-50 seconds.
    const wakingTimer = setTimeout(() => setPyWaking(true), 4000);

    try {
      const res = await fetch(pyApiUrl("/retrieve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: PY_DATASET_ID[selectedId], question: trimmed, k: pyTopK }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw Object.assign(new Error(data.detail || "Retrieval failed."), { status: res.status });
      }
      setPyResults(data.results || []);
      // This request just proved the service is up, right now — reflect
      // that in the one shared status truth immediately instead of
      // waiting up to 30s for the next scheduled poll to notice.
      systemStatus?.markUp("py");
    } catch (searchError) {
      console.error(searchError);
      // status is undefined when fetch itself threw (a real network error —
      // the typical shape in production, calling the service's own origin
      // directly); 502/503/504 covers the local dev-proxy case, where Vite
      // still returns a normal HTTP response even though the upstream
      // service it's proxying to is down or not answering yet.
      const unreachable = searchError.status === undefined || [502, 503, 504].includes(searchError.status);
      setPyError(
        unreachable
          ? "Couldn't reach the Python retrieval service. It may still be waking up from idle — try again in a moment."
          : searchError.message || "Retrieval failed."
      );
      setPyResults([]);
    } finally {
      clearTimeout(wakingTimer);
      setPyLoading(false);
      setPyWaking(false);
    }
  };

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

  const activeQuestion = isNode ? question.trim() : pyQuestion.trim();
  const activeResults = isNode ? results : pyResults;

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
          : "Ask anything here too. The question is sent to a small FastAPI + ChromaDB service (service-py/) that embeds it with Sentence-Transformers and searches a real, in-memory ChromaDB collection. It's on free hosting, so it can take a while to wake up if it's been idle."}
      </p>

      <div className="retrieval-context">
        <span className={`status${isNode ? " live" : ""}`}>{isNode ? "NODE.JS" : "PYTHON"}</span>
        <span>Target index: <b>{searchName}</b></span>
        <span>Collection: <b>{datasetName}</b></span>
      </div>

      <div className="retrieval-flow" aria-label="Retrieval flow">
        <PlanNode number="01" label="Question" detail="Any question, typed live." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="02" label="Embed" detail="Same MiniLM model used at indexing." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="03" label="Search index" detail={isNode ? "Score against in-memory chunk vectors, live." : "Real ChromaDB query, live, over the network."} active />
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
              {loading ? <span className="loading-pulse">Searching…</span> : "Run retrieval"}
            </button>
            {error && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{error}</p>}
          </form>
        ) : (
          <form className="retrieval-panel query-panel" onSubmit={handlePySearch}>
            <div className="retrieval-panel-head"><span>INPUT</span><span>PYTHON DEMO — LIVE</span></div>
            <label className="query-label" htmlFor="py-retrieval-question">Question</label>
            <textarea
              id="py-retrieval-question"
              className="query-field"
              value={pyQuestion}
              onChange={(event) => {
                setPyQuestion(event.target.value);
                setPyResults([]);
                setPyError("");
              }}
              rows={4}
              placeholder={`Ask a precise question about ${datasetName}…`}
            />
            {pyExamples.length > 0 && (
              <div className="demo-question-disclosure">
                <button type="button" className="demo-question-toggle" onClick={() => setShowExamples((v) => !v)} aria-expanded={showExamples}>
                  {showExamples ? "▾" : "▸"} Need inspiration? {pyExamples.length} example question{pyExamples.length === 1 ? "" : "s"}
                </button>
                {showExamples && (
                  <div className="demo-question-list" aria-label="Example questions">
                    {pyExamples.map((q) => (
                      <button key={q} type="button" className="demo-question" onClick={() => { setPyQuestion(q); setPyResults([]); setPyError(""); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="query-meta">
              <span>MODEL</span><b>{retrievalDemo.model}</b>
              <span>OUTPUT</span><b>384 dimensions</b>
            </div>
            <div className="topk-row">
              <span className="topk-label">Top K</span>
              <button type="button" className={`chunk-nav-btn topk-button${pyTopK === 3 ? " active" : ""}`} onClick={() => { setPyTopK(3); setPyResults([]); }}>3</button>
              <button type="button" className={`chunk-nav-btn topk-button${pyTopK === 5 ? " active" : ""}`} onClick={() => { setPyTopK(5); setPyResults([]); }}>5</button>
            </div>
            <button className="chunk-nav-btn retrieve-button" type="submit" disabled={pyLoading}>
              {pyLoading ? <span className="loading-pulse">{pyWaking ? "Waking up the service…" : "Searching…"}</span> : "Run retrieval"}
            </button>
            {pyWaking && <p className="retrieval-note loading-pulse">The Python service is on free hosting and sleeps when idle — this can take up to a minute on a cold start.</p>}
            {pyError && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{pyError}</p>}
          </form>
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
              <h3>A real ChromaDB collection, queried live.</h3>
              <p>Chunks are embedded with Sentence-Transformers and loaded into an in-memory ChromaDB collection on a small FastAPI service. Your question is embedded server-side and matched against it in real time — a real network round trip to a real vector database, not a browser simulation.</p>
              <div className="index-specs"><span>VECTOR DB</span><b>ChromaDB (in-memory)</b><span>HOSTING</span><b>Free tier — sleeps when idle</b></div>
            </>
          )}
        </div>
      </div>

      <RetrievalResults results={activeResults} loading={isNode ? loading : pyLoading} />

      <StepNav
        onBack={onBack}
        backLabel="See the embeddings"
        onNext={activeResults.length ? () => onNext({ question: activeQuestion, results: activeResults }) : undefined}
        nextLabel="Augment context"
      />
    </section>
  );
}
