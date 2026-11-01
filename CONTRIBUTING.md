# Contributing to GlobalInputLab

Thank you for your interest in contributing to **GlobalInputLab**!

GlobalInputLab is an open-source data integrity and international input testing toolkit designed to make software systems resilient against Unicode edge cases, encoding bugs, and text corruption. We welcome contributions from developers, security researchers, and internationalization specialists worldwide.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

---

## How Can You Contribute?

You can contribute in several impactful ways:

1. **Adding Linguistic & Locale Test Vectors:** If your language, script, or regional keyboard layout has unique characters (e.g., complex ligatures, specific combining marks, tone markers, or non-spacing marks) that common web services mismanage, submit a test vector!
2. **Improving Unicode Diagnostics:** Enhancing detection algorithms against emerging steganographic techniques or Trojan Source variations.
3. **Core Engine Optimizations:** Performance improvements for high-throughput string scanning and boundary slicing.
4. **Integration Adapters:** Writing plugins or recipes for Jest, Vitest, Playwright, Cypress, Express, Fastify, Next.js, and Python/Go runners.
5. **Documentation & Guides:** Fixing typos, providing localized examples, or authoring tutorials.

---

## Development Setup

GlobalInputLab has **zero production dependencies** and uses standard Node.js and TypeScript.

### Prerequisites

- **Node.js**: `>= 22.0.0` (Active LTS: 22.x, 24.x, or 26.x)
- **npm**: `>= 9.0.0`
- **Git**

### Installation

1. Fork the repository on GitHub and clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/global-input-lab.git
   cd global-input-lab
   ```

2. Install development dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript source code:
   ```bash
   npm run build
   ```

4. Run the automated test suite:
   ```bash
   npm test
   ```

---

## Development Workflow & Scripts

- `npm run build`: Compiles TypeScript files from `src/` into `dist/` with source maps and type declarations.
- `npm run watch`: Runs the TypeScript compiler in watch mode for active development.
- `npm run typecheck`: Validates TypeScript types across the codebase without emitting artifacts.
- `npm test`: Executes the complete test suite using Node.js's native test runner (`node:test`) and `tsx`.
- `npm run test:coverage`: Executes all tests and generates a line, branch, and function coverage report.
- `npm run lint`: Performs static analysis and type checks.

---

## Guidelines for Adding Test Vectors

When submitting new test vectors to `src/core/test-suites.ts`:

1. **Category Selection:** Place the vector in the most fitting category (`names`, `emails`, `text_multilingual`, `security_adversarial`, `emoji_zwj`, `numbers_dates`).
2. **Metadata Accuracy:**
   - `id`: Unique kebab-case identifier (e.g., `persian-zwnj-verb`).
   - `category`: Category key.
   - `input`: The exact Unicode string.
   - `description`: Plain-language explanation of what makes this string linguistically or technically unique.
   - `expectedBehavior`: Expected preservation, sanitization, or storage outcome.
   - `relevantStandards`: Mention relevant Unicode Annexes (e.g., UAX #9, UAX #15, UAX #29, UTS #39).
3. **Non-Destructive Integrity:** Ensure the vector distinguishes between valid orthographic characters (e.g., ZWNJ in Persian) and malicious steganography (e.g., ZWSP in English text).

---

## Pull Request Guidelines

1. **Branch Naming:** Use clear branch names like `feat/add-devanagari-vectors`, `fix/boundary-inspector-surrogate`, or `docs/update-readme`. Direct pushes to `main` are blocked by the `Protect Main Branch` ruleset; all changes must be proposed via a Pull Request from a working branch or fork.
2. **Commit Messages & Linear History:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `test: ...` for adding or updating tests
   - `docs: ...` for documentation changes
   - `refactor: ...` for code reorganization
   The `main` branch enforces a **linear commit history** (`required_linear_history`). Pull Requests are integrated via **Squash and merge** or **Rebase and merge**.
3. **Tests Required:** Every code change or new vector MUST include accompanying automated tests in `tests/`.
4. **CI Passing & Conversation Resolution:** All 9 automated GitHub Actions CI matrix checks must pass and all review threads must be resolved (`required_review_thread_resolution: true`) before a PR can be merged.
5. **No Breaking Changes Without Discussion:** Open an issue first before introducing changes to public API signatures.

---

## Repository Protection, Required CI Checks & Governance

GlobalInputLab enforces active GitHub Rulesets on [`brahimbattou/global-input-lab`](https://github.com/brahimbattou/global-input-lab/rules) with zero bypass exemptions (`bypass_actors: []`):

### 1. Main Branch Protection (`Protect Main Branch`)
- **Target:** Default branch (`main`).
- **Branch Safety:** Branch deletion (`deletion`) and force-pushes (`non_fast_forward`) are strictly blocked.
- **Pull Request Workflow:** Every change to `main` (whether authored by the primary maintainer, an external contributor, or Dependabot) must enter through a Pull Request. Because GlobalInputLab has a single primary maintainer, `required_approving_review_count` is configured as `0` so the maintainer can merge verified self-authored PRs once all 9 required CI jobs succeed and review conversations are resolved.
- **Required Status Checks (GitHub Actions `integration_id: 15368`):** All 9 matrix jobs from `.github/workflows/ci.yml` must complete with `success`:
  - `Node 22.x on ubuntu-latest`
  - `Node 22.x on windows-latest`
  - `Node 22.x on macos-latest`
  - `Node 24.x on ubuntu-latest`
  - `Node 24.x on windows-latest`
  - `Node 24.x on macos-latest`
  - `Node 26.x on ubuntu-latest`
  - `Node 26.x on windows-latest`
  - `Node 26.x on macos-latest`

### 2. Dependency Update Review Process
- Weekly Dependabot version updates (`.github/dependabot.yml`) for `npm` and `github-actions` open Pull Requests targeting `main`.
- Auto-merge is disabled. Every Dependabot PR must pass the full 9-job CI matrix and undergo manual maintainer review of changelog, type compatibility, and lockfile diffs before merging.

### 3. Release Tag Protection (`Protect Release Tags`)
- Published version tags matching `refs/tags/v*` (e.g., `v0.1.0`) are governed by an active tag ruleset that blocks tag deletion (`deletion`) and force-overwrites (`non_fast_forward`) while permitting normal creation of new version tags.

### 4. Emergency Recovery Procedure
- No standing administrator bypass is enabled so that day-to-day maintenance never bypasses PR or CI checks. If an emergency recovery is required, the repository administrator can temporarily toggle the ruleset enforcement status in **Settings → Rules → Rulesets** as documented in [SECURITY.md](SECURITY.md).

---

## Reporting Issues

If you encounter a bug or unexpected behavior:
- Check existing [GitHub Issues](https://github.com/brahimbattou/global-input-lab/issues) to avoid duplicates.
- Open a new issue using our **Bug Report** template with minimal reproduction code and expected vs. actual results.
- For security vulnerabilities, please refer to our [Security Policy](SECURITY.md).
