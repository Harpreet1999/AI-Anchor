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

  const numerator = dot(a, b);
  const aMagnitude = Math.sqrt(dot(a, a));
  const bMagnitude = Math.sqrt(dot(b, b));

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return numerator / (aMagnitude * bMagnitude);
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
