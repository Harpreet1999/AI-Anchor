// Pulls a short, real excerpt out of a raw source file for display in the
// "source vs. indexed" viewer. This is presentation-only — it does not
// chunk anything; that stays entirely in scripts/build-datasets.mjs, run
// offline. This just proves the excerpt shown is the actual file, not a
// hand-typed copy that can quietly drift from the source.

export function extractHeadingSection(raw, heading) {
  const lines = raw.split("\n");
  const startIdx = lines.findIndex((l) => l.trim() === heading);
  if (startIdx === -1) return "";
  const rest = lines.slice(startIdx + 1);
  const endIdx = rest.findIndex((l) => /^##\s+/.test(l));
  const body = endIdx === -1 ? rest : rest.slice(0, endIdx);
  return [heading, ...body].join("\n").trim();
}

export function excerptChars(raw, marker, chars) {
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw.slice(0, chars);
  return raw.slice(idx, idx + chars).trim();
}
