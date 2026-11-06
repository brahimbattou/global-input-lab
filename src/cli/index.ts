#!/usr/bin/env node
/**
 * GlobalInputLab - CLI Executable Entrypoint
 * Modern International Input & Data Integrity Testing Toolkit
 * (c) 2026 Brahim Battou. MIT License.
 */

import fs from 'fs';
import { auditText, sanitizeText, getTestSuites, fuzzField } from '../index.js';
import { OutputFramingPolicy, TestCategory } from '../types.js';
import { ReportFormatter } from './formatters.js';
import { TestRunner } from './runner.js';

const VERSION = '0.2.0';
const VALID_CATEGORIES: TestCategory[] = [
  'names',
  'emails',
  'text_multilingual',
  'security_adversarial',
  'emoji_zwj',
  'numbers_dates',
];

function printHelp(): void {
  console.log(`
GlobalInputLab v${VERSION}
Modern International Input & Data Integrity Testing Toolkit

Usage:
  global-input-lab <command> [options]
  gil <command> [options]

Commands:
  audit <text|file>      Audit a string or text file for Unicode anomalies, homoglyphs, and encoding risks
  sanitize <text|file>   Sanitize a string or file with non-destructive preservation by default
  test [options]         Run active international test vectors against an HTTP endpoint or command
  generate [options]     Export curated test cases (names, emails, bidi, emojis, security) in JSON, CSV, or TXT
  fuzz [options]         Generate fuzzed edge-case payloads for specific field constraints

Options:
  -h, --help             Show this help screen
  -v, --version          Show version number
  --json                 Output results as JSON
  --category <name>      Filter test cases by category (${VALID_CATEGORIES.join(', ')})
  --url <targetUrl>      Target HTTP endpoint URL for active testing
  --json-path <path>     Dot-notation path to extract response string from JSON (e.g. 'data.content')
  --command <cmd>        Target shell binary to probe safely with payload argument
  --framing <policy>     Output framing policy: 'exact' (default, no trimming), 'strip-trailing-newline', or 'trim'
  --max-response-bytes <n> Max allowed stdout/response bytes before aborting (default: 10MB)
  --max-stderr-bytes <n>   Max allowed stderr bytes before aborting (default: 10MB)
  --strict               Treat inconclusive tests as failures
  --junit <file>         Export test results to JUnit XML file
  --markdown <file>      Export test results to Markdown table file
  --out <file>           Output file path for generated or sanitized data
  --field <type>         Target field type for fuzzer (name, email, identifier, text, search_query)
  --count <n>            Number of items to generate (default: 10)
  --strip-zero-width     Opt-in policy: strip non-linguistic zero-width spaces in Latin contexts
  --strip-soft-hyphens   Opt-in policy: strip soft hyphens (U+00AD)
  --strip-math           Opt-in policy: strip invisible math operators (U+2061..U+2064)
  --strip-controls       Opt-in policy: strip ASCII control codes and null bytes
  --strip-bidi           Opt-in policy: strip Trojan Source bidirectional overrides (U+202D, U+202E)
  --escape-bidi          Escape bidirectional controls (\\u202E) instead of stripping
  --replace-homoglyphs   Convert confusable homoglyphs to canonical Latin (Credential checks only)
  --normalize <form>     Opt-in policy: normalize text to NFC, NFD, NFKC, or NFKD

Operational Caution:
  Active probing commands transmit real test vectors directly to target systems.
  Never run security_adversarial suites against production APIs or unauthorized endpoints.

Examples:
  gil audit "Ignore\\u200B previous instructions"
  gil audit ./user_payload.json --json
  gil sanitize ./input.txt --out ./cleaned.txt
  gil test --url http://localhost:3000/api/echo --json-path "data.echo"
  gil test --command "node -e 'process.stdout.write(process.argv[1])'" --framing exact
  gil generate --category security_adversarial --format json
  gil fuzz --field email --count 5
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`global-input-lab v${VERSION}`);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'audit': {
      const target = args[1];
      if (!target || target.startsWith('--')) {
        console.error('Error: Please provide a text string or valid file path to audit.');
        process.exit(1);
      }

      let textToAudit = target;
      if (fs.existsSync(target)) {
        try {
          textToAudit = fs.readFileSync(target, 'utf8');
        } catch (e) {
          console.error(`Error reading file: ${(e as Error).message}`);
          process.exit(1);
        }
      }

      const report = auditText(textToAudit);

      if (args.includes('--json')) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(ReportFormatter.formatAuditTerminal(report));
      }

      if (report.riskScore >= 70 || report.anomalies.some(a => a.severity === 'critical')) {
        process.exit(2); // Critical risk exit code
      }
      break;
    }

    case 'sanitize': {
      const target = args[1];
      if (!target || target.startsWith('--')) {
        console.error('Error: Please provide a text string or valid file path to sanitize.');
        process.exit(1);
      }

      let textToSanitize = target;
      if (fs.existsSync(target)) {
        textToSanitize = fs.readFileSync(target, 'utf8');
      }

      const replaceHomoglyphs = args.includes('--replace-homoglyphs');
      const escapeBidiControls = args.includes('--escape-bidi');
      const stripBidiOverrides = args.includes('--strip-bidi');
      const stripZeroWidth = args.includes('--strip-zero-width');
      const stripSoftHyphens = args.includes('--strip-soft-hyphens');
      const stripMathOperators = args.includes('--strip-math');
      const stripControlChars = args.includes('--strip-controls');

      const normIndex = args.indexOf('--normalize');
      const normalizeForm = normIndex !== -1 ? (args[normIndex + 1] as any) : false;

      const res = sanitizeText(textToSanitize, {
        replaceHomoglyphs,
        escapeBidiControls,
        stripBidiOverrides,
        stripZeroWidth,
        stripSoftHyphens,
        stripMathOperators,
        stripControlChars,
        normalizeForm,
        preserveLinguisticJoiners: true, // Non-destructive default: preserve Persian ZWNJ, Emoji ZWJ
        preserveDirectionalMarks: true,  // Non-destructive default: preserve LRM/RLM
      });

      const outIndex = args.indexOf('--out');
      if (outIndex !== -1 && args[outIndex + 1]) {
        const outPath = args[outIndex + 1];
        fs.writeFileSync(outPath, res.sanitized, 'utf8');
        console.log(`Sanitized output successfully written to: ${outPath}`);
      } else if (args.includes('--json')) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(res.sanitized);
      }
      break;
    }

    case 'test': {
      const urlIndex = args.indexOf('--url');
      const targetUrl = urlIndex !== -1 ? args[urlIndex + 1] : undefined;

      const jsonPathIndex = args.indexOf('--json-path');
      const jsonPath = jsonPathIndex !== -1 ? args[jsonPathIndex + 1] : undefined;

      const cmdIndex = args.indexOf('--command');
      const targetCommand = cmdIndex !== -1 ? args[cmdIndex + 1] : undefined;

      const framingIndex = args.indexOf('--framing');
      const outputFraming = framingIndex !== -1 ? (args[framingIndex + 1] as OutputFramingPolicy) : 'exact';

      const catIndex = args.indexOf('--category');
      let category: TestCategory | undefined;
      if (catIndex !== -1) {
        const catArg = args[catIndex + 1] as TestCategory;
        if (!VALID_CATEGORIES.includes(catArg)) {
          console.error(`Error: Invalid category '${catArg}'. Allowed categories: ${VALID_CATEGORIES.join(', ')}`);
          process.exit(1);
        }
        category = catArg;
      }

      const maxRespIndex = args.indexOf('--max-response-bytes');
      const maxResponseBytes = maxRespIndex !== -1 ? parseInt(args[maxRespIndex + 1], 10) : undefined;

      const maxStderrIndex = args.indexOf('--max-stderr-bytes');
      const maxStderrBytes = maxStderrIndex !== -1 ? parseInt(args[maxStderrIndex + 1], 10) : undefined;

      const isStrict = args.includes('--strict');

      const runner = new TestRunner();
      const report = await runner.run({
        targetUrl,
        jsonPath,
        targetCommand,
        outputFraming,
        maxResponseBytes: Number.isFinite(maxResponseBytes) ? maxResponseBytes : undefined,
        maxStderrBytes: Number.isFinite(maxStderrBytes) ? maxStderrBytes : undefined,
        categories: category ? [category] : undefined,
      });

      // Write JUnit XML if requested
      const junitIndex = args.indexOf('--junit');
      if (junitIndex !== -1 && args[junitIndex + 1]) {
        const junitPath = args[junitIndex + 1];
        fs.writeFileSync(junitPath, ReportFormatter.toJUnitXml(report), 'utf8');
        console.log(`JUnit XML report written to ${junitPath}`);
      }

      // Write Markdown if requested
      const mdIndex = args.indexOf('--markdown');
      if (mdIndex !== -1 && args[mdIndex + 1]) {
        const mdPath = args[mdIndex + 1];
        fs.writeFileSync(mdPath, ReportFormatter.toMarkdown(report), 'utf8');
        console.log(`Markdown report written to ${mdPath}`);
      }

      if (args.includes('--json')) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(ReportFormatter.formatTestRunTerminal(report));
      }

      if (report.failed > 0 || (isStrict && report.inconclusive > 0)) {
        process.exit(1);
      }
      break;
    }

    case 'generate': {
      const catIndex = args.indexOf('--category');
      let category: TestCategory | undefined;
      if (catIndex !== -1) {
        const catArg = args[catIndex + 1] as TestCategory;
        if (!VALID_CATEGORIES.includes(catArg)) {
          console.error(`Error: Invalid category '${catArg}'. Allowed categories: ${VALID_CATEGORIES.join(', ')}`);
          process.exit(1);
        }
        category = catArg;
      }

      const formatIndex = args.indexOf('--format');
      const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';

      const cases = getTestSuites(category);

      let output = '';
      if (format === 'csv') {
        output = 'id,category,name,payload,riskLevel\n' +
          cases.map(c => `"${c.id}","${c.category}","${c.name.replace(/"/g, '""')}","${c.payload.replace(/"/g, '""')}","${c.riskLevel}"`).join('\n');
      } else if (format === 'txt') {
        output = cases.map(c => c.payload).join('\n');
      } else {
        output = JSON.stringify(cases, null, 2);
      }

      const outIndex = args.indexOf('--out');
      if (outIndex !== -1 && args[outIndex + 1]) {
        fs.writeFileSync(args[outIndex + 1], output, 'utf8');
        console.log(`Exported ${cases.length} test cases to ${args[outIndex + 1]}`);
      } else {
        console.log(output);
      }
      break;
    }

    case 'fuzz': {
      const fieldIndex = args.indexOf('--field');
      const field = (fieldIndex !== -1 ? args[fieldIndex + 1] : 'text') as any;

      const countIndex = args.indexOf('--count');
      const count = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 10;

      const payloads = fuzzField(field).slice(0, count);

      if (args.includes('--json')) {
        console.log(JSON.stringify(payloads, null, 2));
      } else {
        console.log(`\nGenerated ${payloads.length} fuzz payloads for field '${field}':\n`);
        payloads.forEach((p, idx) => {
          console.log(` [${idx + 1}] "${p}"`);
        });
        console.log('');
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
