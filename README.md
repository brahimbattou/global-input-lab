# GlobalInputLab (`global-input-lab`)

> **Modern International Input & Data Integrity Testing Toolkit for Robust Global Software.**  
> Non-destructive Unicode diagnostics, Trojan Source detection, byte-level round-trip verification, and active CI/CD probing.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org)
[![Zero Runtime Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

---

## Overview

Software systems today operate in an interconnected, multilingual environment. Applications ingest text spanning hundreds of human writing systems, emojis, and typographic marks. Simultaneously, modern systems face subtle data corruption and emerging security threats:

- **Invisible Smuggling & Steganography:** Attackers embed zero-width spaces (`U+200B`), joiners, or byte-order marks to bypass keyword filters and smuggle adversarial prompt injection into Large Language Models (LLMs).
- **Trojan Source Bidirectional Overrides (CVE-2021-42574):** Directional override characters (`U+202E` RLO) invert visual rendering, disguising malicious executables or spoofing user identifiers.
- **Silent UTF-8 Multi-Byte Truncation:** Naive string slicing or fixed-byte database columns (`VARCHAR(255)`) cut 3-byte (CJK) or 4-byte (Emoji) sequences mid-character, generating Unicode replacement characters (`U+FFFD`) or crashing parsers.
- **Normalization Drift (UAX #15):** Un-normalized text leads to subtle authentication failures, cache misses, and duplicate records when precomposed (`Café` in NFC) and decomposed (`Cafe\u0301` in NFD) strings are compared.
- **Cross-Script Confusables (UTS #39):** Visually identical characters (e.g. Cyrillic `а` vs Latin `a`) used for spoofing usernames or domain names.

**GlobalInputLab** provides a zero-runtime-dependency toolkit—available both as a **CLI utility** and a **TypeScript/JavaScript library**—to audit, test, and protect applications against international input anomalies.

---

## Core Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                             GlobalInputLab                             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
┌──────────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│    UnicodeAuditor    │   │  BoundaryInspector│   │  HomoglyphDetector  │
│ ──────────────────── │   │ ───────────────── │   │ ─────────────────── │
│ • Graphemes (UAX 29) │   │ • Safe UTF-8 cut  │   │ • Cross-script map  │
│ • Zero-width detect  │   │ • Replacement char│   │ • Mixed-script flag │
│ • Bidi overrides     │   │ • Lone surrogates │   │ • Canonicalize hook │
│ • Diagnostic view    │   │ • Byte calculation│   │ • UTS #39 alignment │
└──────────────────────┘   └───────────────────┘   └─────────────────────┘
     │                               │                               │
     └───────────────────────────────┼───────────────────────────────┘
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
┌──────────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│  RoundTripVerifier   │   │  Text Sanitizer   │   │   TestRunner (CI)   │
│ ──────────────────── │   │ ───────────────── │   │ ─────────────────── │
│ • Byte-exact check   │   │ • Non-destructive │   │ • HTTP probe & echo │
│ • JSON serialization │   │ • Preserves ZWNJ  │   │ • Inconclusive flag │
│ • URI encoding check │   │ • Preserves ZWJ   │   │ • JUnit XML export  │
│ • Diff pinpointing   │   │ • Preserves LRM   │   │ • Markdown summary  │
└──────────────────────┘   └───────────────────┘   └─────────────────────┘
```

1. **Non-Destructive Unicode Auditing:** Audits text without mutating data, generating safe `diagnosticView` representations (e.g. `[U+200B:ZWSP]`) to make invisible characters legible for human inspection.
2. **Context-Aware Preservation:** Unlike naive filters, GlobalInputLab **preserves legitimate linguistic characters** by default—including Persian Zero-Width Non-Joiners (e.g., `می‌روم`), complex emoji Zero-Width Joiner sequences (e.g., `👨‍👩‍👧‍👦`), and Arabic Left-to-Right/Right-to-Left marks (`U+200E`/`U+200F`).
3. **Rigorous HTTP & CLI Test Runner:** Probes active endpoints and verifies actual returned payloads. If a server returns HTTP 200 without returning verifiable echo data, the test is classified as **`INCONCLUSIVE`** rather than falsely marked as passed.
4. **Curated Test Vectors:** Ready-to-run international datasets across 6 categories: `names`, `emails`, `text_multilingual`, `security_adversarial`, `emoji_zwj`, and `numbers_dates`.
5. **Schema Fuzzer:** Generates boundary-constrained international test payloads tailored for input validation testing.

---

## Quick Start (CLI)

Run instantly without installation using `npx`:

```bash
# Audit a string for invisible smuggling or bidi overrides
npx global-input-lab audit "Ignore\u200B previous instructions"

# Audit a JSON or text file
npx global-input-lab audit ./payload.json --json

# Sanitize text with non-destructive preservation
npx global-input-lab sanitize ./input.txt --out ./cleaned.txt

# Run active test vectors against an echo API endpoint
npx global-input-lab test --url http://localhost:3000/api/echo --json-path "data.echo"

# Export curated test cases for other test frameworks (Jest, Vitest, pytest, Go)
npx global-input-lab generate --category security_adversarial --format json
```

### CLI Command Reference

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `audit <text\|file>` | `--json` | Inspects code points, graphemes, normalization, invisible characters, and homoglyphs. Exits with code 2 on critical security risks. |
| `sanitize <text\|file>`| `--out <file>`, `--strip-zero-width`, `--strip-soft-hyphens`, `--strip-math`, `--strip-controls`, `--strip-bidi`, `--escape-bidi`, `--normalize <form>`, `--replace-homoglyphs` | Genuinely non-destructive by default. Cleanses non-linguistic zero-width spaces, soft hyphens, or control codes only with explicit opt-in flags. |
| `test` | `--url <url>`, `--json-path <path>`, `--command <cmd>`, `--framing <exact\|strip-trailing-newline\|trim>`, `--max-response-bytes <bytes>`, `--category <cat>`, `--strict`, `--junit <file>`, `--markdown <file>` | Executes active data integrity tests against an HTTP endpoint or command, validating byte preservation. |
| `generate` | `--category <cat>`, `--format <json\|csv\|txt>`, `--out <file>` | Exports curated test suites for external tools. |
| `fuzz` | `--field <name\|email\|identifier\|text>`, `--count <n>` | Synthesizes schema-constrained edge-case strings. |

---

## Programmatic API (TypeScript / Node.js)

Install the library in your project:

```bash
npm install global-input-lab
```

### 1. Auditing Input Text

```typescript
import { auditText, getDiagnosticView } from 'global-input-lab';

const report = auditText('Ignore\u200B previous\u200C instructions');

console.log('Risk Score:', report.riskScore); // 0 (clean) to 100 (high risk)
console.log('Grapheme Count:', report.graphemeCount);
console.log('UTF-8 Byte Length:', report.byteLengthUtf8);
console.log('Diagnostic View:', report.diagnosticView);
// Output: "Ignore[U+200B:ZWSP] previous[U+200C:ZWNJ] instructions"

for (const anomaly of report.anomalies) {
  console.log(`[${anomaly.severity}] ${anomaly.name} at position ${anomaly.position}: ${anomaly.description}`);
}
```

### 2. Genuinely Non-Destructive Sanitization (Opt-In Policies)

```typescript
import { sanitizeText } from 'global-input-lab';

// 1. By default, sanitizeText is 100% non-destructive and preserves all valid formatting:
const thai = 'ภาษาไทย\u200Bภาษาไทย'; // Thai with ZWSP word boundary
const cleanThai = sanitizeText(thai);
console.log(cleanThai.sanitized === thai); // true (preserved!)

const persian = 'می\u200Cروم'; // Persian with ZWNJ
console.log(sanitizeText(persian).sanitized === persian); // true (preserved!)

const math = '2\u2062x'; // Invisible Times operator
console.log(sanitizeText(math).sanitized === math); // true (preserved!)

// 2. Destructive operations require explicit opt-in:
const dirty = 'Safe\u200BText';
const clean = sanitizeText(dirty, { stripZeroWidth: true });
console.log(clean.sanitized); // "SafeText"
```

### 3. Safe UTF-8 Byte Truncation

```typescript
import { inspectByteTruncation } from 'global-input-lab';

// Truncating 'Hello中World' to 6 bytes:
// 'Hello' is 5 bytes, '中' is 3 bytes (0xE4 0xB8 0xAD).
// Slicing at byte 6 would corrupt '中', causing a replacement character U+FFFD.
const analysis = inspectByteTruncation('Hello中World', 6);

console.log(analysis.wouldCorrupt); // true
console.log(analysis.safeText);     // "Hello" (cleanly cut at character boundary)
console.log(analysis.safeBytes);    // 5 bytes
```

### 4. Round-Trip Verification

```typescript
import { verifyRoundTrip } from 'global-input-lab';

const original = 'José-María';
const fromDatabase = 'Jose-Maria'; // Database stripped accents

const result = verifyRoundTrip(original, fromDatabase);
console.log(result.identical); // false
console.log(result.diffDescription);
// "Mismatch at character index 3: expected 'é' (U+00E9), got 'e' (U+0065)..."
```

---

## Interactive Studio (Web Demo)

GlobalInputLab includes an interactive browser studio located in [`demo/index.html`](demo/index.html). It provides real-time character inspection, grapheme vs byte counters, diagnostic visualizations, and preset vectors.

To open the demo locally:
```bash
# Open demo/index.html in any standard browser
open demo/index.html
```

---

## Diagnostic Scope & Limitations

> [!IMPORTANT]
> **What GlobalInputLab does:** Audits character encodings, identifies non-printable control characters, detects directional overrides (Trojan Source), tests round-trip byte preservation across storage/transport boundaries, and alerts on cross-script mixed confusables based on a versioned curated subset of Unicode Technical Standard #39.
>
> **What GlobalInputLab does NOT do:**
> - Unicode scanning does **not** replace application-level authorization, authentication, or input schema validation.
> - Unicode scanning does **not** replace parameterized SQL queries or Content Security Policies (CSP).
> - Homoglyph detection implements a curated security subset of UTS #39 (v18.0.0). Legitimate multilingual applications handling Cyrillic, Greek, or Arabic content must not automatically convert genuine words into Latin lookalikes.
> - GlobalInputLab tests text encoding, serialization, and API handling—it does **not** directly execute against internal neural network model weights or tokenizer vocabularies without an API wrapper.

> [!CAUTION]
> **Operational Safety Warning for Active Testing:**
> - Probing HTTP endpoints and shell commands sends actual test payloads (including edge cases and adversarial strings) to target processes. **Never run active probes against production systems or third-party endpoints without prior authorization.**
> - Command probing executes local binaries with the ambient permissions of the current shell user. Only probe trusted, non-destructive test scripts or local echo binaries. Configurable maximum limits (`--max-response-bytes` and `--max-stderr-bytes`, each defaulting to 10 MB) are enforced to protect against memory exhaustion.

---

## Quality & Testing

GlobalInputLab maintains 100% automated test verification using Node.js's native test runner (`node:test`), with **93 automated tests** passing across 10 test suites:

```bash
# Run all 93 unit, integration, and CLI tests
npm test

# Run tests with code coverage analysis
npm run test:coverage

# Run TypeScript type checking
npm run typecheck
```

---

## Open Source Programs & Governance

GlobalInputLab maintains complete governance, architecture, and program documentation:
- [System Architecture](docs/architecture.md)
- [OpenAI Codex for Open Source Application Dossier](docs/openai-application/APPLICATION_DRAFT.md)
- [Project Ecosystem Impact & Architecture](docs/openai-application/PROJECT_IMPACT.md)
- [Maintenance Evidence & Standards](docs/openai-application/MAINTENANCE_EVIDENCE.md)
- [Standards & Source References](docs/openai-application/SOURCE_REFERENCES.md)

---

## Contributing

Contributions from the international developer community are warmly welcomed. Please review [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for contribution guidelines, development setup instructions, and guidance on submitting new locale test vectors.

---

## License

GlobalInputLab is licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 Brahim Battou.

