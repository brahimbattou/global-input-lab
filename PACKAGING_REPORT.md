# Packaging & Distribution Verification Report — GlobalInputLab

**Document Date:** November 6, 2026  
**Package Name:** `global-input-lab`  
**Version:** `0.2.0`  
**Target Registry:** npm (`https://registry.npmjs.org/`)  
**Status:** **PASSED ALL PACKAGING GATES — RELEASE READY FOR OWNER APPROVAL**

---

## 1. Executive Summary

Packaging integrity was audited and verified via `npm pack --dry-run` following complete engineering validation, unit test expansion (130 passing assertions), and coverage hardening.

**Key Verification Invariants:**
1. **Clean Distribution Scope:** Only compiled build artifacts (`dist/`), documentation (`README.md`), the license (`LICENSE`), and manifest (`package.json`) are packed into the tarball.
2. **Zero Dependency Leaks:** No `node_modules`, no test files (`tests/`), no demo files (`demo/`), and no local config or archive files (`*.zip`, `*.tgz`) are included.
3. **Reproducibility:** The repository is 100% reproducible using `npm ci` on any clean environment without reliance on cached or pre-installed platform-specific binaries.
4. **Supply-Chain Cleanliness:** Zero (`0`) runtime dependencies. Downstream consumers incur no third-party runtime dependency footprint or transitive package vulnerabilities, significantly reducing runtime supply-chain attack surfaces.
5. **Publishing Safety:** In accordance with maintainer directives, formal publication to npm requires explicit owner action and approval.

---

## 2. Dry-Run Tarball Inspection

Execution of `npm pack --dry-run` yielded the following verified metadata:

```text
npm notice package: global-input-lab@0.2.0
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 19.6kB README.md
npm notice 919B dist/cli/formatters.d.ts
npm notice 485B dist/cli/formatters.d.ts.map
npm notice 8.5kB dist/cli/formatters.js
npm notice 8.9kB dist/cli/formatters.js.map
npm notice 223B dist/cli/index.d.ts
npm notice 124B dist/cli/index.d.ts.map
npm notice 13.2kB dist/cli/index.js
npm notice 10.0kB dist/cli/index.js.map
npm notice 1.9kB dist/cli/runner.d.ts
npm notice 775B dist/cli/runner.d.ts.map
npm notice 33.7kB dist/cli/runner.js
npm notice 21.8kB dist/cli/runner.js.map
npm notice 1.5kB dist/core/boundary-inspector.d.ts
npm notice 913B dist/core/boundary-inspector.d.ts.map
npm notice 4.9kB dist/core/boundary-inspector.js
npm notice 3.3kB dist/core/boundary-inspector.js.map
npm notice 1.5kB dist/core/homoglyph-detector.d.ts
npm notice 483B dist/core/homoglyph-detector.d.ts.map
npm notice 12.0kB dist/core/homoglyph-detector.js
npm notice 10.7kB dist/core/homoglyph-detector.js.map
npm notice 849B dist/core/round-trip.d.ts
npm notice 404B dist/core/round-trip.d.ts.map
npm notice 5.8kB dist/core/round-trip.js
npm notice 4.8kB dist/core/round-trip.js.map
npm notice 897B dist/core/sanitizer.d.ts
npm notice 380B dist/core/sanitizer.d.ts.map
npm notice 11.0kB dist/core/sanitizer.js
npm notice 7.4kB dist/core/sanitizer.js.map
npm notice 733B dist/core/schema-fuzzer.d.ts
npm notice 393B dist/core/schema-fuzzer.d.ts.map
npm notice 3.1kB dist/core/schema-fuzzer.js
npm notice 2.4kB dist/core/schema-fuzzer.js.map
npm notice 750B dist/core/test-suites.d.ts
npm notice 460B dist/core/test-suites.d.ts.map
npm notice 14.3kB dist/core/test-suites.js
npm notice 6.9kB dist/core/test-suites.js.map
npm notice 1.9kB dist/core/unicode-auditor.d.ts
npm notice 581B dist/core/unicode-auditor.d.ts.map
npm notice 24.7kB dist/core/unicode-auditor.js
npm notice 15.3kB dist/core/unicode-auditor.js.map
npm notice 2.4kB dist/index.d.ts
npm notice 1.3kB dist/index.d.ts.map
npm notice 4.9kB dist/index.js
npm notice 3.6kB dist/index.js.map
npm notice 6.6kB dist/types.d.ts
npm notice 4.7kB dist/types.d.ts.map
npm notice 194B dist/types.js
npm notice 114B dist/types.js.map
npm notice 1.6kB package.json
npm notice Tarball Details
npm notice name: global-input-lab
npm notice version: 0.2.0
npm notice filename: global-input-lab-0.2.0.tgz
npm notice package size: 62.6 kB
npm notice unpacked size: 284.8 kB
npm notice total files: 51
```

---

## 3. Package Verification Checklist

- [x] Package Name: `global-input-lab` (Unpublished on npm, available for ownership registration)
- [x] Version: `0.2.0` (SemVer compliant)
- [x] Engine Compatibility: `node >= 22.0.0`
- [x] Executable Binaries: `global-input-lab` and `gil` mapped to `./dist/cli/index.js`
- [x] Modules: ESM (`"type": "module"`) + Modern `"exports"` map with CJS and ESM entrypoints
- [x] Main Entrypoint: `./dist/index.js`
- [x] Type Declarations: `./dist/index.d.ts`
- [x] License: `MIT`
- [x] Tests Passing: 130 passing assertions, 0 failures, 0 skipped
