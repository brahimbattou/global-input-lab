# Test Verification Report — GlobalInputLab

**Document Date:** October 30, 2026  
**Platform:** Windows 10 (Node.js v25.9.0 / npm 11.12.1 / TypeScript 5.7.3)  
**Test Engine:** Native Node.js Test Runner (`node:test`) via `tsx` TypeScript loader  
**Status:** **100% Passing (84 of 84 Tests Passing — 0 Failed, 0 Skipped)**

---

## 1. Summary of Test Results

| Test Suite File | Tests | Passed | Failed | Duration | Scope Verified |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `tests/cli/cli-arguments.test.ts` | 7 | 7 | 0 | ~2.1s | Version, help, argument parsing, category validation, exit code 0 (safe) & 2 (critical). |
| `tests/cli/command-runner.test.ts` | 16 | 16 | 0 | ~3.1s | Exact echo preservation, whitespace/newline corruption, timeout, invalid executable, spaces in args, multibyte stream chunk splitting, bounded stderr, **raw byte comparison rejecting 0x80 for U+FFFD, valid UTF-8 U+FFFD (0xEF 0xBF 0xBD), invalid continuation bytes, truncated sequences**. |
| `tests/cli/formatters.test.ts` | 2 | 2 | 0 | ~5ms | Local integrity self-test execution, JUnit XML and Markdown report generation. |
| `tests/core/boundary-inspector.test.ts` | 4 | 4 | 0 | ~6ms | UTF-8 boundary truncation, safe multi-byte slicing, lone surrogate detection, U+FFFD pinpointing. |
| `tests/core/homoglyph-detector.test.ts` | 9 | 9 | 0 | ~10ms | UTS #39 v18.0.0 metadata reporting, Cyrillic lookalikes, Greek, Cherokee, Armenian, mathematical alphanumeric bold, pure single-script safety, fullwidth conversion, lexical token boundary isolation (`pаypal а`). |
| `tests/core/round-trip.test.ts` | 6 | 6 | 0 | ~6ms | Byte-exact identity, character mismatch pinpointing, JSON serialization, URI encoding round-trip, **direct byte buffer verification rejecting 0x80 for U+FFFD, raw buffer acceptance**. |
| `tests/core/sanitizer-preservation.test.ts` | 16 | 16 | 0 | ~14ms | Genuinely non-destructive defaults: Thai ZWSP word breaks, Tamil combining characters, Khmer, Myanmar, Japanese, Persian ZWNJ, complex emoji sequences, soft hyphens (`cooperate`), invisible math operators (`2x`), word joiners, no silent normalization. |
| `tests/core/sanitizer.test.ts` | 5 | 5 | 0 | ~12ms | Explicit opt-in policies: zero-width stripping, Trojan Source removal, explicit NFC normalization, control code stripping, homoglyph canonicalization. |
| `tests/core/unicode-auditor.test.ts` | 9 | 9 | 0 | ~75ms | Grapheme/code point/byte metrics, Thai ZWSP non-critical rating (info, risk 0), soft hyphen/math info rating, token-level prompt injection detection (`s\u200Bystem` vs `system\u200B note` vs `Hello\u200B world`), **astral Unicode & emoji index mapping (`😀s\u200Bystem`, `😀I\u200Bgnore`, `😀assistant\u200B`, multiple emoji)**. |
| `tests/integration/http-runner.test.ts` | 10 | 10 | 0 | ~350ms | Live HTTP echo, corrupted response detection, jsonPath extraction, unparseable JSON, inconclusive state, 4xx/5xx errors, timeouts, network drop, maxResponseBytes limit. |
| **TOTAL** | **84** | **84** | **0** | **~4.4s** | **Full End-to-End System Verification (Consecutive Deterministic Runs)** |

---

## 2. Raw Test Execution Output

