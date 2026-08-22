// Small hand-authored line diagrams. Each one draws the actual mechanism
// for its pipeline stage (not a decorative icon) — see design/DECISIONS
// context: this is the one visual idea kept from the rejected "Pipeline
// Diagrams" direction.

// ---------------------------------------------------------------------
// Isometric helpers (2:1 "pixel-art" isometric — 26.57°, not true 30°;
// visually reads as isometric and every coordinate is a clean multiple,
// so the boxes below are computed, not eyeballed by hand).
// ---------------------------------------------------------------------
const pt = (p) => p.join(",");
const poly = (pts) => pts.map(pt).join(" ");
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function isoTop(cx, cy, s) {
  return { N: [cx, cy - s / 2], E: [cx + s, cy], S: [cx, cy + s / 2], W: [cx - s, cy] };
}

// A 3-face isometric box: top (lit), left, right (both shaded darker via
// fill-opacity only — no gradients, still theme-safe via currentColor).
function IsoBox({ cx, cy, s, h, lines = 0 }) {
  const { N, E, S, W } = isoTop(cx, cy, s);
  const down = ([x, y]) => [x, y + h];
  const textLines = Array.from({ length: lines }, (_, i) => {
    const t = (i + 1) / (lines + 1);
    return [lerp(S, down(S), t), lerp(E, down(E), t)];
  });
  return (
    <g>
      <polygon points={poly([S, E, down(E), down(S)])} fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.3" />
      <polygon points={poly([W, S, down(S), down(W)])} fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.3" />
      <polygon points={poly([N, E, S, W])} fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.3" />
      {textLines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" strokeWidth="1" opacity="0.55" />
      ))}
    </g>
  );
}

// A flat isometric plane (the "ground" of embedding space) with its two
// axes drawn as faint internal diagonals.
function IsoPlane({ cx, cy, s }) {
  const { N, E, S, W } = isoTop(cx, cy, s);
  return (
    <g>
      <polygon points={poly([N, E, S, W])} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
      <line x1={N[0]} y1={N[1]} x2={S[0]} y2={S[1]} stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <line x1={W[0]} y1={W[1]} x2={E[0]} y2={E[1]} stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </g>
  );
}

// A point "floating" above the plane — an accent dot at height, a dashed
// drop-line, and a hollow shadow marking where it actually sits.
function FloatingPoint({ x, y, h }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - h} stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
      <circle cx={x} cy={y} r="2.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx={x} cy={y - h} r="4.5" fill="currentColor" className="accent-mark" />
    </g>
  );
}

function Callout({ x1, y1, x2, y2, labelX, labelY, anchor = "start", children }) {
  return (
    <g opacity="0.75">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx={x1} cy={y1} r="2" fill="currentColor" opacity="0.5" />
      <text x={labelX} y={labelY} textAnchor={anchor} fontSize="10" fontFamily="Space Mono, monospace" letterSpacing="0.06em" fill="currentColor" opacity="0.6">
        {children}
      </text>
    </g>
  );
}

export function HeroDiagram() {
  return (
    <figure
      role="img"
      aria-label="An isometric diagram: a source document splits into three chunks, which are embedded as points floating above a plane representing vector space."
      style={{ margin: "40px auto 0", maxWidth: 720 }}
    >
      <svg viewBox="0 0 760 320" width="100%" style={{ height: "auto" }}>
        <text x="18" y="26" fontSize="10.5" fontFamily="Space Mono, monospace" letterSpacing="0.08em" fill="currentColor" opacity="0.45">FIG. 01</text>

        {/* source document */}
        <IsoBox cx={128} cy={128} s={46} h={62} lines={4} />
        <Callout x1={92} y1={190} x2={70} y2={230} labelX={70} labelY={244} anchor="middle">SOURCE DOCUMENT</Callout>

        {/* split */}
        <line x1={186} y1={128} x2={244} y2={128} stroke="currentColor" strokeWidth="1.5" markerEnd="url(#heroArrow)" />
        <text x={215} y={117} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">split</text>

        {/* three chunks, cascading like the reference cube clusters */}
        <IsoBox cx={330} cy={92} s={24} h={26} />
        <IsoBox cx={362} cy={136} s={24} h={26} />
        <IsoBox cx={330} cy={180} s={24} h={26} />
        <Callout x1={362} y1={196} x2={362} y2={234} labelX={362} labelY={248} anchor="middle">3 CHUNKS</Callout>

        {/* embed */}
        <line x1={402} y1={136} x2={452} y2={136} stroke="currentColor" strokeWidth="1.5" markerEnd="url(#heroArrow)" />
        <text x={427} y={125} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">embed</text>

        {/* embedding space: a plane with points floating above it */}
        <IsoPlane cx={610} cy={190} s={120} />
        <FloatingPoint x={634} y={178} h={44} />
        <FloatingPoint x={666} y={196} h={64} />
        <FloatingPoint x={598} y={210} h={26} />
        <Callout x1={610} y1={250} x2={610} y2={280} labelX={610} labelY={294} anchor="middle">EMBEDDING SPACE</Callout>

        <defs>
          <marker id="heroArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <polygon points="0 0,7 3,0 6" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <figcaption className="sr-only">A source document splits into three chunks, then each chunk is embedded as a point floating above a plane representing vector space.</figcaption>
    </figure>
  );
}

