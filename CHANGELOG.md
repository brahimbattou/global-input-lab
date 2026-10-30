# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-30

### Added
- **Core Engine:**
  - `UnicodeAuditor`: Non-destructive inspection of code points, grapheme clusters (UAX #29), normalization forms (UAX #15), zero-width characters, and bidirectional overrides (UAX #9 / Trojan Source CVE-2021-42574).
  - `getDiagnosticView`: Non-destructive visualization replacing invisible characters with bracketed hex tags (e.g., `[U+200B:ZWSP]`).
  - `BoundaryInspector`: Detection of UTF-8 byte boundary truncation, replacement characters (`U+FFFD`), and lone surrogate halves.
  - `HomoglyphDetector`: UTS #39 mixed-script detection and cross-script confusables analysis.
  - `RoundTripVerifier`: Byte-exact verification, JSON serialization preservation, and URI encoding fidelity checks.
  - `Sanitizer`: Context-aware sanitization that preserves Persian ZWNJ (`می‌روم`), family emoji ZWJ sequences (`👨‍👩‍👧‍👦`), and directional marks (`U+200E`/`U+200F`) by default.
  - `SchemaFuzzer`: Generation of schema-constrained edge-case test payloads.
  - `TestSuites`: 24 curated international test vectors across 6 core categories.
- **CLI & Test Runner:**
  - `test` command: Active endpoint probing with byte preservation assertions.
  - Configurable `--json-path` extraction for API response validation.
  - Explicit `INCONCLUSIVE` result classification for responses without verifiable echo data.
  - Safe subprocess execution using `spawn` with `{ shell: false }` and strict argument passing.
  - Standardized reporting formats: Terminal ANSI badges, JUnit XML, and GitHub Actions Markdown summaries.
  - `audit`, `sanitize`, `generate`, and `fuzz` CLI commands.
- **Interactive Studio:**
  - Browser-based testing playground in `demo/index.html` with real-time character inspection and transparent diagnostic disclaimers.
- **Testing & Tooling:**
  - 50 automated tests using Node.js's native test runner (`node:test`).
  - Code coverage reporting via `npm run test:coverage`.
  - TypeScript 5.7 compilation with strict type checking and zero runtime dependencies.
