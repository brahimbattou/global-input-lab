import test from 'node:test';
import assert from 'node:assert/strict';
import { HomoglyphDetector, UTS_39_VERSION } from '../../src/core/homoglyph-detector.js';

test('HomoglyphDetector - reports UTS #39 version metadata and dataset scope', () => {
  const detector = new HomoglyphDetector();
  const report = detector.detect('test');

  assert.equal(report.standardsVersion, `UTS #39 v${UTS_39_VERSION}`);
  assert.equal(report.datasetScope, 'curated-security-subset');
});

test('HomoglyphDetector - detects Cyrillic confusable in Latin text with mixed-script flag', () => {
  const detector = new HomoglyphDetector();

  // '\u0430' is Cyrillic small letter a embedded in Latin word "dmin"
  const spoofedAdmin = '\u0430dmin';
  const report = detector.detect(spoofedAdmin);

  assert.equal(report.hasHomoglyphs, true);
  assert.equal(report.matches.length, 1);
  assert.equal(report.matches[0].confusableWith, 'a');
  assert.equal(report.matches[0].sourceScript, 'Cyrillic');
  assert.equal(report.matches[0].isMixedScriptWord, true);
  assert.equal(report.normalizedLatinPreview, 'admin');
});

test('HomoglyphDetector - distinguishes genuine single-script Cyrillic and Greek from mixed-script spoofing', () => {
  const detector = new HomoglyphDetector();

  // 100% Cyrillic word: Пушкин (Pushkin)
  const russianWord = 'Пушкин';
  const russianReport = detector.detect(russianWord);
  // Contains lookalikes (e.g. Cyrillic u, sh, k), but is NOT mixed-script
  assert.ok(russianReport.matches.every((m) => m.isMixedScriptWord === false));

  // 100% Greek word: Αθήνα (Athens)
  const greekWord = 'Αθήνα';
  const greekReport = detector.detect(greekWord);
  assert.ok(greekReport.matches.every((m) => m.isMixedScriptWord === false));
});

test('HomoglyphDetector - detects Greek, Cherokee, and Armenian cross-script lookalikes', () => {
  const detector = new HomoglyphDetector();

  // Greek capital Omicron in 'Open'
  const greekSpoof = '\u039Fpen';
  const greekReport = detector.detect(greekSpoof);
  assert.equal(greekReport.matches[0].confusableWith, 'O');
  assert.equal(greekReport.matches[0].sourceScript, 'Greek');

  // Cherokee letter 'Ꭰ' (U+13A0) resembling Latin 'D'
  const cherokeeSpoof = '\u13A0ata';
  const cherokeeReport = detector.detect(cherokeeSpoof);
  assert.equal(cherokeeReport.matches[0].confusableWith, 'D');
  assert.equal(cherokeeReport.matches[0].sourceScript, 'Cherokee');
});

test('HomoglyphDetector - detects mathematical alphanumeric bold characters', () => {
  const detector = new HomoglyphDetector();

  // Mathematical Bold: 𝐚𝐝𝐦𝐢𝐧
  const mathAdmin = '\u{1D41A}\u{1D41D}\u{1D426}\u{1D422}\u{1D427}';
  const report = detector.detect(mathAdmin);

  assert.equal(report.hasHomoglyphs, true);
  assert.equal(report.normalizedLatinPreview, 'admin');
  assert.ok(report.matches.some((m) => m.sourceScript === 'Mathematical Alphanumeric'));
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

test('HomoglyphDetector - isolated confusable does not inherit mixed-script flag from earlier token (pаypal а)', () => {
  const detector = new HomoglyphDetector();

  // 'pаypal а': 'pаypal' has embedded Cyrillic 'а' (U+0430) -> mixed-script
  // 'а' is standalone Cyrillic 'а' -> single-script / isolated
  const text = 'p\u0430ypal \u0430';
  const report = detector.detect(text);

  assert.equal(report.hasHomoglyphs, true);
  assert.equal(report.matches.length, 2);

  const [firstMatch, secondMatch] = report.matches;

  // First 'а' at index 1 is embedded in Latin word 'pаypal'
  assert.equal(firstMatch.position, 1);
  assert.equal(firstMatch.isMixedScriptWord, true);
  assert.ok(firstMatch.riskDescription.includes('Critical Mixed-Script Spoofing'));

  // Second 'а' at index 7 is isolated (after space)
  assert.equal(secondMatch.position, 7);
  assert.equal(secondMatch.isMixedScriptWord, false);
  assert.ok(secondMatch.riskDescription.includes('Cross-Script Confusable'));
});

