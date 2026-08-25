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
// `accent` controls whether this box is the primary color or neutral —
// only the "in-between, being worked on" boxes (chunks, the prompt) are
// accent; the bookend source/answer shapes stay neutral.
function IsoBox({ cx, cy, s, h, lines = 0, accent = true }) {
  const { N, E, S, W } = isoTop(cx, cy, s);
  const down = ([x, y]) => [x, y + h];
  const textLines = Array.from({ length: lines }, (_, i) => {
    const t = (i + 1) / (lines + 1);
    return [lerp(S, down(S), t), lerp(E, down(E), t)];
  });
  return (
    <g className={accent ? "accent-mark" : undefined}>
      <polygon points={poly([S, E, down(E), down(S)])} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.3" />
      <polygon points={poly([W, S, down(S), down(W)])} fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.3" />
      <polygon points={poly([N, E, S, W])} fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.3" />
      {textLines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" strokeWidth="1" opacity="0.55" />
      ))}
    </g>
  );
}

// The grounded answer — deliberately not the same shape as the source
// document. A flat speech bubble (an answer being said), not an isometric
// box (a document being read): a rounded rect with a tail pointing back at
// the prompt it came from, one internal line kept accent-colored to mark
// the part that traces back to a retrieved chunk.
function AnswerBubble({ x, y, w, h, lines = 3 }) {
  const tailTipX = x - 16, tailTipY = y + h * 0.45;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
      <path d={`M${x + 2},${y + h * 0.32} L${tailTipX},${tailTipY} L${x + 2},${y + h * 0.56} Z`} fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
      {Array.from({ length: lines }, (_, i) => {
        const ly = y + 16 + i * 13;
        const lw = i === lines - 1 ? w * 0.45 : w - 24;
        const isAccent = i === 1;
        return (
          <line
            key={i}
            x1={x + 12} y1={ly} x2={x + 12 + lw} y2={ly}
            stroke="currentColor"
            className={isAccent ? "accent-mark" : undefined}
            strokeWidth={isAccent ? 1.6 : 1}
            opacity={isAccent ? 1 : 0.5}
          />
        );
      })}
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

// A long, thin, curved connector between two stages — a quadratic bezier
// bowed perpendicular to the line it replaces, computed so it works at any
// angle instead of hand-picked control points per arrow.
function FlowArrow({ x1, y1, x2, y2, bow = 16, markerId, strokeWidth = 1 }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const cx = mx + px * bow, cy = my + py * bow;
  return (
    <path
      d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      markerEnd={`url(#${markerId})`}
    />
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
      style={{ margin: "0 auto", maxWidth: 580 }}
    >
      <svg viewBox="0 0 760 320" width="100%" style={{ height: "auto" }}>
        <text x="18" y="26" fontSize="10.5" fontFamily="Space Mono, monospace" letterSpacing="0.08em" fill="currentColor" opacity="0.45">FIG. 01</text>

        {/* source document */}
        <IsoBox cx={128} cy={128} s={46} h={62} lines={4} accent={false} />
        <Callout x1={92} y1={190} x2={70} y2={230} labelX={70} labelY={244} anchor="middle">SOURCE DOCUMENT</Callout>

        {/* split */}
        <FlowArrow x1={180} y1={128} x2={280} y2={128} bow={-20} markerId="heroArrow" />
        <text x={230} y={98} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">split</text>

        {/* three chunks, cascading like the reference cube clusters */}
        <IsoBox cx={330} cy={92} s={24} h={26} />
        <IsoBox cx={362} cy={136} s={24} h={26} />
        <IsoBox cx={330} cy={180} s={24} h={26} />
        <Callout x1={362} y1={196} x2={362} y2={234} labelX={362} labelY={248} anchor="middle">3 CHUNKS</Callout>

        {/* embed */}
        <FlowArrow x1={392} y1={136} x2={472} y2={136} bow={-20} markerId="heroArrow" />
        <text x={432} y={106} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">embed</text>

        {/* embedding space: a plane with points floating above it */}
        <IsoPlane cx={610} cy={190} s={120} />
        <FloatingPoint x={634} y={178} h={44} />
        <FloatingPoint x={666} y={196} h={64} />
        <FloatingPoint x={598} y={210} h={26} />
        <Callout x1={610} y1={250} x2={610} y2={280} labelX={610} labelY={294} anchor="middle">EMBEDDING SPACE</Callout>

        <defs>
          <marker id="heroArrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
            <polygon points="0 0,8 3.5,0 7" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <figcaption className="sr-only">A source document splits into three chunks, then each chunk is embedded as a point floating above a plane representing vector space.</figcaption>
    </figure>
  );
}

export function RetrieveGenerateDiagram() {
  return (
    <figure
      role="img"
      aria-label="An isometric diagram: a question arrives at the indexed points and captures its two nearest neighbors, which are retrieved as chunks, merged into a prompt, and generated into a grounded answer."
      style={{ margin: "0 auto", maxWidth: 580 }}
    >
      <svg viewBox="0 0 760 320" width="100%" style={{ height: "auto" }}>
        <text x="18" y="26" fontSize="10.5" fontFamily="Space Mono, monospace" letterSpacing="0.08em" fill="currentColor" opacity="0.45">FIG. 02</text>

        {/* a question arrives at the already-indexed points */}
        <FlowArrow x1={150} y1={64} x2={150} y2={140} bow={18} markerId="rgArrow" />
        <text x={150} y={54} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">ask</text>

        <IsoPlane cx={150} cy={190} s={100} />
        <circle cx={185} cy={175} r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx={115} cy={205} r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx={195} cy={215} r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx={150} cy={192} r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
        <line x1={150} y1={192} x2={185} y2={175} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1={150} y1={192} x2={115} y2={205} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx={150} cy={192} r="4.5" fill="currentColor" className="accent-mark" />
        <Callout x1={150} y1={244} x2={150} y2={266} labelX={150} labelY={280} anchor="middle">THE INDEX</Callout>

        {/* retrieve */}
        <FlowArrow x1={252} y1={192} x2={304} y2={172} bow={-20} markerId="rgArrow" />
        <text x={278} y={148} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">retrieve</text>

        {/* the 2 captured chunks */}
        <IsoBox cx={330} cy={130} s={22} h={24} />
        <IsoBox cx={330} cy={195} s={22} h={24} />
        <Callout x1={330} y1={231} x2={330} y2={252} labelX={330} labelY={266} anchor="middle">TOP-2 CHUNKS</Callout>

        {/* augment: both chunks converge into one prompt */}
        <line x1={362} y1={130} x2={412} y2={165} stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <line x1={362} y1={195} x2={412} y2={175} stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <text x={400} y={140} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">augment</text>
        <IsoBox cx={452} cy={170} s={32} h={36} />
        <Callout x1={452} y1={228} x2={452} y2={250} labelX={452} labelY={264} anchor="middle">PROMPT</Callout>

        {/* generate */}
        <FlowArrow x1={491} y1={174} x2={589} y2={145} bow={-20} markerId="rgArrow" />
        <text x={540} y={118} textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.65">generate</text>

        {/* the grounded answer — a speech bubble, not a document: this is an
            answer being generated, not a file being read */}
        <AnswerBubble x={600} y={105} w={112} h={90} lines={3} />
        <Callout x1={608} y1={196} x2={634} y2={230} labelX={634} labelY={244} anchor="middle">GROUNDED ANSWER</Callout>

        <defs>
          <marker id="rgArrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
            <polygon points="0 0,8 3.5,0 7" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <figcaption className="sr-only">A question arrives at the indexed points, captures its two nearest neighbors, which are retrieved as chunks, merged into a prompt, and generated into a grounded answer — one line of which traces back to a retrieved chunk.</figcaption>
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

export function CookGlyph() {
  return (
    <figure role="img" aria-label="A recipe card beside a measuring spoon.">
      <svg viewBox="0 0 120 40" width="100%" style={{ maxWidth: 110, height: 36 }}>
        <rect x="10" y="4" width="62" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="18" y1="14" x2="58" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <line x1="18" y1="21" x2="52" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <line x1="18" y1="28" x2="44" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <circle cx="96" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="96" y1="19" x2="96" y2="34" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}

// A named-technology flowchart (not an abstract mechanism diagram like the
// figures above) — one shared start, two labeled tool chains, one shared
// end. The active track's chain is drawn in the accent color; the other
// stays neutral, mirroring the live app-wide color swap.
// A swim-lane backdrop for one track's row — turns "three floating boxes"
// into "a labeled lane," and doubles as the active/inactive indicator so
// the whole row reads as one track, not just its individual boxes. Each
// lane is taller than the row of chain boxes it holds, and the label
// sits in that extra space — above the boxes for the top (Node) lane,
// below them for the bottom (Python) lane, lined up over the Embed
// column — instead of at the lane's left edge, which used to sit right
// where the entry arrow lands and get visually cut through by the curve.
function Lane({ x, y, w, h, label, labelX, labelY, active }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx="6"
        className={active ? "accent-mark" : undefined}
        fill="currentColor" fillOpacity={active ? 0.06 : 0.03}
        stroke="currentColor" strokeWidth="1.2" opacity={active ? 0.9 : 0.4}
      />
      <text
        x={labelX} y={labelY} textAnchor="middle" fontSize="13" fontWeight="700"
        fontFamily="Space Mono, monospace" letterSpacing="0.05em" fill="currentColor"
        className={active ? "accent-mark" : undefined} opacity={active ? 1 : 0.55}
      >{label}</text>
    </g>
  );
}

function ChainBox({ x, y, w, h, label, sub, active }) {
  return (
    <g className={active ? "accent-mark" : undefined} opacity={active ? 1 : 0.55}>
      <rect x={x} y={y} width={w} height={h} rx="2" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.3" />
      <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="Space Mono, monospace" fill="currentColor">{label}</text>
      <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize="8.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.7">{sub}</text>
    </g>
  );
}

export function StackFlowDiagram({ track }) {
  const nodeActive = track === "node";
  const pyActive = track === "python";
  return (
    <figure
      role="img"
      aria-label="A shared set of datasets branches sideways into a Node.js tool chain on top and a Python tool chain below it, each doing chunk, embed, and retrieve left to right, converging into a shared augment step and then a shared generate step."
    >
      <svg viewBox="0 0 1410 290" width="100%" style={{ display: "block", height: "auto" }}>
        <text x="18" y="22" fontSize="11" fontFamily="Space Mono, monospace" letterSpacing="0.08em" fill="currentColor" opacity="0.45">FIG. 00</text>

        <rect x="16" y="98" width="110" height="56" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
        <text x="71" y="130" textAnchor="middle" fontSize="10.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.8">3 DATASETS</text>

        {/* Node's lane grew upward (extra room above its boxes), Python's
            grew downward (extra room below) — the inner edges facing each
            other, and everything between them (the arrows, the shared
            Augment/Generate boxes), are untouched. */}
        <Lane x={230} y={10} w={780} h={106} label="NODE" labelX={640} labelY={38} active={nodeActive} />
        <Lane x={230} y={152} w={780} h={106} label="PYTHON" labelX={640} labelY={240} active={pyActive} />

        <FlowArrow x1={126} y1={116} x2={324} y2={78} bow={-34} markerId="stackArrow" strokeWidth={1.4} />
        <FlowArrow x1={126} y1={136} x2={324} y2={190} bow={34} markerId="stackArrow" strokeWidth={1.4} />

        <ChainBox x={330} y={58} w={170} h={44} label="Chunk" sub="Node.js splitter" active={nodeActive} />
        <ChainBox x={555} y={58} w={170} h={44} label="Embed" sub="Xenova (JS)" active={nodeActive} />
        <ChainBox x={780} y={58} w={170} h={44} label="Retrieve" sub="Cosine / Upstash" active={nodeActive} />

        <ChainBox x={330} y={170} w={170} h={44} label="Chunk" sub="LangChain splitter" active={pyActive} />
        <ChainBox x={555} y={170} w={170} h={44} label="Embed" sub="Sentence-Transf." active={pyActive} />
        <ChainBox x={780} y={170} w={170} h={44} label="Retrieve" sub="ChromaDB" active={pyActive} />

        <FlowArrow x1={500} y1={80} x2={555} y2={80} bow={-14} markerId="stackArrow" strokeWidth={1.4} />
        <FlowArrow x1={725} y1={80} x2={780} y2={80} bow={-14} markerId="stackArrow" strokeWidth={1.4} />
        <FlowArrow x1={500} y1={192} x2={555} y2={192} bow={14} markerId="stackArrow" strokeWidth={1.4} />
        <FlowArrow x1={725} y1={192} x2={780} y2={192} bow={14} markerId="stackArrow" strokeWidth={1.4} />

        {/* Both lanes converge — augment and generate are shared, single
            steps, not a forked pair, so they're drawn on the lane
            midline instead of doubled top and bottom like the boxes
            above. This is the part FIG. 00 used to skip straight past
            with one vague "AGENT + LLM" box; now every one of the 6 real
            pipeline stages (see Step 02) has its own labeled box here. */}
        <FlowArrow x1={950} y1={80} x2={1030} y2={116} bow={-26} markerId="stackArrow" strokeWidth={1.4} />
        <FlowArrow x1={950} y1={192} x2={1030} y2={136} bow={26} markerId="stackArrow" strokeWidth={1.4} />

        <ChainBox x={1030} y={98} w={150} h={56} label="Augment" sub="Build the prompt" active={nodeActive || pyActive} />
        <FlowArrow x1={1180} y1={126} x2={1230} y2={126} bow={-14} markerId="stackArrow" strokeWidth={1.4} />
        <ChainBox x={1230} y={98} w={150} h={56} label="Generate" sub="Groq · GPT-OSS 120B" active={nodeActive || pyActive} />

        <text x={1105} y={172} textAnchor="middle" fontSize="8.5" fontFamily="Space Mono, monospace" fill="currentColor" opacity="0.55">shared — JS either way, no second runtime</text>

        <defs>
          <marker id="stackArrow" markerWidth="11" markerHeight="11" refX="8" refY="4" orient="auto">
            <polygon points="0 0,9 4,0 8" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <figcaption className="sr-only">
        Both tracks start from the same three datasets. Node.js chunks with a hand-rolled splitter,
        embeds with Xenova, and retrieves with cosine similarity or Upstash Vector. Python chunks
        with LangChain, embeds with Sentence-Transformers, and retrieves with ChromaDB. Both
        converge into a shared augment step that builds the prompt, then a shared generate step
        that calls Groq's GPT-OSS 120B — the full six-stage pipeline, not just the first half.
      </figcaption>
    </figure>
  );
}

