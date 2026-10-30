# Packaging & Distribution Verification Report — GlobalInputLab

**Document Date:** October 30, 2026  
**Package Name:** `global-input-lab`  
**Version:** `0.1.0`  
**Target Registry:** npm (`https://registry.npmjs.org/`)  
**Status:** **PASSED ALL PACKAGING GATES — RELEASE STRICTLY FROZEN**

---

## 1. Executive Summary

Packaging integrity was audited and verified via `npm pack --dry-run` following the fifth engineering remediation wave (strict HTTP byte integrity and UTF-8 validation).

**Key Verification Invariants:**
1. **Clean Distribution Scope:** Only compiled build artifacts (`dist/`), documentation (`README.md`), the license (`LICENSE`), and manifest (`package.json`) are packed into the tarball.
2. **Zero Dependency Leaks:** No `node_modules`, no test files (`tests/`), no demo files (`demo/`), and no local config or archive files (`*.zip`, `*.tgz`) are included.
3. **Reproducibility:** The repository is 100% reproducible using `npm ci` on any clean environment without reliance on cached or pre-installed platform-specific binaries.
4. **Supply-Chain Cleanliness:** Zero (`0`) runtime dependencies. Downstream consumers incur zero external attack surface or supply-chain risk.
5. **Publishing Freeze:** In accordance with instructions, public release to npm remains **FROZEN**.

---

## 2. Dry-Run Tarball Inspection

Execution of `npm pack --dry-run` yielded the following verified metadata:

```text
npm notice package: global-input-lab@0.1.0
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 14.3kB README.md
npm notice 919B dist/cli/formatters.d.ts
npm notice 485B dist/cli/formatters.d.ts.map
npm notice 8.4kB dist/cli/formatters.js
npm notice 8.8kB dist/cli/formatters.js.map
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
npm notice 24.3kB dist/core/unicode-auditor.js
npm notice 15.2kB dist/core/unicode-auditor.js.map
npm notice 2.4kB dist/index.d.ts
npm notice 1.3kB dist/index.d.ts.map
npm notice 4.9kB dist/index.js
npm notice 3.6kB dist/index.js.map
npm notice 6.6kB dist/types.d.ts
npm notice 4.7kB dist/types.d.ts.map
npm notice 194B dist/types.js
npm notice 114B dist/types.js.map
npm notice 1.4kB package.json
npm notice Tarball Details
npm notice name: global-input-lab
npm notice version: 0.1.0
npm notice filename: global-input-lab-0.1.0.tgz
npm notice package size: 60.7 kB
npm notice unpacked size: 278.7 kB
npm notice shasum: 292bc055515198d07fed3cf4865c24805f152d3f
npm notice integrity: sha512-Lgdw6Sr5m1UXC[...]pDzGoZOz/d4Gw==
npm notice total files: 51
```

---

## 3. Package Configuration Audit

### 3.1 Metadata & Entry Points
- **Package Name:** `global-input-lab`
- **Version:** `0.1.0` (Semantic Versioning 2.0.0 aligned)
- **Module Format:** `"type": "module"` (ESM native)
- **TypeScript Types:** Bundled declaration files (`dist/index.d.ts`, `dist/types.d.ts`, etc.)
- **Binary Executable:** `"bin": { "global-input-lab": "dist/cli/index.js", "gil": "dist/cli/index.js" }`
- **Files Allowlist:** `"files": [ "dist", "README.md", "LICENSE" ]`
- **Engines:** `"node": ">=18.0.0"`

### 3.2 Dependency Hygiene
- **Runtime Dependencies:** `0` (Zero third-party runtime dependencies)
- **DevDependencies:** Limited to `@types/node` and `typescript`
- **PeerDependencies:** None

---

## 4. Release Freeze Status

In compliance with instructions:
- `npm publish` has NOT been executed.
- No git tag or release has been pushed to any remote registry or GitHub repository.
- Package artifacts are fully validated and held locally.
