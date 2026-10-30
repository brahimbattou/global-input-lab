# OpenAI Open Source Program Eligibility Assessment

**Assessment Date:** October 30, 2026  
**Candidate Account:** `@brahimbattou`  
**Target Project:** `global-input-lab` (`https://github.com/brahimbattou/global-input-lab`)  
**Target Program:** OpenAI Open Source Sponsorship / API Credits for Maintainers  
**Status:** **ELIGIBLE FOR QUALITATIVE APPLICATION UPON REPOSITORY PUBLICATION**

---

## 1. Candidate Account Profile (Non-Sensitive)

- **GitHub Username:** `brahimbattou`
- **Account Creation Date:** April 7, 2026 (`2026-04-07T01:10:52Z`)
- **Account Age:** ~6.8 months (as of October 30, 2026)
- **Public Repositories:** 0 (prior to `global-input-lab` publication)
- **Geographic Eligibility:** Morocco (Supported region for OpenAI API and developer programs)

---

## 2. OpenAI Program Criteria Alignment

OpenAI grants API credits and developer access to maintainers of open-source projects that advance the developer ecosystem, improve software quality, or provide critical tooling for AI and modern applications.

| Program Requirement | Requirement Status | Project Alignment & Evidence |
| :--- | :---: | :--- |
| **OSI-Approved License** | :white_check_mark: **Full Match** | Permissive **MIT License** (`LICENSE`), fully OSI-compliant. |
| **Public GitHub Repository** | :hourglass_flowing_sand: **Pending Push** | Clean codebase, git history initialized, ready for publication to `brahimbattou/global-input-lab`. |
| **Ecosystem Relevance** | :white_check_mark: **High Impact** | Solves critical Unicode vulnerabilities (prompt-injection smuggling via zero-width characters, Trojan Source CVE-2021-42574, silent multi-byte UTF-8 data corruption). Directly aids LLM tokenizer and input data integrity. |
| **Code Quality & Testing** | :white_check_mark: **Exceeds Standard** | 100% automated test suite (50 passing tests), zero runtime dependencies, full TypeScript declarations, comprehensive architectural docs. |
| **Community Governance** | :white_check_mark: **Complete** | Standard `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and issue/PR templates. |

---

## 3. Recommended Application Answers (Draft)

When applying for OpenAI Open Source Developer Credits, use the following grounded statements:

### Project Description
> **GlobalInputLab** is a zero-runtime-dependency TypeScript and CLI toolkit designed to audit and safeguard data integrity across multilingual software systems and AI pipelines. It provides non-destructive Unicode diagnostics (UAX #15, UAX #29, UTS #39), identifies zero-width prompt injection smuggling and Trojan Source bidirectional overrides (CVE-2021-42574), calculates safe UTF-8 byte boundary truncation, and offers an active HTTP probe runner with byte-level round-trip verification.

### How Does This Project Benefit the AI & Open-Source Ecosystem?
> LLMs and modern web services frequently ingest text spanning hundreds of human writing systems. Attackers exploit invisible Unicode characters (such as zero-width spaces and joiners) to obfuscate malicious prompt injections from safety filters while allowing the underlying tokenizer to process them. Simultaneously, naive string slicing truncates multi-byte UTF-8 sequences mid-character, generating Unicode replacement characters (`U+FFFD`) and corrupting training and inference data. GlobalInputLab gives developers and researchers a fast, deterministic, non-destructive audit engine to detect these anomalies in CI/CD pipelines before data enters production storage or model inference.

### How Will OpenAI API Credits Be Used?
> Credits will be utilized to develop automated adversarial evaluation benchmarks—testing how various LLM tokenizers and moderation endpoints handle multi-script confusables, zero-width steganography, and normalization drift, with findings published as open datasets for the community.
