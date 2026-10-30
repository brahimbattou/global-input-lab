import test from 'node:test';
import assert from 'node:assert/strict';
import { HomoglyphDetector } from '../../src/core/homoglyph-detector.js';

test('HomoglyphDetector - detects Cyrillic confusable in Latin text', () => {
  const detector = new HomoglyphDetector();

  // '\u0430' is Cyrillic small letter a
  const spoofedAdmin = '\u0430dmin';
  const report = detector.detect(spoofedAdmin);

  assert.equal(report.hasHomoglyphs, true);
  assert.equal(report.matches.length, 1);
  assert.equal(report.matches[0].confusableWith, 'a');
  assert.equal(report.matches[0].sourceScript, 'Cyrillic');
  assert.equal(report.normalizedLatinPreview, 'admin');
});

test('HomoglyphDetector - correctly verifies safe ASCII strings', () => {
  const detector = new HomoglyphDetector();
  const safe = 'regular_username_123';
  const report = detector.detect(safe);

  assert.equal(report.hasHomoglyphs, false);
  assert.equal(report.matches.length, 0);
  assert.equal(report.normalizedLatinPreview, safe);
});

test('HomoglyphDetector - converts fullwidth characters', () => {
  const detector = new HomoglyphDetector();
  // 'Ａ' is fullwidth Latin capital A (U+FF21)
  const fullwidth = 'ＡＢＣ';
  const report = detector.detect(fullwidth);

  assert.equal(report.hasHomoglyphs, true);
  assert.equal(report.matches.length, 3);
  assert.equal(report.normalizedLatinPreview, 'ABC');
});

test('HomoglyphDetector - canonicalizes confusable strings to Latin', () => {
  const detector = new HomoglyphDetector();
  const confusable = 'p\u0430yp\u0430l'; // Cyrillic 'а's
  const cleaned = detector.canonicalize(confusable);
  assert.equal(cleaned, 'paypal');
});
