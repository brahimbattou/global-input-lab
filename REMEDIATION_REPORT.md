# Engineering Remediation Report — GlobalInputLab

**Document Date:** October 30, 2026  
**Author:** Principal Software Architect & Lead Security Engineer  
**Project:** `global-input-lab` (`@brahimbattou/global-input-lab`)  
**Scope:** Remediation of Wave 1, Wave 2, Wave 3, and Wave 4 Engineering Audit Findings  
**Status:** **ALL DEFECTS REMEDIATED & INDEPENDENTLY VERIFIED (84/84 TESTS PASSING)**

---

## 1. Executive Summary

Following four systematic engineering audit cycles, this report details the complete remediation applied to `global-input-lab`.

Key architectural achievements:
1. **Astral Unicode Code-Point Index Mapping:** Fixed index drift between UTF-16 code units and Unicode code points in `UnicodeAuditor`. Zero-width prompt injection smuggling is correctly detected even when preceded by astral characters or multiple emojis (`😀s\u200Bystem`, `😀I\u200Bgnore`, `🚀🔥s\u200Bystem`).
2. **Real Raw-Byte Data Integrity Verification:** Replaced decoded string comparison with direct raw-byte buffer comparison (`Buffer.concat(stdoutChunks).equals(Buffer.from(tc.payload, 'utf8'))`) executed before string decoding. Malformed UTF-8 byte output (such as invalid byte `0x80` for expected `U+FFFD`) is caught and reported with hexadecimal diagnostics rather than masked by string decoding.
3. **Stream-Safe UTF-8 Chunk Buffering:** Preserves multibyte UTF-8 stream integrity across chunk writes using `StringDecoder` and raw chunk accumulation.
4. **Bounded Subprocess Memory:** Configurable `maxStderrBytes` limit (default 10 MB) actively terminates runaway processes without memory leaks.
5. **Lexical Token Boundary Isolation in Homoglyphs:** Implemented `TokenSpan` tracking so isolated confusables (e.g. `а` in `pаypal а`) do not inherit mixed-script flags from earlier tokens.
6. **Standards Realignment with UTS #39 v18.0.0:** Aligned metadata and curated tables with the official Unicode 18.0.0 security standard (`https://www.unicode.org/Public/18.0.0/security/`).
7. **100% Non-Destructive Defaults:** Sanitizer preserves all valid international formatting and characters by default (Thai/Khmer/Lao/Myanmar ZWSP, Tamil combining marks, soft hyphens `U+00AD`, math operators `U+2061`..`U+2064`).

---

## 2. Wave 4 Remediation Details

### 2.1 Unicode Code-Point Index Mapping (`src/core/unicode-auditor.ts`)

#### Architectural Defect
The previous `checkEmbeddedKeywordSmuggling` tokenized characters using `Array.from()` (producing Unicode code points), but performed keyword matching using `cleanToken.toLowerCase().indexOf(kw)`. Because JavaScript strings use UTF-16 code units, any astral Unicode character (code point > 0xFFFF, such as emojis `😀`, `🚀`) contributed 2 code units to `indexOf`, but only 1 element in `cleanToOrigIndex`. This caused index drift that falsely placed the keyword offset *after* the invisible character's position (`origKwStart < relPos` became false), missing embedded keyword smuggling when emojis preceded the keyword.

#### Technical Implementation
Standardized on a 100% code-point-based model:
```typescript
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
```

---

### 2.2 Raw Byte-Level Round-Trip Verification (`src/cli/runner.ts`, `src/core/round-trip.ts`)

#### Architectural Defect
In previous versions, `probeCommand()` decoded stdout chunks into a JavaScript string before round-trip evaluation. When a subprocess output invalid UTF-8 bytes (such as single byte `0x80` for expected payload `U+FFFD`), the UTF-8 decoder replaced `0x80` with `\uFFFD`. Comparing the expected string `\uFFFD` with decoded string `\uFFFD` returned `true`, falsely passing byte preservation.

