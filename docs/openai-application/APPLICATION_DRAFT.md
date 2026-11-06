# OpenAI Codex for Open Source — Official Application Dossier

**Target Program:** OpenAI Codex for Open Source  
**Official Application Portal:** [https://openai.com/form/codex-for-oss/](https://openai.com/form/codex-for-oss/)  
**Program Details:** [https://developers.openai.com/community/codex-for-oss](https://developers.openai.com/community/codex-for-oss)  
**Program Terms:** [https://learn.chatgpt.com/docs/codex-for-oss-terms](https://learn.chatgpt.com/docs/codex-for-oss-terms)  
**Status:** **DRAFT PREPARED — PENDING MAINTAINER APPROVAL BEFORE SUBMISSION**

> [!IMPORTANT]
> **Safety Notice:** Do not submit this application form automatically. The submission must be reviewed and personally approved by Brahim Battou.

---

## 1. Candidate Application Field Values

This table corresponds directly to the official application form at [https://openai.com/form/codex-for-oss/](https://openai.com/form/codex-for-oss/):

| Form Question / Field | Candidate Value / Response | Length | Instructions & Context |
| :--- | :--- | :---: | :--- |
| **First name** *(Required)* | Brahim | 6 | Maintainer legal/preferred first name. |
| **Last name** *(Required)* | Battou | 6 | Maintainer legal/preferred last name. |
| **Email** *(Required)* | `[YOUR_CHATGPT_ACCOUNT_EMAIL]` | — | **CRITICAL:** Must be the email associated with your ChatGPT account where Pro access with Codex will be provisioned. |
| **GitHub username** *(Required)* | `brahimbattou` | 12 | Public profile visibility confirmed. |
| **GitHub repository URL** *(Required)* | `https://github.com/brahimbattou/global-input-lab` | 48 | Public open-source repository. |
| **Describe your role: are you a primary or core maintainer?** *(Required)* | Primary maintainer | 18 | Creator, lead architect, and primary maintainer. |
| **Why does this repository qualify? (include GitHub stars, monthly downloads, or why it's important to the ecosystem)** *(Required)* | *See Field Narrative 1 below* | **492 chars** | Truthful Day 0 adoption with architectural & ecosystem justification (Max 500). |
| **I'm interested in...** *(Checkboxes)* | [x] Codex Security<br>[x] API credits for my project | — | Select both capabilities to support security reviews and CI automation. |
| **OpenAI Organization ID** *(Required for API credits)* | `org-[YOUR_OPENAI_ORG_ID]` | — | Found at [platform.openai.com/account/organization](https://platform.openai.com/account/organization). |
| **How will you use API credits for your project?** *(Required if requesting API credits)* | *See Field Narrative 2 below* | **459 chars** | Actionable CI automation and regression testing plan (Max 500). |
| **Anything else we should know?** *(Optional)* | *See Field Narrative 3 below* | **487 chars** | Engineering standards, testing rigor, and security disclosures (Max 500). |

---

## 2. Character-Counted Field Narratives

### Field: Why does this repository qualify? (Limit: 500 characters)

```text
GlobalInputLab is an open-source toolkit resolving text encoding and data integrity failures in multilingual pipelines. As a newly published framework, it is at Day 0 of public adoption (pre-npm release), prioritizing architectural rigor: zero runtime dependencies, non-destructive sanitization for complex scripts (Arabic, Indic, CJK), UTF-8 stream boundary slicing, and UTS #39 defense against prompt steganography. It includes 130 automated tests and a cross-platform Node 22-26 CI matrix.
```
- **Exact Length:** 492 characters (strictly under 500-character ceiling).
- **Adoption Context:** Truthfully states Day 0 / pre-npm release status without fabricating stars or downloads.

---

### Field: How will you use API credits for your project? (Limit: 500 characters)

```text
We will use API credits to automate three maintainer workflows: (1) A GitHub Actions CI assistant that validates proposed Unicode test vectors against UTS #39 without linguistic false positives; (2) An automated triage assistant for issue classification and orthographic context validation across non-Latin scripts; and (3) An automated regression test generator that synthesizes boundary edge cases for reported UTF-8 parsing and stream chunk slicing issues.
```
- **Exact Length:** 459 characters (strictly under 500-character ceiling).

---

### Field: Anything else we should know? (Limit: 500 characters)

```text
GlobalInputLab is maintained with strict engineering standards: an automated CI matrix across Ubuntu, Windows, and macOS on Node 22, 24, and 26; full TypeScript type safety; 72.8% coverage; and zero runtime dependencies to minimize runtime supply-chain attack surfaces. Codex support will help expand test datasets across underrepresented scripts, harden stream parsing, and assist in maintaining security disclosures for prompt injection and Trojan Source bidirectional vulnerabilities.
```
- **Exact Length:** 487 characters (strictly under 500-character ceiling).
- **Security Context:** Accurately states that zero runtime dependencies minimizes runtime supply-chain attack surfaces without overpromising.

---

## 3. How to Retrieve Your OpenAI Organization ID

1. Open your browser and navigate to: [https://platform.openai.com/account/organization](https://platform.openai.com/account/organization)
2. Log in with the ChatGPT account specified in the application.
3. Locate the field labeled **Organization ID**.
4. The format is: `org-xxxxxxxxxxxxxxxxxxxxxxxx`
5. Paste that string into the `OpenAI Organization ID` application field.
   *(Do NOT use API keys starting with `sk-`, and do NOT use Project IDs starting with `proj-`).*

---

## 4. Codex Security Justification

GlobalInputLab handles low-level character parsing, multi-byte buffer manipulation, stream chunk recombination, and process spawning (`spawn` with `shell: false`). Codex Security access will assist in automated auditing to ensure:
- Stream boundary decoders never encounter buffer overrun or denial-of-service vulnerabilities when handling malformed byte streams.
- Curated UTS #39 regex lookups remain free from Regular Expression Denial of Service (ReDoS).
- Process probing logic maintains strict separation between arguments and execution environments across all operating systems.
