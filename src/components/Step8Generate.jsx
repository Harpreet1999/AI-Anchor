import { useState } from "react";
import CopyButton from "./CopyButton.jsx";
import JsonBlock from "./JsonBlock.jsx";
import StepNav from "./StepNav.jsx";
import AnswerMarkdown from "./AnswerMarkdown.jsx";
import { useSystemStatus } from "../lib/systemStatus.jsx";

const DATASETS = {
  career: "Portfolio Data",
  cars: "Car Legends",
  sherlock: "Sherlock Holmes",
  cookbook: "Boston Cooking-School Cook Book",
};

// Friendlier messages for the failure modes that actually happen, rather
// than one generic "something went wrong".
function describeError(status, message) {
  if (status === 0) return "Couldn't reach the backend. Is it running? (npm run dev:api, or npm run dev:full to start both together.)";
  if (status === 500 && /GROQ_API_KEY/i.test(message || "")) return "The backend has no Groq API key configured yet. Add GROQ_API_KEY to .env (see .env.example) and restart the API server.";
  if (status === 401 || status === 403) return "Groq rejected the API key. Double-check the key in .env is correct and active.";
  if (status === 429) return "Rate limited by Groq's free tier. Wait a moment and try again.";
  return message || "Generation failed.";
}

export default function Step8Generate({ track, selectedId, retrievalData, onBack, onRestartRag }) {
  const systemStatus = useSystemStatus();
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [usage, setUsage] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [latencyMs, setLatencyMs] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextChunksUsed, setContextChunksUsed] = useState(null);
  const [contextChunksRequested, setContextChunksRequested] = useState(null);
  const results = retrievalData?.results || [];
  const question = retrievalData?.question || "No retrieved question available.";
  const trackName = track === "node" ? "NODE.JS" : "PYTHON";
  const datasetName = selectedId ? DATASETS[selectedId] : "the selected dataset";

  const handleGenerate = async () => {
    if (!results.length) return;
    setLoading(true);
    setError("");
    const started = performance.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, results }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw Object.assign(new Error(data.error || "Generation failed"), { status: res.status });
      }
      setAnswer(data.answer || "The model returned no answer.");
      setModel(data.model || "");
      setUsage(data.usage || null);
      setTruncated(Boolean(data.truncated));
      setLatencyMs(Math.round(performance.now() - started));
      setRawResponse(data);
      setContextChunksUsed(data.contextChunksUsed ?? null);
      setContextChunksRequested(data.contextChunksRequested ?? null);
      // Same principle as Step 06's retrieval call — a real answer just
      // came back, so the shared status truth should say "up" right now,
      // not wait for the next scheduled poll.
      systemStatus?.markUp("groq", data.model ? { message: `Live — ${data.model}` } : undefined);
    } catch (generationError) {
      console.error(generationError);
      setError(describeError(generationError.status ?? 0, generationError.message));
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
        The question and retrieved chunks from Step 07 are sent to a small backend, which calls
        Groq (GPT-OSS 120B) with your API key kept server-side — never exposed in the browser.
        The model is instructed to answer only from the evidence, and to say so plainly if the
        evidence doesn't contain the answer.
      </p>

      <div className="retrieval-context">
        <span className="status live">{trackName}</span>
        <span>Collection: <b>{datasetName}</b></span>
        <span>Model: <b>{model || "Groq · openai/gpt-oss-120b"}</b></span>
      </div>

      <div className="generation-layout">
        <div className="retrieval-panel generation-question">
          <div className="retrieval-panel-head"><span>QUESTION</span><span>FROM STEP 06</span></div>
          <p>{question}</p>
        </div>
        <div className="retrieval-panel generation-question">
          <div className="retrieval-panel-head"><span>GROUNDING</span><span>{results.length} CHUNKS</span></div>
          <p>Only the retrieved evidence is sent to the model — no outside knowledge allowed.</p>
        </div>
      </div>

      <div className="retrieval-panel answer-panel">
        <div className="retrieval-panel-head"><span>GENERATED ANSWER</span><span>{loading ? "GENERATING…" : "GROQ"}</span></div>
        <div className={`answer-body${answer ? " ready" : ""}`}>
          {answer ? <AnswerMarkdown text={answer} /> : "Run generation to produce a grounded answer."}
        </div>

        {contextChunksUsed !== null && contextChunksRequested !== null && contextChunksUsed < contextChunksRequested && (
          <p className="retrieval-note" style={{ color: "#E8B923" }}>
            Only {contextChunksUsed} of the {contextChunksRequested} retrieved chunks were actually
            sent to the model — the rest didn't fit this request's token budget (the lowest-ranked
            ones were dropped first).
          </p>
        )}

        {truncated && (
          <p className="retrieval-note" style={{ color: "#E8B923" }}>
            This answer hit the model's output limit and may be cut off mid-sentence — try regenerating.
          </p>
        )}
        {error && <p className="retrieval-note" style={{ color: "#f7b5b5" }}>{error}</p>}

        {answer && !error && (
          <div className="usage-strip">
            <div className="usage-chip"><span>LATENCY</span><b>{latencyMs !== null ? `${latencyMs}ms` : "—"}</b></div>
            <div className="usage-chip"><span>PROMPT TOKENS</span><b>{usage?.prompt_tokens ?? "—"}</b></div>
            <div className="usage-chip"><span>REASONING TOKENS</span><b>{usage?.completion_tokens_details?.reasoning_tokens ?? "—"}</b></div>
            <div className="usage-chip"><span>ANSWER TOKENS</span><b>{usage?.completion_tokens ?? "—"}</b></div>
            <div className="usage-actions">
              <CopyButton getText={() => answer} label="Copy answer" />
              <button type="button" className="copy-btn" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? "Hide raw response" : "View raw response"}
              </button>
            </div>
          </div>
        )}

        {showRaw && rawResponse && (
          <pre className="chunk-block raw-response-block"><JsonBlock value={rawResponse} /></pre>
        )}

        <div className="generate-actions-row">
          <button className="chunk-nav-btn generate-button" type="button" onClick={handleGenerate} disabled={loading || !results.length}>
            {loading ? "Generating…" : answer ? "Generate again" : "Generate answer"}
          </button>
          {onRestartRag && (
            <button
              className="chunk-nav-btn restart-rag-button"
              type="button"
              onClick={onRestartRag}
              title={`Back to Step 06 — ${trackName === "NODE.JS" ? "Node" : "Python"} track and ${datasetName} stay selected`}
            >
              ↻ Perform another RAG in same stack
            </button>
          )}
        </div>
      </div>

      <div className="augment-note">
        <b>What this proves:</b> the final answer is produced from a traceable retrieval context by
        a real hosted model — not a browser-side placeholder, and not free-form guessing.
      </div>

      <StepNav onBack={onBack} backLabel="See augmented context" />
    </section>
  );
}
