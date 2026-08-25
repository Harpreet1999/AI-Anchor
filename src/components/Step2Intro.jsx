import { HeroDiagram, RetrieveGenerateDiagram } from "./diagrams.jsx";
import PipelineGrid from "./PipelineGrid.jsx";
import StepNav from "./StepNav.jsx";

export default function Step2Intro({ onNext, onBack }) {
  return (
    <section className="sheet">
      <div className="sheet-num">STEP 02</div>
      <h2>The anatomy of a pipeline, mid-build</h2>
      <p className="dek">
        Three fixed datasets, split into chunks, and embedded into real vectors. Source, Chunk,
        and Embed (stages 01–03 below) are all real, wired to the files in this repo — for both
        tracks. The rest are the honest next steps — shown so the map stays accurate, not to
        imply more is built than actually is.
      </p>

      <div className="fig-cols">
        <div className="fig-col">
          <div className="fig-frame">
            <div className="fig-frame-inner">
              <HeroDiagram />
              <div className="fig-caption"><span className="status live">Live</span> Source → Chunk → Embed</div>
            </div>
          </div>
        </div>
        <div className="fig-col">
          <div className="fig-frame">
            <div className="fig-frame-inner">
              <RetrieveGenerateDiagram />
              <div className="fig-caption"><span className="status">Planned</span> Retrieve → Augment → Generate</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <PipelineGrid />
      </div>

      <StepNav onBack={onBack} backLabel="Pick a stack" onNext={onNext} nextLabel="Pick a dataset" />
    </section>
  );
}
