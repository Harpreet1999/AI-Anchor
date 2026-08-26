import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { LockCircle } from "iconsax-react";
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
//
// Two rules combine, not one:
//  - "Earned" progress from real prerequisites — but only where skipping
//    one actually breaks something. Step 03 (Pick a Dataset) is the only
//    one of these: it calls useDataset() for all three cards on render,
//    which indexes into a per-track loader table — a null track throws
//    immediately, it doesn't degrade gracefully. Every step after that
//    (04-08) already renders a normal "nothing selected yet" placeholder
//    when its data isn't there, so they don't need a hard technical gate.
//  - "One step at a time" — whatever step comes right after wherever the
//    visitor currently is should always be clickable, even before
//    finishing the current one. Only jumping two-or-more steps past real
//    progress is what's actually blocked.
function computeMaxStep(activeStep, track, selectedId, retrievalData) {
  let earned = 1;
  if (track) earned = 3;
  if (selectedId) earned = 6;
  if (retrievalData) earned = 8;

  const adjacent = activeStep + 1;
  const hardCeiling = track ? 8 : 2; // Step 03+ needs a real track to render at all

  return Math.min(hardCeiling, Math.max(earned, adjacent));
}

function lockReason(n, activeStep, track) {
  if (n > 2 && !track) return "Go back to Step 01 and pick a stack first.";
  return `One step at a time — Step ${String(activeStep + 1).padStart(2, "0")} is next.`;
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

  // Steps swap in place (no real navigation, no page reload) — the
  // browser has no reason to reset scroll on its own, so without this,
  // whatever scroll position you'd reached on the previous step carries
  // straight over. Landing on a brand new step already scrolled halfway
  // down it (masthead cut off, jumping into mid-content) is exactly what
  // that looks like.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeStep]);

  const maxStep = computeMaxStep(activeStep, track, selectedId, retrievalData);

  // Every nav click (sidebar, top bar) goes through here instead of
  // setActiveStep directly — jumping ahead of what's actually been done
  // just shows why it's not reachable yet instead of silently jumping.
  const attemptNavigate = (n) => {
    if (n <= maxStep) {
      setActiveStep(n);
      return;
    }
    setLockedMsg(lockReason(n, activeStep, track));
    clearTimeout(lockedTimerRef.current);
    lockedTimerRef.current = setTimeout(() => setLockedMsg(""), 3600);
  };

  const dismissLockedMsg = () => {
    clearTimeout(lockedTimerRef.current);
    setLockedMsg("");
  };

  // Switching track mid-flow used to leave selectedId/retrievalData from
  // the OLD track sitting in state — since computeMaxStep's "earned"
  // ladder just checks whether those are truthy, not which track they
  // belong to, that meant every step stayed unlocked in the sidebar after
  // a track switch even though nothing had actually been redone for the
  // new track. Picking a genuinely different track now clears both, so
  // progress has to be re-earned for it, same as a fresh run.
  const handleSelectTrack = (newTrack) => {
    if (newTrack !== track) {
      setSelectedId(null);
      setRetrievalData(null);
      setActiveStep((s) => (s > 3 ? 3 : s));
    }
    setTrack(newTrack);
  };

  const handleSelectDataset = (id) => {
    setSelectedId(id);
    setProcessing(true);
    attemptNavigate(4);

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
        // Fixed to the viewport, not tucked under the top bar — the old
        // spot was easy to miss entirely if that bar had already scrolled
        // out of view when a locked step got clicked. This floats above
        // everything and stays put regardless of scroll position.
        <div className="nav-lock-toast" role="status" aria-live="polite">
          <LockCircle size={16} variant="Bold" color="currentColor" className="nav-lock-toast-icon" />
          <span>{lockedMsg}</span>
          <button type="button" className="nav-lock-toast-close" onClick={dismissLockedMsg} aria-label="Dismiss">✕</button>
        </div>
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
              <Step1StackPicker track={track} onSelectTrack={handleSelectTrack} onNext={() => attemptNavigate(2)} />
            )}
            {activeStep === 2 && (
              <Step2Intro onBack={() => setActiveStep(1)} onNext={() => attemptNavigate(3)} />
            )}
            {activeStep === 3 && (
              <Step3Select
                track={track}
                selectedId={selectedId}
                onSelectDataset={handleSelectDataset}
                onSelectTrack={handleSelectTrack}
                onBack={() => setActiveStep(2)}
              />
            )}
            {activeStep === 4 && (
              <Step4Preview
                track={track}
                selectedId={selectedId}
                processing={processing}
                onBack={() => setActiveStep(3)}
                onNext={() => attemptNavigate(5)}
              />
            )}
            {activeStep === 5 && (
              <Step5Embeddings
                track={track}
                selectedId={selectedId}
                onBack={() => setActiveStep(4)}
                onNext={() => attemptNavigate(6)}
              />
            )}
            {activeStep === 6 && (
              <Step6RetrievalPlan
                track={track}
                selectedId={selectedId}
                onBack={() => setActiveStep(5)}
                onNext={(data) => {
                  setRetrievalData(data);
                  attemptNavigate(7);
                }}
              />
            )}
            {activeStep === 7 && (
              <Step7Augment
                track={track}
                selectedId={selectedId}
                retrievalData={retrievalData}
                onBack={() => setActiveStep(6)}
                onNext={() => attemptNavigate(8)}
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
