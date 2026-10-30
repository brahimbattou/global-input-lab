# Packaging & Distribution Verification Report — GlobalInputLab

**Date:** October 30, 2026  
**Package Name:** `global-input-lab`  
**Version:** `0.1.0`  
**Target Registry:** npm (`https://registry.npmjs.org/`)  
**Status:** **PASSED ALL PACKAGING GATES (FROZEN FROM PUBLIC PUBLISH)**

---

## 1. Executive Summary

Packaging integrity was verified through `npm pack --dry-run` and clean dependency checks. The package was audited to ensure:
- Only built artifacts (`dist/`), documentation (`README.md`), and the license (`LICENSE`) are packed.
- No development dependencies, scratch scripts, local configuration files, or tests are leaked into the distribution.
- Binary executables (`global-input-lab` and `gil`) are properly linked with valid shebangs (`#!/usr/bin/env node`).
- Zero runtime dependencies are required by downstream consumers.

---

## 2. Dry-Run Tarball Inspection

Execution of `npm pack --dry-run` yielded the following verified metadata:

```text
npm notice package: global-input-lab@0.1.0
npm notice Tarball Details
npm notice name:          global-input-lab
npm notice version:       0.1.0
npm notice filename:      global-input-lab-0.1.0.tgz
npm notice package size:  49.3 kB
npm notice unpacked size: 214.8 kB
npm notice shasum:        70a94e40c94e1682d659a7cb08147bc7cd264127
npm notice total files:   51
```

### Complete Contents Manifest (51 Files)

1. `LICENSE` (1.1 kB)
2. `README.md` (12.9 kB)
3. `package.json` (1.4 kB)
4. `dist/index.js`, `dist/index.d.ts`, `dist/index.js.map`, `dist/index.d.ts.map`
5. `dist/types.js`, `dist/types.d.ts`, `dist/types.js.map`, `dist/types.d.ts.map`
6. `dist/core/unicode-auditor.js` + `.d.ts` + maps
7. `dist/core/sanitizer.js` + `.d.ts` + maps
8. `dist/core/boundary-inspector.js` + `.d.ts` + maps
9. `dist/core/homoglyph-detector.js` + `.d.ts` + maps
10. `dist/core/round-trip.js` + `.d.ts` + maps
11. `dist/core/schema-fuzzer.js` + `.d.ts` + maps
12. `dist/core/test-suites.js` + `.d.ts` + maps
13. `dist/cli/index.js` + `.d.ts` + maps
14. `dist/cli/runner.js` + `.d.ts` + maps
15. `dist/cli/formatters.js` + `.d.ts` + maps

---

## 3. Package Configuration Audit

### 3.1 Metadata & Discovery
- **Name:** `global-input-lab` (Confirmed available on npm registry; no conflicts).
- **Version:** `0.1.0` (Semantic Versioning aligned).
- **Module Type:** `"type": "module"` (ESM native).
- **Entry Points:**
  - `"main": "./dist/index.js"`
  - `"types": "./dist/index.d.ts"`
- **CLI Binaries:**
  - `"global-input-lab": "./dist/cli/index.js"`
  - `"gil": "./dist/cli/index.js"`
- **Engines:** `"node": ">=18.0.0"` (Ensures native `Intl.Segmenter` and fetch support).

### 3.2 Runtime Dependencies
- **Production Dependencies:** **0** (Zero runtime dependencies).
- **Dev Dependencies:**
  - `@types/node: ^22.13.0`
  - `tsx: ^4.23.15`
  - `typescript: ^5.7.3`

---

## 4. Security & Hygiene Checklist

- [x] `.gitignore` excludes `node_modules/`, `coverage/`, `.env*`, and archive files (`*.zip`, `*.tgz`).
- [x] No secrets, private API keys, or tokens in git staging or package manifest.
- [x] Package tarball size is under 50 kB (efficient download and fast cold starts).
- [x] CLI entry point contains `#!/usr/bin/env node` header and executable permissions.
- [x] Public publishing remains **FROZEN** until explicit user command.
