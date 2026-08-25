import { useMemo, useState } from "react";
import { pipeline } from "@huggingface/transformers";
import portfolioNode from "../../data/processed/portfolio.json";
import carsNode from "../../data/processed/cars-jdm-legends.json";
import sherlockNode from "../../data/processed/sherlock-holmes.json";
import portfolioPy from "../../data-py/processed/portfolio.json";
import carsPy from "../../data-py/processed/cars-jdm-legends.json";
import sherlockPy from "../../data-py/processed/sherlock-holmes.json";
import StepNav from "./StepNav.jsx";
import RetrievalResults from "./RetrievalResults.jsx";
import { rankChunks } from "../lib/retrieval.js";

const DATASETS = {
  career: "Portfolio Data",
  cars: "JDM Legends",
  sherlock: "Sherlock Holmes",
};

const BY_TRACK = {
  node: { career: portfolioNode, cars: carsNode, sherlock: sherlockNode },
  python: { career: portfolioPy, cars: carsPy, sherlock: sherlockPy },
};

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

async function embedQuestion(question) {
  const extractor = await pipeline("feature-extraction", MODEL_ID);
  const output = await extractor(question, { pooling: "mean", normalize: true });

  if (Array.isArray(output)) {
    return output[0] ?? output;
  }

  if (typeof output?.tolist === "function") {
    const list = output.tolist();
    return Array.isArray(list[0]) ? list[0] : list;
  }

  if (output?.data) {
    return Array.from(output.data);
  }

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

export default function Step6RetrievalPlan({ track, selectedId, onBack }) {
  const isNode = track === "node";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";
  const searchName = isNode ? "Cosine similarity / in-memory index" : "Local ChromaDB collection";
  const dataset = useMemo(() => {
    if (!selectedId) return null;
    return BY_TRACK[track][selectedId];
  }, [selectedId, track]);

  const [question, setQuestion] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topK, setTopK] = useState(3);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!selectedId || !dataset) return;

    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please enter a question to search.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const queryVector = await embedQuestion(trimmed);
      const ranked = rankChunks(queryVector, dataset.chunks, topK);
      setResults(ranked);
    } catch (searchError) {
      console.error(searchError);
      setError("Retrieval failed. The embedding model could not load in the browser. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 06</div>
      <div className="planned-title-row">
        <h2>Retrieval, running against real chunk vectors</h2>
        <span className="status">LIVE · {isNode ? "NODE PATH" : "PYTHON PATH"}</span>
      </div>
      <p className="dek">
        This is the first real retrieval step. A user question is embedded and compared against the selected dataset’s chunk vectors. The top results are returned with score and source metadata.
      </p>

      <div className="retrieval-context">
        <span className={`status${isNode ? " live" : ""}`}>{isNode ? "NODE.JS" : "PYTHON"}</span>
        <span>Target index: <b>{searchName}</b></span>
        <span>Collection: <b>{datasetName}</b></span>
      </div>

      <div className="retrieval-flow" aria-label="Retrieval flow">
        <PlanNode number="01" label="Question" detail="A user asks one focused question." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="02" label="Embed once" detail="Use the same MiniLM model as indexing." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="03" label="Search index" detail={isNode ? "Score against the in-memory chunk vectors." : "Query the local Chroma collection."} active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="04" label="Top K evidence" detail="Return chunks, scores, and source IDs." active />
      </div>

      <div className="retrieval-layout">
        <form className="retrieval-panel query-panel" onSubmit={handleSearch}>
          <div className="retrieval-panel-head"><span>INPUT</span><span>{isNode ? "NODE DEMO" : "PYTHON LOCAL"}</span></div>
          <label className="query-label" htmlFor="retrieval-question">Question</label>
          <textarea
            id="retrieval-question"
            className="query-field"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            placeholder={`Ask a precise question about ${datasetName}…`}
          />
          <div className="query-meta">
            <span>MODEL</span><b>all-MiniLM-L6-v2</b>
            <span>OUTPUT</span><b>384 dimensions</b>
          </div>
          <div className="topk-row">
            <span className="topk-label">Top K</span>
            <button
              type="button"
              className={`chunk-nav-btn topk-button${topK === 3 ? " active" : ""}`}
              onClick={() => setTopK(3)}
            >
              3
            </button>
            <button
              type="button"
              className={`chunk-nav-btn topk-button${topK === 5 ? " active" : ""}`}
              onClick={() => setTopK(5)}
            >
              5
            </button>
          </div>
          <button className="chunk-nav-btn retrieve-button" type="submit" disabled={loading || !dataset}>
            {loading ? "Searching…" : "Run retrieval"}
          </button>
          {error && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{error}</p>}
        </form>

        <div className="retrieval-panel index-panel">
          <div className="retrieval-panel-head"><span>INDEX</span><span>{isNode ? "NODE PATH" : "PYTHON PATH"}</span></div>
          {isNode ? (
            <>
              <h3>Small collection first. Local cosine search.</h3>
              <p>With one selected dataset loaded into memory, each chunk is already a normalized vector. The question is embedded and compared against every chunk in that dataset, producing a fast, zero-cost retrieval pass.</p>
              <div className="index-specs"><span>LOCAL</span><b>cosine similarity</b><span>HOSTED</span><b>Upstash Vector</b></div>
            </>
          ) : (
            <>
              <h3>One persistent collection per dataset.</h3>
              <p>Python stores embeddings in a local Chroma collection and queries that collection with the same MiniLM model, returning nearest chunks with metadata and distance.</p>
              <div className="index-specs"><span>STORE</span><b>ChromaDB collection</b><span>QUERY</span><b>similarity_search</b></div>
            </>
          )}
        </div>
      </div>

      <RetrievalResults results={results} loading={loading} />

      <StepNav onBack={onBack} backLabel="See the embeddings" />
    </section>
  );
}
