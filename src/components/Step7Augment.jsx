import { useState } from "react";
import CopyButton from "./CopyButton.jsx";
import StepNav from "./StepNav.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "Car Legends",
  sherlock: "Sherlock Holmes",
  cookbook: "Boston Cooking-School Cook Book",
};

const SYSTEM_LINE = "SYSTEM: Answer the user's question using only the supplied evidence. Cite the source when relevant.";

export default function Step7Augment({ track, selectedId, retrievalData, onBack, onNext }) {
  const results = retrievalData?.results || [];
  const question = retrievalData?.question || "No question has been retrieved yet.";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";
  const trackName = track === "node" ? "NODE.JS" : "PYTHON";
  // Every evidence item starts collapsed — used to auto-open the first
  // one, which looked like an arbitrary pick to whichever chunk happened
  // to rank #1 rather than a deliberate default.
  const [openIndex, setOpenIndex] = useState(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const fullPrompt = results.length
    ? [
        SYSTEM_LINE,
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

      {results.length > 0 ? (
        <div className="retrieval-panel prompt-panel">
          <div className="retrieval-panel-head">
            <span>AUGMENTED PROMPT CONTEXT</span>
            <span>{trackName} · {results.length} CHUNKS</span>
          </div>

          <div className="prompt-block prompt-system">
            <span className="prompt-block-label">SYSTEM</span>
            <p>{SYSTEM_LINE}</p>
          </div>
          <div className="prompt-block">
            <span className="prompt-block-label">QUESTION</span>
            <p>{question}</p>
          </div>

          <div className="prompt-evidence-list">
            {results.map((result, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={result.chunkId || index} className="prompt-evidence-item">
                  <button
                    type="button"
                    className="prompt-evidence-toggle"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="prompt-evidence-tag">[{index + 1}]</span>
                    <span className="prompt-evidence-title">{result.title} · {result.source}</span>
                    <span className="prompt-evidence-caret">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && <p className="prompt-evidence-text">{result.text}</p>}
                </div>
              );
            })}
          </div>

          <div className="prompt-panel-foot">
            <span>{fullPrompt.length.toLocaleString()} characters sent to the model in Step 08</span>
            <div className="prompt-panel-foot-actions">
              <button type="button" className="copy-btn" onClick={() => setShowFullPrompt((v) => !v)} aria-expanded={showFullPrompt}>
                {showFullPrompt ? "Hide full prompt" : "Show full prompt"}
              </button>
              <CopyButton getText={() => fullPrompt} label="Copy full prompt" />
            </div>
          </div>

          {showFullPrompt && (
            <pre className="chunk-block full-prompt-block">{fullPrompt}</pre>
          )}
        </div>
      ) : (
        <div className="retrieval-panel prompt-panel">
          <div className="retrieval-panel-head"><span>AUGMENTED PROMPT CONTEXT</span><span>{trackName}</span></div>
          <p className="retrieval-note">Run retrieval in Step 06 to create augmented context.</p>
        </div>
      )}

      <div className="augment-note">
        <b>What this proves:</b> the answer stage receives traceable evidence with source IDs, not just an unstructured question.
      </div>

      <StepNav onBack={onBack} backLabel="See retrieval results" onNext={onNext} nextLabel="Generate answer" />
    </section>
  );
}
