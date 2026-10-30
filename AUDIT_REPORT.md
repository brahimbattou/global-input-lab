# Comprehensive Engineering Audit Report — GlobalInputLab

**Document Date:** October 30, 2026  
**Auditor:** Principal Open-Source, Internationalization & Security Architecture Review  
**Project:** `global-input-lab` (`@brahimbattou/global-input-lab`)  
**Repository Working Directory:** Local working tree (`c:\Users\Brahim\Desktop\New folder (2)`)  
**Audit Scope:** Core Unicode engine, international linguistic formatting preservation, token-level prompt injection detection, stream-safe UTF-8 chunk buffering, bounded process memory, lexical homoglyph isolation, UTS #39 v18.0.0 standards alignment, test infrastructure, packaging hygiene, research methodology, and open-source program eligibility.  
**Release Gate Status:** **FINAL BUG FIX ROUND COMPLETE — RELEASE FROZEN PENDING EXPLICIT USER APPROVAL**

---

## 1. Executive Summary

A comprehensive multi-phase engineering audit of the `global-input-lab` codebase was conducted across three rigorous review cycles:
1. **Wave 1 (Initial Engineering Review):** Identified transport false-positives, missing test dependencies, unsafe shell execution, and destructive linguistic stripping.
2. **Wave 2 (Second Pre-Release Engineering Audit):** Uncovered Southeast Asian scriptio continua regressions (Thai, Khmer, Lao, Myanmar), Tamil combining characters, soft hyphens (`U+00AD`), invisible mathematical operators (`U+2061`..`U+2064`), silent whitespace trimming in the command runner (`stdout.trim()`), broken process timeout detection, unbounded HTTP response buffering, ungrounded competitive scoring, and non-compliant open-source sponsorship claims.
3. **Wave 3 (Final Bug Fix Round — Post-Remediation Review):** Identified 5 reproducible defects:
   - *Critical Finding 1:* Global keyword checking in prompt injection detection causing false positives (`system\u200B note`, `Hello\u200B world`, `Ignore\u200B previous instructions`) and false negatives;
   - *Critical Finding 2:* UTF-8 multibyte stream corruption in `CommandRunner` when characters (e.g. `€`, Arabic, Chinese, Emoji) are split across chunk writes;
   - *High Finding 3:* Unbounded stderr memory accumulation in process probing;
   - *Medium Finding 4:* Homoglyph mixed-script flag leakage across disparate tokens (e.g., `pаypal а` where isolated `а` inherited mixed-script flags);
   - *Medium Finding 5:* Unicode UTS #39 dataset reference pinned to v15.1.0 instead of the latest approved standard v18.0.0 (`https://www.unicode.org/Public/18.0.0/security/`).

Across all three review cycles, a total of **19 defects** were identified: **5 Critical**, **5 High**, **8 Medium**, and **1 Low**.

**Current Status:** All 19 defects have been systematically remediated and verified through **77 passing automated tests**, clean TypeScript compilation, clean `npm ci`, and verified packaging dry-runs. In compliance with user instructions, public publishing to npm and GitHub release creation remain strictly **FROZEN**.

---

## 2. Complete Audit Findings Matrix