function IconFrame({ label, children }) {
  return (
    <figure role="img" aria-label={label}>
      <svg viewBox="0 0 90 72" width="100%" style={{ maxWidth: 80, height: 64 }}>
        {children}
      </svg>
    </figure>
  );
}

export function SourceIcon() {
  return (
    <IconFrame label="A document page with lines of text.">
      <rect x="18" y="6" width="54" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="28" y1="22" x2="62" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <line x1="28" y1="33" x2="62" y2="33" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <line x1="28" y1="44" x2="54" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <line x1="28" y1="55" x2="62" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
    </IconFrame>
  );
}

export function ChunkIcon() {
  return (
    <IconFrame label="The document split into three separate blocks.">
      <rect x="14" y="6" width="62" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="28" width="62" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="50" width="62" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  );
}

export function EmbedIcon() {
  return (
    <IconFrame label="A block turning into a point plotted among other points.">
      <rect x="10" y="30" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="32" y1="37" x2="46" y2="37" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#embedArrow)" />
      <line x1="52" y1="10" x2="52" y2="64" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="52" y1="64" x2="82" y2="64" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="62" cy="24" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="72" cy="46" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="66" cy="55" r="3.5" fill="currentColor" className="accent-mark" />
      <defs><marker id="embedArrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="currentColor" /></marker></defs>
    </IconFrame>
  );
}

export function RetrieveIcon() {
  return (
    <IconFrame label="A query point with a search radius capturing its nearest neighbors.">
      <circle cx="45" cy="38" r="18" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
      <circle cx="45" cy="38" r="3.5" fill="currentColor" className="accent-mark" />
      <circle cx="58" cy="26" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="32" cy="50" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="75" cy="55" r="3" fill="currentColor" opacity="0.3" />
      <line x1="45" y1="38" x2="58" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="45" y1="38" x2="32" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </IconFrame>
  );
}

export function AugmentIcon() {
  return (
    <IconFrame label="Three retrieved chunks merging into one prompt.">
      <rect x="8" y="10" width="26" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="28" width="26" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="46" width="26" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="36" y1="16" x2="52" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="36" y1="34" x2="52" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="36" y1="52" x2="52" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="54" y="24" width="28" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" className="accent-mark" />
    </IconFrame>
  );
}

export function GenerateIcon() {
  return (
    <IconFrame label="A prompt box with an arrow into an answer box of generated text.">
      <rect x="8" y="26" width="26" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="36" y1="36" x2="50" y2="36" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#genArrow)" />
      <rect x="52" y="14" width="30" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" className="accent-mark" />
      <line x1="58" y1="26" x2="76" y2="26" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="58" y1="36" x2="76" y2="36" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="58" y1="46" x2="70" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <defs><marker id="genArrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="currentColor" /></marker></defs>
    </IconFrame>
  );
}

export function ProseGlyph() {
  return (
    <figure role="img" aria-label="Lines of prose text.">
      <svg viewBox="0 0 120 40" width="100%" style={{ maxWidth: 110, height: 36 }}>
        <line x1="4" y1="8" x2="90" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <line x1="4" y1="18" x2="110" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <line x1="4" y1="28" x2="70" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </figure>
  );
}

export function BarGlyph() {
  return (
    <figure role="img" aria-label="A small bar chart.">
      <svg viewBox="0 0 120 40" width="100%" style={{ maxWidth: 110, height: 36 }}>
        <line x1="4" y1="34" x2="116" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <rect x="14" y="14" width="12" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="38" y="6" width="12" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="62" y="20" width="12" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="86" y="10" width="12" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}

export function BookGlyph() {
  return (
    <figure role="img" aria-label="Two stacked pages.">
      <svg viewBox="0 0 120 40" width="100%" style={{ maxWidth: 110, height: 36 }}>
        <rect x="18" y="4" width="66" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <rect x="10" y="9" width="66" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="20" y1="19" x2="62" y2="19" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <line x1="20" y1="27" x2="52" y2="27" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </figure>
  );
}
