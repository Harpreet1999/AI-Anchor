import { useState } from "react";
import {
  SourceIcon,
  ChunkIcon,
  EmbedIcon,
  RetrieveIcon,
  AugmentIcon,
  GenerateIcon,
} from "./diagrams.jsx";
import LiveCheck from "./LiveCheck.jsx";

// The honest map of the pipeline. `state` must be updated in lockstep with
// what's actually wired up as later stages get built — never ahead of it.
// `tech` and `detail` back the expandable drawer below; `check` (optional)
// wires a stage to a real health endpoint so "Live" can be verified on the
// spot, not just asserted. `key` is a plain machine id (not the "01"-style
// display number) — used by PipelineTimeline.jsx to pick the right glyph
// for the live position sidebar.
export const STAGES = [
  {
    num: "01", key: "source", title: "Source", gerund: "Sourcing", cap: "Raw .md / .txt files a human can read top to bottom.", state: "live", Icon: SourceIcon,
    detail: "Three fixed source files — a resume/portfolio, a car-spec sheet, and a public-domain short story collection — committed straight into the repo. No uploads, no scraping, nothing fetched at request time.",
    tech: [["Format", "Markdown / plain text"], ["Storage", "Committed to the repo"], ["Datasets", "3, fixed"]],
  },
  {
    num: "02", key: "chunk", title: "Chunk", gerund: "Chunking", cap: "Split into small, individually-citable pieces.", state: "live", Icon: ChunkIcon,
    detail: "Each source file is split into small, structurally-meaningful pieces — one chunk per real unit (a heading section, a car, a story paragraph) so a question about one fact retrieves that fact, not the whole file. Node and Python use genuinely different splitters, not the same logic renamed.",
    tech: [["Node.js", "Hand-rolled, structure-aware splitter"], ["Python", "LangChain RecursiveCharacterTextSplitter"]],
  },
  {
    num: "03", key: "embed", title: "Embed & Index", gerund: "Embedding / Indexing", cap: "Each chunk becomes a vector, computed once.", state: "live", Icon: EmbedIcon,
    detail: "Every chunk is run through a real sentence-embedding model once, offline, and the resulting vectors are committed alongside the chunks. Same model family on both tracks, two different runtimes.",
    tech: [["Node.js", "Xenova/transformers.js (all-MiniLM-L6-v2)"], ["Python", "Sentence-Transformers (all-MiniLM-L6-v2)"], ["Dimensions", "384 per chunk"]],
  },
  {
    num: "04", key: "retrieve", title: "Retrieve", gerund: "Retrieving", cap: "Match a question to the closest chunks.", state: "live", Icon: RetrieveIcon,
    detail: "Node embeds your question in the browser and ranks it against every chunk vector locally — zero network calls. Python sends the question to a small FastAPI service that embeds it server-side and queries a real, in-memory ChromaDB collection.",
    tech: [["Node.js", "Cosine similarity, fully client-side"], ["Python", "ChromaDB, live network call"]],
    check: { label: "Check Python retrieval service", serviceId: "py" },
  },
  {
    num: "05", key: "augment", title: "Augment", gerund: "Augmenting", cap: "Insert retrieved chunks into the prompt.", state: "live", Icon: AugmentIcon,
    detail: "The retrieved chunks are assembled into a single evidence block, numbered and source-tagged, and placed alongside the question — the exact context the model sees, nothing hidden.",
    tech: [["Shape", "System instruction + question + numbered evidence"], ["Runtime", "Plain JS, no LLM call yet"]],
  },
  {
    num: "06", key: "generate", title: "Generate", gerund: "Generating", cap: "Groq (GPT-OSS 120B) answers from that context, server-side.", state: "live", Icon: GenerateIcon,
    detail: "The augmented prompt is sent to Groq's hosted GPT-OSS 120B, instructed to answer only from the supplied evidence and say so plainly — in its own words, not a fixed stock phrase — when the evidence doesn't cover the question. Your API key stays server-side.",
    tech: [["Model", "openai/gpt-oss-120b via Groq"], ["Key handling", "Server-side only, never sent to the browser"]],
    check: { label: "Check Groq LLM backend", serviceId: "groq" },
  },
];

const STATUS_LABEL = { live: "Live", next: "Next up", planned: "Planned" };

export default function PipelineGrid() {
  const [openNum, setOpenNum] = useState(null);
  // Kept separate from openNum so the detail panel's collapse animation
  // has something to shrink — content, not just clear instantly the
  // moment openNum goes back to null.
  const [lastOpenNum, setLastOpenNum] = useState(null);
  const displayedStage = STAGES.find((s) => s.num === (openNum || lastOpenNum));

  const toggle = (num) => {
    if (openNum === num) {
      setOpenNum(null);
    } else {
      setOpenNum(num);
      setLastOpenNum(num);
    }
  };

  return (
    <>
      {/* A fixed 3-column grid, always — clicking a card no longer injects
          a full-width detail block into the grid's own flow (that used to
          shove every later card down onto the next row the instant you
          opened one, then snap them back the instant you closed it). The
          detail now lives in one place below the whole grid instead, so
          every card stays exactly where it started. */}
      <div className="stage-grid">
        {STAGES.map((s) => {
          const isOpen = openNum === s.num;
          return (
            <button
              key={s.num}
              type="button"
              className={`stage-btn${s.state === "live" ? " live" : ""}${isOpen ? " expanded" : ""}`}
              onClick={() => toggle(s.num)}
              aria-expanded={isOpen}
            >
              <div className="stage-head">
                <span className="num">{s.num}</span>
                <span className={`status${s.state === "live" ? " live" : ""}`}>{STATUS_LABEL[s.state]}</span>
              </div>
              <s.Icon />
              <h3>{s.title}</h3>
              <p>{s.cap}</p>
              <div className="stage-expand-hint">{isOpen ? "▾ Hide details" : "▸ How this works"}</div>
            </button>
          );
        })}
      </div>

      <div className={`stage-detail-wrap${openNum ? " open" : ""}`}>
        <div className="stage-detail-inner">
          {displayedStage && (
            <div className="stage-detail">
              <div className="stage-detail-title">Stage {displayedStage.num} — {displayedStage.title}</div>
              <div className="stage-detail-grid">
                <div>
                  <h4>{displayedStage.gerund}</h4>
                  <p>{displayedStage.detail}</p>
                  {displayedStage.check && <LiveCheck label={displayedStage.check.label} serviceId={displayedStage.check.serviceId} />}
                </div>
                <div>
                  <h4>Tech</h4>
                  <div className="stage-detail-tech">
                    {displayedStage.tech.map(([k, v]) => (
                      <div key={k} className="stage-detail-tech-row"><span>{k}</span><span>{v}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flow-note">
        <b>What's actually true right now</b> — the full pipeline is live end to end. Every chunk
        has a real embedding (stage 03, both tracks). Retrieval (04) and augmentation (05) run for
        real. Generation (06) calls Groq (GPT-OSS 120B) through a small backend, instructed to
        answer only from the retrieved evidence and say plainly when it can't. Click any stage
        above for the specifics, or run its live check.
      </div>
    </>
  );
}