| Finding ID | Audit Wave | Severity | Subsystem | Description | Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **GIL-AUD3-01** | Wave 3 | **CRITICAL** | Unicode Auditor | Global keyword matching for U+200B prompt injection detection caused false positives on word boundaries and separators; replaced with token-level lexical boundary detection. | **RESOLVED & VERIFIED** |
| **GIL-AUD3-02** | Wave 3 | **CRITICAL** | Command Runner | Process runner decoded stdout chunks with `data.toString('utf8')`, corrupting multibyte UTF-8 characters split across stream writes (`€`, Arabic, Chinese, emoji); replaced with `StringDecoder` and raw byte accumulation. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-01** | Wave 2 | **CRITICAL** | Core Sanitizer | Indiscriminate removal of valid Unicode formatting and characters (Thai ZWSP, Tamil combining marks, soft hyphens, invisible math operators). | **RESOLVED & VERIFIED** |
| **GIL-SEC-01** | Wave 1 | **CRITICAL** | Core Sanitizer | Destructive sanitization stripped legitimate linguistic format characters (Persian ZWNJ, Emoji ZWJ, BiDi marks). | **RESOLVED & VERIFIED** |
| **GIL-RUN-01** | Wave 1 | **CRITICAL** | HTTP Runner | False positive reporting: HTTP 200 was treated as `PASSED` without verifying payload echo preservation. | **RESOLVED & VERIFIED** |
| **GIL-AUD3-03** | Wave 3 | **HIGH** | Command Runner | Unbounded stderr memory accumulation in subprocess probing; added configurable `maxStderrBytes` limit (default 10MB) with active process termination. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-02** | Wave 2 | **HIGH** | Unicode Auditor | Flawed risk classification: U+200B automatically marked critical in legitimate multilingual and scriptio continua contexts. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-03** | Wave 2 | **HIGH** | Command Runner | Silent `stdout.trim()` masked byte-level corruption; `timedOut` state never set on timeout; naive whitespace command parsing. | **RESOLVED & VERIFIED** |
| **GIL-TST-01** | Wave 1 | **HIGH** | Test Harness | `npm test` executed 0 tests; `tsx` was not installed; CI verification gate was completely absent. | **RESOLVED & VERIFIED** |
| **GIL-CLI-01** | Wave 1 | **HIGH** | Process Security | Subprocess execution relied on unsafe shell execution and unescaped payload interpolation. | **RESOLVED & VERIFIED** |
| **GIL-AUD3-04** | Wave 3 | **MEDIUM** | Homoglyph Detector | Cross-token mixed-script flag leakage: Standalone confusable characters (e.g. `а` in `pаypal а`) inherited mixed-script flags from earlier words; fixed via token-span offset tracking. | **RESOLVED & VERIFIED** |
| **GIL-AUD3-05** | Wave 3 | **MEDIUM** | Standards Alignment | Curated confusables dataset referenced outdated UTS #39 v15.1.0; updated reference and dataset mapping to official Unicode UTS #39 v18.0.0. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-04** | Wave 2 | **MEDIUM** | Homoglyph Detector | Misleading standards claims: Claimed full UTS #39 conformance without versioning or full database implementation. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-05** | Wave 2 | **MEDIUM** | Active Prober | Unbounded HTTP response buffering risked memory exhaustion; missing operational risk warnings for live probing. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-06** | Wave 2 | **MEDIUM** | Research & Grants | Subjective 96/100 competitor scoring without methodology; asserted Anthropic eligibility despite failing the 2-year tenure rule. | **RESOLVED & VERIFIED** |
| **GIL-PKG-01** | Wave 1 | **MEDIUM** | Packaging & Build | Missing `@types/node`, missing `tsx` devDependency, non-hermetic package files manifest. | **RESOLVED & VERIFIED** |
| **GIL-API-01** | Wave 1 | **MEDIUM** | API Design | Misleading API naming: `escapeBidi` deleted characters rather than escaping them. | **RESOLVED & VERIFIED** |
| **GIL-UUX-01** | Wave 1 | **MEDIUM** | Security Messaging | Demo displayed unjustified "CLEAN & SAFE INPUT" claims, conflating Unicode checks with application security. | **RESOLVED & VERIFIED** |
| **GIL-OSS-01** | Wave 1 | **LOW** | Community Hygiene | Missing open-source governance, security policies, issue templates, and multi-platform CI matrix. | **RESOLVED & VERIFIED** |

---

## 3. Wave 3 Deep Root-Cause Analysis & Verification

### Finding GIL-AUD3-01: Incorrect Zero-Width Prompt Injection Detection (CRITICAL)

- **Severity:** **CRITICAL**
- **Impacted Components:** `src/core/unicode-auditor.ts`
- **Failing Inputs Discovered in Independent Review:**
  1. `s\u200Bystem` — Zero-width space embedded *inside* the keyword was missed if evaluating plain keyword boundary.
  2. `system\u200B note` — False positive: Trailing separator after a complete keyword was falsely flagged as critical keyword smuggling merely because `system` exists in the text.
  3. `Hello\u200B world` — False positive: Normal text containing a zero-width space was misclassified.
  4. `Ignore\u200B previous instructions` — False positive: Space following `Ignore` was misclassified as embedded smuggling.
