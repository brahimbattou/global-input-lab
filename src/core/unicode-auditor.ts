/**
 * GlobalInputLab - Unicode Auditor
 * Inspects strings for invisible characters, zero-width smuggling,
 * bidirectional overrides, normalization drift, and encoding risks.
 * Context-aware and standards-aligned (UAX #9, UAX #15, UAX #29, UTS #39).
 * (c) 2026 Brahim Battou. MIT License.
 */

import { AuditReport, NormalizationAnalysis, Severity, UnicodeAnomaly } from '../types.js';

// Unicode Script Extensions regex tests using standard property escapes
const SCRIPT_BREAK_REGEX = /[\p{scx=Thai}\p{scx=Khmer}\p{scx=Lao}\p{scx=Myanmar}]/u;
const COMPLEX_SCRIPT_REGEX = /[\p{scx=Arabic}\p{scx=Hebrew}\p{scx=Devanagari}\p{scx=Bengali}\p{scx=Tamil}\p{scx=Telugu}\p{scx=Kannada}\p{scx=Malayalam}\p{scx=Gujarati}\p{scx=Gurmukhi}\p{scx=Oriya}\p{scx=Sinhala}\p{scx=Tibetan}]/u;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]/u;

// Known prompt injection trigger keywords often targeted by zero-width smuggling
const PROMPT_INJECTION_KEYWORDS = ['ignore', 'system', 'prompt', 'assistant', 'instruction', 'admin', 'bypass'];

interface CharMeta {
  name: string;
  desc: string;
  defaultSeverity: Severity;
  tag: string;
}

const ZERO_WIDTH_POINTS: Record<number, CharMeta> = {
  0x200b: { name: 'ZERO WIDTH SPACE', desc: 'Zero-width space; legitimate in unspaced scripts (Thai/Khmer/Lao/Myanmar), suspicious inside Latin tokens', defaultSeverity: 'warning', tag: 'ZWSP' },
  0x200c: { name: 'ZERO WIDTH NON-JOINER', desc: 'Prevents ligature formation (essential in Persian/Indic, suspect in Latin)', defaultSeverity: 'info', tag: 'ZWNJ' },
  0x200d: { name: 'ZERO WIDTH JOINER', desc: 'Combines characters/emojis (essential in emoji sequences and Indic scripts, suspect in Latin)', defaultSeverity: 'info', tag: 'ZWJ' },
  0xfeff: { name: 'ZERO WIDTH NO-BREAK SPACE (BOM)', desc: 'Byte order mark; may cause unexpected string comparison mismatches when mid-string', defaultSeverity: 'warning', tag: 'BOM' },
  0x2060: { name: 'WORD JOINER', desc: 'Zero-width non-breaking character that prevents line breaks', defaultSeverity: 'info', tag: 'WJ' },
  0x180e: { name: 'MONGOLIAN VOWEL SEPARATOR', desc: 'Mongolian format character', defaultSeverity: 'info', tag: 'MVS' },
  0x00ad: { name: 'SOFT HYPHEN', desc: 'Discretionary hyphen for typographical line breaking in European typography', defaultSeverity: 'info', tag: 'SHY' },
  0x200e: { name: 'LEFT-TO-RIGHT MARK', desc: 'Directional formatting mark used to order neutral characters (UAX #9)', defaultSeverity: 'info', tag: 'LRM' },
  0x200f: { name: 'RIGHT-TO-LEFT MARK', desc: 'Directional formatting mark used to order neutral characters (UAX #9)', defaultSeverity: 'info', tag: 'RLM' },
  0x2061: { name: 'FUNCTION APPLICATION', desc: 'Invisible mathematical operator (MathML/Unicode mathematics)', defaultSeverity: 'info', tag: 'FA' },
  0x2062: { name: 'INVISIBLE TIMES', desc: 'Invisible mathematical operator (e.g. 2x multiplication in MathML)', defaultSeverity: 'info', tag: 'IT' },
  0x2063: { name: 'INVISIBLE SEPARATOR', desc: 'Invisible mathematical separator character', defaultSeverity: 'info', tag: 'IS' },
  0x2064: { name: 'INVISIBLE PLUS', desc: 'Invisible mathematical addition operator', defaultSeverity: 'info', tag: 'IP' },
};

