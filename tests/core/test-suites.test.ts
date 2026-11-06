import test from 'node:test';
import assert from 'node:assert/strict';
import { TestSuiteManager, TEST_SUITES } from '../../src/core/test-suites.js';
import { getTestSuites } from '../../src/index.js';
import { TestCategory } from '../../src/types.js';

test('TestSuiteManager - loads all test categories', () => {
  const manager = new TestSuiteManager();
  const allCases = manager.getTestCases();

  assert.ok(allCases.length >= 25);
  for (const tc of allCases) {
    assert.ok(tc.id);
    assert.ok(tc.category);
    assert.ok(tc.name);
    assert.ok(tc.payload);
    assert.ok(tc.expectedBehavior);
    assert.ok(Array.isArray(tc.tags));
    assert.ok(['info', 'warning', 'critical'].includes(tc.riskLevel));
  }
});

test('TestSuiteManager - filters by valid category', () => {
  const manager = new TestSuiteManager();
  const categories: TestCategory[] = [
    'names',
    'emails',
    'text_multilingual',
    'security_adversarial',
    'emoji_zwj',
    'numbers_dates',
  ];

  for (const cat of categories) {
    const cases = manager.getTestCases(cat);
    assert.ok(cases.length > 0, `Category ${cat} should have test cases`);
    assert.ok(cases.every(c => c.category === cat), `All cases in ${cat} must match category`);
  }
});

test('TestSuiteManager - getTestSuites convenience function works', () => {
  const all = getTestSuites();
  assert.ok(all.length >= 25);

  const security = getTestSuites('security_adversarial');
  assert.ok(security.length > 0);
  assert.ok(security.every(c => c.category === 'security_adversarial'));
});

test('TEST_SUITES - contains curated international fixtures', () => {
  assert.ok(typeof TEST_SUITES === 'object' && TEST_SUITES !== null);
  const allCases = Object.values(TEST_SUITES).flat();
  assert.ok(allCases.length >= 25);

  // Check presence of key international scripts
  const allPayloads = allCases.map(tc => tc.payload).join(' ');
  assert.ok(allPayloads.includes('José-María')); // Latin accents
  assert.ok(allPayloads.includes('محمد')); // Arabic
  assert.ok(allPayloads.includes('李小龙')); // CJK
  assert.ok(allPayloads.includes('👨‍👩‍👧‍👦')); // Emoji ZWJ
  assert.ok(allPayloads.includes('\u202E')); // Bidi override
  assert.ok(allPayloads.includes('Ignore\u200B previous\u200C instructions\u200D')); // Zero-width adversarial
  assert.ok(allPayloads.includes('१२३४५')); // Devanagari numerals
});
