# GlobalInputLab — Open-Source Maintenance Evidence & Governance

**Primary Maintainer:** Brahim Battou (`@brahimbattou`)  
**Verified Committer Email:** `274145896+brahimbattou@users.noreply.github.com`  
**Repository:** `https://github.com/brahimbattou/global-input-lab`  

---

## 1. Maintainer Leadership & Authorship

Brahim Battou is the sole creator, lead engineer, and primary maintainer of GlobalInputLab. All project commits, architecture specifications, test suites, and documentation are authored and maintained directly by Brahim Battou under verified Git authorship.

### Git Authorship & Commit Attribution
- Every commit in the repository is strictly attributed to `Brahim Battou <274145896+brahimbattou@users.noreply.github.com>`.
- Private email protection and command-line push verification are enabled on the maintainer's GitHub account.
- Complete local backup bundles and recovery snapshots are maintained to guarantee repository integrity and provenance.

---

## 2. Engineering Quality & Rigor

The repository enforces uncompromising technical standards:

| Control | Implementation Details | Status |
| :--- | :--- | :---: |
| **Automated Tests** | 130 passing assertions across 13 specialized test suites (`tests/**/*.test.ts`). Zero skipped, zero flaky tests. | :white_check_mark: **Verified** |
| **Cross-Platform CI** | GitHub Actions matrix testing on **Ubuntu**, **Windows**, and **macOS** across Node.js **22.x**, **24.x**, and **26.x**. | :white_check_mark: **Active** |
| **Code Coverage** | Comprehensive line and branch coverage report executed via native Node.js test runner (`--experimental-test-coverage`). | :white_check_mark: **Verified** |
| **Type Safety** | 100% strict TypeScript compilation (`tsc --noEmit`), zero `any` leakage in public API surfaces. | :white_check_mark: **Verified** |
| **Packaging Safety** | `npm pack --dry-run` verified: only `dist/`, `README.md`, and `LICENSE` are distributed. Zero test files, git internals, or sensitive files included. | :white_check_mark: **Verified** |
| **Dependency Minimality** | Zero runtime dependencies. Reduces maintenance burden and eliminates supply-chain compromise vectors. | :white_check_mark: **Verified** |
| **CodeQL Static Analysis** | GitHub CodeQL Default Setup active (`javascript-typescript` and `actions` query suites) on `main`, pull requests, and weekly schedules. | :white_check_mark: **Active** |
| **Supply-Chain & Dependabot** | Dependency Graph (SBOM), Dependabot Alerts, Dependabot Security Updates, and weekly `.github/dependabot.yml` (`npm` and `github-actions`) with mandatory CI gating and manual review. | :white_check_mark: **Active** |
| **Secret Protection** | GitHub Secret Scanning and Push Protection active on the public repository. | :white_check_mark: **Active** |
| **Main Branch Ruleset** | Active `Protect Main Branch` ruleset blocking deletion and force-pushes, enforcing linear history, requiring PRs + conversation resolution, and requiring all 9 CI matrix jobs (`integration_id: 15368`) with zero bypass exemptions. | :white_check_mark: **Active** |
| **Release Tag Ruleset** | Active `Protect Release Tags` ruleset (`refs/tags/v*`) preventing deletion or force-overwriting of published version tags while permitting new release tags. | :white_check_mark: **Active** |

---

## 3. Open-Source Governance Infrastructure

GlobalInputLab maintains complete governance and community infrastructure:

1. **Issue Templates (`.github/ISSUE_TEMPLATE/`):**
   - Structured bug report form (`bug_report.yml`) requiring environment context and reproduction steps.
   - Structured feature request form (`feature_request.yml`) aligning with non-destructive design principles.
   - International test vector contribution form (`new_vector.yml`) with Unicode code point and linguistic justification fields.
2. **Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`):**
   - Checklist enforcing test coverage, typecheck execution, non-destructive defaults preservation, and documentation updates.
3. **Security Policy (`SECURITY.md`):**
   - Transparent Coordinated Vulnerability Disclosure (CVD) process utilizing GitHub's confidential Private Vulnerability Reporting (`enabled: true`).
   - Documented maintainer notification verification checklist requiring repository Watch (`All Activity` or `Security alerts`) and verified email delivery in GitHub account notification settings.
   - Documented branch/tag protection architecture and administrator emergency recovery procedure.
4. **Contributor Guidelines (`CONTRIBUTING.md`):**
   - Architectural principles, PR-based branch workflow, required 9-job CI checks, Dependabot review rules, and coding standards for community contributors.
5. **Community Standard (`CODE_OF_CONDUCT.md`):**
   - Contributor Covenant v2.1 establishing an inclusive, respectful, and safe community environment.

---

## 4. Branch Protection, Release Immutability & Change Management

1. **Main Branch Ruleset (`Protect Main Branch`):**
   - **Target:** `~DEFAULT_BRANCH` (`main`), Enforcement: `Active`, Bypass Actors: `[]` (none).
   - ** protections Enabled:** Restrict deletions (`deletion`), block force-pushes (`non_fast_forward`), require linear history (`required_linear_history`), require a Pull Request before merging (`required_approving_review_count: 0` for single-maintainer velocity; `required_review_thread_resolution: true`), and require all 9 GitHub Actions CI matrix checks (`Node 22.x`, `Node 24.x`, `Node 26.x` across `ubuntu-latest`, `windows-latest`, `macos-latest` with `integration_id: 15368`).
2. **Dependency Update Review Process:**
   - Dependabot Pull Requests (`npm` and `github-actions`) are never merged automatically. Each PR must pass all 9 required status checks and undergo manual maintainer review before squash/rebase merging.
3. **Release Tag Protection (`Protect Release Tags`):**
   - Targets `refs/tags/v*` with `Active` enforcement, blocking tag deletion (`deletion`) and force-pushes (`non_fast_forward`) to guarantee immutable published releases while allowing creation of new `v*` tags.
4. **Emergency Recovery Procedure:**
   - Rather than maintaining a permanent administrator bypass that could weaken routine PR and CI enforcement, emergency recovery requires the repository administrator (`@brahimbattou`) to explicitly navigate to **Settings → Rules → Rulesets**, temporarily change the ruleset enforcement from `Active` to `Disabled` (or `Evaluate`), complete the audited recovery action, and immediately re-enable `Active` enforcement.
