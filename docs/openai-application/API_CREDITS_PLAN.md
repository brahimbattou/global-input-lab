# GlobalInputLab — OpenAI API Credits Allocation & Maintenance Plan

**Maintainer:** Brahim Battou (`@brahimbattou`)  
**Repository:** `https://github.com/brahimbattou/global-input-lab`  

---

## 1. Executive Allocation Summary (Form-Ready: <=500 chars)

> We will use API credits to automate three essential open-source workflows: (1) An automated GitHub Actions PR reviewer that verifies submitted Unicode test vectors against Unicode Technical Standard #39 without introducing linguistic false positives; (2) An automated triage assistant for issue classification and orthographic context validation across non-Latin scripts; and (3) An automated regression test generator that synthesizes boundary edge cases for newly reported UTF-8 parsing defects.

*(Character count: 486 characters — fully compliant with the 500-character form limit).*

---

## 2. Granular Implementation Architecture

Should OpenAI award API credits under the Codex for Open Source program, the credits will be deployed into targeted, automated developer tooling integrated into GitHub Actions:

### Workflow A: Automated Pull Request Review Bot (`.github/workflows/ai-pr-review.yml`)
- **Trigger:** Community PRs submitting new international test cases, sanitization rules, or confusable mappings.
- **Model:** `gpt-4o-mini` / `codex` API via GitHub Action.
- **Function:** Analyzes proposed Unicode additions against Unicode Consortium technical reports (UAX #9, UAX #15, UAX #29, UTS #39). Flags whether an added character could cause false positives in native scripts (e.g. distinguishing Thai word boundary zero-width spaces from adversarial prompt injection smuggling).
- **Cost Efficiency:** Highly constrained token budgets (structured JSON output schema, <1,000 prompt tokens per PR).

### Workflow B: Orthographic Context & Issue Triage Assistant (`.github/workflows/ai-triage.yml`)
- **Trigger:** New issues opened by developers reporting unexpected character behavior or script truncation.
- **Model:** `gpt-4o-mini` API.
- **Function:** Analyzes the reported text snippet, identifies the underlying Unicode script property (`\p{Script_Extensions}`), determines whether the character is a combining mark, joiner, or formatting control, and automatically labels the issue (e.g., `area:indic-ligature`, `area:bidi-override`, `triage:needs-reproduction`).
- **Impact:** Eliminates triage delays for global contributors and ensures expert orthographic handling.

### Workflow C: Continuous Boundary Edge-Case Fuzzing & Regression Synthesis
- **Trigger:** Post-release maintenance cycles and scheduled fuzzing runs.
- **Model:** Codex / reasoning models.
- **Function:** Synthesizes permutations of complex grapheme clusters (e.g., multi-person skin-tone emoji sequences, stacked Zalgo diacritics, bidirectional isolate nestings) to stress-test `BoundaryInspector` and `RoundTripVerifier`.
- **Impact:** Expands the project's test suite from 93 assertions to hundreds of robust regression checks.

---

## 3. Governance, Cost-Capping & Safety Controls

1. **Strict Token Boundaries:** Every automated workflow enforces hard max-token limits and prompt truncation to prevent uncontrolled credit consumption.
2. **Organization Isolation:** Credits will be mapped exclusively to an isolated OpenAI Organization ID dedicated to open-source maintenance.
3. **No Private Data Transmission:** Probing payloads contain exclusively public synthetic test vectors; no personal information or proprietary data is ever submitted to the API.
