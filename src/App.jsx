import { Suspense, lazy, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TopProgress from "./components/TopProgress.jsx";
import Masthead from "./components/Masthead.jsx";
import PipelineTimeline from "./components/PipelineTimeline.jsx";
import { STAGES } from "./components/PipelineGrid.jsx";
import { SystemStatusProvider } from "./lib/systemStatus.jsx";

// Lazy-loaded, not statically imported — each step (and whatever it pulls
// in; Step 06 alone drags in the transformers.js embedding pipeline) used
// to ship in the same initial bundle as Step 01, whether or not a visitor
// ever got there. Now only the step actually being viewed is fetched,
// which is most of what made the very first paint slow.
const Step1StackPicker = lazy(() => import("./components/Step1StackPicker.jsx"));
const Step2Intro = lazy(() => import("./components/Step2Intro.jsx"));
const Step3Select = lazy(() => import("./components/Step3Select.jsx"));
const Step4Preview = lazy(() => import("./components/Step4Preview.jsx"));
const Step5Embeddings = lazy(() => import("./components/Step5Embeddings.jsx"));
const Step6RetrievalPlan = lazy(() => import("./components/Step6RetrievalPlan.jsx"));
const Step7Augment = lazy(() => import("./components/Step7Augment.jsx"));
const Step8Generate = lazy(() => import("./components/Step8Generate.jsx"));

const liveCount = STAGES.filter((s) => s.state === "live").length;

// The furthest step actually reachable right now, given what's been done
// so far — not just "whatever number is highest". Steps beyond this are
// visible in the sidebar/top bar (so the full shape of the flow stays in
// view) but clicking them doesn't navigate; it explains what's missing.
function computeMaxStep(track, selectedId, retrievalData) {
  if (!track) return 1;
  if (!selectedId) return 3;
  if (!retrievalData) return 6;
  return 8;
}

function lockReason(n, track, selectedId, retrievalData) {
  if (n > 1 && !track) return "Pick a stack in Step 01 first.";
  if (n > 3 && !selectedId) return "Pick a dataset in Step 03 first.";
  if (n > 6 && !retrievalData) return "Run retrieval in Step 06 first.";
  return "That step isn't reachable yet.";
}

function App() {
  const [activeStep, setActiveStep] = useState(1);
  // No default track — the app starts in a neutral, uncolored state (see
  // index.css's base --accent) until the visitor actually picks one in
  // Step 01. Defaulting this to "node" used to recolor the whole site
  // yellow before any real choice had been made.
  const [track, setTrack] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [retrievalData, setRetrievalData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lockedMsg, setLockedMsg] = useState("");
  const timerRef = useRef(null);
  const lockedTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(lockedTimerRef.current);
  }, []);

  useEffect(() => {
    if (track) document.documentElement.dataset.track = track;
    else delete document.documentElement.dataset.track;
  }, [track]);

  const maxStep = computeMaxStep(track, selectedId, retrievalData);

  // Every nav click (sidebar, top bar) goes through here instead of
  // setActiveStep directly — jumping ahead of what's actually been done
  // just shows why it's not reachable yet instead of silently jumping.
  const attemptNavigate = (n) => {
    if (n <= maxStep) {
      setActiveStep(n);
      return;
    }
    setLockedMsg(lockReason(n, track, selectedId, retrievalData));
    clearTimeout(lockedTimerRef.current);
    lockedTimerRef.current = setTimeout(() => setLockedMsg(""), 3200);
  };

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

  // Jumps straight back to Step 06 with the same track + dataset still
  // selected, so asking a follow-up question doesn't mean clicking Back
  // twice — only the previous question's retrieval/generation result
  // clears, nothing about the chosen stack.
  const handleRestartRag = () => {
    setRetrievalData(null);
    setActiveStep(6);
  };

  return (
    <SystemStatusProvider>
      <Masthead />
      <TopProgress active={activeStep} onNavigate={attemptNavigate} maxStep={maxStep} />
      {lockedMsg && (
        <div className="nav-lock-toast" role="status" aria-live="polite">{lockedMsg}</div>
      )}
      <div className="layout">
        <Sidebar
          active={activeStep}
          onNavigate={attemptNavigate}
          maxStep={maxStep}
          liveCount={liveCount}
          totalStages={STAGES.length}
        />
        <div className="sheets">
          <Suspense fallback={<div className="step-loading" role="status" aria-live="polite">Loading step…</div>}>
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
                onNext={() => setActiveStep(6)}
              />
            )}
            {activeStep === 6 && (
              <Step6RetrievalPlan
                track={track}
                selectedId={selectedId}
                onBack={() => setActiveStep(5)}
                onNext={(data) => {
                  setRetrievalData(data);
                  setActiveStep(7);
                }}
              />
            )}
            {activeStep === 7 && (
              <Step7Augment
                track={track}
                selectedId={selectedId}
                retrievalData={retrievalData}
                onBack={() => setActiveStep(6)}
                onNext={() => setActiveStep(8)}
              />
            )}
            {activeStep === 8 && (
              <Step8Generate
                track={track}
                selectedId={selectedId}
                retrievalData={retrievalData}
                onBack={() => setActiveStep(7)}
                onRestartRag={handleRestartRag}
              />
            )}
          </Suspense>
        </div>
        <PipelineTimeline activeStep={activeStep} />
      </div>
    </SystemStatusProvider>
  );
}

export default App;
