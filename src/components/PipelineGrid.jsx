import {
  SourceIcon,
  ChunkIcon,
  EmbedIcon,
  RetrieveIcon,
  AugmentIcon,
  GenerateIcon,
} from "./diagrams.jsx";

// The honest map of the pipeline. `state` must be updated in lockstep with
// what's actually wired up as later stages get built — never ahead of it.
export const STAGES = [
  { num: "01", title: "Source", cap: "Raw .md / .txt files a human can read top to bottom.", state: "live", Icon: SourceIcon },
  { num: "02", title: "Chunk", cap: "Split into small, individually-citable pieces.", state: "live", Icon: ChunkIcon },
  { num: "03", title: "Embed & Index", cap: "Each chunk becomes a vector, computed once.", state: "next", Icon: EmbedIcon },
  { num: "04", title: "Retrieve", cap: "Match a question to the closest chunks.", state: "planned", Icon: RetrieveIcon },
  { num: "05", title: "Augment", cap: "Insert retrieved chunks into the prompt.", state: "planned", Icon: AugmentIcon },
  { num: "06", title: "Generate", cap: "The LLM answers, grounded in that context.", state: "planned", Icon: GenerateIcon },
];

const STATUS_LABEL = { live: "Live", next: "Next up", planned: "Planned" };

export default function PipelineGrid() {
  return (
    <>
      <div className="stage-grid">
        {STAGES.map((s) => (
          <div key={s.num} className={`stage${s.state === "live" ? " live" : ""}`}>
            <div className="stage-head">
              <span className="num">{s.num}</span>
              <span className={`status${s.state === "live" ? " live" : ""}`}>{STATUS_LABEL[s.state]}</span>
            </div>
            <s.Icon />
            <h3>{s.title}</h3>
            <p>{s.cap}</p>
          </div>
        ))}
      </div>
      <div className="flow-note">
        <b>What's actually true right now</b> — every dataset has been split into chunks with a
        consistent shape (stage 02). No vectors exist yet; that's stage 03, next.
      </div>
    </>
  );
}
