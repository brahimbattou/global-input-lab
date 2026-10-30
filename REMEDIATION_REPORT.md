# Technical Remediation Report — GlobalInputLab

**Date:** October 30, 2026  
**Subject:** Engineering Remediation of Core Systems, Test Harness, and CLI Infrastructure  
**Author:** Principal Software Architect  
**Project:** `global-input-lab` (`@brahimbattou/global-input-lab`)

---

## 1. Overview & Purpose

Following the preliminary engineering review, an intensive remediation effort was executed to transform the prototype into a production-grade, non-destructive data integrity toolkit.

This document details the exact technical changes implemented across the core subsystems, the rationale behind each architectural decision, and the verification evidence establishing stability.

---

## 2. Remediation Areas & Solutions

### Area 1: Non-Destructive Unicode Auditing & Linguistic Preservation

#### The Problem
The original implementation treated any character outside standard printable ASCII as potentially suspicious, and aggressively stripped zero-width characters using a single regex. This resulted in data corruption for valid international languages, especially Persian, Arabic, and emoji sequences.

#### The Technical Solution
1. **Separation of Auditing from Mutation:**
   - The auditing engine in `src/core/unicode-auditor.ts` was made strictly read-only. It inspects strings across six dimensions (graphemes, code points, bytes, normalization, invisible characters, and directional overrides) without modifying the input.
   - Implemented `getDiagnosticView(text)`: Instead of modifying strings, it generates a safe diagnostic representation where invisible or suspicious codepoints are converted into readable tags:
     ```typescript
     // Input: "Ignore\u200B previous\u200C instructions"
     // Diagnostic Output: "Ignore[U+200B:ZWSP] previous[U+200C:ZWNJ] instructions"
     ```
2. **Context-Aware Linguistic Heuristics:**
   - In Persian, `U+200C` (Zero-Width Non-Joiner) is an essential orthographic character (e.g., `می‌روم` where `می` must not connect to `روم`). The auditor checks surrounding characters: if ZWNJ is preceded or followed by Arabic/Persian/Hebrew/Devanagari scripts, it is tagged `isLinguisticContext: true` with a risk score of `0`.
   - In modern emoji typography, `U+200D` (Zero-Width Joiner) glues individual emojis into sequences (e.g., `👨‍👩‍👧‍👦`, `👩‍🔬`). The auditor detects emoji-adjacent ZWJ sequences and preserves them with zero security penalty.
   - Conversely, isolated zero-width characters (e.g. `adm\u200Bin` or invisible characters placed inside English sentences) are flagged as high-risk steganography or prompt-injection attempts.
3. **Explicit Policy Configuration in Sanitizer:**
   `src/core/sanitizer.ts` now defaults to non-destructive preservation:
   ```typescript
   export const DEFAULT_SANITIZER_OPTIONS: Required<SanitizerOptions> = {
     stripZeroWidth: true,
     preserveLinguisticJoiners: true,  // PRESERVES Persian ZWNJ and Emoji ZWJ
     stripBidiOverrides: true,
     preserveDirectionalMarks: true,    // PRESERVES LRM and RLM
     escapeBidiControls: false,
     normalizeNfc: true,
     stripNullBytes: true,
     stripControlCodes: true,
     canonicalizeHomoglyphs: false,     // NEVER alters real names to Latin by default
   };
   ```

---

### Area 2: HTTP Test Runner Response Validation & Inconclusive Classification

#### The Problem
The prototype marked tests as `PASSED` whenever the target server returned HTTP 2xx. If a backend truncated a UTF-8 character, replaced emojis with `???`, or returned an empty response, the test falsely passed.

#### The Technical Solution
1. **Separation of Transport from Integrity:**
   `src/cli/runner.ts` now records two separate diagnostic signals:
   - `transportOk: boolean` (Did the network request succeed with HTTP 2xx?)
   - `dataPreserved: boolean` (Does the returned body match the input byte-for-byte?)
2. **Configurable JSON-Path Extraction:**
   Many APIs return wrapped payloads (e.g., `{ "status": "ok", "data": { "value": "<input>" } }`). The runner supports `--json-path "data.value"` to extract the exact echoed field.
