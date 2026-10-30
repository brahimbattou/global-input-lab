/**
 * GlobalInputLab - Boundary Inspector
 * Detects UTF-8 multi-byte truncation risks, lone surrogate halves,
 * and character replacement corruption (U+FFFD).
 * (c) 2026 Brahim Battou. MIT License.
 */

export interface TruncationAnalysis {
  originalText: string;
  originalBytes: number;
  targetMaxBytes: number;
  wouldCorrupt: boolean;
  safeText: string;
  safeBytes: number;
  lostCharactersCount: number;
  truncatedCodePoint?: {
    char: string;
    codePoint: number;
    hex: string;
    totalBytes: number;
    retainedBytes: number;
  };
}

export interface LoneSurrogate {
  codeUnit: number;
  hex: string;
  position: number;
  type: 'high_surrogate' | 'low_surrogate';
  description: string;
}

export class BoundaryInspector {
  /**
   * Analyzes what happens when a string is sliced to a maximum byte length.
   * Prevents mid-character slicing that results in malformed UTF-8 or U+FFFD replacement characters.
   */
  public analyzeByteTruncation(text: string, maxBytes: number): TruncationAnalysis {
    const originalBuf = Buffer.from(text, 'utf8');
    const originalBytes = originalBuf.length;

    if (maxBytes >= originalBytes) {
      return {
        originalText: text,
        originalBytes,
        targetMaxBytes: maxBytes,
        wouldCorrupt: false,
        safeText: text,
        safeBytes: originalBytes,
        lostCharactersCount: 0,
      };
    }

    // Inspect the byte at maxBytes boundary
    // In UTF-8:
    // 0xxxxxxx = 1-byte ASCII (0x00..0x7F)
    // 110xxxxx = 2-byte start (0xC0..0xDF)
    // 1110xxxx = 3-byte start (0xE0..0xEF)
    // 11110xxx = 4-byte start (0xF0..0xF7)
    // 10xxxxxx = continuation byte (0x80..0xBF)

    let safeCut = maxBytes;
    // Walk backward if we land on a continuation byte or the start of an incomplete sequence
    while (safeCut > 0 && (originalBuf[safeCut] & 0xc0) === 0x80) {
      safeCut--;
    }

    // Check if the byte at safeCut starts a multi-byte sequence that exceeds maxBytes
    if (safeCut > 0) {
      const leadByte = originalBuf[safeCut];
      let expectedSeqLen = 1;
      if ((leadByte & 0xe0) === 0xc0) expectedSeqLen = 2;
      else if ((leadByte & 0xf0) === 0xe0) expectedSeqLen = 3;
      else if ((leadByte & 0xf8) === 0xf0) expectedSeqLen = 4;

      if (safeCut + expectedSeqLen > maxBytes) {
        // This character cannot fit completely in maxBytes
        // safeCut must exclude this lead byte
      } else {
        // It fit completely
        safeCut = safeCut + expectedSeqLen;
      }
    }

    // If naive slice is done at maxBytes
    const naiveBuf = originalBuf.subarray(0, maxBytes);
    const decodedNaive = naiveBuf.toString('utf8');
    const wouldCorrupt = decodedNaive.includes('\uFFFD') && !text.includes('\uFFFD');

    const safeBuf = originalBuf.subarray(0, safeCut);
    const safeText = safeBuf.toString('utf8');

    return {
      originalText: text,
      originalBytes,
      targetMaxBytes: maxBytes,
      wouldCorrupt,
      safeText,
      safeBytes: safeBuf.length,
      lostCharactersCount: Array.from(text).length - Array.from(safeText).length,
    };
  }

  /**
   * Identifies lone surrogates (isolated high or low surrogates)
   * that cause JSON.stringify errors or database exceptions
   */
  public findLoneSurrogates(text: string): LoneSurrogate[] {
    const surrogates: LoneSurrogate[] = [];

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      if (code >= 0xd800 && code <= 0xdbff) {
        // High surrogate - check if next is low surrogate
        const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
        if (next < 0xdc00 || next > 0xdfff) {
          surrogates.push({
            codeUnit: code,
            hex: 'U+' + code.toString(16).toUpperCase(),
            position: i,
            type: 'high_surrogate',
            description: 'Unpaired high surrogate (0xD800..0xDBFF) without matching low surrogate',
          });
        } else {
          // Skip the pair
          i++;
        }
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        // Unpaired low surrogate
        surrogates.push({
          codeUnit: code,
          hex: 'U+' + code.toString(16).toUpperCase(),
          position: i,
          type: 'low_surrogate',
          description: 'Unpaired low surrogate (0xDC00..0xDFFF) without preceding high surrogate',
        });
      }
    }

    return surrogates;
  }

  /**
   * Detects Unicode replacement characters (U+FFFD)
   */
  public findReplacementCharacters(text: string): number[] {
    const indices: number[] = [];
    let idx = text.indexOf('\uFFFD');
    while (idx !== -1) {
      indices.push(idx);
      idx = text.indexOf('\uFFFD', idx + 1);
    }
    return indices;
  }
}