// Table of Bidirectional Overrides and Isolates
const BIDI_POINTS: Record<number, CharMeta> = {
  0x202a: { name: 'LEFT-TO-RIGHT EMBEDDING (LRE)', desc: 'Forces LTR directionality, alters visual order of characters', defaultSeverity: 'warning', tag: 'LRE' },
  0x202b: { name: 'RIGHT-TO-LEFT EMBEDDING (RLE)', desc: 'Forces RTL directionality, alters visual order of characters', defaultSeverity: 'warning', tag: 'RLE' },
  0x202c: { name: 'POP DIRECTIONAL FORMATTING (PDF)', desc: 'Terminates embedding/override scope', defaultSeverity: 'warning', tag: 'PDF' },
  0x202d: { name: 'LEFT-TO-RIGHT OVERRIDE (LRO)', desc: 'High-risk override: inverts visual character sequence, spoofing file extensions or code order', defaultSeverity: 'critical', tag: 'LRO' },
  0x202e: { name: 'RIGHT-TO-LEFT OVERRIDE (RLO)', desc: 'Critical Trojan Source vulnerability vector (e.g. disguised .exe as .pdf, CVE-2021-42574)', defaultSeverity: 'critical', tag: 'RLO' },
  0x2066: { name: 'LEFT-TO-RIGHT ISOLATE (LRI)', desc: 'Isolates text with LTR direction', defaultSeverity: 'warning', tag: 'LRI' },
  0x2067: { name: 'RIGHT-TO-LEFT ISOLATE (RLI)', desc: 'Isolates text with RTL direction', defaultSeverity: 'warning', tag: 'RLI' },
  0x2068: { name: 'FIRST STRONG ISOLATE (FSI)', desc: 'Isolates text based on first strong directional character', defaultSeverity: 'warning', tag: 'FSI' },
  0x2069: { name: 'POP DIRECTIONAL ISOLATE (PDI)', desc: 'Terminates directional isolate scope', defaultSeverity: 'warning', tag: 'PDI' },
};

export class UnicodeAuditor {
  private segmenter?: Intl.Segmenter;

  constructor() {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      this.segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
  }

