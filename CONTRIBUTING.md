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

1. **Branch Naming:** Use clear branch names like `feat/add-devanagari-vectors`, `fix/boundary-inspector-surrogate`, or `docs/update-readme`.
2. **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `test: ...` for adding or updating tests
   - `docs: ...` for documentation changes
   - `refactor: ...` for code reorganization
3. **Tests Required:** Every code change or new vector MUST include accompanying automated tests in `tests/`.
4. **CI Passing:** All automated checks in GitHub Actions must pass before a PR can be merged.
5. **No Breaking Changes Without Discussion:** Open an issue first before introducing changes to public API signatures.

---

## Reporting Issues

If you encounter a bug or unexpected behavior:
- Check existing [GitHub Issues](https://github.com/brahimbattou/global-input-lab/issues) to avoid duplicates.
- Open a new issue using our **Bug Report** template with minimal reproduction code and expected vs. actual results.
- For security vulnerabilities, please refer to our [Security Policy](SECURITY.md).
