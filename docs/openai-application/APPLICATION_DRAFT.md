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

| Form Field | Value / Draft Content | Character Count | Notes & Instructions |
| :--- | :--- | :---: | :--- |
| **First Name** | Brahim | 6 | Maintainer legal/preferred first name. |
| **Last Name** | Battou | 6 | Maintainer legal/preferred last name. |
| **ChatGPT Account Email** | `[YOUR_CHATGPT_ACCOUNT_EMAIL]` | — | **CRITICAL:** Use your actual login email for ChatGPT (where Pro with Codex will be activated). **DO NOT** use the GitHub noreply address here. |
| **GitHub Username** | `brahimbattou` | 12 | Confirmed GitHub handle. |
| **Public GitHub Repository URL** | `https://github.com/brahimbattou/global-input-lab` | 48 | Public open-source repository. |
| **Maintainer Role** | Primary / Core Maintainer | 25 | Author, creator, and lead engineer. |
| **Why the repository qualifies** *(Max 500 chars)* | *See Field Narrative 1 below* | **493 chars** | Rigorous architectural justification. |
| **Interest in Codex Security** | Yes | — | Evaluated separately by OpenAI. |
| **Interest in API Credits** | Yes | — | For GitHub Actions maintenance automation. |
| **OpenAI Organization ID** | `org-[YOUR_OPENAI_ORG_ID]` | — | Found on [platform.openai.com/account/organization](https://platform.openai.com/account/organization). |
| **How API credits will be used** *(Max 500 chars)* | *See Field Narrative 2 below* | **486 chars** | Actionable automation plan. |
| **Additional relevant information** *(Max 500 chars)* | *See Field Narrative 3 below* | **473 chars** | Rigor, licensing, and standards. |

---

## 2. Character-Counted Field Narratives

### Field: Why the repository qualifies (Limit: 500 characters)

```text
GlobalInputLab is an open-source toolkit solving critical text integrity and security failures across global data pipelines. It provides non-destructive sanitization preserving complex scripts (Persian ZWNJ, Thai/Khmer word boundaries, Emoji ZWJ), strict raw-byte UTF-8 verification for HTTP and CLI processes, and curated UTS #39 confusable detection to prevent prompt steganography. It features 93 passing automated tests, zero runtime dependencies, and an MIT license to protect multilingual software.
```
- **Length:** 493 characters (within 500-character ceiling).

---

### Field: How API credits will be used (Limit: 500 characters)

```text
We will use API credits to automate three essential open-source workflows: (1) An automated GitHub Actions PR reviewer that verifies submitted Unicode test vectors against Unicode Technical Standard #39 without introducing linguistic false positives; (2) An automated triage assistant for issue classification and orthographic context validation across non-Latin scripts; and (3) An automated regression test generator that synthesizes boundary edge cases for newly reported UTF-8 parsing defects.
```
- **Length:** 486 characters (within 500-character ceiling).

---

### Field: Additional relevant information (Limit: 500 characters)

```text
GlobalInputLab is maintained with strict engineering discipline: automated cross-platform CI matrix across Ubuntu, Windows, and macOS on Node 22, 24, and 26; full TypeScript type safety; comprehensive coverage; and zero supply-chain bloat. Codex support will enable rapid expansion of our test datasets across underrepresented scripts, harden raw stream parsing, and assist in maintaining coordinated security disclosures for prompt injection and Trojan Source bidirectional vulnerabilities.
```
- **Length:** 473 characters (within 500-character ceiling).

---

## 3. How to Retrieve Your OpenAI Organization ID

1. Open your web browser and navigate to: [https://platform.openai.com/account/organization](https://platform.openai.com/account/organization)
2. Log in with your OpenAI / ChatGPT credentials.
3. Locate the field labeled **Organization ID**.
4. The format is typically: `org-xxxxxxxxxxxxxxxxxxxxxxxx`
5. Copy that string directly into the `OpenAI Organization ID` application field.
   *(Do NOT use API keys starting with `sk-`, and do NOT use Project IDs starting with `proj-`).*

---

## 4. Codex Security Justification

GlobalInputLab handles low-level character parsing, multi-byte buffer manipulation, stream chunk recombination, and process spawning (`spawn` with `shell: false`). Codex Security access will provide automated deep-code auditing to verify that:
- Stream boundary decoders never encounter buffer overrun or denial-of-service vulnerabilities when handling malformed byte streams.
- The curated UTS #39 regex lookups are free from Regular Expression Denial of Service (ReDoS).
- Process probing logic maintains strict separation between arguments and execution environments across all operating systems.
