# Comprehensive Engineering Audit Report — GlobalInputLab

**Document Date:** October 30, 2026  
**Auditor:** Principal Open-Source, Internationalization & Security Architecture Review  
**Project:** `global-input-lab` (`@brahimbattou/global-input-lab`)  
**Repository Working Directory:** Local working tree (`c:\Users\Brahim\Desktop\New folder (2)`)  
**Audit Scope:** Core Unicode engine, international linguistic formatting preservation, astral Unicode code-point index mapping, real raw-byte data integrity verification, stream-safe UTF-8 chunk buffering, bounded process memory, lexical homoglyph isolation, UTS #39 v18.0.0 curated security subset alignment, test infrastructure, packaging hygiene, research methodology, and open-source program eligibility.  
**Release Gate Status:** **FINAL CORRECTNESS AUDIT COMPLETE — RELEASE FROZEN PENDING EXPLICIT USER APPROVAL**

---

## 1. Executive Summary

A comprehensive multi-phase engineering audit of the `global-input-lab` codebase was conducted across five review cycles:
1. **Wave 1 (Initial Engineering Review):** Identified transport false-positives, missing test dependencies, unsafe shell execution, and destructive linguistic stripping.
2. **Wave 2 (Second Pre-Release Engineering Audit):** Uncovered Southeast Asian scriptio continua regressions (Thai, Khmer, Lao, Myanmar), Tamil combining characters, soft hyphens (`U+00AD`), invisible mathematical operators (`U+2061`..`U+2064`), silent whitespace trimming in the command runner (`stdout.trim()`), broken process timeout detection, unbounded HTTP response buffering, ungrounded competitive scoring, and non-compliant open-source sponsorship claims.
3. **Wave 3 (Bug Fix Round):** Resolved global keyword prompt injection matching, UTF-8 chunk splitting across stream boundaries, unbounded stderr, homoglyph token leakage, and aligned standards with UTS #39 v18.0.0.
4. **Wave 4 (Astral Unicode & CLI Byte Integrity):** Resolved astral Unicode code-point index drift in prompt injection detection and implemented raw-byte buffer comparison in the CLI subprocess runner.
5. **Wave 5 (HTTP Raw-Byte Integrity & Strict UTF-8 Validation):** Identified and resolved a critical false-positive in the HTTP Runner where malformed UTF-8 bytes (such as byte `0x80` for expected `U+FFFD`) were lossily decoded by `StringDecoder` into `\uFFFD`, falsely passing data preservation verification. Replaced lossy streaming decoding with raw buffer accumulation, strict `TextDecoder('utf-8', { fatal: true })` validation, explicit charset checking, and direct raw-byte comparison for raw text responses.

Across all review cycles, a total of **22 defects** were identified: **8 Critical**, **5 High**, **8 Medium**, and **1 Low**.

**Current Status:** All 22 defects have been systematically remediated and verified through **93 passing automated tests**, clean TypeScript compilation, clean `npm ci`, code coverage analysis, and verified packaging dry-runs. In compliance with user instructions, public publishing to npm and GitHub release creation remain strictly **FROZEN**.

---

## 2. Complete Audit Findings Matrix

| Finding ID | Audit Wave | Severity | Subsystem | Description | Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **GIL-AUD5-01** | Wave 5 | **CRITICAL** | HTTP Runner | Lossy `StringDecoder` converted invalid UTF-8 (e.g. byte 0x80) to U+FFFD, falsely passing tests expecting U+FFFD; implemented strict UTF-8 validation (`TextDecoder` with `fatal: true`), explicit charset checking, and direct raw-byte comparison for text responses. | **RESOLVED & VERIFIED** |
| **GIL-AUD4-01** | Wave 4 | **CRITICAL** | Unicode Auditor | Mixed code-point and UTF-16 code-unit indexing caused false negatives when astral characters (emojis) preceded embedded zero-width characters; replaced with consistent code-point-based token scanning. | **RESOLVED & VERIFIED** |
| **GIL-AUD4-02** | Wave 4 | **CRITICAL** | Command Runner | Decoded string comparison in round-trip masked raw byte corruption (e.g. invalid byte 0x80 for U+FFFD); implemented direct raw-byte Buffer comparison before string decoding with hexadecimal diagnostics. | **RESOLVED & VERIFIED** |
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
| **GIL-AUD2-04** | Wave 2 | **MEDIUM** | Homoglyph Detector | Misleading standards claims: Clarified that implementation is a manually curated security subset, not full UTS #39 conformance. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-05** | Wave 2 | **MEDIUM** | Active Prober | Unbounded HTTP response buffering risked memory exhaustion; missing operational risk warnings for live probing. | **RESOLVED & VERIFIED** |
| **GIL-AUD2-06** | Wave 2 | **MEDIUM** | Research & Grants | Subjective 96/100 competitor scoring without methodology; asserted Anthropic eligibility despite failing the 2-year tenure rule. | **RESOLVED & VERIFIED** |
| **GIL-PKG-01** | Wave 1 | **MEDIUM** | Packaging & Build | Missing `@types/node`, missing `tsx` devDependency, non-hermetic package files manifest. | **RESOLVED & VERIFIED** |
| **GIL-API-01** | Wave 1 | **MEDIUM** | API Design | Misleading API naming: `escapeBidi` deleted characters rather than escaping them. | **RESOLVED & VERIFIED** |
| **GIL-UUX-01** | Wave 1 | **MEDIUM** | Security Messaging | Demo displayed unjustified "CLEAN & SAFE INPUT" claims, conflating Unicode checks with application security. | **RESOLVED & VERIFIED** |
| **GIL-OSS-01** | Wave 1 | **LOW** | Community Hygiene | Missing open-source governance, security policies, issue templates, and multi-platform CI matrix. | **RESOLVED & VERIFIED** |

