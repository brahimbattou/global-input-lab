# Anthropic Claude for Open Source Program Eligibility Assessment

**Assessment Date:** October 30, 2026  
**Candidate Account:** `@brahimbattou`  
**Target Project:** `global-input-lab` (`https://github.com/brahimbattou/global-input-lab`)  
**Target Program:** Anthropic Claude for Open Source Software (OSS)  
**Official Program References:**  
- Program Portal: [https://claude.com/contact-sales/claude-for-oss](https://claude.com/contact-sales/claude-for-oss)  
- Official Terms & Conditions: [https://www.anthropic.com/claude-for-oss-terms](https://www.anthropic.com/claude-for-oss-terms)  
**Current Assessment Status:** **CURRENTLY INELIGIBLE — GENERAL ELIGIBILITY REQUIREMENTS NOT MET**

---

## 1. Executive Summary & Status Classification

An exhaustive review of the candidate GitHub account against the published Anthropic Claude for Open Source Terms and Conditions was conducted. 

Under the official terms:
> Applicants must satisfy **both** all General Eligibility Requirements **and** at least one Qualifying Track. Qualitative or impact-based evaluation tracks (such as Ecosystem Impact) **do not waive** the mandatory General Eligibility requirements, including minimum account tenure.

Because candidate account `@brahimbattou` was registered on **April 7, 2026** (tenure of ~6.8 months as of October 30, 2026), it **does not satisfy the mandatory two-year account tenure requirement**. Any immediate application under either automated or qualitative tracks would be rejected on eligibility grounds.

---

## 2. Granular Requirements & Gap Analysis

### 2.1 General Eligibility Requirements (Mandatory for All Tracks)

| Official Anthropic Requirement | Candidate Evidence (`@brahimbattou`) | Compliance Status | Analysis & Deficit |
| :--- | :--- | :---: | :--- |
| **Minimum Account Tenure (>= 2 Years)** | Account registered on `2026-04-07T01:10:52Z` (~6.8 months old). | :x: **FAILED** | **Deficit: ~17.2 months.** Account will not reach the mandatory 24-month tenure until **April 7, 2028**. |
| **Active GitHub History (Prior 90 Days)** | 0 public repositories and no verifiable public commits prior to this project. | :x: **FAILED** | Lacks the continuous 90-day track record of verifiable public open-source contributions. |
| **Geographic / Sanctions Compliance** | Developer located in Morocco (supported commercial and developer region). | :white_check_mark: **PASSED** | Not located in an embargoed or restricted jurisdiction. |
| **Valid OSS Licensing** | Project licensed under OSI-approved **MIT License** (`LICENSE`). | :white_check_mark: **PASSED** | Fully compliant open-source licensing. |
| **No Prior Terms Violations** | Account in good standing with GitHub; zero policy violations. | :white_check_mark: **PASSED** | Compliant. |

---

### 2.2 Qualifying Tracks Analysis

The official terms provide multiple tracks, but all require prior satisfaction of the General Requirements above:

- **Track A: High-Adoption Maintainer Track**
  - Requires established repositories with significant dependent packages, stars, or downstream citations.
  - *Candidate Status:* **Not Applicable.** New project with zero historical adoption metrics.
- **Track B: Ecosystem Impact & Critical Tooling Track**
  - Evaluates qualitative importance to developer ecosystems, software safety, and data integrity.
  - *Candidate Status:* While GlobalInputLab's technical architecture directly targets AI data integrity, Unicode prompt steganography, and multi-byte safety, **this track does not waive the two-year account tenure requirement**.

---

## 3. Explicit Status Distinctions

### 3.1 Current Eligibility
- **Verdict:** **INELIGIBLE.**
- **Rationale:** The candidate account fails the hard two-year account tenure gate and historical contribution criteria. The application cannot proceed at this time.

### 3.2 Requirements Not Met
1. **GitHub Account Age:** Minimum requirement is 24 consecutive months; current account age is ~6.8 months.
2. **Prior 90-Day Contribution History:** Account lacked public repository activity in the 90 days preceding project initialization.

### 3.3 Future Eligibility Pathway
- **Earliest Qualification Date:** **April 7, 2028.**
- **Prerequisites for April 2028 Qualification:**
  - Maintain the `@brahimbattou` account in good standing through April 2028.
  - Maintain steady, documented open-source commits, releases, and issue responses across a consecutive 90+ day window.
  - Maintain compliance with Anthropic's Acceptable Use Policy and Terms of Service.

### 3.4 Project Impact Evidence Still Needed
Before an application can succeed under the Ecosystem Impact Track in the future, the project must produce verifiable empirical evidence of ecosystem adoption:
1. **Verifiable Production Adoption:** Evidence of downstream projects using `global-input-lab` in active CI/CD workflows.
2. **Documented Bug Discoveries:** Public security advisories, CVEs, or bug reports submitted to downstream open-source libraries demonstrating defects discovered via GlobalInputLab.
3. **Community Metrics:** Organic GitHub stars, forks, external contributor pull requests, and multi-platform packaging downloads (npm).
4. **Third-Party Citations:** Technical articles, benchmark mentions, or security disclosures referencing the toolkit.

### 3.5 Selection Uncertainty & Discretionary Nature
Even upon meeting all eligibility criteria in April 2028:
- Acceptance into Anthropic's Claude for Open Source program is **strictly discretionary** and subject to program capacity, annual credit budget allocations, and competitive review.
- Meeting baseline criteria provides eligibility to be considered, **not an entitlement to acceptance**.

---

## 4. Remediation & Strategic Roadmap (2026–2028)

To position the maintainer and project for future eligibility:

1. **Publish Clean Public Repository:** Publish `global-input-lab` under `@brahimbattou` on GitHub with complete documentation, passing CI badges, and verified zero-dependency packaging.
2. **Establish Sustained Public Commit History:** Continuously maintain test suites, expand Unicode test vectors, and release regular semantic versions over the next 18 months.
3. **Integrate with Downstream Ecosystem:** Partner with open-source web frameworks, tokenizer libraries, and input parsers to incorporate GlobalInputLab into their automated test suites.
4. **Re-evaluate in Q2 2028:** Formally submit an application via [https://claude.com/contact-sales/claude-for-oss](https://claude.com/contact-sales/claude-for-oss) once the two-year tenure milestone is reached on April 7, 2028.