  /**
   * Generates a safe, non-destructive diagnostic visualization showing invisible
   * and directional characters with bracketed hex tags [U+XXXX:TAG] without altering the input.
   */
  public getDiagnosticView(text: string): string {
    let out = '';
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (cp === undefined) continue;

      if (ZERO_WIDTH_POINTS[cp]) {
        out += `[U+${cp.toString(16).toUpperCase().padStart(4, '0')}:${ZERO_WIDTH_POINTS[cp].tag}]`;
      } else if (BIDI_POINTS[cp]) {
        out += `[U+${cp.toString(16).toUpperCase().padStart(4, '0')}:${BIDI_POINTS[cp].tag}]`;
      } else if (cp === 0x0000) {
        out += '[U+0000:NUL]';
      } else if (cp === 0xfffd) {
        out += '[U+FFFD:REPL]';
      } else {
        out += char;
      }
    }
    return out;
  }

  /**
   * Calculates the number of visual grapheme clusters in a string (UAX #29)
   */
  public countGraphemes(text: string): number {
    if (this.segmenter) {
      let count = 0;
      for (const _ of this.segmenter.segment(text)) {
        count++;
      }
      return count;
    }
    return Array.from(text).length;
  }

  /**
   * Analyzes text normalization across all 4 standard Unicode forms (UAX #15)
   */
  public analyzeNormalization(text: string): NormalizationAnalysis {
    const nfc = text.normalize('NFC');
    const nfd = text.normalize('NFD');
    const nfkc = text.normalize('NFKC');
    const nfkd = text.normalize('NFKD');

    return {
      nfc,
      nfd,
      nfkc,
      nfkd,
      isNFC: text === nfc,
      isNFD: text === nfd,
      isNFKC: text === nfkc,
      isNFKD: text === nfkd,
    };
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
   * Evaluates whether an invisible character at position `pos` is strictly embedded
   * inside a token that reconstructs into a prompt-injection keyword when stripped of formatting.
   * Uses a 100% consistent Unicode code-point indexing model to ensure that astral characters
   * (e.g. emojis with surrogate pairs) preceding or surrounding the keyword never cause false negatives.
   * Prevents false positives where the separator merely follows a complete keyword or separates words.
   */
  private checkEmbeddedKeywordSmuggling(chars: string[], pos: number): { isEmbedded: boolean; keyword?: string; token?: string } {
    const isDelimiter = (ch: string) => /[\s.,;:!?'"()\[\]{}/\\<>+=_~@#$%^&*|\-]/.test(ch);

    let start = pos;
    while (start > 0 && !isDelimiter(chars[start - 1])) {
      start--;
    }

    let end = pos;
    while (end < chars.length - 1 && !isDelimiter(chars[end + 1])) {
      end++;
    }

    const tokenChars = chars.slice(start, end + 1);
    const relPos = pos - start;

    const cleanCodePoints: string[] = [];
    const cleanToOrigIndex: number[] = [];

    for (let i = 0; i < tokenChars.length; i++) {
      const ch = tokenChars[i];
      const cp = ch.codePointAt(0);
      if (cp && ZERO_WIDTH_POINTS[cp]) {
        continue;
      }
      cleanToOrigIndex.push(i);
      cleanCodePoints.push(ch.toLowerCase());
    }

    for (const kw of PROMPT_INJECTION_KEYWORDS) {
      const kwChars = Array.from(kw.toLowerCase());
      if (kwChars.length === 0 || kwChars.length > cleanCodePoints.length) {
        continue;
      }

      for (let sIdx = 0; sIdx <= cleanCodePoints.length - kwChars.length; sIdx++) {
        let match = true;
        for (let k = 0; k < kwChars.length; k++) {
          if (cleanCodePoints[sIdx + k] !== kwChars[k]) {
            match = false;
            break;
          }
        }

        if (match) {
          const origKwStart = cleanToOrigIndex[sIdx];
          const origKwEnd = cleanToOrigIndex[sIdx + kwChars.length - 1];

          // Character is strictly embedded inside this keyword if the keyword starts BEFORE relPos and ends AFTER relPos.
          if (origKwStart < relPos && origKwEnd > relPos) {
            return {
              isEmbedded: true,
              keyword: kw,
              token: tokenChars.join(''),
            };
          }
        }
      }
    }

    return { isEmbedded: false };
  }

  /**
   * Audits a string for anomalies, invisible smuggling, and security risks.
   * Completely non-destructive: original input is never mutated.
   */
  public audit(text: string): AuditReport {
    const anomalies: UnicodeAnomaly[] = [];
    const codePoints: number[] = [];
    const chars = Array.from(text);

    let hasZeroWidth = false;
    let hasBidi = false;
    let consecutiveCombining = 0;
    let maxConsecutiveCombining = 0;

    for (let pos = 0; pos < chars.length; pos++) {
      const char = chars[pos];
      const cp = char.codePointAt(0);
      if (cp === undefined) continue;
      codePoints.push(cp);

      const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
      const prevChar = pos > 0 ? chars[pos - 1] : undefined;
      const nextChar = pos + 1 < chars.length ? chars[pos + 1] : undefined;

      // 1. Check for zero-width / invisible format characters
      if (ZERO_WIDTH_POINTS[cp]) {
        const item = ZERO_WIDTH_POINTS[cp];
        let severity: Severity = item.defaultSeverity;
        let isLinguisticContext = false;
        let desc = item.desc;
        let recommendation = 'Review zero-width character to ensure it does not bypass filters or conceal intent.';

        // Contextual analysis for U+200B (Zero Width Space):
        // In Thai, Khmer, Lao, Myanmar: legitimate word boundary marker
        if (cp === 0x200b) {
          if (this.isScriptWordBreakContext(prevChar, nextChar)) {
            severity = 'info';
            isLinguisticContext = true;
            desc = 'Standard script word boundary marker in writing system without whitespace (e.g. Thai/Khmer/Lao/Myanmar).';
            recommendation = 'Preserve this character to maintain valid word segmentation and line breaking.';
          } else {
            const smuggling = this.checkEmbeddedKeywordSmuggling(chars, pos);
            if (smuggling.isEmbedded && smuggling.keyword) {
              severity = 'critical';
              isLinguisticContext = false;
              desc = `Critical zero-width smuggling: Character is embedded inside keyword token '${smuggling.keyword}'. Likely attempt to evade keyword moderation or safety filters.`;
              recommendation = 'Strip zero-width characters and review payload for adversarial intent.';
            } else {
              severity = 'warning';
              isLinguisticContext = false;
              desc = `Orphaned zero-width space in non-scriptio-continua text. Placed at boundary or between tokens; not embedded inside a keyword.`;
              recommendation = 'Review zero-width space to verify whether it represents accidental formatting or separator obfuscation.';
            }
          }
        }

        // Contextual analysis for ZWNJ (U+200C): Legitimate in Persian/Arabic/Indic (e.g. می\u200Cروم)
        if (cp === 0x200c) {
          if (this.isComplexScriptContext(prevChar, nextChar)) {
            severity = 'info';
            isLinguisticContext = true;
            desc = `Standard linguistic formatting character (${item.tag}). Retain to preserve text integrity.`;
            recommendation = 'Preserve this character to maintain valid orthography.';
          } else {
            const smuggling = this.checkEmbeddedKeywordSmuggling(chars, pos);
            if (smuggling.isEmbedded && smuggling.keyword) {
              severity = 'critical';
              isLinguisticContext = false;
              desc = `Critical zero-width non-joiner smuggling embedded inside keyword token '${smuggling.keyword}'.`;
              recommendation = 'Strip zero-width characters and review payload for adversarial intent.';
            } else {
              severity = 'warning';
              isLinguisticContext = false;
            }
          }
        }

        // Contextual analysis for ZWJ (U+200D): Legitimate in Emoji ZWJ sequences or Indic ligatures
        if (cp === 0x200d) {
          if (this.isEmojiContext(prevChar, nextChar) || this.isComplexScriptContext(prevChar, nextChar)) {
            severity = 'info';
            isLinguisticContext = true;
            desc = `Standard emoji or linguistic joiner (${item.tag}). Retain to preserve emoji sequences or ligatures.`;
            recommendation = 'Preserve this character to maintain valid emoji ligatures.';
          } else {
            const smuggling = this.checkEmbeddedKeywordSmuggling(chars, pos);
            if (smuggling.isEmbedded && smuggling.keyword) {
              severity = 'critical';
              isLinguisticContext = false;
              desc = `Critical zero-width joiner smuggling embedded inside keyword token '${smuggling.keyword}'.`;
              recommendation = 'Strip zero-width characters and review payload for adversarial intent.';
            } else {
              severity = 'warning';
              isLinguisticContext = false;
            }
          }
        }

        // Directional marks LRM / RLM (U+200E / U+200F): Standard UAX #9 formatting
        if (cp === 0x200e || cp === 0x200f) {
          severity = 'info';
          isLinguisticContext = true;
          desc = `Standard bidirectional mark (${item.tag}) used to order neutral characters (UAX #9).`;
          recommendation = 'Preserve directional marks to maintain intended visual order.';
        }

        // Mongolian Vowel Separator (U+180E), Soft Hyphen (U+00AD), Word Joiner (U+2060), and Math Operators (U+2061..U+2064):
        if (cp === 0x180e || cp === 0x00ad || cp === 0x2060 || (cp >= 0x2061 && cp <= 0x2064)) {
          severity = 'info';
          isLinguisticContext = true;
          if (cp === 0x180e) {
            desc = 'Mongolian vowel separator (U+180E) format character.';
            recommendation = 'Preserve vowel separator in Mongolian text context.';
          } else if (cp === 0x00ad) {
            desc = 'Discretionary soft hyphen used for typographical line breaking.';
            recommendation = 'Preserve soft hyphen to support responsive document typesetting.';
          } else if (cp >= 0x2061 && cp <= 0x2064) {
            desc = 'Standard invisible mathematical operator (MathML/Unicode mathematics).';
            recommendation = 'Preserve operator to maintain semantic mathematical formula representation.';
          } else {
            desc = 'Zero-width word joiner (U+2060) preventing line breaks without spacing.';
            recommendation = 'Preserve word joiner unless word-break normalization is requested.';
          }
        }

        if (severity !== 'info') {
          hasZeroWidth = true;
        }

        anomalies.push({
          type: 'zero_width',
          severity,
          codePoint: cp,
          hex,
          char,
          position: pos,
          name: item.name,
          description: desc,
          recommendation,
          isLinguisticContext,
        });
      }

      // 2. Check for Bidi overrides and isolates (UAX #9)
      if (BIDI_POINTS[cp]) {
        const item = BIDI_POINTS[cp];
        hasBidi = true;
        anomalies.push({
          type: 'bidi_override',
          severity: item.defaultSeverity,
          codePoint: cp,
          hex,
          char,
          position: pos,
          name: item.name,
          description: item.desc,
          recommendation: 'Neutralize or escape directional overrides to prevent visual spoofing (CVE-2021-42574).',
        });
      }

      // 3. Check for dangerous non-printable control characters
      if (
        (cp >= 0x0000 && cp <= 0x001f && cp !== 0x0009 && cp !== 0x000a && cp !== 0x000d) ||
        (cp >= 0x007f && cp <= 0x009f)
      ) {
        anomalies.push({
          type: 'control',
          severity: cp === 0x0000 ? 'critical' : 'warning',
          codePoint: cp,
          hex,
          char: '',
          position: pos,
          name: cp === 0x0000 ? 'NULL BYTE' : 'CONTROL CHARACTER',
          description: cp === 0x0000 ? 'Null byte injection vulnerability' : 'Non-printable ASCII/C1 control code',
          recommendation: 'Strip control characters to prevent parser corruption and log injection',
        });
      }

      // 4. Check for replacement character U+FFFD (indicates prior data loss or encoding mismatch)
      if (cp === 0xfffd) {
        anomalies.push({
          type: 'byte_split_risk',
          severity: 'warning',
          codePoint: cp,
          hex,
          char,
          position: pos,
          name: 'REPLACEMENT CHARACTER',
          description: 'Input contains Unicode replacement character (U+FFFD), indicating prior data loss or encoding mismatch (Mojibake)',
          recommendation: 'Trace upstream ingestion pipeline to locate UTF-8 decoding faults',
        });
      }

      // 5. Combining diacritical marks (detecting Zalgo text)
      if (
        (cp >= 0x0300 && cp <= 0x036f) ||
        (cp >= 0x1ab0 && cp <= 0x1aff) ||
        (cp >= 0x1dc0 && cp <= 0x1dff) ||
        (cp >= 0x20d0 && cp <= 0x20ff) ||
        (cp >= 0xfe20 && cp <= 0xfe2f)
      ) {
        consecutiveCombining++;
        if (consecutiveCombining > maxConsecutiveCombining) {
          maxConsecutiveCombining = consecutiveCombining;
        }
      } else {
        consecutiveCombining = 0;
      }
    }

    // Evaluate Zalgo / diacritic overflow (only for excessive Latin/Greek combining marks >= 5)
    const hasZalgo = maxConsecutiveCombining >= 5;
    if (hasZalgo) {
      anomalies.push({
        type: 'zalgo',
        severity: 'warning',
        codePoint: 0x0300,
        hex: 'U+0300..U+036F',
        char: 'combining_marks',
        position: 0,
        name: 'ZALGO_COMBINING_OVERFLOW',
        description: `Excessive combining diacritics detected (${maxConsecutiveCombining} stacked marks). Can cause UI layout breakage or regex DoS`,
        recommendation: 'Limit consecutive combining marks or normalize text with NFC',
      });
    }

    // Normalization analysis
    const norm = this.analyzeNormalization(text);
    if (!norm.isNFC) {
      anomalies.push({
        type: 'non_nfc',
        severity: 'info',
        codePoint: 0,
        hex: 'N/A',
        char: '',
        position: 0,
        name: 'NON_NFC_NORMALIZATION',
        description: 'Input string is not in standard NFC canonical composition. May cause equality comparison mismatches and duplicate database records',
        recommendation: 'Normalize incoming text to NFC before indexing or saving to databases',
      });
    }

    // Calculate calibrated risk score (0-100)
    // Only non-linguistic anomalies contribute to risk score
    let riskScore = 0;
    for (const a of anomalies) {
      if (a.isLinguisticContext) continue; // Legitimate linguistic format characters do not increase security risk
      if (a.severity === 'critical') riskScore += 35;
      else if (a.severity === 'warning') riskScore += 15;
      else if (a.severity === 'info') riskScore += 2;
    }
    riskScore = Math.min(100, riskScore);

    const byteLengthUtf8 = Buffer.byteLength(text, 'utf8');
    const byteLengthUtf16 = text.length * 2;
    const graphemeCount = this.countGraphemes(text);
    const diagnosticView = this.getDiagnosticView(text);

    let summary = 'No known Unicode integrity or security patterns detected.';
    const nonLinguisticAnomalies = anomalies.filter(a => !a.isLinguisticContext);
    if (riskScore >= 70) {
      summary = `CRITICAL RISK: Detected high-severity anomalies (${anomalies.filter(a => a.severity === 'critical').length} critical issues) including invisible smuggling or bidi overrides.`;
    } else if (riskScore >= 30) {
      summary = `MODERATE RISK: Detected ${nonLinguisticAnomalies.length} anomalies requiring review before database or LLM usage.`;
    } else if (nonLinguisticAnomalies.length > 0) {
      summary = `INFORMATIONAL: Input contains ${nonLinguisticAnomalies.length} non-standard Unicode characteristics.`;
    }

    return {
      input: text,
      codePointCount: codePoints.length,
      byteLengthUtf8,
      byteLengthUtf16,
      graphemeCount,
      normalization: norm,
      hasBidi,
      hasZeroWidth,
      hasHomoglyphs: false, // Updated by HomoglyphDetector
      hasZalgo,
      anomalies,
      riskScore,
      diagnosticView,
      summary,
    };
  }
}
