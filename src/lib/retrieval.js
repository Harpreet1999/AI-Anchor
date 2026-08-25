// Both tracks normalize every embedding to unit length at embed-time
// (Node: `normalize: true` in scripts/embed-datasets.mjs; Python:
// `normalize_embeddings=True` in build_datasets.py) — so for two unit
// vectors, a plain dot product already equals cosine similarity, no
// magnitude division needed. Same invariant Step5Embeddings.jsx relies on.
export function dot(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    total += a[i] * b[i];
  }
  return total;
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }
  return dot(a, b);
}

export function rankChunks(queryVector, chunks, limit = 3) {
  const ranked = chunks
    .map((chunk) => ({
      chunkId: chunk.id,
      title: chunk.title,
      source: chunk.source,
      section: chunk.section,
      text: chunk.text,
      score: cosineSimilarity(queryVector, chunk.embedding || []),
      metadata: chunk.metadata || {},
    }))
    .filter((result) => Number.isFinite(result.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}
