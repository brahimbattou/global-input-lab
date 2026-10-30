import test from 'node:test';
import assert from 'node:assert/strict';
import { Sanitizer } from '../../src/core/sanitizer.js';

test('Sanitizer - strips zero-width and invisible characters', () => {
  const sanitizer = new Sanitizer();
  const dirty = 'Hello\u200B \u200CWorld\uFEFF!';
  const res = sanitizer.sanitize(dirty, { stripZeroWidth: true });

  assert.equal(res.sanitized, 'Hello World!');
  assert.equal(res.changed, true);
  assert.ok(
    res.operationsApplied.includes('strip_zero_width_characters') ||
    res.operationsApplied.includes('strip_non_linguistic_zero_width') ||
    res.operationsApplied.includes('strip_orphaned_joiners')
  );
});

test('Sanitizer - removes Bidi override Trojan Source characters', () => {
  const sanitizer = new Sanitizer();
  const dangerous = 'document_\u202Efdp.exe';
  const res = sanitizer.sanitize(dangerous, { stripBidiOverrides: true });

  assert.equal(res.sanitized, 'document_fdp.exe');
  assert.ok(res.operationsApplied.includes('strip_bidi_overrides'));
});

test('Sanitizer - normalizes non-NFC text into canonical NFC', () => {
  const sanitizer = new Sanitizer();
  const nfd = 'Cafe\u0301'; // Decomposed e + acute
  const res = sanitizer.sanitize(nfd, { normalizeForm: 'NFC' });

  assert.equal(res.sanitized, 'Café'); // Precomposed
  assert.ok(res.operationsApplied.includes('normalize_NFC'));
});

test('Sanitizer - strips null bytes and C0 control codes', () => {
  const sanitizer = new Sanitizer();
  const withNull = 'path/to/file\u0000.txt';
  const res = sanitizer.sanitize(withNull, { stripControlChars: true });

  assert.equal(res.sanitized, 'path/to/file.txt');
  assert.ok(res.operationsApplied.includes('strip_control_characters'));
});

test('Sanitizer - canonicalizes homoglyphs when requested', () => {
  const sanitizer = new Sanitizer();
  const spoofed = '\u0430dmin'; // Cyrillic 'а'
  const res = sanitizer.sanitize(spoofed, { replaceHomoglyphs: true });

  assert.equal(res.sanitized, 'admin');
  assert.ok(res.operationsApplied.includes('canonicalize_homoglyphs'));
});
