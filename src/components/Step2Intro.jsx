import { useState } from "react";
import { HeroDiagram, RetrieveGenerateDiagram } from "./diagrams.jsx";
import PipelineGrid from "./PipelineGrid.jsx";
import StepNav from "./StepNav.jsx";

export default function Step2Intro({ onNext, onBack }) {
  // Lifted here (not local to PipelineGrid) so a hover on either figure
  // above, or a card in the stage grid below, highlights the same stage
  // everywhere at once — one shared cursor across all three surfaces.
  const [hoveredStage, setHoveredStage] = useState(null);

  return (
    <section className="sheet">
      <div className="sheet-num">STEP 02</div>
      <h2>The anatomy of a pipeline, mid-build</h2>
      <p className="dek">
        Three fixed datasets, split into chunks, and embedded into real vectors. Source, Chunk,
        and Embed (stages 01–03 below) are all real, wired to the files in this repo — for both
        tracks. The rest are the honest next steps — shown so the map stays accurate, not to
        imply more is built than actually is. Hover a segment of either figure, or a stage card
        below, to trace the same step across all of them.
      </p>

      <div className="fig-cols">
        <div className="fig-col">
          <div className="fig-frame">
            <div className="fig-frame-inner">
              <HeroDiagram hoveredStage={hoveredStage} onHoverStage={setHoveredStage} />
              <div className="fig-caption"><span className="status live">Live</span> Source → Chunk → Embed</div>
            </div>
          </div>
        </div>
        <div className="fig-col">
          <div className="fig-frame">
            <div className="fig-frame-inner">
              <RetrieveGenerateDiagram hoveredStage={hoveredStage} onHoverStage={setHoveredStage} />
              <div className="fig-caption"><span className="status live">Live</span> Retrieve → Augment → Generate</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <PipelineGrid hoveredStage={hoveredStage} onHoverStage={setHoveredStage} />
      </div>

      <StepNav onBack={onBack} backLabel="Pick a stack" onNext={onNext} nextLabel="Pick a dataset" />
    </section>
  );
}
