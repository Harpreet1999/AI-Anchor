import StepNav from "./StepNav.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "JDM Legends",
  sherlock: "Sherlock Holmes",
};

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
  const searchName = isNode ? "Cosine similarity / Upstash Vector" : "ChromaDB";

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 06</div>
      <div className="planned-title-row">
        <h2>The retrieval desk, drawn before it is wired</h2>
        <span className="status">NEXT UP · UI PLAN</span>
      </div>
      <p className="dek">
        This is the next real boundary: a question becomes a vector, the index returns the closest
        chunks, and only those chunks continue to the prompt. The interface below is deliberately
        a blueprint—no query is sent and no search runs yet.
      </p>

      <div className="retrieval-context">
        <span className={`status${isNode ? " live" : ""}`}>{isNode ? "NODE.JS" : "PYTHON"}</span>
        <span>Target index: <b>{searchName}</b></span>
        <span>Collection: <b>{datasetName}</b></span>
      </div>

      <div className="retrieval-flow" aria-label="Planned retrieval flow">
        <PlanNode number="01" label="Question" detail="A user asks one focused question." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="02" label="Embed once" detail="Use the same MiniLM model as indexing." active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="03" label="Search index" detail={isNode ? "Score against vectors or call Upstash." : "Query the Chroma collection."} active />
        <div className="retrieval-arrow" aria-hidden="true">→</div>
        <PlanNode number="04" label="Top K evidence" detail="Return chunks, scores, and source IDs." />
      </div>

      <div className="retrieval-layout">
        <div className="retrieval-panel query-panel">
          <div className="retrieval-panel-head"><span>PLANNED INPUT</span><span>NO LIVE QUERY</span></div>
          <label className="query-label" htmlFor="retrieval-question">Question</label>
          <div id="retrieval-question" className="query-field" aria-label="Example question, not editable">
            Ask a precise question about {datasetName}…
          </div>
          <div className="query-meta">
            <span>MODEL</span><b>all-MiniLM-L6-v2</b>
            <span>OUTPUT</span><b>384 dimensions</b>
          </div>
        </div>

        <div className="retrieval-panel index-panel">
          <div className="retrieval-panel-head"><span>PLANNED INDEX</span><span>{isNode ? "NODE PATH" : "PYTHON PATH"}</span></div>
          {isNode ? (
            <>
              <h3>Small collection first. Hosted vector index when needed.</h3>
              <p>At this project’s size, normalized vectors can be compared in memory with a dot product. The deployed path can swap that scan for Upstash Vector without changing the result shape.</p>
              <div className="index-specs"><span>LOCAL</span><b>cosine similarity</b><span>HOSTED</span><b>Upstash Vector</b></div>
            </>
          ) : (
            <>
              <h3>One persistent collection per dataset.</h3>
              <p>Python sends the query vector to ChromaDB, which returns the nearest documents with their metadata and distance—ready to cite downstream.</p>
              <div className="index-specs"><span>STORE</span><b>ChromaDB collection</b><span>QUERY</span><b>similarity_search</b></div>
            </>
          )}
        </div>
      </div>

      <div className="retrieval-panel evidence-panel">
        <div className="retrieval-panel-head"><span>PLANNED RESPONSE SHAPE</span><span>TOP K = 3</span></div>
        <div className="evidence-placeholder">
          <span className="evidence-rank">01</span><span>score</span><span className="evidence-line" /><span>chunk ID + source citation</span>
        </div>
        <div className="evidence-placeholder muted">
          <span className="evidence-rank">02</span><span>score</span><span className="evidence-line" /><span>chunk ID + source citation</span>
        </div>
        <div className="evidence-placeholder muted">
          <span className="evidence-rank">03</span><span>score</span><span className="evidence-line" /><span>chunk ID + source citation</span>
        </div>
        <p className="retrieval-note"><b>Why this shape?</b> Retrieval must return evidence, not an answer. Step 07 will use these exact chunks to assemble a grounded prompt.</p>
      </div>

      <StepNav onBack={onBack} backLabel="See the embeddings" />
    </section>
  );
}
