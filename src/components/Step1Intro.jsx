import { HeroDiagram } from "./diagrams.jsx";
import PipelineGrid from "./PipelineGrid.jsx";
import StepNav from "./StepNav.jsx";

export default function Step1Intro({ onNext }) {
  return (
    <section className="sheet">
      <div className="sheet-num">STEP 01</div>
      <h2>How the pipeline reads Harpreet's data</h2>
      <p className="dek">
        Three fixed datasets, split into chunks, on the way to being embedded and searched.
        Source and Chunk (stages 01–02 below) are real, wired to the files in this repo. The rest
        are the honest next steps — shown so the map stays accurate, not to imply more is built
        than actually is.
      </p>

      <HeroDiagram />

      <div style={{ marginTop: 48 }}>
        <PipelineGrid />
      </div>

      <StepNav onNext={onNext} nextLabel="Pick a dataset" />
    </section>
  );
}
