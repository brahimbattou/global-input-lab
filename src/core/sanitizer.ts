/**
 * GlobalInputLab - Text Sanitizer
 * Configurable, genuinely non-destructive-by-default sanitization engine.
 * Preserves linguistic joiners, word-break markers (Thai/Khmer/Lao/Myanmar ZWSP),
 * soft hyphens, mathematical operators, and directional marks unless explicitly opted in.
 * (c) 2026 Brahim Battou. MIT License.
 */

import { SanitizeOptions, SanitizeResult } from '../types.js';
import { HomoglyphDetector } from './homoglyph-detector.js';

// Unicode Script Extensions regex tests using standard property escapes
const SCRIPT_BREAK_REGEX = /[\p{scx=Thai}\p{scx=Khmer}\p{scx=Lao}\p{scx=Myanmar}]/u;
const COMPLEX_SCRIPT_REGEX = /[\p{scx=Arabic}\p{scx=Hebrew}\p{scx=Devanagari}\p{scx=Bengali}\p{scx=Tamil}\p{scx=Telugu}\p{scx=Kannada}\p{scx=Malayalam}\p{scx=Gujarati}\p{scx=Gurmukhi}\p{scx=Oriya}\p{scx=Sinhala}\p{scx=Tibetan}]/u;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]/u;
const MONGOLIAN_REGEX = /\p{scx=Mongolian}/u;

// Dangerous bidirectional overrides (Trojan Source: LRO, RLO)
const BIDI_OVERRIDE_REGEX = /[\u202D\u202E]/g;

// All Bidi controls (LRE, RLE, PDF, LRO, RLO, LRI, RLI, FSI, PDI)
const ALL_BIDI_CONTROLS_REGEX = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g;

// Dangerous non-printable ASCII/C1 control characters (preserving \t, \n, \r)
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

// Invisible mathematical operators
const MATH_OPERATOR_REGEX = /[\u2061-\u2064]/g;

// Soft hyphen
const SOFT_HYPHEN_REGEX = /\u00AD/g;

// Word joiner
const WORD_JOINER_REGEX = /\u2060/g;

