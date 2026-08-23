import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TopProgress from "./components/TopProgress.jsx";
import Masthead from "./components/Masthead.jsx";
import Step1StackPicker from "./components/Step1StackPicker.jsx";
import Step2Intro from "./components/Step2Intro.jsx";
import Step3Select from "./components/Step3Select.jsx";
import Step4Preview from "./components/Step4Preview.jsx";
import Step5Embeddings from "./components/Step5Embeddings.jsx";
import { STAGES } from "./components/PipelineGrid.jsx";

const liveCount = STAGES.filter((s) => s.state === "live").length;

function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [track, setTrack] = useState("node");
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // The selected track recolors the whole app (accent swaps yellow <-> green)
  // until manually switched back — a root-level attribute, not local state,
  // since it has to reach every component's CSS custom properties.
  useEffect(() => {
    document.documentElement.dataset.track = track;
  }, [track]);

  const handleSelectDataset = (id) => {
    setSelectedId(id);
    setProcessing(true);
    setActiveStep(4);

    clearTimeout(timerRef.current);
    // Paced reveal, not real processing time — the chunks are already
    // precomputed and sitting in the JSON file. This delay exists to make
    // the "chunking happened" step legible, not because anything is
    // actually being computed right now.
    const delay = 2200 + Math.random() * 1800; // 2.2s–4.0s
    timerRef.current = setTimeout(() => setProcessing(false), delay);
  };

  return (
    <>
      <Masthead />
      <TopProgress active={activeStep} onNavigate={setActiveStep} />
      <div className="layout">
        <Sidebar
          active={activeStep}
          onNavigate={setActiveStep}
          liveCount={liveCount}
          totalStages={STAGES.length}
        />
        <div className="sheets">
          {activeStep === 1 && (
            <Step1StackPicker track={track} onSelectTrack={setTrack} onNext={() => setActiveStep(2)} />
          )}
          {activeStep === 2 && (
            <Step2Intro onBack={() => setActiveStep(1)} onNext={() => setActiveStep(3)} />
          )}
          {activeStep === 3 && (
            <Step3Select
              track={track}
              selectedId={selectedId}
              onSelectDataset={handleSelectDataset}
              onBack={() => setActiveStep(2)}
            />
          )}
          {activeStep === 4 && (
            <Step4Preview
              track={track}
              selectedId={selectedId}
              processing={processing}
              onBack={() => setActiveStep(3)}
              onNext={() => setActiveStep(5)}
            />
          )}
          {activeStep === 5 && (
            <Step5Embeddings
              track={track}
              selectedId={selectedId}
              onBack={() => setActiveStep(4)}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
