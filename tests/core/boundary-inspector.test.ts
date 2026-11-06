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

  const clean = 'No errors here';
  assert.deepEqual(inspector.findReplacementCharacters(clean), []);
});

test('BoundaryInspector - returns unchanged when maxBytes >= originalBytes', () => {
  const inspector = new BoundaryInspector();
  const text = 'Short text';
  const analysis = inspector.analyzeByteTruncation(text, 100);

  assert.equal(analysis.wouldCorrupt, false);
  assert.equal(analysis.safeText, text);
  assert.equal(analysis.safeBytes, Buffer.byteLength(text, 'utf8'));
  assert.equal(analysis.lostCharactersCount, 0);
});

test('BoundaryInspector - safely truncates 2-byte UTF-8 sequences (Arabic / accented Latin)', () => {
  const inspector = new BoundaryInspector();
  // 'ع' is 2 bytes (0xD8 0xB9) in UTF-8
  const text = 'ABCعDEF'; // 3 ASCII + 2 Arabic + 3 ASCII = 8 bytes
  // Truncating at 4 bytes would cut 'ع' in half (only 1 byte of it)
  const analysis = inspector.analyzeByteTruncation(text, 4);

  assert.equal(analysis.wouldCorrupt, true);
  assert.equal(analysis.safeText, 'ABC');
  assert.equal(analysis.safeBytes, 3);
});

test('BoundaryInspector - safely truncates 4-byte astral UTF-8 sequences (Emoji)', () => {
  const inspector = new BoundaryInspector();
  // '🚀' is 4 bytes (0xF0 0x9F 0x9A 0x80)
  const text = 'Launch 🚀 Now'; // 7 ASCII + 4 Emoji + 4 ASCII = 15 bytes
  // Truncate at 8 bytes (7 bytes for 'Launch ' + 1 byte into '🚀')
  const analysis8 = inspector.analyzeByteTruncation(text, 8);
  assert.equal(analysis8.wouldCorrupt, true);
  assert.equal(analysis8.safeText, 'Launch ');
  assert.equal(analysis8.safeBytes, 7);

  // Truncate at 10 bytes (7 bytes for 'Launch ' + 3 bytes into '🚀')
  const analysis10 = inspector.analyzeByteTruncation(text, 10);
  assert.equal(analysis10.wouldCorrupt, true);
  assert.equal(analysis10.safeText, 'Launch ');
  assert.equal(analysis10.safeBytes, 7);

  // Truncate at 11 bytes (7 bytes + 4 bytes = exactly fits 🚀)
  const analysis11 = inspector.analyzeByteTruncation(text, 11);
  assert.equal(analysis11.wouldCorrupt, false);
  assert.equal(analysis11.safeText, 'Launch 🚀');
  assert.equal(analysis11.safeBytes, 11);
});

test('BoundaryInspector - detects lone low surrogate without high surrogate', () => {
  const inspector = new BoundaryInspector();
  // Lone low surrogate \uDC00 without preceding high surrogate
  const broken = '\uDC00Start';
  const surrogates = inspector.findLoneSurrogates(broken);

  assert.equal(surrogates.length, 1);
  assert.equal(surrogates[0].type, 'low_surrogate');
  assert.equal(surrogates[0].codeUnit, 0xdc00);
});

test('BoundaryInspector - detects lone high surrogate at the end of string', () => {
  const inspector = new BoundaryInspector();
  const broken = 'End\uD800';
  const surrogates = inspector.findLoneSurrogates(broken);

  assert.equal(surrogates.length, 1);
  assert.equal(surrogates[0].type, 'high_surrogate');
  assert.equal(surrogates[0].codeUnit, 0xd800);
});

test('BoundaryInspector - ignores valid paired surrogate characters', () => {
  const inspector = new BoundaryInspector();
  // '🚀' = \uD83D\uDE80
  const validEmoji = 'Rocket \uD83D\uDE80 flies';
  const surrogates = inspector.findLoneSurrogates(validEmoji);

  assert.equal(surrogates.length, 0);
});
