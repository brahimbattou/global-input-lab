/**
 * GlobalInputLab
 * Modern International Input & Data Integrity Testing Toolkit for Robust Global Software.
 * (c) 2026 Brahim Battou. MIT License.
 *
 * @packageDocumentation
 */

export * from './types.js';
export { UnicodeAuditor } from './core/unicode-auditor.js';
export { HomoglyphDetector } from './core/homoglyph-detector.js';
export { BoundaryInspector, type TruncationAnalysis, type LoneSurrogate } from './core/boundary-inspector.js';
export { RoundTripVerifier } from './core/round-trip.js';
export { Sanitizer } from './core/sanitizer.js';
export { TestSuiteManager, TEST_SUITES } from './core/test-suites.js';
export { SchemaFuzzer } from './core/schema-fuzzer.js';

import { UnicodeAuditor } from './core/unicode-auditor.js';
import { HomoglyphDetector } from './core/homoglyph-detector.js';
import { BoundaryInspector, TruncationAnalysis } from './core/boundary-inspector.js';
import { RoundTripVerifier } from './core/round-trip.js';
import { Sanitizer } from './core/sanitizer.js';
import { TestSuiteManager } from './core/test-suites.js';
import { SchemaFuzzer } from './core/schema-fuzzer.js';
import { AuditReport, HomoglyphReport, RoundTripResult, SanitizeOptions, SanitizeResult, TestCase, TestCategory } from './types.js';

// Cached singleton instances for convenience functions
let _auditor: UnicodeAuditor | null = null;
let _homoglyphs: HomoglyphDetector | null = null;
let _boundary: BoundaryInspector | null = null;
let _roundTrip: RoundTripVerifier | null = null;
let _sanitizer: Sanitizer | null = null;
let _suiteManager: TestSuiteManager | null = null;
let _fuzzer: SchemaFuzzer | null = null;

function getAuditor(): UnicodeAuditor {
  if (!_auditor) _auditor = new UnicodeAuditor();
  return _auditor;
}

function getHomoglyphs(): HomoglyphDetector {
  if (!_homoglyphs) _homoglyphs = new HomoglyphDetector();
  return _homoglyphs;
}

function getBoundary(): BoundaryInspector {
  if (!_boundary) _boundary = new BoundaryInspector();
  return _boundary;
}

function getRoundTrip(): RoundTripVerifier {
  if (!_roundTrip) _roundTrip = new RoundTripVerifier();
  return _roundTrip;
}

function getSanitizer(): Sanitizer {
  if (!_sanitizer) _sanitizer = new Sanitizer();
  return _sanitizer;
}

function getSuiteManager(): TestSuiteManager {
  if (!_suiteManager) _suiteManager = new TestSuiteManager();
  return _suiteManager;
}

function getFuzzer(): SchemaFuzzer {
  if (!_fuzzer) _fuzzer = new SchemaFuzzer();
  return _fuzzer;
}

/**
 * Audits a string for invisible smuggling, bidi overrides, and normalization risks.
 * Non-destructive: original input is never mutated.
 */
export function auditText(text: string): AuditReport {
  const report = getAuditor().audit(text);
  const homoglyphs = getHomoglyphs().detect(text);
  report.hasHomoglyphs = homoglyphs.hasHomoglyphs;

  if (homoglyphs.hasHomoglyphs) {
    let addedRisk = 0;
    for (const m of homoglyphs.matches) {
      // Differentiate mixed-script attacks (e.g. аdmin) from genuine Slavic/Greek words
      const severity = m.isMixedScriptWord ? 'critical' : 'info';
      if (m.isMixedScriptWord) addedRisk += 25;

      report.anomalies.push({
        type: 'homoglyph',
        severity,
        codePoint: m.codePoint,
        hex: m.hex,
        char: m.char,
        position: m.position,
        name: `HOMOGLYPH_${m.sourceScript.toUpperCase()}`,
        description: m.riskDescription,
        recommendation: m.isMixedScriptWord
          ? `Mixed-script spoofing detected: verify context or reject Latin '${m.confusableWith}' lookalike.`
          : `Standard ${m.sourceScript} character. Retain as legitimate international text.`,
      });
    }
    report.riskScore = Math.min(100, report.riskScore + addedRisk);
  }

  return report;
}

/**
 * Generates a safe, non-destructive diagnostic visualization showing invisible
 * and directional characters with bracketed hex tags without altering the input.
 */
export function getDiagnosticView(text: string): string {
  return getAuditor().getDiagnosticView(text);
}

/**
 * Sanitizes input text according to explicit policies.
 * Preserves linguistic joiners (ZWNJ in Persian, ZWJ in emojis) by default.
 */
export function sanitizeText(text: string, options?: SanitizeOptions): SanitizeResult {
  return getSanitizer().sanitize(text, options);
}

/**
 * Verifies byte and string round-trip preservation
 */
export function verifyRoundTrip(original: string, processed: string): RoundTripResult {
  return getRoundTrip().verify(original, processed);
}

/**
 * Detects cross-script confusables and homoglyphs with UTS #39 mixed-script analysis
 */
export function detectHomoglyphs(text: string): HomoglyphReport {
  return getHomoglyphs().detect(text);
}

/**
 * Analyzes UTF-8 byte boundary truncation safety
 */
export function inspectByteTruncation(text: string, maxBytes: number): TruncationAnalysis {
  return getBoundary().analyzeByteTruncation(text, maxBytes);
}

/**
 * Retrieves curated test cases across categories
 */
export function getTestSuites(category?: TestCategory): TestCase[] {
  return getSuiteManager().getTestCases(category);
}

/**
 * Generates edge-case payloads for a given field type
 */
export function fuzzField(fieldType: 'name' | 'email' | 'search_query' | 'text' | 'identifier'): string[] {
  return getFuzzer().generateForField(fieldType);
}
