# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-06

### Added
- **Public API Exports:**
  - Exported `SchemaFuzzer` (`generateFuzzPayloads`, `generateForField`) and `fuzzField` convenience helper from package root.
  - Exported `TestSuiteManager` and `getTestSuites` convenience loader from package root.
  - Exported `inspectByteTruncation` convenience helper for string-level UTF-8 byte boundary analysis.
  - Added modern `"exports"` map in `package.json` for seamless ESM/CommonJS package resolution.
- **CLI Enhancements:**
  - Added `--json` flag to `audit` and `sanitize` commands for automated CI and tooling integration.
  - Added `--format` (`json`, `csv`, `txt`) and `--out` file writing options to `generate` command.
  - Added `fuzz` subcommand with `--field`, `--count`, and `--json` support.
  - Added `--framing` (`exact` vs `loose`), `--junit`, and `--markdown` export options to `test` command.
- **Automated Testing Suite:**
  - Expanded automated test coverage from 50 to 130 passing assertions across 13 test suites.
  - Added unit test suites for `formatters.ts`, `schema-fuzzer.ts`, and `test-suites.ts`.
  - Added edge-case tests for UTF-8 multi-byte truncation (2-byte Arabic/Latin, 4-byte astral emojis), lone surrogates, and replacement characters.
  - Added integration tests for CLI argument parsing, flags, and file outputs.
- **Security & Repository Governance:**
  - Configured GitHub CodeQL Default Setup (zero open alerts).
  - Configured Dependabot automated weekly version and security updates (`.github/dependabot.yml`).
  - Enabled GitHub Private Vulnerability Reporting.
  - Established GitHub branch protection rulesets (`Protect Main Branch` and `Protect Release Tags`).

### Changed
- **Node.js Engine Support:**
  - Updated minimum supported Node.js version to `>=22.0.0` in `package.json` and verification scripts.
  - Upgraded GitHub Actions CI matrix to test Node.js 22.x, 24.x, and 26.x across Ubuntu, Windows, and macOS.
  - Upgraded workflow actions to `actions/checkout@v7.0.1` and `actions/setup-node@v7.1.0`.
- **Code Coverage:**
  - Increased line coverage to 72.91% and branch coverage to 72.68% across all modules.
  - Core modules (`boundary-inspector`, `homoglyph-detector`, `schema-fuzzer`) achieve 100% line coverage.
- **Documentation Accuracy:**
  - Removed unverified security contact email in favor of official GitHub Private Vulnerability Reporting.
  - Calibrated supply-chain and runtime dependency statements to accurately describe risk mitigation.
  - Distinguished UTS #39 confusable detection from invisible-character prompt injection diagnostics.

### Fixed
- **Unicode Auditor Linguistic Context:**
  - Corrected classification of Mongolian Vowel Separator (`U+180E`) to explicitly set `isLinguisticContext = true`, preventing false positives on legitimate Mongolic text.

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
