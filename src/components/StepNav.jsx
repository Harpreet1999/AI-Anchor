import { ArrowLeft2, ArrowRight2 } from "iconsax-react";

export default function StepNav({ onBack, backLabel, onNext, nextLabel, nextDisabled }) {
  if (!onBack && !onNext) return null;
  return (
    <div className="step-nav">
      {onBack ? (
        <button className="step-nav-btn back" onClick={onBack}>
          <ArrowLeft2 size={16} variant="Outline" color="currentColor" /> {backLabel || "Back"}
        </button>
      ) : <span />}
      {onNext ? (
        <button className="step-nav-btn next" onClick={onNext} disabled={nextDisabled}>
          {nextLabel || "Next"} <ArrowRight2 size={16} variant="Outline" color="currentColor" />
        </button>
      ) : <span />}
    </div>
  );
}
