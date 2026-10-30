/**
 * GlobalInputLab - Unicode Auditor
 * Inspects strings for invisible characters, zero-width smuggling,
 * bidirectional overrides, normalization drift, and encoding risks.
 * Non-destructive and standards-aligned (UAX #9, UAX #15, UAX #29, UTS #39).
 * (c) 2026 Brahim Battou. MIT License.
 */

import { AuditReport, NormalizationAnalysis, Severity, UnicodeAnomaly } from '../types.js';

// Table of known invisible and zero-width code points
interface CharMeta {
  name: string;
  desc: string;
  defaultSeverity: Severity;
  tag: string;
}

const ZERO_WIDTH_POINTS: Record<number, CharMeta> = {
  0x200b: { name: 'ZERO WIDTH SPACE', desc: 'Can be used for text steganography or prompt injection smuggling', defaultSeverity: 'critical', tag: 'ZWSP' },
  0x200c: { name: 'ZERO WIDTH NON-JOINER', desc: 'Prevents ligature formation (essential in Persian/Indic, suspect in Latin)', defaultSeverity: 'warning', tag: 'ZWNJ' },
  0x200d: { name: 'ZERO WIDTH JOINER', desc: 'Combines characters/emojis (essential in emoji sequences, suspect in Latin)', defaultSeverity: 'warning', tag: 'ZWJ' },
  0xfeff: { name: 'ZERO WIDTH NO-BREAK SPACE (BOM)', desc: 'Byte order mark, causes unexpected string comparison mismatches', defaultSeverity: 'warning', tag: 'BOM' },
  0x2060: { name: 'WORD JOINER', desc: 'Zero-width non-breaking character that can conceal payload boundaries', defaultSeverity: 'warning', tag: 'WJ' },
  0x180e: { name: 'MONGOLIAN VOWEL SEPARATOR', desc: 'Deprecated invisible separator that may cause rendering anomalies', defaultSeverity: 'warning', tag: 'MVS' },
  0x00ad: { name: 'SOFT HYPHEN', desc: 'Invisible formatting character until a line break occurs, evades exact match filters', defaultSeverity: 'warning', tag: 'SHY' },
  0x200e: { name: 'LEFT-TO-RIGHT MARK', desc: 'Invisible directional formatting character used to correct neutral character ordering', defaultSeverity: 'info', tag: 'LRM' },
  0x200f: { name: 'RIGHT-TO-LEFT MARK', desc: 'Invisible directional formatting character used to correct neutral character ordering', defaultSeverity: 'info', tag: 'RLM' },
  0x2061: { name: 'FUNCTION APPLICATION', desc: 'Invisible math operator, unexpected in general text', defaultSeverity: 'warning', tag: 'FA' },
  0x2062: { name: 'INVISIBLE TIMES', desc: 'Invisible math operator, unexpected in general text', defaultSeverity: 'warning', tag: 'IT' },
  0x2063: { name: 'INVISIBLE SEPARATOR', desc: 'Invisible punctuation character', defaultSeverity: 'warning', tag: 'IS' },
  0x2064: { name: 'INVISIBLE PLUS', desc: 'Invisible math operator', defaultSeverity: 'warning', tag: 'IP' },
};

