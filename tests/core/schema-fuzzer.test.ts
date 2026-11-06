import test from 'node:test';
import assert from 'node:assert/strict';
import { SchemaFuzzer } from '../../src/core/schema-fuzzer.js';
import { fuzzField } from '../../src/index.js';

test('SchemaFuzzer - generates default fuzz payloads within constraints', () => {
  const fuzzer = new SchemaFuzzer();
  const payloads = fuzzer.generateFuzzPayloads();

  assert.ok(payloads.length > 0);
  assert.ok(payloads.length <= 15);
  for (const p of payloads) {
    assert.equal(typeof p, 'string');
    assert.ok(p.length >= 1);
  }
});

test('SchemaFuzzer - respects count and min/max length options', () => {
  const fuzzer = new SchemaFuzzer();
  const payloads = fuzzer.generateFuzzPayloads({
    count: 5,
    minLength: 2,
    maxLength: 50,
  });

  assert.ok(payloads.length <= 5);
  for (const p of payloads) {
    assert.ok(p.length >= 2);
    assert.ok(p.length <= 50);
  }
});

test('SchemaFuzzer - synthesizes minLength=1 edge cases', () => {
  const fuzzer = new SchemaFuzzer();
  const payloads = fuzzer.generateFuzzPayloads({
    minLength: 1,
    count: 50,
  });

  assert.ok(payloads.includes('A'));
  assert.ok(payloads.includes('ñ'));
  assert.ok(payloads.includes('中'));
  assert.ok(payloads.includes('🚀'));
  assert.ok(payloads.includes('\u200B'));
});

test('SchemaFuzzer - filters by test category', () => {
  const fuzzer = new SchemaFuzzer();
  const namePayloads = fuzzer.generateFuzzPayloads({ category: 'names', count: 10 });
  assert.ok(namePayloads.length > 0);

  const emailPayloads = fuzzer.generateFuzzPayloads({ category: 'emails', count: 10 });
  assert.ok(emailPayloads.length > 0);
});

test('SchemaFuzzer - handles allowBidi and allowEmojis toggles', () => {
  const fuzzer = new SchemaFuzzer();
  const noBidi = fuzzer.generateFuzzPayloads({ allowBidi: false, count: 50 });
  assert.ok(!noBidi.includes('LTR_START_\u202E_OVERRIDE_RTL_\u202C_LTR_END'));

  const noEmoji = fuzzer.generateFuzzPayloads({ allowEmojis: false, count: 50 });
  assert.ok(!noEmoji.some(p => p.startsWith('Flag: 🇲🇦')));
});

test('SchemaFuzzer - generates payloads for specific fields', () => {
  const fuzzer = new SchemaFuzzer();

  const names = fuzzer.generateForField('name');
  assert.ok(names.length > 0);

  const emails = fuzzer.generateForField('email');
  assert.ok(emails.length > 0);

  const identifiers = fuzzer.generateForField('identifier');
  assert.ok(identifiers.length > 0);
  assert.ok(identifiers.includes('admin'));
  assert.ok(identifiers.includes('\u0430dmin')); // Cyrillic confusable
  assert.ok(identifiers.includes('user\u200B123')); // Zero-width space
  assert.ok(identifiers.includes('root\u0000')); // Null byte
  assert.ok(identifiers.includes('ＳＹＳＴＥＭ')); // Fullwidth

  const queries = fuzzer.generateForField('search_query');
  assert.ok(queries.length > 0);

  const texts = fuzzer.generateForField('text');
  assert.ok(texts.length > 0);
});

test('SchemaFuzzer - fuzzField public API convenience function works', () => {
  const idPayloads = fuzzField('identifier');
  assert.ok(idPayloads.length > 0);
  assert.ok(idPayloads.includes('\u0430dmin'));
});
