/**
 * GlobalInputLab - Homoglyph & Confusable Detector
 * Detects cross-script visual confusables (Cyrillic, Greek, Armenian, Cherokee, Math, Fullwidth)
 * used for IDN spoofing, credential masquerading, and filter evasion.
 * Standards Alignment: Curated security subset based on Unicode Technical Standard #39 (UTS #39 v18.0.0).
 * Official Security Data: https://www.unicode.org/Public/18.0.0/security/confusables.txt
 * Official Standard: https://www.unicode.org/reports/tr39/
 * (c) 2026 Brahim Battou. MIT License.
 */

import { HomoglyphMatch, HomoglyphReport } from '../types.js';

export const UTS_39_VERSION = '18.0.0';
export const DATASET_TYPE = 'curated-security-subset' as const;

interface ConfusableEntry {
  target: string;
  targetCp: number;
  sourceScript: string;
}

// Curated high-fidelity table of confusables that visually mimic Latin characters (UTS #39 v18.0.0)
const CONFUSABLES_MAP: Record<number, ConfusableEntry> = {
  // Cyrillic Small
  0x0430: { target: 'a', targetCp: 0x0061, sourceScript: 'Cyrillic' },
  0x0441: { target: 'c', targetCp: 0x0063, sourceScript: 'Cyrillic' },
  0x0435: { target: 'e', targetCp: 0x0065, sourceScript: 'Cyrillic' },
  0x0456: { target: 'i', targetCp: 0x0069, sourceScript: 'Cyrillic' },
  0x0458: { target: 'j', targetCp: 0x006a, sourceScript: 'Cyrillic' },
  0x043e: { target: 'o', targetCp: 0x006f, sourceScript: 'Cyrillic' },
  0x0440: { target: 'p', targetCp: 0x0070, sourceScript: 'Cyrillic' },
  0x0455: { target: 's', targetCp: 0x0073, sourceScript: 'Cyrillic' },
  0x0445: { target: 'x', targetCp: 0x0078, sourceScript: 'Cyrillic' },
  0x0443: { target: 'y', targetCp: 0x0079, sourceScript: 'Cyrillic' },
  0x0501: { target: 'd', targetCp: 0x0064, sourceScript: 'Cyrillic' },
  0x051b: { target: 'q', targetCp: 0x0071, sourceScript: 'Cyrillic' },

  // Cyrillic Capital
  0x0410: { target: 'A', targetCp: 0x0041, sourceScript: 'Cyrillic' },
  0x0412: { target: 'B', targetCp: 0x0042, sourceScript: 'Cyrillic' },
  0x0421: { target: 'C', targetCp: 0x0043, sourceScript: 'Cyrillic' },
  0x0415: { target: 'E', targetCp: 0x0045, sourceScript: 'Cyrillic' },
  0x041d: { target: 'H', targetCp: 0x0048, sourceScript: 'Cyrillic' },
  0x0406: { target: 'I', targetCp: 0x0049, sourceScript: 'Cyrillic' },
  0x0408: { target: 'J', targetCp: 0x004a, sourceScript: 'Cyrillic' },
  0x041a: { target: 'K', targetCp: 0x004b, sourceScript: 'Cyrillic' },
  0x041c: { target: 'M', targetCp: 0x004d, sourceScript: 'Cyrillic' },
  0x041e: { target: 'O', targetCp: 0x004e, sourceScript: 'Cyrillic' },
  0x0420: { target: 'P', targetCp: 0x0050, sourceScript: 'Cyrillic' },
  0x0405: { target: 'S', targetCp: 0x0053, sourceScript: 'Cyrillic' },
  0x0422: { target: 'T', targetCp: 0x0054, sourceScript: 'Cyrillic' },
  0x0425: { target: 'X', targetCp: 0x0058, sourceScript: 'Cyrillic' },
  0x04ae: { target: 'Y', targetCp: 0x0059, sourceScript: 'Cyrillic' },

  // Greek Small
  0x03b1: { target: 'a', targetCp: 0x0061, sourceScript: 'Greek' },
  0x03b2: { target: 'b', targetCp: 0x0062, sourceScript: 'Greek' },
  0x03b5: { target: 'e', targetCp: 0x0065, sourceScript: 'Greek' },
  0x03b7: { target: 'n', targetCp: 0x006e, sourceScript: 'Greek' },
  0x03b9: { target: 'i', targetCp: 0x0069, sourceScript: 'Greek' },
  0x03ba: { target: 'k', targetCp: 0x006b, sourceScript: 'Greek' },
  0x03bd: { target: 'v', targetCp: 0x0076, sourceScript: 'Greek' },
  0x03bf: { target: 'o', targetCp: 0x006f, sourceScript: 'Greek' },
  0x03c1: { target: 'p', targetCp: 0x0070, sourceScript: 'Greek' },
  0x03c4: { target: 't', targetCp: 0x0074, sourceScript: 'Greek' },
  0x03c5: { target: 'u', targetCp: 0x0075, sourceScript: 'Greek' },
  0x03c7: { target: 'x', targetCp: 0x0078, sourceScript: 'Greek' },

  // Greek Capital
  0x0391: { target: 'A', targetCp: 0x0041, sourceScript: 'Greek' },
  0x0392: { target: 'B', targetCp: 0x0042, sourceScript: 'Greek' },
  0x0395: { target: 'E', targetCp: 0x0045, sourceScript: 'Greek' },
  0x0396: { target: 'Z', targetCp: 0x005a, sourceScript: 'Greek' },
  0x0397: { target: 'H', targetCp: 0x0048, sourceScript: 'Greek' },
  0x0399: { target: 'I', targetCp: 0x0049, sourceScript: 'Greek' },
  0x039a: { target: 'K', targetCp: 0x004b, sourceScript: 'Greek' },
  0x039c: { target: 'M', targetCp: 0x004d, sourceScript: 'Greek' },
  0x039d: { target: 'N', targetCp: 0x004e, sourceScript: 'Greek' },
  0x039f: { target: 'O', targetCp: 0x004f, sourceScript: 'Greek' },
  0x03a1: { target: 'P', targetCp: 0x0050, sourceScript: 'Greek' },
  0x03a4: { target: 'T', targetCp: 0x0054, sourceScript: 'Greek' },
  0x03a5: { target: 'Y', targetCp: 0x0059, sourceScript: 'Greek' },
  0x03a7: { target: 'X', targetCp: 0x0058, sourceScript: 'Greek' },

  // Cherokee Lookalikes
  0x13a0: { target: 'D', targetCp: 0x0044, sourceScript: 'Cherokee' },
  0x13a1: { target: 'R', targetCp: 0x0052, sourceScript: 'Cherokee' },
  0x13a2: { target: 'T', targetCp: 0x0054, sourceScript: 'Cherokee' },
  0x13aa: { target: 'A', targetCp: 0x0041, sourceScript: 'Cherokee' },
  0x13b5: { target: 'B', targetCp: 0x0042, sourceScript: 'Cherokee' },
  0x13c0: { target: 'M', targetCp: 0x004d, sourceScript: 'Cherokee' },
  0x13bb: { target: 'H', targetCp: 0x0048, sourceScript: 'Cherokee' },
  0x13cd: { target: 'W', targetCp: 0x0057, sourceScript: 'Cherokee' },
  0x13c3: { target: 'Z', targetCp: 0x005a, sourceScript: 'Cherokee' },

  // Armenian Lookalikes
  0x0585: { target: 'o', targetCp: 0x006f, sourceScript: 'Armenian' },
  0x0578: { target: 'n', targetCp: 0x006e, sourceScript: 'Armenian' },
  0x0563: { target: 'q', targetCp: 0x0071, sourceScript: 'Armenian' },
  0x0582: { target: 'u', targetCp: 0x0075, sourceScript: 'Armenian' },
};

