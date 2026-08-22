export default function StepNav({ onBack, backLabel, onNext, nextLabel, nextDisabled }) {
  if (!onBack && !onNext) return null;
  return (
    <div className="step-nav">
      {onBack ? (
        <button className="step-nav-btn back" onClick={onBack}>← {backLabel || "Back"}</button>
      ) : <span />}
      {onNext ? (
        <button className="step-nav-btn next" onClick={onNext} disabled={nextDisabled}>
          {nextLabel || "Next"} →
        </button>
      ) : <span />}
    </div>
  );
}
