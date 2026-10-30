/**
 * GlobalInputLab - Round Trip Verifier
 * Verifies byte-level data preservation across encoding, serialization,
 * transport, and database round-trips.
 * (c) 2026 Brahim Battou. MIT License.
 */

import { RoundTripResult } from '../types.js';

export class RoundTripVerifier {
  /**
   * Compares an input string or raw byte buffer with a returned/stored string or raw buffer
   * to verify byte-exact round-trip fidelity.
   */
  public verify(original: string | Buffer, processed: string | Buffer): RoundTripResult {
    const originalBuf = Buffer.isBuffer(original) ? original : Buffer.from(original, 'utf8');
    const processedBuf = Buffer.isBuffer(processed) ? processed : Buffer.from(processed, 'utf8');

    const originalStr = Buffer.isBuffer(original) ? original.toString('utf8') : original;
    const processedStr = Buffer.isBuffer(processed) ? processed.toString('utf8') : processed;

    const bytePreserved = originalBuf.equals(processedBuf);
    const identical = bytePreserved && (originalStr === processedStr);
    const lengthDelta = processedStr.length - originalStr.length;

    const hadReplacementBefore = originalStr.includes('\uFFFD');
    const hasReplacementNow = processedStr.includes('\uFFFD');
    const introducedReplacementChar = (!hadReplacementBefore && hasReplacementNow) || (!bytePreserved && hasReplacementNow);

    let diffDescription: string | undefined;
    let firstByteMismatchOffset: number | undefined;
    let expectedBytesHex: string | undefined;
    let receivedBytesHex: string | undefined;

    if (!bytePreserved || !identical) {
      let charMismatchDesc = '';
      if (!identical || originalStr !== processedStr) {
        const maxLen = Math.max(originalStr.length, processedStr.length);
        for (let i = 0; i < maxLen; i++) {
          const c1 = originalStr[i];
          const c2 = processedStr[i];
          if (c1 !== c2) {
            const origHex = c1 ? 'U+' + c1.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') : 'END';
            const procHex = c2 ? 'U+' + c2.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') : 'END';
            charMismatchDesc = `Mismatch at character index ${i}: expected '${c1 ?? ''}' (${origHex}), got '${c2 ?? ''}' (${procHex}). Original length: ${originalStr.length}, Processed length: ${processedStr.length}. `;
            break;
          }
        }
      }

      let byteMismatchDesc = '';
      if (!bytePreserved) {
        const minLen = Math.min(originalBuf.length, processedBuf.length);
        let mismatchIdx = -1;
        for (let i = 0; i < minLen; i++) {
          if (originalBuf[i] !== processedBuf[i]) {
            mismatchIdx = i;
            break;
          }
        }
        if (mismatchIdx === -1 && originalBuf.length !== processedBuf.length) {
          mismatchIdx = minLen;
        }

        firstByteMismatchOffset = mismatchIdx;
        const expByte = mismatchIdx < originalBuf.length ? '0x' + originalBuf[mismatchIdx].toString(16).toUpperCase().padStart(2, '0') : 'EOF';
        const recByte = mismatchIdx < processedBuf.length ? '0x' + processedBuf[mismatchIdx].toString(16).toUpperCase().padStart(2, '0') : 'EOF';
        expectedBytesHex = originalBuf.subarray(0, 16).toString('hex');
        receivedBytesHex = processedBuf.subarray(0, 16).toString('hex');

        byteMismatchDesc = `Byte mismatch at offset ${mismatchIdx}: expected ${expByte}, received ${recByte} (expected len: ${originalBuf.length} bytes, received len: ${processedBuf.length} bytes). `;
      }

      diffDescription = (charMismatchDesc + byteMismatchDesc).trim();

      if (introducedReplacementChar || (!hadReplacementBefore && hasReplacementNow) || (!bytePreserved && hasReplacementNow)) {
        diffDescription += ' CRITICAL: Unicode replacement character (U+FFFD) was introduced or invalid UTF-8 bytes were received.';
      }
    }

    return {
      original: originalStr,
      processed: processedStr,
      identical,
      bytePreserved,
      lengthDelta,
      introducedReplacementChar,
      diffDescription,
      expectedBytesHex,
      receivedBytesHex,
      firstByteMismatchOffset,
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
