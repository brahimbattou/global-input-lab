# GlobalInputLab — Project Architecture & Ecosystem Impact

**Maintainer:** Brahim Battou (`@brahimbattou`)  
**Repository:** `https://github.com/brahimbattou/global-input-lab`  
**License:** MIT  

---

## 1. The Core Problem: Why International Text Integrity Matters

Text processing is one of the most deceptively fragile layers of modern software engineering. While modern systems claim universal Unicode support, real-world data pipelines frequently suffer from:

1. **Silent Data Loss & Mojibake:** Naive string truncation at fixed byte boundaries slices multi-byte UTF-8 sequences in half, introducing replacement characters (`U+FFFD`) or database write exceptions.
2. **Harmful Destructive Sanitization:** Well-intentioned security filters indiscriminately strip zero-width characters, destroying legitimate non-spaced orthographies (Thai, Khmer, Lao, Myanmar word boundaries) or ligatures (Persian Zero-Width Non-Joiner, Indic scripts, Emoji sequences).
3. **Adversarial Steganography & Filter Evasion:** Adversaries embed zero-width spaces (`U+200B`) inside prompt keywords (e.g. `i\u200Bgnore`) or utilize bidirectional overrides (`U+202E`, Trojan Source / CVE-2021-42574) to disguise executable payloads and bypass safety guardrails.
4. **Homoglyph & Mixed-Script Spoofing:** Cross-script lookalikes (Cyrillic `а` vs Latin `a`) allow attackers to register lookalike usernames, spoof credentials, or poison vector databases.
5. **False Positive Transport Claims:** HTTP endpoints and CLI processes frequently return `200 OK` or exit code `0` while silently stripping diacritics, altering byte encodings, or mangling incoming multilingual text.

---

## 2. Technical Differentiation & Architecture

GlobalInputLab was engineered from first principles to provide developers with a dependable, standard-aligned toolkit:

| Feature Dimension | Typical Industry Approach | GlobalInputLab Engineering Approach |
| :--- | :--- | :--- |
| **Sanitization Policy** | Destructive by default (regex replaces strip all zero-width points). | **Genuinely Non-Destructive by Default:** Preserves Thai/Khmer ZWSP, Persian ZWNJ, and Emoji ZWJ. Requires explicit opt-in for destructive transformations. |
| **Unicode Indexing** | JavaScript UTF-16 code units (`string.length`, surrogate halves). | **Code-Point-Aware Indexing:** Array-based code-point indexing significantly improves detection fidelity across astral characters and emoji sequences compared to naive UTF-16 slicing, while acknowledging documented detection limitations for complex modifier chains or novel orthographic contexts. |
| **Response Verification** | Checks HTTP status code `200` or process exit code `0`. | **Raw-Byte Integrity Verification:** Strict `TextDecoder` fatal UTF-8 check, raw buffer byte comparison, and `inconclusive` status when servers do not echo data. |
| **Homoglyph Detection** | Ad-hoc character replacement or overbroad lookups. | **UTS #39 Curated Security Subset (v18.0.0):** Token-span mixed-script analysis isolates genuine Cyrillic/Greek from adversarial lookalikes. |
| **Supply Chain Safety** | Dozens of external npm transitive dependencies. | **Zero Runtime Dependencies:** Built strictly using Node.js standard libraries and TypeScript types. Significantly minimized runtime supply-chain attack surface. |

---

## 3. Real-World Developer Use Cases

1. **AI / LLM Ingestion & Tokenizer Pipelines:**
   Pre-audit user prompts and document embeddings to detect invisible steganographic tokens, prompt injection bypasses, and normalization drift before data reaches tokenizer vocabularies.
2. **API & Microservice Data Integrity Testing:**
   Execute active probes against REST/GraphQL endpoints using `gil test --url <endpoint>` to verify whether intermediate gateways, firewalls, or databases mangle multi-byte text.
3. **CLI & Shell Process Probing:**
   Probe local binaries with `gil test --command <cmd> --framing exact` to ensure processes preserve raw stdout bytes without silent newline stripping or encoding degradation.
4. **Form & Database Validation (Fuzzing):**
   Generate high-risk international test payloads (`gil generate --category security_adversarial`) to stress-test schema boundaries, maximum byte constraints, and database encodings.
