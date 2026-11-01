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

GlobalInputLab utilizes GitHub's **Private Vulnerability Reporting** feature to allow security researchers and developers to privately and securely report vulnerabilities directly to the maintainer.

To submit a private vulnerability report:

1. Navigate to the repository on GitHub: [brahimbattou/global-input-lab](https://github.com/brahimbattou/global-input-lab).
2. Click the **Security** tab under the repository navigation bar.
3. In the left-hand menu under "Security", select **Advisories**.
4. Click the green **Report a vulnerability** button to open a confidential advisory draft.
5. Provide detailed information to assist in reproducing and resolving the issue:
   - A clear description of the vulnerability.
   - Minimal reproduction code, command invocation, or offending test payload.
   - Expected behavior versus actual observed behavior.
   - Impact assessment (e.g., Denial of Service, filter bypass, silent data corruption, or unsafe execution).
6. Submit the report.

This opens a private advisory workspace where maintainers and the reporter can securely communicate, assess the issue, and collaborate on a remediation before any public disclosure. Once a fix is verified, a coordinated release and security advisory will be published.

---

## Security Architecture & Best Practices

GlobalInputLab follows strict secure-by-default design principles:

1. **Zero External Runtime Dependencies:** Mitigates supply chain attacks (no third-party npm packages required at runtime).
2. **Safe Child Process Execution:** All CLI execution avoids shell interpolation (`child_process.spawn` is invoked with `{ shell: false }` and strict argument arrays).
3. **Strict Transport Protocol Validation:** Only `http:` and `https:` URLs are permitted for active network probes.
4. **Non-Destructive Defaults:** Auditing functions are read-only and never mutate source text. Sanitization preserves valid linguistic characters (such as Persian ZWNJ and emoji sequences) by default.
