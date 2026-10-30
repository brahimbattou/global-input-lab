import test from 'node:test';
import assert from 'node:assert/strict';
import { BoundaryInspector } from '../../src/core/boundary-inspector.js';

test('BoundaryInspector - detects UTF-8 byte boundary truncation corruption', () => {
  const inspector = new BoundaryInspector();
  // '中' is 3 bytes in UTF-8 (0xE4, 0xB8, 0xAD)
  // 'Hello中' is 5 + 3 = 8 bytes
  const text = 'Hello中World';

  // Naive slice at 6 bytes would take 5 bytes of 'Hello' and 1 byte of '中', corrupting '中'
  const analysis = inspector.analyzeByteTruncation(text, 6);

  assert.equal(analysis.wouldCorrupt, true);
  assert.equal(analysis.safeText, 'Hello');
  assert.equal(analysis.safeBytes, 5);
});

test('BoundaryInspector - safe slice fits complete multi-byte character', () => {
  const inspector = new BoundaryInspector();
  const text = 'Hello中World';

  // Slice at 8 bytes exactly fits 'Hello中' (5 + 3 = 8 bytes)
  const analysis = inspector.analyzeByteTruncation(text, 8);

  assert.equal(analysis.wouldCorrupt, false);
  assert.equal(analysis.safeText, 'Hello中');
  assert.equal(analysis.safeBytes, 8);
});

test('BoundaryInspector - detects lone surrogate halves', () => {
  const inspector = new BoundaryInspector();
  // Lone high surrogate: \uD83D without low surrogate
  const brokenSurrogate = 'Bad\uD83DString';
  const surrogates = inspector.findLoneSurrogates(brokenSurrogate);

  assert.equal(surrogates.length, 1);
  assert.equal(surrogates[0].type, 'high_surrogate');
  assert.equal(surrogates[0].codeUnit, 0xd83d);
});

test('BoundaryInspector - identifies replacement characters (U+FFFD)', () => {
  const inspector = new BoundaryInspector();
  const corrupted = 'Data\uFFFDwith\uFFFDerrors';
  const indices = inspector.findReplacementCharacters(corrupted);

  assert.deepEqual(indices, [4, 9]);
});