```text
> global-input-lab@0.1.0 test
> node --import tsx --test tests/**/*.test.ts

✔ CLI Arguments - prints version on --version (348.5098ms)
✔ CLI Arguments - prints help on --help (335.544ms)
✔ CLI Arguments - fails on missing audit argument (268.3696ms)
✔ CLI Arguments - fails on invalid category for test command (293.2133ms)
✔ CLI Arguments - audit exits with code 0 on safe text (406.5523ms)
✔ CLI Arguments - audit exits with code 2 on high risk payload (392.4966ms)
✔ CLI Arguments - sanitize writes clean text to --out path (312.7485ms)
✔ TestRunner - executes local integrity self-test suite (5.9851ms)
✔ ReportFormatter - formats JUnit XML and Markdown accurately (1.9099ms)
✔ probeCommand - verifies correct exact echo without modification (177.0844ms)
✔ probeCommand - detects leading whitespace corruption in exact framing (210.4431ms)
✔ probeCommand - detects trailing whitespace corruption in exact framing (171.8018ms)
✔ probeCommand - detects additional newline characters in exact framing (351.9573ms)
✔ probeCommand - detects missing characters (165.1754ms)
✔ probeCommand - detects wrong output (169.939ms)
✔ probeCommand - handles process timeout accurately (315.6479ms)
✔ probeCommand - handles invalid executable gracefully (25.0735ms)
✔ probeCommand - supports arguments containing spaces without shell interpolation (177.2632ms)
✔ probeCommand - preserves Euro symbol (€) split across multiple stdout chunks (244.743ms)
✔ probeCommand - preserves Arabic, Chinese, Emoji, and mixed text split across stream chunk boundaries (842.9866ms)
✔ probeCommand - bounds and safely handles large stderr output without memory exhaustion (146.1606ms)
✔ probeCommand - rejects U+FFFD payload when output is invalid byte 0x80 instead of 0xEF 0xBF 0xBD (161.5356ms)
✔ probeCommand - accepts valid UTF-8 encoding of U+FFFD (0xEF 0xBF 0xBD) (152.8829ms)
✔ probeCommand - detects invalid continuation bytes in multi-byte sequences (158.8222ms)
✔ probeCommand - detects truncated UTF-8 sequences (144.23ms)
✔ BoundaryInspector - detects UTF-8 byte boundary truncation corruption (2.0803ms)
✔ BoundaryInspector - safe slice fits complete multi-byte character (0.4206ms)
✔ BoundaryInspector - detects lone surrogate halves (0.5705ms)
✔ BoundaryInspector - identifies replacement characters (U+FFFD) (1.8609ms)
✔ HomoglyphDetector - reports UTS #39 version metadata and dataset scope (6.6283ms)
✔ HomoglyphDetector - detects Cyrillic confusable in Latin text with mixed-script flag (0.939ms)
✔ HomoglyphDetector - distinguishes genuine single-script Cyrillic and Greek from mixed-script spoofing (1.2365ms)
✔ HomoglyphDetector - detects Greek, Cherokee, and Armenian cross-script lookalikes (0.507ms)
✔ HomoglyphDetector - detects mathematical alphanumeric bold characters (0.5505ms)
✔ HomoglyphDetector - correctly verifies safe ASCII strings (0.4936ms)
✔ HomoglyphDetector - converts fullwidth characters (0.4ms)
✔ HomoglyphDetector - canonicalizes confusable strings to Latin (0.3763ms)
✔ HomoglyphDetector - isolated confusable does not inherit mixed-script flag from earlier token (pаypal а) (0.7834ms)
✔ RoundTripVerifier - verifies identical byte and string preservation (2.3426ms)
✔ RoundTripVerifier - pinpoints exact character mismatch and replacement chars (1.1225ms)
✔ RoundTripVerifier - verifies JSON serialization fidelity (0.6318ms)
✔ RoundTripVerifier - verifies URI encoding round-trip fidelity (0.5341ms)
✔ RoundTripVerifier - direct byte verification detects invalid byte output 0x80 for U+FFFD (0.5256ms)
✔ RoundTripVerifier - accepts identical raw byte buffers (0.3535ms)
✔ Sanitizer Preservation - preserves Thai text and ZWSP word separators by default (3.1893ms)
✔ Sanitizer Preservation - preserves Thai ZWSP word boundary even when stripZeroWidth is enabled (2.6035ms)
✔ Sanitizer Preservation - preserves Tamil combining characters (0.346ms)
✔ Sanitizer Preservation - preserves Khmer and Myanmar scripts with word boundaries (0.7204ms)
✔ Sanitizer Preservation - preserves Japanese, Gujarati, Kannada, Malayalam, Bengali, Devanagari (0.363ms)
✔ Sanitizer Preservation - preserves Persian ZWNJ (می‌روم) by default (0.3011ms)
✔ Sanitizer Preservation - preserves complex emoji ZWJ sequences by default (0.8882ms)
✔ Sanitizer Preservation - preserves soft hyphen (cooperate) by default (0.5212ms)
✔ Sanitizer Preservation - preserves invisible mathematical operators (2x) by default (0.5034ms)
✔ Sanitizer Preservation - preserves word joiners by default and strips only when opted in (0.5469ms)
✔ Sanitizer Preservation - does NOT apply silent normalization by default (0.6008ms)
✔ Sanitizer Preservation - strips orphaned zero-width spaces in Latin text when opted in (1.2313ms)
✔ Sanitizer Preservation - strips dangerous Bidi overrides (LRO / RLO) only when opted in (0.4338ms)
✔ Sanitizer Preservation - escapes Bidi controls when escapeBidiControls is enabled (0.6124ms)
✔ Sanitizer Preservation - never converts homoglyphs to Latin by default (0.3215ms)
✔ Sanitizer Preservation - canonicalizes homoglyphs only when explicitly requested (0.5858ms)
✔ Sanitizer - strips zero-width and invisible characters (8.5423ms)
✔ Sanitizer - removes Bidi override Trojan Source characters (1.4556ms)
✔ Sanitizer - normalizes non-NFC text into canonical NFC (0.8355ms)
✔ Sanitizer - strips null bytes and C0 control codes (0.5789ms)
✔ Sanitizer - canonicalizes homoglyphs when requested (0.665ms)
✔ UnicodeAuditor - measures graphemes, code points, and bytes accurately (48.5152ms)
✔ UnicodeAuditor - Thai word with ZWSP does NOT trigger critical severity or security risk (1.2123ms)
✔ UnicodeAuditor - soft hyphen and math operators are classified as legitimate info (1.2477ms)
✔ UnicodeAuditor - token-level prompt injection detection distinguishes embedded from separator characters (2.0548ms)
✔ UnicodeAuditor - robust astral Unicode and emoji index mapping prevents false negatives (1.934ms)
✔ UnicodeAuditor - flags zero-width prompt injection smuggling inside Latin keywords (0.6186ms)
✔ UnicodeAuditor - flags Trojan Source Bidi overrides (0.7929ms)
✔ UnicodeAuditor - detects non-NFC normalization forms (0.5241ms)
✔ UnicodeAuditor - detects Zalgo combining diacritics overflow (1.0926ms)
✔ HTTP Runner - passes when server echoes identical UTF-8 payload (90.8892ms)
✔ HTTP Runner - fails when server returns HTTP 200 but mangles/corrupts payload (13.3265ms)
✔ HTTP Runner - fails when configured jsonPath is missing in response (8.856ms)
✔ HTTP Runner - fails when response is invalid JSON with jsonPath option (8.8055ms)
✔ HTTP Runner - marks response INCONCLUSIVE when HTTP 200/204 returns no echoable data (7.4623ms)
✔ HTTP Runner - fails on HTTP 4xx client errors (9.3187ms)
✔ HTTP Runner - fails on HTTP 5xx server errors (6.2173ms)
✔ HTTP Runner - fails when request times out (160.9992ms)
✔ HTTP Runner - fails gracefully on network connection failure (6.5093ms)
✔ HTTP Runner - fails safely when response exceeds maxResponseBytes (11.0291ms)
ℹ tests 84
ℹ suites 0
ℹ pass 84
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4450.1135
```

