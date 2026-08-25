import StepNav from "./StepNav.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "JDM Legends",
  sherlock: "Sherlock Holmes",
};

export default function Step7Augment({ track, selectedId, retrievalData, onBack, onNext }) {
  const results = retrievalData?.results || [];
  const question = retrievalData?.question || "No question has been retrieved yet.";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";
  const trackName = track === "node" ? "NODE.JS" : "PYTHON";
  const context = results.length
    ? [
        "SYSTEM: Answer the user's question using only the supplied evidence. Cite the source when relevant.",
        `USER QUESTION: ${question}`,
        "RETRIEVED EVIDENCE:",
        results.map((result, index) => (
          `[${index + 1}] ${result.title} · ${result.source} · ${result.section || "unsectioned"}\n${result.text}`
        )).join("\n\n"),
      ].join("\n\n")
    : "Run retrieval in Step 06 to create augmented context.";

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 07</div>
      <div className="planned-title-row">
        <h2>Augment, assembling retrieved evidence into context</h2>
        <span className="status live">LIVE · {trackName} PATH</span>
      </div>
      <p className="dek">
        Retrieval found the evidence. Augmentation now places those chunks beside the question so a later generator can answer from the selected source instead of guessing.
      </p>

      <div className="retrieval-context">
        <span className="status live">{trackName}</span>
        <span>Collection: <b>{datasetName}</b></span>
        <span>Evidence: <b>{results.length} retrieved chunk{results.length === 1 ? "" : "s"}</b></span>
      </div>

      <div className="augment-layout">
        <div className="retrieval-panel augment-question">
          <div className="retrieval-panel-head"><span>QUESTION</span><span>USER INPUT</span></div>
          <p>{question}</p>
        </div>
        <div className="retrieval-panel augment-question">
          <div className="retrieval-panel-head"><span>CONTRACT</span><span>GROUNDED INPUT</span></div>
          <p>Question + ranked chunks + source metadata</p>
        </div>
      </div>

      <div className="retrieval-panel prompt-panel">
        <div className="retrieval-panel-head"><span>AUGMENTED PROMPT CONTEXT</span><span>{trackName} · {results.length} CHUNKS</span></div>
        <pre>{context}</pre>
      </div>

      <div className="augment-note">
        <b>What this proves:</b> the answer stage receives traceable evidence with source IDs, not just an unstructured question.
      </div>

      <StepNav onBack={onBack} backLabel="See retrieval results" onNext={onNext} nextLabel="Generate answer" />
    </section>
  );
}