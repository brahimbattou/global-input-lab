# Product Roadmap — GlobalInputLab

This roadmap outlines the planned development milestones for **GlobalInputLab** across three strategic horizons.

---

## Horizon 1: Immediate & Stabilization (Next 30–60 Days)

- [x] **Core Engine & Zero-Dependency TypeScript Foundation:** Complete initial non-destructive engine, CLI, and test runner.
- [x] **Comprehensive Test Suite:** 50 automated tests covering Unicode correctness, HTTP runner response verification, boundary slicing, and CLI safety.
- [x] **Non-Destructive Linguistic Preservation:** Guarantee zero-corruption defaults for Persian ZWNJ, complex emojis, and Arabic directional marks.
- [x] **Curated Test Vectors:** 24 multi-category edge cases with standard references.
- [ ] **GitHub Action Marketplace Release:** Package the CLI as a reusable GitHub Action (`global-input-lab/action`) for one-line CI/CD pipeline integration.
- [ ] **Extended Locale Vectors (Phase 1):** Community-driven expansions for South Asian scripts (Devanagari, Bengali, Tamil) and East Asian (CJK unified ideographs, Hangul jamo).

---

## Horizon 2: Ecosystem Integration (90–180 Days)

- [ ] **Test Framework Adapters:**
  - `@global-input-lab/jest`: Matchers for Jest/Vitest (`expect(input).toBePreservedThrough(pipeline)`).
  - `@global-input-lab/playwright`: End-to-end form input fuzzing plugin for web UI inputs.
- [ ] **SARIF & Static Security Reporting:** Direct integration with GitHub Advanced Security code scanning alerts.
- [ ] **Python & Go Client Bindings:**
  - Native Python package (`pip install global-input-lab`) utilizing PyO3/Rust core for backend testing.
  - Go module (`go get github.com/brahimbattou/global-input-lab-go`) for microservice validation.
- [ ] **LLM Prompt Injection Test Suite:** Dedicated adversarial benchmark evaluating LLM tokenizer truncation and zero-width smuggling.

---

## Horizon 3: Platform & Long-Term Vision (6–12 Months)

- [ ] **High-Performance Rust Core Engine:** Port heavy character scanning and UTS #39 table matching to Rust with WebAssembly (Wasm) and C-ABI targets.
- [ ] **Dynamic API Fuzzing Proxy:** Lightweight local proxy intercepting outbound API calls to automatically inject international boundary vectors and log downstream regressions.
- [ ] **Ecosystem Benchmark Reports:** Publish semi-annual data on how major web frameworks, ORMs, and databases handle international text integrity.
