# GlobalInputLab Architecture & Technical Design

This document details the internal architecture, design principles, standards alignment, and failure modes handled by **GlobalInputLab**.

---

## 1. Architectural Philosophy

GlobalInputLab was engineered around five foundational architectural principles:

1. **Non-Destructive Observation First:** Auditing and diagnostic tools must never mutate user data. When visualizing invisible or non-printable characters, the engine outputs an annotated string (`diagnosticView`) rather than stripping data.
2. **Linguistic Context Preservation:** Unlike naive security filters that strip all zero-width characters (e.g., regex `[\u200B-\u200D]`), GlobalInputLab preserves legitimate orthographic characters (Persian ZWNJ `U+200C`, complex emoji ZWJ sequences `U+200D`, and directional marks `U+200E`/`U+200F`).
3. **Zero External Runtime Dependencies:** Security and data integrity tools should not introduce supply-chain attack vectors. The entire core engine is implemented using standard modern JavaScript and Node.js APIs (`Intl.Segmenter`, `TextEncoder`, `TextDecoder`, `node:http`, `node:child_process`).
4. **Distinction Between Transport & Integrity:** Successful HTTP delivery (HTTP 200) does not guarantee data preservation. Test outcomes explicitly separate transport status (`transportOk`) from byte integrity (`dataPreserved`) and classify ambiguous responses as `INCONCLUSIVE`.
5. **Standards Compliance:** Every check maps directly to official Unicode Technical Reports and Standard Annexes.

---

## 2. Core Subsystems

```
                     ┌───────────────────────────────┐
                     │          Public API           │
                     │         (src/index.ts)        │
                     └───────────────┬───────────────┘
                                     │
     ┌───────────────────┬───────────┴───────────┬───────────────────┐
     ▼                   ▼                       ▼                   ▼
┌───────────────┐ ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
│ UnicodeAuditor│ │BoundaryInspect│     │HomoglyphDetect│   │RoundTripVerify│
│  (UAX 15, 29, │ │ (UTF-8 Bytes, │     │  (UTS #39,    │   │ (Byte-Exact,  │
│   UAX 9 Bidi) │ │  Surrogates)  │     │ Mixed-Script) │   │  JSON, URI)   │
└───────┬───────┘ └───────┬───────┘     └───────┬───────┘   └───────┬───────┘
        │                 │                     │                   │
        └─────────────────┼─────────────────────┼───────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     TextSanitizer     │
              │  (Policy-Controlled)  │
              └───────────┬───────────┘
                          │
     ┌────────────────────┴───────────────────┐
     ▼                                        ▼
┌───────────────────────┐        ┌───────────────────────┐
│     SchemaFuzzer      │        │    TestSuites / CI    │
│  (Boundary Synthesis) │        │ (Runner, Formatters)  │
└───────────────────────┘        └───────────────────────┘
```

---

## 3. Subsystem Deep-Dive

### 3.1 UnicodeAuditor (`src/core/unicode-auditor.ts`)

- **Grapheme Cluster Segmentation (UAX #29):** Utilizes native `Intl.Segmenter(undefined, { granularity: 'grapheme' })` to compute true user-perceived character counts. Slicing by UTF-16 code units (`string.length`) breaks emoji combinations, whereas grapheme segmentation groups base characters with their combining marks and joiners.
- **Normalization Analysis (UAX #15):** Compares text against NFC, NFD, NFKC, and NFKD forms. If `text !== text.normalize('NFC')`, normalization drift is reported.
- **Directional Overrides & Trojan Source (UAX #9 / CVE-2021-42574):** Inspects for dangerous directional override characters (`U+202D`, `U+202E`, `U+2066`, `U+2067`, `U+2068`, `U+202B`, `U+202A`, `U+200E`, `U+200F`). Isolates and embedding characters are flagged with contextual severity.
- **Linguistic Context Discrimination:**
  - `U+200C` (ZWNJ) in Persian/Arabic words (e.g. `می‌روم`) is identified as legitimate orthography with 0 risk penalty.
  - `U+200D` (ZWJ) between emoji graphemes (e.g. `👨‍👩‍👧‍👦`) is identified as standard emoji presentation.
  - Orphaned zero-width spaces (`U+200B`), non-breaking zero-width spaces (`U+FEFF`), or joiners injected into Latin words (e.g. `adm\u200Bin`) are flagged as potential prompt-injection smuggling or keyword obfuscation.

### 3.2 BoundaryInspector (`src/core/boundary-inspector.ts`)

- **Multi-Byte UTF-8 Truncation:** UTF-8 characters require between 1 and 4 bytes:
  - 1 byte: ASCII (`0x00`–`0x7F`)
  - 2 bytes: Latin extensions, Greek, Cyrillic, Hebrew, Arabic (`0x80`–`0x07FF`)
  - 3 bytes: CJK ideographs, Devanagari (`0x0800`–`0xFFFF`)
  - 4 bytes: Emojis, mathematical symbols, historic scripts (`0x10000`–`0x10FFFF`)
- Truncating at an arbitrary byte index (e.g., database column truncation) can slice a multi-byte sequence in half, causing decoding errors or replacement characters (`U+FFFD`).
- `inspectByteTruncation(text, maxBytes)` calculates safe cutoffs that never sever multi-byte codepoint sequences.

### 3.3 HomoglyphDetector (`src/core/homoglyph-detector.ts`)

- **UTS #39 Mixed-Script Detection:** Identifies words that mix scripts suspiciously (e.g., Cyrillic small letter `а` `U+0430` substituted inside the Latin word `аdmin`).
- **Context Preservation:** Single-script words written in Cyrillic (e.g. `Пушкин`), Greek (e.g. `Αθήνα`), or Arabic are correctly classified as natural language, avoiding false-positive alerts.

### 3.4 HTTP & CLI Test Runner (`src/cli/runner.ts`)

- **Data Integrity Verification:**
  - Extracts payload from the response body using configurable JSON paths (e.g. `data.value`).
  - Compares the returned payload against the original byte-for-byte and string-for-string using `verifyRoundTrip`.
- **Classification Matrix:**
  | HTTP Status | Response Payload | Result | Reason |
  | :--- | :--- | :--- | :--- |
  | 2xx | Exactly matches original input | `PASSED` | Data preserved accurately. |
  | 2xx | Altered, truncated, or `U+FFFD` present | `FAILED` | Data corruption detected. |
  | 2xx | Missing echo field or unparseable JSON | `INCONCLUSIVE` | Server did not return echo data to verify. |
  | 4xx / 5xx | Any | `FAILED` | HTTP transport failure. |
  | Error | Timeout / Connection refused | `FAILED` | Network unreachable. |

---

## 4. Security Considerations for Process Execution

When executing CLI probes against external commands, GlobalInputLab strictly uses:
```typescript
import { spawn } from 'node:child_process';

const child = spawn(command, args, {
  shell: false, // Disables shell execution to prevent command injection
  stdio: ['pipe', 'pipe', 'pipe'],
});
```
This guarantees that international test payloads (which may include quotation marks, newlines, semicolons, or terminal escape codes) cannot be executed as arbitrary shell commands.
