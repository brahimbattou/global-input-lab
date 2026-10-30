# Security Policy

## Supported Versions

We provide security updates and patches for the following versions of **GlobalInputLab**:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

The GlobalInputLab maintainers take security and data integrity vulnerabilities seriously. If you discover a security vulnerability, including:

- Bypasses of Trojan Source detection (`CVE-2021-42574`)
- Undetected zero-width steganographic or prompt-injection sequences
- Regular Expression Denial of Service (ReDoS) in parsing or auditing routines
- Command injection or unsafe process execution bugs in the CLI
- Unhandled exceptions or parser crashes caused by malformed UTF-8 payloads

Please **do not disclose it publicly** via GitHub Issues.

### Reporting Process

1. **Email the Maintainer:** Submit a detailed report to `security@battou.dev` with the subject line `[SECURITY] GlobalInputLab Vulnerability Report`.
2. **Include Reproduction Steps:**
   - Detailed description of the vulnerability.
   - Minimal reproduction code or test payload.
   - Expected behavior vs. actual observed behavior.
   - Impact assessment (e.g., DoS, filter bypass, data corruption).
3. **Response Timeline:**
   - **Acknowledgment:** Within 48 hours.
   - **Initial Assessment:** Within 5 business days.
   - **Fix & Advisory:** Coordinated disclosure typically within 30 days of initial report.

---

## Security Architecture & Best Practices

GlobalInputLab follows strict secure-by-default design principles:

1. **Zero External Runtime Dependencies:** Mitigates supply chain attacks (no third-party npm packages required at runtime).
2. **Safe Child Process Execution:** All CLI execution avoids shell interpolation (`child_process.spawn` is invoked with `{ shell: false }` and strict argument arrays).
3. **Strict Transport Protocol Validation:** Only `http:` and `https:` URLs are permitted for active network probes.
4. **Non-Destructive Defaults:** Auditing functions are read-only and never mutate source text. Sanitization preserves valid linguistic characters (such as Persian ZWNJ and emoji sequences) by default.