// Add Fullwidth forms (U+FF01..U+FF5E map to U+0021..U+007E)
for (let fw = 0xff01; fw <= 0xff5e; fw++) {
  const ascii = fw - 0xfee0;
  CONFUSABLES_MAP[fw] = {
    target: String.fromCharCode(ascii),
    targetCp: ascii,
    sourceScript: 'Fullwidth',
  };
}

// Add Mathematical Bold Capital (U+1D400..U+1D419 -> A..Z)
for (let i = 0; i < 26; i++) {
  CONFUSABLES_MAP[0x1d400 + i] = {
    target: String.fromCharCode(0x0041 + i),
    targetCp: 0x0041 + i,
    sourceScript: 'Mathematical Alphanumeric',
  };
}

// Add Mathematical Bold Small (U+1D41A..U+1D433 -> a..z)
for (let i = 0; i < 26; i++) {
  CONFUSABLES_MAP[0x1d41a + i] = {
    target: String.fromCharCode(0x0061 + i),
    targetCp: 0x0061 + i,
    sourceScript: 'Mathematical Alphanumeric',
  };
}

// Add Mathematical Monospace Small (U+1D68A..U+1D6A3 -> a..z)
for (let i = 0; i < 26; i++) {
  CONFUSABLES_MAP[0x1d68a + i] = {
    target: String.fromCharCode(0x0061 + i),
    targetCp: 0x0061 + i,
    sourceScript: 'Mathematical Monospace',
  };
}