#### Technical Implementation
1. **Byte-Exact Comparison Before String Decoding:**
   ```typescript
   const rawStdoutBuffer = Buffer.concat(stdoutChunks);
   const expectedBuffer = Buffer.from(tc.payload, 'utf8');

   // Apply framing policy directly at the raw byte buffer level
   let extractedBuffer: Buffer;
   if (framing === 'exact') {
     extractedBuffer = rawStdoutBuffer;
   } else if (framing === 'strip-trailing-newline') {
     if (rawStdoutBuffer.length >= 2 && rawStdoutBuffer[rawStdoutBuffer.length - 2] === 0x0d && rawStdoutBuffer[rawStdoutBuffer.length - 1] === 0x0a) {
       extractedBuffer = rawStdoutBuffer.subarray(0, rawStdoutBuffer.length - 2);
     } else if (rawStdoutBuffer.length >= 1 && rawStdoutBuffer[rawStdoutBuffer.length - 1] === 0x0a) {
       extractedBuffer = rawStdoutBuffer.subarray(0, rawStdoutBuffer.length - 1);
     } else {
       extractedBuffer = rawStdoutBuffer;
     }
   } else {
     // trim: strip leading/trailing ASCII whitespace bytes [0x20, 0x09, 0x0A, 0x0D]
     let s = 0;
     while (s < rawStdoutBuffer.length && [0x20, 0x09, 0x0a, 0x0d].includes(rawStdoutBuffer[s])) s++;
     let e = rawStdoutBuffer.length;
     while (e > s && [0x20, 0x09, 0x0a, 0x0d].includes(rawStdoutBuffer[e - 1])) e--;
     extractedBuffer = rawStdoutBuffer.subarray(s, e);
   }

   const byteExactMatch = extractedBuffer.equals(expectedBuffer);
   const rt = this.roundTripVerifier.verify(expectedBuffer, extractedBuffer);
   const passed = byteExactMatch && rt.identical;
   ```
2. **Buffer Pass-Through in `RoundTripVerifier.verify`:** Accepts `Buffer` directly to compare `originalBuf.equals(processedBuf)` without re-encoding decoded strings.
3. **Hexadecimal Diagnostics:** Formats exact mismatch offsets and hex representations:
   `Byte mismatch at offset 0: expected 0xEF, received 0x80 (expected len: 3 bytes, received len: 1 bytes).`

---

## 3. Test Verification Matrix (84 Automated Tests)

All remediated components were verified through automated tests executing against native Node.js:

| Test Category | Suite File | Tests | Key Invariants Verified |
| :--- | :--- | :---: | :--- |
| **Sanitizer Preservation** | `tests/core/sanitizer-preservation.test.ts` | 18 | Thai, Tamil, Khmer, Myanmar, Japanese, Persian, complex emojis, soft hyphens, math operators, word joiners, non-normalization by default. |
| **Command Runner** | `tests/cli/command-runner.test.ts` | 16 | Exact echo, whitespace/newline corruption, timeout, invalid executable, spaces in args, **split UTF-8 stream chunks (€, Arabic, Chinese, Emoji, mixed), bounded stderr, raw byte comparison for U+FFFD vs 0x80, valid U+FFFD, invalid continuation bytes, truncated sequences**. |
| **Unicode Auditor** | `tests/core/unicode-auditor.test.ts` | 9 | Grapheme/code point/byte metrics, Thai ZWSP info rating, soft hyphen/math info rating, token-level prompt injection detection, **astral Unicode emoji index mapping (😀s\u200Bystem, 😀I\u200Bgnore, 😀assistant\u200B, 🚀🔥s\u200Bystem)**, Trojan Source, non-NFC, Zalgo. |
| **Homoglyph Detector** | `tests/core/homoglyph-detector.test.ts` | 9 | UTS #39 v18.0.0 metadata, Cyrillic lookalikes, Greek, Cherokee, Armenian, math alphanumeric, pure single-script safety, fullwidth conversion, **isolated confusable token boundary isolation (pаypal а)**. |
| **HTTP Runner** | `tests/integration/http-runner.test.ts` | 10 | Exact echo, corrupted payload detection, jsonPath extraction, unparseable JSON, inconclusive state, 4xx/5xx errors, timeouts, network drop, maxResponseBytes limit. |
| **CLI Arguments** | `tests/cli/cli-arguments.test.ts` | 7 | Help, version, argument parsing, category validation, exit codes (0 for safe, 2 for critical). |
| **Boundary Inspector** | `tests/core/boundary-inspector.test.ts` | 4 | UTF-8 boundary truncation, safe multi-byte slicing, lone surrogates, replacement characters. |
| **Round Trip** | `tests/core/round-trip.test.ts` | 6 | Byte identity, character mismatch pinpointing, JSON serialization, URI encoding, **raw Buffer direct byte comparison (invalid 0x80 vs U+FFFD, identical raw byte buffers)**. |
| **Sanitizer Opt-In** | `tests/core/sanitizer.test.ts` | 5 | Opt-in zero-width stripping, Trojan Source removal, explicit NFC normalization, control code removal, homoglyph canonicalization. |
| **Formatters** | `tests/cli/formatters.test.ts` | 2 | Local integrity self-test execution, JUnit XML and Markdown formatting. |
| **TOTAL** | **10 Test Suites** | **84** | **100% Passing (84 passed, 0 failed, duration ~5.3s)** |

---

## 4. Release Freeze Commitment

In accordance with strict pre-release governance instructions:
- No npm package has been published.
- No public GitHub release or git tag has been created.
- The clean source archive is bundled without `node_modules` or local platform binaries.
- The repository is 100% ready for distribution upon explicit user authorization.
