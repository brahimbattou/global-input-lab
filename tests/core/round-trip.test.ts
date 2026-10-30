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

test('RoundTripVerifier - direct byte verification detects invalid byte output 0x80 for U+FFFD', () => {
  const verifier = new RoundTripVerifier();
  const expectedBuf = Buffer.from('\uFFFD', 'utf8'); // [0xEF, 0xBF, 0xBD]
  const receivedBuf = Buffer.from([0x80]); // Invalid UTF-8 single byte

  const result = verifier.verify(expectedBuf, receivedBuf);

  assert.equal(result.bytePreserved, false, 'Invalid raw byte 0x80 must not be considered preserved');
  assert.equal(result.identical, false);
  assert.equal(result.firstByteMismatchOffset, 0);
  assert.ok(result.diffDescription?.includes('Byte mismatch at offset 0'));
  assert.ok(result.diffDescription?.includes('expected 0xEF, received 0x80'));
});

test('RoundTripVerifier - accepts identical raw byte buffers', () => {
  const verifier = new RoundTripVerifier();
  const euroBuf = Buffer.from('€', 'utf8'); // [0xE2, 0x82, 0xAC]
  const receivedBuf = Buffer.from([0xE2, 0x82, 0xAC]);

  const result = verifier.verify(euroBuf, receivedBuf);

  assert.equal(result.bytePreserved, true);
  assert.equal(result.identical, true);
});