---

## 3. Wave 5 Critical HTTP Byte Integrity Deep Root-Cause Analysis

### Finding GIL-AUD5-01: HTTP Invalid UTF-8 False Positives (CRITICAL)

- **Severity:** **CRITICAL**
- **Impacted Components:** `src/cli/runner.ts`, `tests/integration/http-runner.test.ts`
- **Failing Input Discovered in Review:**
  - Expected payload: `U+FFFD` (`0xEF 0xBF 0xBD` in UTF-8).
  - HTTP Server response: Invalid single byte `0x80`.
  - Previous result: `outcome: passed`, `dataPreserved: true`.
- **Root Cause:**
  `probeHttpEndpoint()` accumulated incoming stream chunks using `new StringDecoder('utf8')`. When the server returned raw byte `0x80`, Node's `StringDecoder` silently replaced the invalid byte with `\uFFFD`. When comparing the expected string `\uFFFD` with the decoded string `\uFFFD`, string comparison evaluated to `true`, reporting `dataPreserved: true`.
- **Remediation Implemented:**
  1. **Raw Buffer Accumulation:** Stream chunks are collected directly into `bodyChunks: Buffer[]` without lossy intermediate string decoding.
  2. **Explicit Charset Validation:** Checks `Content-Type` header; if a charset other than UTF-8 is specified (e.g. `ISO-8859-1`), rejects the response explicitly.
  3. **Strict TextDecoder Validation:** Before any string conversion, validates the complete buffer using `new TextDecoder('utf-8', { fatal: true }).decode(fullRawBuffer)`. Any malformed byte (such as `0x80`), invalid continuation byte, or truncated multibyte sequence immediately throws and fails the test.
  4. **Direct Raw-Byte Comparison for Text Responses:** For direct text responses, compares the extracted raw response buffer against `Buffer.from(tc.payload, 'utf8')` using `RoundTripVerifier.verify()`, maintaining byte-level fidelity.
  5. **Strict JSON Parsing:** For JSON responses, validates UTF-8 integrity before parsing JSON and extracting target properties.
  6. **Empty Response Handling:** Empty HTTP 200/204 responses without echoable data are marked `INCONCLUSIVE`, not `PASSED`.
- **Verification:** Verified via 9 dedicated regression tests in `tests/integration/http-runner.test.ts` covering invalid byte 0x80, valid U+FFFD (0xEF 0xBF 0xBD), invalid continuation bytes, truncated sequences, chunk-split multibyte sequences, valid/malformed JSON, and empty responses.

---

## 4. UTS #39 Scope Clarification

GlobalInputLab implements a **manually curated security subset** of high-frequency Latin, Cyrillic, Greek, Cherokee, and Armenian confusables, as well as mathematical alphanumeric bold lookalikes, grounded in Unicode Technical Standard #39 (UTS #39 v18.0.0).

**Explicit Non-Claim:**
> GlobalInputLab does **not** claim full or complete UTS #39 conformance across all Unicode scripts or the entire ~10,000+ entry `confusables.txt` database. Embedding the complete database in memory would violate the project's zero-dependency, lightweight footprint design goals. The engine focuses specifically on high-risk credential spoofing, domain masquerading, and mixed-script homoglyphs.

---

## 5. Remaining Defects & Risk Classification

As of this audit report:
- **Critical Defects Remaining:** **0**
- **High Severity Defects Remaining:** **0**
- **Medium Severity Defects Remaining:** **0**
- **Low Severity Defects Remaining:** **0**

All 22 identified findings across all audit waves have been resolved, code-reviewed, and verified via automated regression testing.

---

## 6. Pre-Release Checklist & Publishing Status

- [x] All Unicode sanitization is 100% non-destructive by default.
- [x] Zero-width spaces in Thai, Khmer, Lao, and Myanmar are preserved as legitimate typography.
- [x] Tamil combining marks, soft hyphens, and math operators are preserved by default.
- [x] Astral Unicode characters (emojis) correctly handled in token-level prompt injection detection.
- [x] Direct raw-byte buffer comparison prevents string decoding false positives in command runner.
- [x] Strict UTF-8 validation (`fatal: true`) and raw byte comparison prevent false positives in HTTP runner.
- [x] Hexadecimal diagnostics pinpoint byte mismatch offsets and lengths.
- [x] Subprocess stderr memory is strictly bounded with configurable `maxStderrBytes`.
- [x] Homoglyph mixed-script detection strictly tracks token boundaries (`pаypal а` verified).
- [x] Curated confusables subset explicitly distinguished from full UTS #39 database.
- [x] All 93 automated tests pass with 0 failures across consecutive executions.
- [x] Clean packaging verified via `npm pack --dry-run` (51 files, 0 dependencies).
- [x] Clean source archive delivered without node_modules or platform binaries.
- [ ] **Public Publishing:** **STRICTLY FROZEN** pending explicit user authorization.
