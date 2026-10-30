/**
 * GlobalInputLab - Types & Interfaces
 * Modern International Input & Data Integrity Testing Toolkit
 * (c) 2026 Brahim Battou. MIT License.
 */

export type UnicodeAnomalyType =
  | 'zero_width'
  | 'bidi_override'
  | 'unassigned'
  | 'surrogate'
  | 'control'
  | 'homoglyph'
  | 'zalgo'
  | 'non_nfc'
  | 'byte_split_risk';

export type Severity = 'info' | 'warning' | 'critical';

export interface UnicodeAnomaly {
  type: UnicodeAnomalyType;
  severity: Severity;
  codePoint: number;
  hex: string;
  char: string;
  position: number;
  name: string;
  description: string;
  recommendation: string;
  isLinguisticContext?: boolean; // True if ZWJ/ZWNJ is legitimately used in Persian/Indic/Emoji
}

export interface NormalizationAnalysis {
  nfc: string;
  nfd: string;
  nfkc: string;
  nfkd: string;
  isNFC: boolean;
  isNFD: boolean;
  isNFKC: boolean;
  isNFKD: boolean;
}

export interface AuditReport {
  input: string;
  codePointCount: number;
  byteLengthUtf8: number;
  byteLengthUtf16: number;
  graphemeCount: number;
  normalization: NormalizationAnalysis;
  hasBidi: boolean;
  hasZeroWidth: boolean;
  hasHomoglyphs: boolean;
  hasZalgo: boolean;
  anomalies: UnicodeAnomaly[];
  riskScore: number; // 0 (safe) to 100 (high risk)
  diagnosticView: string; // Safe non-destructive visual string with bracketed hex tags
  summary: string;
}

export interface HomoglyphMatch {
  char: string;
  codePoint: number;
  hex: string;
  position: number;
  confusableWith: string;
  confusableCodePoint: number;
  confusableHex: string;
  sourceScript: string;
  targetScript: string;
  isMixedScriptWord: boolean; // True if Latin word contains an isolated foreign confusable
  riskDescription: string;
}

export interface HomoglyphReport {
  input: string;
  hasHomoglyphs: boolean;
  matches: HomoglyphMatch[];
  normalizedLatinPreview: string;
}

export interface SanitizeOptions {
  /**
   * Strip orphaned zero-width spaces (U+200B, U+FEFF BOM, U+2060).
   * Default: true.
   */
  stripZeroWidth?: boolean;

  /**
   * Preserve legitimate linguistic joiners (ZWNJ U+200C in Persian/Arabic/Indic and ZWJ U+200D in emojis).
   * Default: true.
   */
  preserveLinguisticJoiners?: boolean;

  /**
   * Preserve legitimate directional marks (LRM U+200E, RLM U+200F).
   * Default: true.
   */
  preserveDirectionalMarks?: boolean;

  /**
   * Remove dangerous bidirectional overrides (LRO U+202D, RLO U+202E).
   * Default: true.
   */
  stripBidiOverrides?: boolean;

  /**
   * Escape bidirectional controls to Unicode escape literals (e.g. \\u202E) instead of deleting.
   * Default: false.
   */
  escapeBidiControls?: boolean;

  /**
   * Strip non-printable ASCII/C1 control characters (null bytes, C0/C1) while preserving \t, \n, \r.
   * Default: true.
   */
  stripControlChars?: boolean;

  /**
   * Canonicalize confusables to Latin base equivalents.
   * WARNING: Destructive to non-Latin languages. Must only be used for credential spoofing checks.
   * Default: false.
   */
  replaceHomoglyphs?: boolean;

  /**
   * Normalize text into canonical composition form.
   * Default: 'NFC'. Set to false to disable normalization.
   */
  normalizeForm?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' | false;

  /**
   * Limit stacked combining diacritical marks (e.g. Zalgo text) to max 3 per base character.
   * Default: true.
   */
  stripZalgo?: boolean;
}

export interface SanitizeResult {
  original: string;
  sanitized: string;
  changed: boolean;
  operationsApplied: string[];
}

export interface RoundTripResult {
  original: string;
  processed: string;
  identical: boolean;
  bytePreserved: boolean;
  lengthDelta: number;
  introducedReplacementChar: boolean; // Detected U+FFFD (Mojibake or invalid decode)
  diffDescription?: string;
}

export type TestCategory =
  | 'names'
  | 'emails'
  | 'text_multilingual'
  | 'security_adversarial'
  | 'emoji_zwj'
  | 'numbers_dates';

export interface TestCase {
  id: string;
  category: TestCategory;
  name: string;
  description: string;
  payload: string;
  expectedBehavior: string;
  tags: string[];
  riskLevel: Severity;
}

export interface FuzzOptions {
  category?: TestCategory;
  count?: number;
  minLength?: number;
  maxLength?: number;
  allowBidi?: boolean;
  allowEmojis?: boolean;
}

export type TestOutcome = 'passed' | 'failed' | 'inconclusive';

export interface TestRunOptions {
  targetUrl?: string;
  targetCommand?: string;
  categories?: TestCategory[];
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT';
  bodyTemplate?: string; // e.g. '{"input":"{PAYLOAD}"}'
  jsonPath?: string; // Path to extract from response (e.g. 'data.content' or 'echo')
  allowInconclusive?: boolean; // If false, inconclusive tests count toward failure
}

export interface SingleTestResult {
  testCase: TestCase;
  outcome: TestOutcome;
  passed: boolean; // true if outcome === 'passed'
  transportOk: boolean; // true if HTTP 2xx or command exit code 0
  dataPreserved: boolean | null; // null if cannot be verified (inconclusive)
  statusCode?: number;
  durationMs: number;
  receivedPayload?: string;
  extractedPayload?: string;
  roundTrip?: RoundTripResult;
  inconclusiveReason?: string;
  error?: string;
}

export interface TestRunReport {
  total: number;
  passed: number;
  failed: number;
  inconclusive: number;
  durationMs: number;
  results: SingleTestResult[];
  summary: string;
}