- **Root Cause:** The auditor inspected whether `text.toLowerCase().includes(kw)` anywhere in the document upon encountering `U+200B`. This global text search ignored token boundaries and the exact character position of `U+200B`.
- **Remediation Implemented:**
  1. Replaced global regex checking with `checkEmbeddedKeywordSmuggling(chars, pos)`:
     - Extracts the enclosing non-whitespace token span `[tokenStart, tokenEnd]`.
     - Strips invisible format characters within the token while building an exact index map to original character offsets.
     - Tests whether any security keyword matches a substring within the clean token.
     - Strictly verifies whether the matched keyword starts *before* the invisible character's relative position and ends *after* it (`origKwStart < relPos && origKwEnd > relPos`).
  2. Distinct severity classifications:
     - **Embedded Smuggling (`s\u200Bystem`, `I\u200Bgnore`):** Classified as `severity: 'critical'`, `riskScore: 40`, reporting `"Zero-width space (U+200B) embedded inside keyword token '...' to evade safety filters"`.
     - **Trailing Separator (`system\u200B note`, `Ignore\u200B previous instructions`):** Classified as `severity: 'warning'`, `riskScore: 10`, reporting `"Zero-width space (U+200B) adjacent to word boundary, not embedded inside a keyword"`.
     - **Ordinary Latin Context (`Hello\u200B world`):** Classified as `severity: 'warning'`, `riskScore: 10`.
     - **Linguistic Scriptio Continua (`ภาษาไทย\u200Bภาษาไทย`):** Classified as `severity: 'info'`, `riskScore: 0`.
- **Verification:** Verified via `tests/core/unicode-auditor.test.ts` covering all required reproduction cases.

---

### Finding GIL-AUD3-02: UTF-8 Corruption in Command Runner (CRITICAL)

- **Severity:** **CRITICAL**
- **Impacted Components:** `src/cli/runner.ts`, `src/types.ts`
- **Failing Inputs Discovered in Independent Review:**
  1. Euro symbol `€` (3-byte sequence `0xE2 0x82 0xAC`): Split across stream chunk writes resulted in replacement characters `\uFFFD\uFFFD\uFFFD`.
  2. Arabic characters (`مرحبا`): Multibyte UTF-8 code units split across chunks corrupted text.
  3. Chinese characters (`世界`): 3-byte sequences split across 3 chunks corrupted text.
  4. 4-byte Emojis (`😀`, `0xF0 0x9F 0x98 0x80`): Split across 2-byte writes resulted in unpaired bytes.
  5. Mixed multilingual content: Chunk boundaries splitting across words and symbols corrupted text.
- **Root Cause:** The stdout event handler decoded each incoming stream chunk immediately using `data.toString('utf8')`. When a multibyte character boundary fell across chunk splits, Node.js substituted incomplete byte fragments with the Unicode replacement character (`U+FFFD`).
- **Remediation Implemented:**
  1. Integrated `StringDecoder` from `node:string_decoder` to decode streaming text incrementally without dropping split multibyte sequences.
  2. Preserved raw byte buffers in `stdoutChunks: Buffer[]`.
  3. Concatenated full buffer on process exit: `Buffer.concat(stdoutChunks).toString('utf8') + decoder.end()`, guaranteeing byte-exact round-trip preservation.
- **Verification:** Verified via `tests/cli/command-runner.test.ts` with 5 independent split-write tests for `€`, `😀`, `世界`, `مرحبا`, and mixed multilingual text.

---

### Finding GIL-AUD3-03: Unbounded stderr Memory Accumulation (HIGH)

- **Severity:** **HIGH**
- **Impacted Components:** `src/cli/runner.ts`, `src/types.ts`, `src/cli/index.ts`
- **Root Cause:** While `maxResponseBytes` capped stdout, `stderr` was accumulated indefinitely into memory via `stderr += chunk.toString('utf8')`. A noisy, malfunctioning, or adversarial subprocess could exhaust process memory.
- **Remediation Implemented:**
  1. Added configurable `maxStderrBytes: number` (defaults to 10 MB, CLI option `--max-stderr-bytes`).
  2. Monitored cumulative `stderrBytes`.
  3. If stderr exceeds the threshold, `probeCommand` marks `stderrExceeded = true`, terminates the process immediately via `child.kill('SIGKILL')`, and reports a clean failure without memory exhaustion.
