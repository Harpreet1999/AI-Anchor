import test from 'node:test';
import assert from 'node:assert/strict';

import { cosineSimilarity, rankChunks } from '../src/lib/retrieval.js';

test('cosineSimilarity returns the expected value for aligned vectors', () => {
  const a = [1, 0, 0];
  const b = [1, 0, 0];
  assert.equal(cosineSimilarity(a, b), 1);
});

test('rankChunks returns top results in descending similarity order', () => {
  const chunks = [
    { id: 'c1', text: 'alpha', embedding: [1, 0, 0] },
    { id: 'c2', text: 'beta', embedding: [0, 1, 0] },
    { id: 'c3', text: 'gamma', embedding: [0.8, 0.6, 0] },
  ];

  const results = rankChunks([1, 0, 0], chunks, 2);

  assert.equal(results.length, 2);
  assert.equal(results[0].chunkId, 'c1');
  assert.equal(results[1].chunkId, 'c3');
});
