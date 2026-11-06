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

test('Sanitizer - strips null bytes explicitly with stripNullBytes', () => {
  const sanitizer = new Sanitizer();
  const withNull = 'user\u0000name';
  const res = sanitizer.sanitize(withNull, { stripNullBytes: true });

  assert.equal(res.sanitized, 'username');
  assert.ok(res.operationsApplied.includes('strip_null_bytes'));
});

test('Sanitizer - escapes Bidi controls when escapeBidiControls is enabled', () => {
  const sanitizer = new Sanitizer();
  const dangerous = 'doc_\u202Ereversed';
  const res = sanitizer.sanitize(dangerous, { escapeBidiControls: true });

  assert.equal(res.sanitized, 'doc_\\u202Ereversed');
  assert.ok(res.operationsApplied.includes('escape_bidi_controls'));
});

test('Sanitizer - strips invisible mathematical operators when opted in', () => {
  const sanitizer = new Sanitizer();
  const math = '2\u2062x + 3\u2064y';
  const res = sanitizer.sanitize(math, { stripMathOperators: true });

  assert.equal(res.sanitized, '2x + 3y');
  assert.ok(res.operationsApplied.includes('strip_math_operators'));
});

test('Sanitizer - strips word joiners when opted in', () => {
  const sanitizer = new Sanitizer();
  const text = 'word\u2060joiner';
  const res = sanitizer.sanitize(text, { stripWordJoiners: true });

  assert.equal(res.sanitized, 'wordjoiner');
  assert.ok(res.operationsApplied.includes('strip_word_joiners'));
});

test('Sanitizer - truncates stacked Zalgo combining diacritics when opted in', () => {
  const sanitizer = new Sanitizer();
  const zalgo = 'Z\u0300\u0301\u0302\u0303\u0304algo';
  const res = sanitizer.sanitize(zalgo, { stripZalgo: true });

  assert.equal(res.changed, true);
  assert.ok(res.operationsApplied.includes('truncate_stacked_diacritics'));
});