3. **Introduction of the `INCONCLUSIVE` Test State:**
   If a server returns HTTP 200/204 but the response contains no echoable body or the configured field does not exist, the test is classified as **`INCONCLUSIVE`** (neither passed nor failed):
   ```typescript
   if (options.jsonPath && (extractedValue === undefined || extractedValue === null)) {
     return {
       testCase,
       outcome: 'inconclusive',
       transportOk: true,
       dataPreserved: false,
       errorMessage: `Configured jsonPath "${options.jsonPath}" was not found in response`,
     };
   }
   ```
4. **Byte-Level Round-Trip Verification:**
   When an echo is extracted, `verifyRoundTrip` compares:
   - Byte-for-byte identity via `Uint8Array`.
   - String normalization equivalence.
   - Pinpoints the exact index and code point of any mismatch.

---

### Area 3: Subprocess Safety & CLI Process Execution

#### The Problem
The CLI previously used raw shell execution commands, exposing the runner to command injection if test payloads contained shell delimiters.

#### The Technical Solution
1. **Replaced Shell Execution with `spawn`:**
   In `src/cli/runner.ts`, process execution was completely rewritten:
   ```typescript
   const child = spawn(command, args, {
     shell: false, // Prevents shell interpretation entirely
     stdio: ['pipe', 'pipe', 'pipe'],
     timeout: options.timeoutMs ?? 5000,
   });
   ```
2. **CLI Argument Validation:**
   `src/cli/index.ts` strictly validates input parameters:
   - Verifies target URLs use either `http:` or `https:`.
   - Validates categories against the allowed set: `names`, `emails`, `text_multilingual`, `security_adversarial`, `emoji_zwj`, `numbers_dates`.
   - Validates that numeric timeout values are positive integers.

---

### Area 4: Testing Infrastructure & Build Pipeline

#### The Problem
Running `npm test` executed zero tests because of missing dependencies and misconfigured test scripts.

#### The Technical Solution
1. **Dependency Modernization:**
   Added `tsx@^4.23.15` and `@types/node@^22.13.0` to `devDependencies`.
2. **Unified Native Test Execution:**
   Configured `package.json` to leverage Node.js's native test runner (`node:test`) with TypeScript loader support:
   ```json
   "scripts": {
     "build": "tsc",
     "typecheck": "tsc --noEmit",
     "test": "node --import tsx --test tests/**/*.test.ts",
     "test:coverage": "node --import tsx --test --experimental-test-coverage tests/**/*.test.ts"
   }
   ```
3. **Comprehensive Test Suite:**
   Built 8 dedicated test suites containing 50 individual test cases:
   - `tests/core/boundary-inspector.test.ts` (4 tests)
   - `tests/core/homoglyph-detector.test.ts` (4 tests)
   - `tests/core/round-trip.test.ts` (4 tests)
   - `tests/core/sanitizer-preservation.test.ts` (11 tests)
   - `tests/core/sanitizer.test.ts` (5 tests)
   - `tests/core/unicode-auditor.test.ts` (5 tests)
   - `tests/cli/http-runner.test.ts` (9 tests)
   - `tests/cli/cli-args.test.ts` (7 tests)
   - `tests/cli/formatters.test.ts` (1 test)

---

## 3. Summary of Remediated Source Files

| File | Changes Made |
| :--- | :--- |
| `src/types.ts` | Added non-destructive options, `diagnosticView`, and `TestOutcome` (`passed`, `failed`, `inconclusive`). |
| `src/core/unicode-auditor.ts` | Non-destructive auditing, grapheme counting, diagnostic view generator, and contextual ZWNJ/ZWJ detection. |
| `src/core/sanitizer.ts` | Default linguistic preservation, renamed `stripBidiOverrides`, added `escapeBidiControls`. |
| `src/core/boundary-inspector.ts` | Multi-byte UTF-8 boundary calculation and surrogate validation. |
| `src/core/homoglyph-detector.ts` | Mixed-script token detection per UTS #39 with Latin canonicalization hook. |
| `src/core/round-trip.ts` | Byte-exact diff pinpointing, JSON serialization, and URI encoding checks. |
| `src/cli/runner.ts` | Configurable response extraction, `INCONCLUSIVE` status, and safe `spawn` process execution. |
| `src/cli/formatters.ts` | Terminal badges (`[PASS]`, `[FAIL]`, `[INCONC]`), JUnit XML format, and Markdown summaries. |
| `src/cli/index.ts` | CLI parameter validation, `--json-path`, `--strict`, and non-destructive sanitization flags. |
| `demo/index.html` | Removed misleading claims; added diagnostic disclaimers. |
