# GlobalInputLab — Standards & Primary Source References

This document records the official standards, regulatory guidelines, security disclosures, and primary technical specifications that govern the architecture and testing suites of GlobalInputLab.

---

## 1. Unicode Consortium Technical Standards & Reports

1. **Unicode Technical Standard #39 (UTS #39): Unicode Security Mechanisms**
   - **Current Alignment:** Version 18.0.0
   - **Official Report:** [https://www.unicode.org/reports/tr39/](https://www.unicode.org/reports/tr39/)
   - **Official Confusables Dataset:** [https://www.unicode.org/Public/18.0.0/security/confusables.txt](https://www.unicode.org/Public/18.0.0/security/confusables.txt)
   - **Application in GlobalInputLab:** Forms the foundation of `HomoglyphDetector`, providing a curated security subset covering Latin lookalikes across Cyrillic, Greek, Cherokee, Armenian, Mathematical Alphanumeric, and Fullwidth forms.

2. **Unicode Standard Annex #9 (UAX #9): Unicode Bidirectional Algorithm (Bidi)**
   - **Official Report:** [https://www.unicode.org/reports/tr9/](https://www.unicode.org/reports/tr9/)
   - **Application in GlobalInputLab:** Governs the classification and detection of directional formatting marks (`LRM`, `RLM`), embeddings (`LRE`, `RLE`, `PDF`), and isolates (`LRI`, `RLI`, `FSI`, `PDI`).

3. **Unicode Standard Annex #15 (UAX #15): Unicode Normalization Forms**
   - **Official Report:** [https://www.unicode.org/reports/tr15/](https://www.unicode.org/reports/tr15/)
   - **Application in GlobalInputLab:** Powers `analyzeNormalization` across standard forms (`NFC`, `NFD`, `NFKC`, `NFKD`), detecting normalization drift and preventing silent mutations.

4. **Unicode Standard Annex #29 (UAX #29): Unicode Text Segmentation**
   - **Official Report:** [https://www.unicode.org/reports/tr29/](https://www.unicode.org/reports/tr29/)
   - **Application in GlobalInputLab:** Utilized in `countGraphemes` via `Intl.Segmenter` to accurately measure user-perceived visual character clusters rather than naive code units.

---

## 2. Security Disclosures & Threat Models

1. **Trojan Source: Invisible Bidirectional Vulnerabilities**
   - **Advisory:** CVE-2021-42574
   - **Research Reference:** Boucher & Anderson, Cambridge University (2021)
   - **Application in GlobalInputLab:** Detection of `U+202D` (LRO) and `U+202E` (RLO) as critical anomalies in `UnicodeAuditor` and opt-in stripping/escaping in `Sanitizer`.

2. **Zero-Width Character Steganography & Prompt Injection Evasion**
   - **Threat Context:** Adversaries embed zero-width spaces (`U+200B`) and joiners (`U+200C`, `U+200D`) within sensitive keyword tokens (e.g. `p\u200Bro\u200Bmpt`) to evade keyword-based moderation filters and LLM guardrails.
   - **Application in GlobalInputLab:** `checkEmbeddedKeywordSmuggling` performs token-level code-point reconstruction, distinguishing malicious embedded smuggling from legitimate linguistic word boundaries (Thai/Khmer ZWSP).

---

## 3. Official Program & Licensing References

1. **OpenAI Codex for Open Source Program**
   - **Program Information:** [https://developers.openai.com/community/codex-for-oss](https://developers.openai.com/community/codex-for-oss)
   - **Application Form:** [https://openai.com/form/codex-for-oss/](https://openai.com/form/codex-for-oss/)
   - **Program Terms:** [https://learn.chatgpt.com/docs/codex-for-oss-terms](https://learn.chatgpt.com/docs/codex-for-oss-terms)

2. **Open Source Initiative (OSI)**
   - **The MIT License:** [https://opensource.org/licenses/MIT](https://opensource.org/licenses/MIT)
   - **Application in GlobalInputLab:** Governing license of the entire repository and distribution package.