// Stacked combining marks (4 or more consecutive combining marks outside Indic/Thai/Khmer/Myanmar scripts)
const ZALGO_REGEX = /([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{3})[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+/g;

export class Sanitizer {
  private homoglyphDetector: HomoglyphDetector;

  constructor() {
    this.homoglyphDetector = new HomoglyphDetector();
  }

  private isScriptWordBreakContext(charBefore?: string, charAfter?: string): boolean {
    return (
      (charBefore !== undefined && SCRIPT_BREAK_REGEX.test(charBefore)) ||
      (charAfter !== undefined && SCRIPT_BREAK_REGEX.test(charAfter))
    );
  }

  private isComplexScriptContext(charBefore?: string, charAfter?: string): boolean {
    return (
      (charBefore !== undefined && COMPLEX_SCRIPT_REGEX.test(charBefore)) ||
      (charAfter !== undefined && COMPLEX_SCRIPT_REGEX.test(charAfter))
    );
  }

  private isEmojiContext(charBefore?: string, charAfter?: string): boolean {
    return (
      (charBefore !== undefined && EMOJI_REGEX.test(charBefore)) ||
      (charAfter !== undefined && EMOJI_REGEX.test(charAfter))
    );
  }

  /**
   * Sanitizes input text according to explicit, genuinely non-destructive-by-default policies.
   * By default, returns text identical to input without unintended character stripping.
   */
  public sanitize(text: string, options: SanitizeOptions = {}): SanitizeResult {
    const opts: Required<SanitizeOptions> = {
      stripZeroWidth: options.stripZeroWidth ?? false, // Non-destructive default
      stripSoftHyphens: options.stripSoftHyphens ?? false, // Non-destructive default
      stripMathOperators: options.stripMathOperators ?? false, // Non-destructive default
      stripWordJoiners: options.stripWordJoiners ?? false, // Non-destructive default
      preserveLinguisticJoiners: options.preserveLinguisticJoiners ?? true,
      preserveDirectionalMarks: options.preserveDirectionalMarks ?? true,
      stripBidiOverrides: options.stripBidiOverrides ?? false, // Explicit opt-in policy
      escapeBidiControls: options.escapeBidiControls ?? false,
      stripControlChars: options.stripControlChars ?? false, // Explicit opt-in policy
      stripNullBytes: options.stripNullBytes ?? false, // Explicit opt-in policy
      replaceHomoglyphs: options.replaceHomoglyphs ?? false,
      normalizeForm: options.normalizeForm ?? false, // No silent normalization by default
      stripZalgo: options.stripZalgo ?? false, // Explicit opt-in policy
    };

    let result = text;
    const operationsApplied: string[] = [];

    // 1. Strip null bytes if explicitly requested
    if (opts.stripNullBytes && result.includes('\u0000')) {
      result = result.replace(/\u0000/g, '');
      operationsApplied.push('strip_null_bytes');
    }

    // 2. Strip non-printable control characters (C0/C1) if explicitly requested
    if (opts.stripControlChars && CONTROL_CHAR_REGEX.test(result)) {
      result = result.replace(CONTROL_CHAR_REGEX, '');
      operationsApplied.push('strip_control_characters');
    }

    // 3. Strip soft hyphens if specifically requested
    if (opts.stripSoftHyphens && SOFT_HYPHEN_REGEX.test(result)) {
      result = result.replace(SOFT_HYPHEN_REGEX, '');
      operationsApplied.push('strip_soft_hyphens');
    }

    // 4. Strip invisible mathematical operators if specifically requested
    if (opts.stripMathOperators && MATH_OPERATOR_REGEX.test(result)) {
      result = result.replace(MATH_OPERATOR_REGEX, '');
      operationsApplied.push('strip_math_operators');
    }

    // 5. Strip word joiners if specifically requested
    if (opts.stripWordJoiners && WORD_JOINER_REGEX.test(result)) {
      result = result.replace(WORD_JOINER_REGEX, '');
      operationsApplied.push('strip_word_joiners');
    }

    // 6. Handle Zero-Width characters when explicitly requested
    if (opts.stripZeroWidth) {
      const chars = Array.from(result);
      let modified = false;
      const filtered: string[] = [];

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const cp = char.codePointAt(0);
        const prevChar = i > 0 ? chars[i - 1] : undefined;
        const nextChar = i + 1 < chars.length ? chars[i + 1] : undefined;

        if (cp === 0x200b) {
          // Zero-width space:
          // Preserve if in Thai, Khmer, Lao, Myanmar script contexts
          if (this.isScriptWordBreakContext(prevChar, nextChar)) {
            filtered.push(char); // Legitimate word boundary preserved!
          } else {
            modified = true; // Strip orphaned ZWSP in Latin or non-word-break contexts
          }
        } else if (cp === 0x200c) {
          // ZWNJ:
          if (opts.preserveLinguisticJoiners && this.isComplexScriptContext(prevChar, nextChar)) {
            filtered.push(char); // Legitimate Persian/Arabic/Indic ZWNJ preserved!
          } else if (opts.preserveLinguisticJoiners && !this.isComplexScriptContext(prevChar, nextChar)) {
            modified = true; // Strip orphaned ZWNJ in Latin
          } else if (!opts.preserveLinguisticJoiners) {
            modified = true; // User explicitly requested stripping all joiners
          } else {
            filtered.push(char);
          }
        } else if (cp === 0x200d) {
          // ZWJ:
          if (opts.preserveLinguisticJoiners && (this.isEmojiContext(prevChar, nextChar) || this.isComplexScriptContext(prevChar, nextChar))) {
            filtered.push(char); // Legitimate Emoji or Indic ligature preserved!
          } else if (opts.preserveLinguisticJoiners && !(this.isEmojiContext(prevChar, nextChar) || this.isComplexScriptContext(prevChar, nextChar))) {
            modified = true; // Strip orphaned ZWJ in Latin
          } else if (!opts.preserveLinguisticJoiners) {
            modified = true; // User explicitly requested stripping all joiners
          } else {
            filtered.push(char);
          }
        } else if (cp === 0xfeff) {
          // BOM mid-string: strip if stripZeroWidth is enabled
          modified = true;
        } else if (cp === 0x180e) {
          // Mongolian vowel separator: preserve if adjacent to Mongolian
          if ((prevChar && MONGOLIAN_REGEX.test(prevChar)) || (nextChar && MONGOLIAN_REGEX.test(nextChar))) {
            filtered.push(char);
          } else {
            modified = true;
          }
        } else if (cp === 0x200e || cp === 0x200f) {
          if (opts.preserveDirectionalMarks) {
            filtered.push(char);
          } else {
            modified = true;
          }
        } else {
          filtered.push(char);
        }
      }

      if (modified) {
        result = filtered.join('');
        operationsApplied.push('strip_zero_width_characters');
      }
    }

    // 7. Handle Bidirectional Overrides
    if (opts.escapeBidiControls) {
      if (ALL_BIDI_CONTROLS_REGEX.test(result)) {
        result = result.replace(ALL_BIDI_CONTROLS_REGEX, (ch) => {
          return '\\u' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
        });
        operationsApplied.push('escape_bidi_controls');
      }
    } else if (opts.stripBidiOverrides) {
      if (BIDI_OVERRIDE_REGEX.test(result)) {
        result = result.replace(BIDI_OVERRIDE_REGEX, '');
        operationsApplied.push('strip_bidi_overrides');
      }
    }

    // 8. Strip Zalgo / Stacked Combining Diacritics if explicitly opted in
    if (opts.stripZalgo && ZALGO_REGEX.test(result)) {
      result = result.replace(ZALGO_REGEX, '$1');
      operationsApplied.push('truncate_stacked_diacritics');
    }

    // 9. Replace Homoglyphs with Canonical Latin (Explicit opt-in only)
    if (opts.replaceHomoglyphs && this.homoglyphDetector.hasConfusables(result)) {
      result = this.homoglyphDetector.canonicalize(result);
      operationsApplied.push('canonicalize_homoglyphs');
    }

    // 10. Normalization Form (Explicit opt-in only, no silent normalization)
    if (opts.normalizeForm) {
      const normalized = result.normalize(opts.normalizeForm);
      if (normalized !== result) {
        result = normalized;
        operationsApplied.push(`normalize_${opts.normalizeForm}`);
      }
    }

    return {
      original: text,
      sanitized: result,
      changed: text !== result,
      operationsApplied,
    };
  }
}
