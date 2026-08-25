// A second, deliberately different icon language for the live-position
// timeline rail (PipelineTimeline.jsx) — small, abstract, monoline glyphs,
// not the detailed isometric-style icons Step 02's grid uses. Each one's
// artwork is centered on its own 24x24 viewBox (unlike the FIG. icons,
// whose content sits off-center within a wider frame), so simple CSS
// centering on the wrapper is enough — no drifting glyphs in the rail.
const COMMON = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function TimelineSourceIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
    </svg>
  );
}

export function TimelineChunkIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <rect x="3.5" y="9" width="4.5" height="6" rx="0.5" />
      <rect x="9.75" y="9" width="4.5" height="6" rx="0.5" />
      <rect x="16" y="9" width="4.5" height="6" rx="0.5" />
    </svg>
  );
}

export function TimelineEmbedIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" strokeDasharray="1.5 3" opacity="0.55" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TimelineRetrieveIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <line x1="15" y1="15" x2="19.5" y2="19.5" />
    </svg>
  );
}

export function TimelineAugmentIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function TimelineGenerateIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M12 3.5 L13.6 10.4 L20.5 12 L13.6 13.6 L12 20.5 L10.4 13.6 L3.5 12 L10.4 10.4 Z" strokeLinejoin="round" />
    </svg>
  );
}

export const TIMELINE_ICON_BY_KEY = {
  source: TimelineSourceIcon,
  chunk: TimelineChunkIcon,
  embed: TimelineEmbedIcon,
  retrieve: TimelineRetrieveIcon,
  augment: TimelineAugmentIcon,
  generate: TimelineGenerateIcon,
};