// Table of Bidirectional Overrides and Isolates
const BIDI_POINTS: Record<number, CharMeta> = {
  0x202a: { name: 'LEFT-TO-RIGHT EMBEDDING (LRE)', desc: 'Forces LTR directionality, alters visual order of characters', defaultSeverity: 'warning', tag: 'LRE' },
  0x202b: { name: 'RIGHT-TO-LEFT EMBEDDING (RLE)', desc: 'Forces RTL directionality, alters visual order of characters', defaultSeverity: 'warning', tag: 'RLE' },
  0x202c: { name: 'POP DIRECTIONAL FORMATTING (PDF)', desc: 'Terminates embedding/override scope', defaultSeverity: 'warning', tag: 'PDF' },
  0x202d: { name: 'LEFT-TO-RIGHT OVERRIDE (LRO)', desc: 'High-risk override: inverts visual character sequence, spoofing file extensions or URLs', defaultSeverity: 'critical', tag: 'LRO' },
  0x202e: { name: 'RIGHT-TO-LEFT OVERRIDE (RLO)', desc: 'Critical Trojan Source vulnerability vector (e.g. disguised .exe as .pdf)', defaultSeverity: 'critical', tag: 'RLO' },
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

  /**
   * Checks whether a code point belongs to Arabic, Persian, Hebrew, or Indic scripts
   */
  private isPersoArabicOrIndic(cp: number): boolean {
    return (
      (cp >= 0x0600 && cp <= 0x06ff) || // Arabic
      (cp >= 0x0750 && cp <= 0x077f) || // Arabic Supplement
      (cp >= 0x08a0 && cp <= 0x08ff) || // Arabic Extended-A
      (cp >= 0x0590 && cp <= 0x05ff) || // Hebrew
      (cp >= 0x0900 && cp <= 0x097f) || // Devanagari
      (cp >= 0x0980 && cp <= 0x09ff)    // Bengali
    );
  }

  /**
   * Checks whether a code point is an emoji or modifier
   */
  private isEmoji(cp: number): boolean {
    return (
      (cp >= 0x1f300 && cp <= 0x1faff) || // Miscellaneous Symbols and Pictographs, Emoticons, Transport
      (cp >= 0x2600 && cp <= 0x27bf) ||   // Miscellaneous Symbols, Dingbats
      (cp >= 0xfe00 && cp <= 0xfe0f)      // Variation Selectors
    );
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
      const prevCp = pos > 0 ? chars[pos - 1].codePointAt(0) : undefined;
      const nextCp = pos + 1 < chars.length ? chars[pos + 1].codePointAt(0) : undefined;

      // 1. Check for zero-width / invisible format characters
      if (ZERO_WIDTH_POINTS[cp]) {
        const item = ZERO_WIDTH_POINTS[cp];
        let severity = item.defaultSeverity;
        let isLinguisticContext = false;

        // Contextual analysis for ZWNJ (U+200C): Legitimate in Persian/Arabic/Indic (e.g. می\u200Cروم)
        if (cp === 0x200c) {
          if ((prevCp && this.isPersoArabicOrIndic(prevCp)) || (nextCp && this.isPersoArabicOrIndic(nextCp))) {
            severity = 'info';
            isLinguisticContext = true;
          }
        }

        // Contextual analysis for ZWJ (U+200D): Legitimate in Emoji ZWJ sequences or Indic ligatures
        if (cp === 0x200d) {
          if ((prevCp && (this.isEmoji(prevCp) || this.isPersoArabicOrIndic(prevCp))) ||
              (nextCp && (this.isEmoji(nextCp) || this.isPersoArabicOrIndic(nextCp)))) {
            severity = 'info';
            isLinguisticContext = true;
          }
        }

        // Directional marks LRM / RLM (U+200E / U+200F): Standard UAX #9 formatting
        if (cp === 0x200e || cp === 0x200f) {
          severity = 'info';
          isLinguisticContext = true;
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
          description: isLinguisticContext
            ? `Standard linguistic or emoji formatting character (${item.tag}). Retain to preserve text integrity.`
            : item.desc,
          recommendation: isLinguisticContext
            ? 'Preserve this character to maintain valid orthography or emoji ligatures.'
            : 'Strip or review zero-width character to prevent filter evasion or prompt injection smuggling.',
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

    // Evaluate Zalgo / diacritic overflow
    const hasZalgo = maxConsecutiveCombining >= 4;
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
        recommendation: 'Limit consecutive combining marks to 3 or normalize text with NFC',
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
    if (riskScore >= 70) {
      summary = `CRITICAL RISK: Detected high-severity anomalies (${anomalies.filter(a => a.severity === 'critical').length} critical issues) including invisible smuggling or bidi overrides.`;
    } else if (riskScore >= 30) {
      summary = `MODERATE RISK: Detected ${anomalies.filter(a => !a.isLinguisticContext).length} anomalies requiring review before database or LLM usage.`;
    } else if (anomalies.length > 0) {
      summary = `INFORMATIONAL: Input contains ${anomalies.length} standard Unicode characteristics (e.g. linguistic formatting or normalization).`;
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
