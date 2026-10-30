import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundTripVerifier } from '../../src/core/round-trip.js';

test('RoundTripVerifier - verifies identical byte and string preservation', () => {
  const verifier = new RoundTripVerifier();
  const input = 'José-María Núñez-González (李小龙)';
  const result = verifier.verify(input, input);

  assert.equal(result.identical, true);
  assert.equal(result.bytePreserved, true);
  assert.equal(result.lengthDelta, 0);
  assert.equal(result.introducedReplacementChar, false);
});

test('RoundTripVerifier - pinpoints exact character mismatch and replacement chars', () => {
  const verifier = new RoundTripVerifier();
  const original = 'Hello World';
  const corrupted = 'Hello\uFFFDWorld';

  const result = verifier.verify(original, corrupted);
  assert.equal(result.identical, false);
  assert.equal(result.introducedReplacementChar, true);
  assert.ok(result.diffDescription?.includes('Mismatch at character index 5'));
  assert.ok(result.diffDescription?.includes('U+FFFD'));
});

test('RoundTripVerifier - verifies JSON serialization fidelity', () => {
  const verifier = new RoundTripVerifier();
  const complexText = 'Complex: 👨‍👩‍👧‍👦, العربية, עברית, "quotes", \\backslashes\\';
  const result = verifier.verifyJsonSerialization(complexText);

  assert.equal(result.identical, true);
  assert.equal(result.bytePreserved, true);
});

test('RoundTripVerifier - verifies URI encoding round-trip fidelity', () => {
  const verifier = new RoundTripVerifier();
  const text = 'Query with spaces & ümlauts & 中文';
  const result = verifier.verifyUriEncoding(text);

  assert.equal(result.identical, true);
  assert.equal(result.bytePreserved, true);
});
