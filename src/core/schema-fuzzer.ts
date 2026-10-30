/**
 * GlobalInputLab - Schema Fuzzer
 * Generates boundary, adversarial, and international edge-case strings
 * constrained by length, character sets, and security scenarios.
 * (c) 2026 Brahim Battou. MIT License.
 */

import { FuzzOptions } from '../types.js';
import { TestSuiteManager } from './test-suites.js';

export class SchemaFuzzer {
  private suiteManager: TestSuiteManager;

  constructor() {
    this.suiteManager = new TestSuiteManager();
  }

  /**
   * Generates a collection of fuzzed international strings matching constraints
   */
  public generateFuzzPayloads(options: FuzzOptions = {}): string[] {
    const minLength = options.minLength ?? 1;
    const maxLength = options.maxLength ?? 500;
    const count = options.count ?? 15;

    const baseTestCases = this.suiteManager.getTestCases(options.category);
    const results: Set<string> = new Set();

    // 1. Filter existing high-value vectors by length
    for (const tc of baseTestCases) {
      if (tc.payload.length >= minLength && tc.payload.length <= maxLength) {
        results.add(tc.payload);
      }
    }

    // 2. Synthesize boundary edge cases
    // Exactly minLength
    if (minLength === 1) {
      results.add('A');
      results.add('ñ');
      results.add('中');
      results.add('🚀'); // 4-byte single grapheme
      results.add('\u200B'); // Zero-width single char
    }

    // Exactly maxLength boundary repetitions
    if (maxLength > 10) {
      results.add('é'.repeat(maxLength));
      results.add('李'.repeat(Math.floor(maxLength / 2)));
    }

    // Bidi mixed payloads
    if (options.allowBidi !== false) {
      results.add('LTR_START_\u202E_OVERRIDE_RTL_\u202C_LTR_END');
      results.add('User אברהם verified #1234');
    }

    // Emoji compound sequences
    if (options.allowEmojis !== false) {
      results.add('👩‍💻'.repeat(Math.min(5, Math.floor(maxLength / 4))));
      results.add('Flag: 🇲🇦 Testing');
    }

    // Convert Set to Array and limit to requested count
    const list = Array.from(results);
    return list.slice(0, count);
  }

  /**
   * Generates tailored edge-cases for a specific data field type
   */
  public generateForField(fieldType: 'name' | 'email' | 'search_query' | 'text' | 'identifier'): string[] {
    switch (fieldType) {
      case 'name':
        return this.generateFuzzPayloads({ category: 'names', count: 10 });
      case 'email':
        return this.generateFuzzPayloads({ category: 'emails', count: 10 });
      case 'identifier':
        return [
          'admin',
          '\u0430dmin', // Cyrillic a
          'user_123',
          'user\u200B123', // zero-width space
          'root\u0000',
          'SYSTEM',
          'ＳＹＳＴＥＭ', // fullwidth
        ];
      case 'search_query':
      case 'text':
      default:
        return this.generateFuzzPayloads({ count: 15 });
    }
  }
}
