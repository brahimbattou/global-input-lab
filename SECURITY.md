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

---

## Automated Repository Security Controls

The canonical GitHub repository ([`brahimbattou/global-input-lab`](https://github.com/brahimbattou/global-input-lab)) enforces the following automated security and supply-chain protections:

- **Private Vulnerability Reporting:** Enabled on the repository to support confidential security advisory submissions.
- **Dependency Graph (SBOM):** Enabled and tracking `package.json`, `package-lock.json`, and `.github/workflows/ci.yml`.
- **Dependabot Alerts & Security Updates:** Enabled to detect known vulnerabilities in development dependencies (`@types/node`, `tsx`, `typescript`) and GitHub Actions, and to open automated remediation pull requests.
- **Dependabot Version Updates (`.github/dependabot.yml`):** Configured on a weekly schedule for both `npm` and `github-actions` ecosystems with grouped minor/patch updates. Auto-merge is disabled; all dependency updates require full 9-job CI matrix verification and manual maintainer review before merging.
- **GitHub CodeQL Analysis (Default Setup):** Configured for `javascript-typescript` and `actions` using the default query suite across `main`, pull requests, and weekly scheduled scans.
- **Secret Scanning & Push Protection:** Enabled to prevent accidental credential commits.

---

## Maintainer Security Notification Configuration

Because user-level notification routing is governed by personal GitHub account settings (and cannot be read or modified via repository-scoped API tokens), the maintainer must verify the following settings in the GitHub web interface to ensure timely delivery of Private Vulnerability Reports, Dependabot alerts, and CodeQL findings:

1. **Repository Watch Settings:** On [`github.com/brahimbattou/global-input-lab`](https://github.com/brahimbattou/global-input-lab), click the **Watch** menu in the top-right corner and select either **All Activity** or **Custom → Security alerts** (plus **Issues** and **Pull requests**).
2. **Notification Email Routing:** In [GitHub Notification Settings](https://github.com/settings/notifications), confirm a verified primary email address is configured under **Default notification email**.
3. **Alert Delivery Channels:** Under **Subscriptions → Watching** and **System → Dependabot alerts** in [GitHub Notification Settings](https://github.com/settings/notifications), ensure **Email** and **Web** notifications are enabled.
