# Anthropic Open Source Program Eligibility Assessment

**Assessment Date:** October 30, 2026  
**Candidate Account:** `@brahimbattou`  
**Target Project:** `global-input-lab` (`https://github.com/brahimbattou/global-input-lab`)  
**Target Program:** Anthropic Claude for Open Source Sponsorship  
**Status:** **DISCRETIONARY / HIGH-IMPACT PATHWAY REQUIRED (ACCOUNT TENURE < 2 YEARS)**

---

## 1. Candidate Account Audit (Non-Sensitive)

- **GitHub Username:** `brahimbattou`
- **Account Creation Date:** April 7, 2026 (`2026-04-07T01:10:52Z`)
- **Account Age:** ~6.8 months (as of October 30, 2026)
- **Public Repositories:** 0
- **Geographic Eligibility:** Morocco (Supported region for Anthropic commercial and developer API access)

---

## 2. Anthropic Program Requirements Analysis

Anthropic's open-source maintainer sponsorship program operates through two distinct evaluation pathways:

### Pathway A: Automated Quantitative Maintainer Track
- **Requirement 1: Minimum Account Tenure of 2 Years:**
  - *Candidate Status:* **DOES NOT SATISFY**. The account `@brahimbattou` was created on April 7, 2026 (~6.8 months old). It will reach the 24-month threshold in April 2028.
- **Requirement 2: Verifiable Historical Commits Over 90 Days:**
  - *Candidate Status:* Prior to launching `global-input-lab`, the account had 0 public repositories and no verifiable public commits in the preceding 90 days.
- **Finding on Pathway A:** **Ineligible for automatic algorithmic qualification.** Any claim of eligibility based on account age or past commit history would be false.

---

### Pathway B: Qualitative / Discretionary Ecosystem Impact Track
Anthropic explicitly reserves discretionary grants and API sponsorship for high-impact software projects, security tools, and data-integrity utilities, particularly those addressing AI safety, alignment, and prompt security:

| Evaluation Criterion | Candidate Evidence | Assessment |
| :--- | :--- | :---: |
| **Direct Relevance to AI Safety & Integrity** | GlobalInputLab detects zero-width prompt injection smuggling, Trojan Source code execution vectors, and LLM input corruption. | :white_check_mark: **High Impact** |
| **Engineering Rigor & Correctness** | 50 automated tests, zero runtime dependencies, strict Unicode standard alignment (UAX #9, UAX #15, UAX #29, UTS #39). | :white_check_mark: **Exceeds Standard** |
| **Open-Source Governance** | MIT License, Contributor Covenant Code of Conduct, security disclosure policy, comprehensive architectural documentation. | :white_check_mark: **Complete** |
| **Transparency & Honesty** | Accurately states account metrics without inventing history or falsifying credentials. | :white_check_mark: **Full Integrity** |

---

## 3. Strategic Action Plan for Anthropic Sponsorship

To qualify under the Qualitative / Discretionary Track:

1. **Publish Repository Publicly:** Push `brahimbattou/global-input-lab` to GitHub with clean commit history, complete documentation, and passing CI badges.
2. **Launch Interactive Web Demo & GitHub Action:** Deploy the demo on GitHub Pages and release the reusable CI Action to establish verifiable adoption signals.
3. **Engage in the AI Safety & i18n Community:** Share research findings (from `RESEARCH.md` and `docs/architecture.md`) regarding zero-width steganography in LLM context windows on GitHub Discussions, Hacker News, and developer communities.
4. **Submit Discretionary Sponsorship Application:** Submit the project under the AI Safety Tooling / Prompt Steganography category, highlighting the engineering depth and zero-dependency architecture.

---

## 4. Recommended Application Answers (Draft)

### Project Name & URL
> **GlobalInputLab** — `https://github.com/brahimbattou/global-input-lab`

### Describe the Project and Its Relevance to Claude / AI Safety
> GlobalInputLab is an open-source data integrity and Unicode security testing toolkit. Modern LLM pipelines are uniquely vulnerable to invisible Unicode characters (such as zero-width spaces, joiners, and bidirectional overrides like CVE-2021-42574) used to smuggle adversarial instructions past keyword safety filters while being interpreted by tokenizers. GlobalInputLab provides deterministic, non-destructive auditing algorithms that detect these anomalies, verify UTF-8 multi-byte boundary preservation, and test HTTP API endpoints for round-trip data fidelity.

### How Will Anthropic Credits Support the Project?
> Credits will support automated benchmarking of frontier models (Claude 3.5 Sonnet / Claude 3 Opus) against multilingual adversarial corpora—measuring tokenization robustness, prompt-injection defense against zero-width obfuscation, and normalization consistency across non-Latin scripts (Arabic, Persian, Devanagari, CJK).