export class HomoglyphDetector {
  /**
   * Helper to detect if a word/token contains both Latin letters and foreign confusables (UTS #39 Mixed-Script).
   */
  private checkMixedScriptWord(word: string): boolean {
    let hasLatin = false;
    let hasForeignConfusable = false;

    for (const char of word) {
      const cp = char.codePointAt(0);
      if (cp === undefined) continue;

      if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) {
        hasLatin = true;
      } else if (CONFUSABLES_MAP[cp] && CONFUSABLES_MAP[cp].sourceScript !== 'Fullwidth') {
        hasForeignConfusable = true;
      }
    }

    return hasLatin && hasForeignConfusable;
  }

  /**
   * Inspects a string and reports confusable/homoglyph characters according to UTS #39 curated security subset.
   */
  public detect(text: string): HomoglyphReport {
    const matches: HomoglyphMatch[] = [];
    let normalizedLatinPreview = '';

    const chars = Array.from(text);

    // Segment text into precise token spans to track character-offset boundaries
    interface TokenSpan {
      start: number;
      end: number;
      text: string;
      isMixedScript: boolean;
    }

    const tokenSpans: TokenSpan[] = [];
    let currentTokenStart = -1;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const isDelim = /[\s,.;:!?'"()\[\]{}/\\<>+=_~@#$%^&*|\-]/.test(ch);
      if (!isDelim) {
        if (currentTokenStart === -1) {
          currentTokenStart = i;
        }
      } else {
        if (currentTokenStart !== -1) {
          const tokenStr = chars.slice(currentTokenStart, i).join('');
          tokenSpans.push({
            start: currentTokenStart,
            end: i,
            text: tokenStr,
            isMixedScript: this.checkMixedScriptWord(tokenStr),
          });
          currentTokenStart = -1;
        }
      }
    }

    if (currentTokenStart !== -1) {
      const tokenStr = chars.slice(currentTokenStart, chars.length).join('');
      tokenSpans.push({
        start: currentTokenStart,
        end: chars.length,
        text: tokenStr,
        isMixedScript: this.checkMixedScriptWord(tokenStr),
      });
    }

    let pos = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const cp = char.codePointAt(0);
      if (cp === undefined) {
        normalizedLatinPreview += char;
        pos++;
        continue;
      }

      const confusable = CONFUSABLES_MAP[cp];
      if (confusable) {
        // Evaluate mixed-script status strictly based on the token enclosing this specific character offset
        const enclosingToken = tokenSpans.find((t) => i >= t.start && i < t.end);
        const isMixedScript = enclosingToken ? enclosingToken.isMixedScript : false;

        matches.push({
          char,
          codePoint: cp,
          hex: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          position: pos,
          confusableWith: confusable.target,
          confusableCodePoint: confusable.targetCp,
          confusableHex: 'U+' + confusable.targetCp.toString(16).toUpperCase().padStart(4, '0'),
          sourceScript: confusable.sourceScript,
          targetScript: 'Latin',
          isMixedScriptWord: isMixedScript,
          riskDescription: isMixedScript
            ? `Critical Mixed-Script Spoofing: Foreign ${confusable.sourceScript} character '${char}' embedded inside a Latin word. High likelihood of credential or domain masquerading (UTS #39).`
            : `Cross-Script Confusable: ${confusable.sourceScript} character '${char}' visually mimics Latin '${confusable.target}'.`,
        });

        normalizedLatinPreview += confusable.target;
      } else {
        normalizedLatinPreview += char;
      }

      pos++;
    }

    return {
      input: text,
      hasHomoglyphs: matches.length > 0,
      standardsVersion: `UTS #39 v${UTS_39_VERSION}`,
      datasetScope: DATASET_TYPE,
      matches,
      normalizedLatinPreview,
    };
  }

  /**
   * Checks whether the string contains any confusables from the curated dataset
   */
  public hasConfusables(text: string): boolean {
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (cp !== undefined && CONFUSABLES_MAP[cp]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Canonicalizes confusables to their base Latin equivalents.
   * WARNING: Destructive to native text. Should only be applied during credential spoofing checks.
   */
  public canonicalize(text: string): string {
    let out = '';
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (cp !== undefined && CONFUSABLES_MAP[cp]) {
        out += CONFUSABLES_MAP[cp].target;
      } else {
        out += char;
      }
    }
    return out;
  }
}
