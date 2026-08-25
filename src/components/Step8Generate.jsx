import { useState } from "react";
import { pipeline } from "@huggingface/transformers";
import StepNav from "./StepNav.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "JDM Legends",
  sherlock: "Sherlock Holmes",
};

const MODEL_ID = "Xenova/flan-t5-small";
let generatorPromise;

function loadGenerator() {
  generatorPromise ||= pipeline("text2text-generation", MODEL_ID);
  return generatorPromise;
}

function buildPrompt(question, results) {
  const evidence = results.map((result, index) => (
    `[${index + 1}] ${result.title} | ${result.source}\n${result.text}`
  )).join("\n\n");

  return `Answer the question using only the evidence. Keep the answer concise and mention the source when possible.\n\nQuestion: ${question}\n\nEvidence:\n${evidence}`;
}

export default function Step8Generate({ track, selectedId, retrievalData, onBack }) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const results = retrievalData?.results || [];
  const question = retrievalData?.question || "No retrieved question available.";
  const trackName = track === "node" ? "NODE.JS" : "PYTHON";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";

  const handleGenerate = async () => {
    if (!results.length) return;
    setLoading(true);
    setError("");

    try {
      const generator = await loadGenerator();
      const output = await generator(buildPrompt(question, results), {
        max_new_tokens: 120,
        do_sample: false,
      });
      setAnswer(output[0]?.generated_text?.trim() || "The model returned no answer.");
    } catch (generationError) {
      console.error(generationError);
      setError("Generation failed. The local model could not load in the browser.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 08</div>
      <div className="planned-title-row">
        <h2>Generate, answering from augmented evidence</h2>
        <span className="status live">LIVE · {trackName} PATH</span>
      </div>
      <p className="dek">
        The local instruction model receives the question and retrieved chunks from Step 07. Its answer is generated in the browser, with no hosted API or application key.
      </p>

      <div className="retrieval-context">
        <span className="status live">{trackName}</span>
        <span>Collection: <b>{datasetName}</b></span>
        <span>Model: <b>{MODEL_ID}</b></span>
      </div>

      <div className="generation-layout">
        <div className="retrieval-panel generation-question">
          <div className="retrieval-panel-head"><span>QUESTION</span><span>FROM STEP 06</span></div>
          <p>{question}</p>
        </div>
        <div className="retrieval-panel generation-question">
          <div className="retrieval-panel-head"><span>GROUNDING</span><span>{results.length} CHUNKS</span></div>
          <p>Only the retrieved evidence is sent to the local model.</p>
        </div>
      </div>

      <div className="retrieval-panel answer-panel">
        <div className="retrieval-panel-head"><span>GENERATED ANSWER</span><span>{loading ? "GENERATING…" : "LOCAL MODEL"}</span></div>
        <div className={`answer-body${answer ? " ready" : ""}`}>
          {answer || "Run generation to produce a grounded answer."}
        </div>
        {error && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{error}</p>}
        <button className="chunk-nav-btn generate-button" type="button" onClick={handleGenerate} disabled={loading || !results.length}>
          {loading ? "Generating…" : answer ? "Generate again" : "Generate answer"}
        </button>
      </div>

      <div className="augment-note">
        <b>What this proves:</b> the final answer is produced from a traceable retrieval context, not from an unrelated free-form prompt.
      </div>

      <StepNav onBack={onBack} backLabel="See augmented context" />
    </section>
  );
}