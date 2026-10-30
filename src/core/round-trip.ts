/**
 * GlobalInputLab - Round Trip Verifier
 * Verifies byte-level data preservation across encoding, serialization,
 * transport, and database round-trips.
 * (c) 2026 Brahim Battou. MIT License.
 */

import { RoundTripResult } from '../types.js';

export class RoundTripVerifier {
  /**
   * Compares an input string with a returned/stored string to verify round-trip fidelity.
   */
  public verify(original: string, processed: string): RoundTripResult {
    const identical = original === processed;
    const originalBuf = Buffer.from(original, 'utf8');
    const processedBuf = Buffer.from(processed, 'utf8');
    const bytePreserved = originalBuf.equals(processedBuf);
    const lengthDelta = processed.length - original.length;

    const hadReplacementBefore = original.includes('\uFFFD');
    const hasReplacementNow = processed.includes('\uFFFD');
    const introducedReplacementChar = !hadReplacementBefore && hasReplacementNow;

    let diffDescription: string | undefined;

    if (!identical) {
      // Pinpoint first mismatch
      const maxLen = Math.max(original.length, processed.length);

      for (let i = 0; i < maxLen; i++) {
        const c1 = original[i];
        const c2 = processed[i];
        if (c1 !== c2) {
          const origHex = c1 ? 'U+' + c1.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') : 'END';
          const procHex = c2 ? 'U+' + c2.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') : 'END';
          diffDescription = `Mismatch at character index ${i}: expected '${c1 ?? ''}' (${origHex}), got '${c2 ?? ''}' (${procHex}). Original length: ${original.length}, Processed length: ${processed.length}.`;
          break;
        }
      }

      if (introducedReplacementChar) {
        diffDescription += ' CRITICAL: Unicode replacement character (U+FFFD) was introduced, confirming byte truncation or encoding corruption.';
      }
    }

    return {
      original,
      processed,
      identical,
      bytePreserved,
      lengthDelta,
      introducedReplacementChar,
      diffDescription,
    };
  }

  /**
   * Verifies JSON serialization and deserialization integrity
   */
  public verifyJsonSerialization(text: string): RoundTripResult {
    try {
      const serialized = JSON.stringify({ data: text });
      const parsed = JSON.parse(serialized);
      return this.verify(text, parsed.data);
    } catch (err) {
      return {
        original: text,
        processed: '',
        identical: false,
        bytePreserved: false,
        lengthDelta: -text.length,
        introducedReplacementChar: false,
        diffDescription: `JSON serialization failed: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Verifies URI encoding and decoding round-trip integrity
   */
  public verifyUriEncoding(text: string): RoundTripResult {
    try {
      const encoded = encodeURIComponent(text);
      const decoded = decodeURIComponent(encoded);
      return this.verify(text, decoded);
    } catch (err) {
      return {
        original: text,
        processed: '',
        identical: false,
        bytePreserved: false,
        lengthDelta: -text.length,
        introducedReplacementChar: false,
        diffDescription: `URI decoding failed: ${(err as Error).message}`,
      };
    }
  }
}
