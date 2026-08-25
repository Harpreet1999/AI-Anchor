import { useEffect, useState } from "react";
import { ArrowRight2 } from "iconsax-react";
import { STAGES } from "./PipelineGrid.jsx";
import { TIMELINE_ICON_BY_KEY } from "./timelineIcons.jsx";

const COLLAPSE_KEY = "ai-anchor-timeline-collapsed";

// Which of the 6 real pipeline stages a given app step corresponds to.
// Steps 1 (Pick a Stack) and 2 (How It Works) are framing/overview steps,
// not a specific stage of the pipeline itself, so nothing is highlighted
// for those — highlighting one would be a false claim about where in the
// pipeline the visitor actually is.
const STEP_TO_STAGE_INDEX = { 3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5 };

// A live, always-visible read of exactly where the visitor is in the real
// pipeline — the same six stages and icons Step 02's grid uses, just
// stacked vertically instead of in a 3-column grid, so it can sit in a
// collapsible rail next to the content on every step, not just Step 02.
export default function PipelineTimeline({ activeStep }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved !== null) setCollapsed(saved === "1");
    } catch {
      // localStorage unavailable — just defaults to expanded, non-fatal
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* non-fatal */ }
      return next;
    });
  };

  const currentIndex = STEP_TO_STAGE_INDEX[activeStep];

  return (
    <aside className={`timeline-rail${collapsed ? " collapsed" : ""}`} aria-label="Live pipeline position">
      <button type="button" className="timeline-toggle" onClick={toggle} aria-expanded={!collapsed} title={collapsed ? "Show pipeline timeline" : "Hide pipeline timeline"}>
        <ArrowRight2 size={13} variant="Outline" color="currentColor" style={{ transform: collapsed ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
        <span className="timeline-toggle-label">{collapsed ? "View Timeline" : "Hide Timeline"}</span>
      </button>

      {!collapsed && (
        <div className="timeline-body">
          <div className="timeline-head">
            <span>VISUAL TIMELINE</span>
          </div>
          <div className="timeline-track">
            {STAGES.map((s, i) => {
              const isCurrent = i === currentIndex;
              const isPast = currentIndex !== undefined && i < currentIndex;
              const Icon = TIMELINE_ICON_BY_KEY[s.key];
              return (
                <div key={s.num} className={`timeline-node${isCurrent ? " current" : ""}${isPast ? " past" : ""}`}>
                  <div className="timeline-node-row">
                    <div className="timeline-node-icon">
                      <Icon />
                    </div>
                    <div className="timeline-node-label">
                      <span className="timeline-node-num">{s.num}</span>
                      <span className="timeline-node-title">{s.title}</span>
                    </div>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="timeline-connector" aria-hidden="true">
                      <div className="timeline-connector-fill" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="timeline-foot">
            {currentIndex === undefined
              ? "This step isn't one specific pipeline stage."
              : `You're on stage ${currentIndex + 1} of ${STAGES.length}, live.`}
          </div>
        </div>
      )}
    </aside>
  );
}
