/**
 * GlobalInputLab - Text Sanitizer
 * Configurable, non-destructive-by-default sanitization engine.
 * Preserves linguistic joiners (ZWNJ in Persian, ZWJ in emoji) and directional marks (LRM/RLM).
 * (c) 2026 Brahim Battou. MIT License.
 */

import { SanitizeOptions, SanitizeResult } from '../types.js';
import { HomoglyphDetector } from './homoglyph-detector.js';

// Non-linguistic zero-width characters that serve no text formatting function
const NON_LINGUISTIC_ZERO_WIDTH_REGEX = /[\u200B\uFEFF\u2060\u180E\u00AD\u2061\u2062\u2063\u2064]/g;

// Dangerous bidirectional overrides (Trojan Source: LRO, RLO)
const BIDI_OVERRIDE_REGEX = /[\u202D\u202E]/g;

// All Bidi controls (LRE, RLE, PDF, LRO, RLO, LRI, RLI, FSI, PDI)
const ALL_BIDI_CONTROLS_REGEX = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g;

// Dangerous non-printable ASCII/C1 control characters (preserving \t, \n, \r)
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

// Stacked combining marks (4 or more consecutive combining marks)
const ZALGO_REGEX = /([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{3})[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+/g;

export class Sanitizer {
  private homoglyphDetector: HomoglyphDetector;

  constructor() {
    this.homoglyphDetector = new HomoglyphDetector();
  }

  private isPersoArabicOrIndic(cp: number): boolean {
    return (
      (cp >= 0x0600 && cp <= 0x06ff) ||
      (cp >= 0x0750 && cp <= 0x077f) ||
      (cp >= 0x08a0 && cp <= 0x08ff) ||
      (cp >= 0x0590 && cp <= 0x05ff) ||
      (cp >= 0x0900 && cp <= 0x097f) ||
      (cp >= 0x0980 && cp <= 0x09ff)
    );
  }

  private isEmoji(cp: number): boolean {
    return (
      (cp >= 0x1f300 && cp <= 0x1faff) ||
      (cp >= 0x2600 && cp <= 0x27bf) ||
      (cp >= 0xfe00 && cp <= 0xfe0f)
    );
  }

  /**
   * Sanitizes input text according to explicit, non-destructive-by-default policies.
   */
  public sanitize(text: string, options: SanitizeOptions = {}): SanitizeResult {
    const opts: Required<SanitizeOptions> = {
      stripZeroWidth: options.stripZeroWidth ?? true,
      preserveLinguisticJoiners: options.preserveLinguisticJoiners ?? true,
      preserveDirectionalMarks: options.preserveDirectionalMarks ?? true,
      stripBidiOverrides: options.stripBidiOverrides ?? true,
      escapeBidiControls: options.escapeBidiControls ?? false,
      stripControlChars: options.stripControlChars ?? true,
      replaceHomoglyphs: options.replaceHomoglyphs ?? false,
      normalizeForm: options.normalizeForm ?? 'NFC',
      stripZalgo: options.stripZalgo ?? true,
    };

    let result = text;
    const operationsApplied: string[] = [];

    // 1. Strip non-printable control characters (null bytes, C0/C1)
    if (opts.stripControlChars && CONTROL_CHAR_REGEX.test(result)) {
      result = result.replace(CONTROL_CHAR_REGEX, '');
      operationsApplied.push('strip_control_characters');
    }

    // 2. Handle Zero-Width & Invisible Characters
    if (opts.stripZeroWidth) {
      // Always strip non-linguistic zero-width characters (ZWSP, BOM mid-text, WJ)
      if (NON_LINGUISTIC_ZERO_WIDTH_REGEX.test(result)) {
        result = result.replace(NON_LINGUISTIC_ZERO_WIDTH_REGEX, '');
        operationsApplied.push('strip_non_linguistic_zero_width');
      }

      // Handle ZWNJ (U+200C) and ZWJ (U+200D)
      if (!opts.preserveLinguisticJoiners) {
        // Blind removal requested explicitly by policy
        result = result.replace(/[\u200C\u200D]/g, '');
        operationsApplied.push('strip_all_joiners_explicit');
      } else {
        // Smart contextual preservation:
        // Strip ZWNJ/ZWJ ONLY when orphaned in Latin/ASCII contexts
        const chars = Array.from(result);
        let modified = false;
        const filteredChars: string[] = [];

        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          const cp = char.codePointAt(0);
          const prevCp = i > 0 ? chars[i - 1].codePointAt(0) : undefined;
          const nextCp = i + 1 < chars.length ? chars[i + 1].codePointAt(0) : undefined;

          if (cp === 0x200c) {
            // ZWNJ: preserve in Persian/Arabic/Indic (e.g. می\u200Cروم)
            const isLinguistic = (prevCp && this.isPersoArabicOrIndic(prevCp)) || (nextCp && this.isPersoArabicOrIndic(nextCp));
            if (isLinguistic) {
              filteredChars.push(char);
            } else {
              modified = true; // Strip orphaned ZWNJ in Latin text
            }
          } else if (cp === 0x200d) {
            // ZWJ: preserve in Emoji sequence or Indic ligature
            const isLinguistic = (prevCp && (this.isEmoji(prevCp) || this.isPersoArabicOrIndic(prevCp))) ||
                                 (nextCp && (this.isEmoji(nextCp) || this.isPersoArabicOrIndic(nextCp)));
            if (isLinguistic) {
              filteredChars.push(char);
            } else {
              modified = true; // Strip orphaned ZWJ in Latin text
            }
          } else if (cp === 0x200e || cp === 0x200f) {
            // Directional marks LRM / RLM
            if (opts.preserveDirectionalMarks) {
              filteredChars.push(char);
            } else {
              modified = true;
            }
          } else {
            filteredChars.push(char);
          }
        }

        if (modified) {
          result = filteredChars.join('');
          operationsApplied.push('strip_orphaned_joiners');
        }
      }
    }

    // 3. Handle Bidirectional Overrides
    if (opts.escapeBidiControls) {
      // Truly escape bidi controls to \uXXXX literals instead of deleting
      if (ALL_BIDI_CONTROLS_REGEX.test(result)) {
        result = result.replace(ALL_BIDI_CONTROLS_REGEX, (ch) => {
          return '\\u' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
        });
        operationsApplied.push('escape_bidi_controls');
      }
    } else if (opts.stripBidiOverrides) {
      // Remove dangerous overrides (LRO, RLO)
      if (BIDI_OVERRIDE_REGEX.test(result)) {
        result = result.replace(BIDI_OVERRIDE_REGEX, '');
        operationsApplied.push('strip_bidi_overrides');
      }
    }

    // 4. Strip Zalgo / Stacked Combining Diacritics
    if (opts.stripZalgo && ZALGO_REGEX.test(result)) {
      result = result.replace(ZALGO_REGEX, '$1');
      operationsApplied.push('truncate_stacked_diacritics');
    }

    // 5. Replace Homoglyphs with Canonical Latin (Explicit opt-in only)
    if (opts.replaceHomoglyphs && this.homoglyphDetector.hasConfusables(result)) {
      result = this.homoglyphDetector.canonicalize(result);
      operationsApplied.push('canonicalize_homoglyphs');
    }

    // 6. Normalization Form (NFC by default)
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
