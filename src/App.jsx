import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TopProgress from "./components/TopProgress.jsx";
import Step1Intro from "./components/Step1Intro.jsx";
import Step2Select from "./components/Step2Select.jsx";
import Step3Preview from "./components/Step3Preview.jsx";
import { STAGES } from "./components/PipelineGrid.jsx";

const liveCount = STAGES.filter((s) => s.state === "live").length;

function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [track, setTrack] = useState("node");
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSelectDataset = (id) => {
    setSelectedId(id);
    setProcessing(true);
    setActiveStep(3);

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
      <TopProgress active={activeStep} onNavigate={setActiveStep} />
      <div className="layout">
        <Sidebar
          active={activeStep}
          onNavigate={setActiveStep}
          liveCount={liveCount}
          totalStages={STAGES.length}
        />
        <div className="sheets">
          {activeStep === 1 && <Step1Intro onNext={() => setActiveStep(2)} />}
          {activeStep === 2 && (
            <Step2Select
              selectedId={selectedId}
              track={track}
              onSelectTrack={setTrack}
              onSelectDataset={handleSelectDataset}
              onBack={() => setActiveStep(1)}
            />
          )}
          {activeStep === 3 && (
            <Step3Preview
              selectedId={selectedId}
              processing={processing}
              onBack={() => setActiveStep(2)}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