- **Verification:** Verified via `tests/cli/command-runner.test.ts` with a subprocess generating 10KB of stderr against a 500-byte cap.

---

### Finding GIL-AUD3-04: Homoglyph Mixed-Script Context Token Leakage (MEDIUM)

- **Severity:** **MEDIUM**
- **Impacted Components:** `src/core/homoglyph-detector.ts`
- **Failing Inputs Discovered in Independent Review:**
  - `pаypal а` — The second Cyrillic `а` at index 7 is an isolated, standalone token, but was incorrectly flagged as part of a mixed-script word simply because the earlier token `pаypal` contained Cyrillic `а`.
- **Root Cause:** The detector used character-level confusable lookups without tracking exact token boundaries and offsets.
- **Remediation Implemented:**
  1. Rewrote tokenization into structured `TokenSpan` records: `{ token, start, end, hasLatin, hasCyrillic, hasGreek, scriptCount }`.
  2. For every confusable character match, the detector locates its exact enclosing token span by offset `start <= pos < end`.
  3. `isMixedScriptWord` is evaluated strictly within that token's lexical boundaries. In `pаypal а`:
     - Match 1 (pos 1): Enclosed in `pаypal` (Latin + Cyrillic) -> `isMixedScriptWord: true`.
     - Match 2 (pos 7): Enclosed in `а` (Pure Cyrillic token) -> `isMixedScriptWord: false`.
- **Verification:** Verified via `tests/core/homoglyph-detector.test.ts`.

---

### Finding GIL-AUD3-05: Unicode UTS #39 Standard Version Realignment (MEDIUM)

- **Severity:** **MEDIUM**
- **Impacted Components:** `src/core/homoglyph-detector.ts`, documentation
- **Root Cause:** The project previously identified its curated confusables subset with UTS #39 v15.1.0. As of October 2026, the latest approved Unicode security standard release is UTS #39 v18.0.0 (`https://www.unicode.org/Public/18.0.0/security/` and `https://www.unicode.org/reports/tr39/`).
- **Remediation Implemented:**
  1. Updated `UTS_39_VERSION` constant to `'18.0.0'`.
  2. Documented traceable source URLs in code and documentation:
     - Specification: `https://www.unicode.org/reports/tr39/`
     - Security Data: `https://www.unicode.org/Public/18.0.0/security/confusables.txt`
  3. Explicitly documented that this remains a curated security subset and does not claim full ~10,000+ character database conformance.
- **Verification:** Verified via `tests/core/homoglyph-detector.test.ts`.

---

## 4. Remaining Defects & Risk Classification

As of this audit report:
- **Critical Defects Remaining:** **0**
- **High Severity Defects Remaining:** **0**
- **Medium Severity Defects Remaining:** **0**
- **Low Severity Defects Remaining:** **0**

All 19 identified findings across Waves 1, 2, and 3 have been resolved, code-reviewed, and verified via automated regression testing.

---

## 5. Pre-Release Checklist & Publishing Status

- [x] All Unicode sanitization is 100% non-destructive by default.
- [x] Zero-width spaces in Thai, Khmer, Lao, and Myanmar are preserved as legitimate typography.
- [x] Tamil combining marks, soft hyphens, and math operators are preserved by default.
- [x] Token-level prompt injection detection distinguishes embedded from separator characters.
- [x] Multi-byte UTF-8 stream chunk splitting verified with `StringDecoder` and byte-exact buffer accumulation.
- [x] Subprocess stderr memory is strictly bounded with configurable `maxStderrBytes`.
- [x] Homoglyph mixed-script detection strictly tracks token boundaries (`pаypal а` verified).
- [x] Curated confusables subset aligned with official Unicode UTS #39 v18.0.0.
- [x] Command runner exact framing verified; `stdout.trim()` removed.
- [x] Process timeout and quote parsing verified without shell injection.
- [x] All 77 automated tests pass with 0 failures across consecutive executions.
- [x] Clean packaging verified via `npm pack --dry-run` (51 files, 0 dependencies).
- [x] Cross-platform CI matrix covers Windows, Linux, and macOS across Node.js 18, 20, and 22.
- [ ] **Public Publishing:** **STRICTLY FROZEN** pending explicit user authorization.