---

## 3. Independent Verification Evidence

1. **Clean Installation:** `npm ci` completed cleanly with code 0 (`added 6 packages, and audited 7 packages, found 0 vulnerabilities`).
2. **TypeScript Compilation:** `npm run typecheck` and `npm run build` completed with zero diagnostic warnings and zero errors.
3. **Execution Determinism:** Consecutive test executions passed all 84 tests identically with zero flaky tests.
4. **Coverage Analysis:** Core source modules (`src/`) achieve high line and branch coverage:
   - `homoglyph-detector.ts`: 100.00% lines, 89.19% branch, 100.00% funcs
   - `round-trip.ts`: 94.85% lines, 94.44% branch, 100.00% funcs
   - `boundary-inspector.ts`: 94.23% lines, 62.50% branch, 100.00% funcs
   - `runner.ts`: 93.16% lines, 67.89% branch, 100.00% funcs
   - `sanitizer.ts`: 93.13% lines, 87.04% branch, 88.89% funcs
   - `unicode-auditor.ts`: 86.92% lines, 85.86% branch, 93.33% funcs
5. **Cross-Platform Matrix:** `.github/workflows/ci.yml` defines active automated verification across `ubuntu-latest`, `windows-latest`, and `macos-latest` on Node.js 18, 20, and 22.
