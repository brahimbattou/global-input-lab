/**
 * GlobalInputLab - CLI Formatters & Reporters
 * Supports Rich ANSI Terminal UI, JSON, JUnit XML, Markdown, and GitHub Actions Annotations.
 * (c) 2026 Brahim Battou. MIT License.
 */

import { AuditReport, TestRunReport } from '../types.js';

// Clean ANSI colors with zero dependencies
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

export class ReportFormatter {
  /**
   * Formats an audit report for terminal output
   */
  public static formatAuditTerminal(report: AuditReport): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(`${c.bold}${c.cyan}=== GlobalInputLab Unicode Audit ===${c.reset}`);
    lines.push(`${c.dim}Input text preview:${c.reset} "${report.input.length > 60 ? report.input.slice(0, 57) + '...' : report.input}"`);
    lines.push(`${c.dim}Diagnostic view:${c.reset}    "${report.diagnosticView.length > 80 ? report.diagnosticView.slice(0, 77) + '...' : report.diagnosticView}"`);
    lines.push('');

    // Metrics table
    lines.push(`${c.bold}Metrics:${c.reset}`);
    lines.push(`  * Visual Graphemes: ${c.white}${report.graphemeCount}${c.reset}`);
    lines.push(`  * Code Points:      ${c.white}${report.codePointCount}${c.reset}`);
    lines.push(`  * UTF-8 Bytes:      ${c.white}${report.byteLengthUtf8} bytes${c.reset}`);
    lines.push(`  * UTF-16 CodeUnits: ${c.white}${report.byteLengthUtf16 / 2}${c.reset}`);
    lines.push(`  * Normalization:    NFC: ${report.normalization.isNFC ? c.green + 'YES' : c.yellow + 'NO'}${c.reset} | NFD: ${report.normalization.isNFD ? 'YES' : 'NO'}`);
    lines.push(`  * Risk Score:       ${this.formatRiskBadge(report.riskScore)}`);
    lines.push('');

    // Anomalies
    if (report.anomalies.length === 0) {
      lines.push(`${c.green}[PASS] No security or encoding anomalies detected.${c.reset}`);
    } else {
      lines.push(`${c.bold}Detected Characteristics & Anomalies (${report.anomalies.length}):${c.reset}`);
      for (const a of report.anomalies) {
        let badge = `${c.cyan} INFO ${c.reset}`;
        if (a.severity === 'critical') {
          badge = `${c.bgRed}${c.white} CRIT ${c.reset}`;
        } else if (a.severity === 'warning') {
          badge = `${c.bgYellow}${c.white} WARN ${c.reset}`;
        }

        lines.push(`  ${badge} ${c.bold}${a.name}${c.reset} [${a.hex}] at position ${a.position}`);
        lines.push(`         ${c.dim}Context:${c.reset} ${a.description}`);
        lines.push(`         ${c.dim}Action:${c.reset}  ${c.green}${a.recommendation}${c.reset}`);
      }
    }

    lines.push('');
    lines.push(`${c.dim}Summary:${c.reset} ${report.summary}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats test run results for terminal output
   */
  public static formatTestRunTerminal(report: TestRunReport): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(`${c.bold}${c.cyan}=== GlobalInputLab Test Suite Execution ===${c.reset}`);
    lines.push(`Executed ${report.total} test vectors in ${report.durationMs}ms`);
    lines.push('');

    for (const res of report.results) {
      let statusBadge = `${c.green}[PASS]${c.reset}`;
      if (res.outcome === 'failed') {
        statusBadge = `${c.red}[FAIL]${c.reset}`;
      } else if (res.outcome === 'inconclusive') {
        statusBadge = `${c.yellow}[INCONC]${c.reset}`;
      }

      lines.push(`  ${statusBadge} ${c.bold}${res.testCase.category}${c.reset} / ${res.testCase.name} ${c.dim}(${res.durationMs}ms)${c.reset}`);
      if (res.outcome === 'failed') {
        lines.push(`         ${c.red}Error:${c.reset} ${res.error || 'Failed integrity check'}`);
        if (res.roundTrip?.diffDescription) {
          lines.push(`         ${c.yellow}Diff:${c.reset}  ${res.roundTrip.diffDescription}`);
        }
      } else if (res.outcome === 'inconclusive') {
        lines.push(`         ${c.yellow}Notice:${c.reset} ${res.inconclusiveReason}`);
      }
    }

    lines.push('');
    lines.push(
      `${c.bold}Summary:${c.reset} ${report.passed}/${report.total} passed. ` +
      `${report.failed > 0 ? c.red + report.failed + ' failed' : '0 failed'}${c.reset}, ` +
      `${report.inconclusive > 0 ? c.yellow + report.inconclusive + ' inconclusive' : '0 inconclusive'}${c.reset}.`
    );
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats test results as JUnit XML for CI/CD runners
   */
  public static toJUnitXml(report: TestRunReport): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<testsuites name="GlobalInputLab" tests="${report.total}" failures="${report.failed}" errors="0" time="${(report.durationMs / 1000).toFixed(3)}">`);
    lines.push(`  <testsuite name="DataIntegritySuite" tests="${report.total}" failures="${report.failed}" time="${(report.durationMs / 1000).toFixed(3)}">`);

    for (const res of report.results) {
      lines.push(`    <testcase classname="${res.testCase.category}" name="${this.escapeXml(res.testCase.name)}" time="${(res.durationMs / 1000).toFixed(3)}">`);
      if (res.outcome === 'failed') {
        lines.push(`      <failure message="${this.escapeXml(res.error || 'Failed integrity check')}">${this.escapeXml(res.roundTrip?.diffDescription || '')}</failure>`);
      } else if (res.outcome === 'inconclusive') {
        lines.push(`      <skipped message="${this.escapeXml(res.inconclusiveReason || 'Inconclusive response')}"/>`);
      }
      lines.push('    </testcase>');
    }

    lines.push('  </testsuite>');
    lines.push('</testsuites>');
    return lines.join('\n');
  }

  /**
   * Formats test results as a GitHub Actions Markdown Summary
   */
  public static toMarkdown(report: TestRunReport): string {
    const lines: string[] = [];
    lines.push('# GlobalInputLab Data Integrity Report');
    lines.push('');
    lines.push(`- **Status:** ${report.failed === 0 ? 'Success' : 'Failed'}`);
    lines.push(`- **Total Vectors:** ${report.total}`);
    lines.push(`- **Passed (Verified):** ${report.passed}`);
    lines.push(`- **Failed:** ${report.failed}`);
    lines.push(`- **Inconclusive:** ${report.inconclusive}`);
    lines.push(`- **Duration:** ${report.durationMs}ms`);
    lines.push('');
    lines.push('| Status | Category | Test Case | Duration | Details |');
    lines.push('|---|---|---|---|---|');

    for (const res of report.results) {
      let icon = 'PASS';
      if (res.outcome === 'failed') icon = 'FAIL';
      else if (res.outcome === 'inconclusive') icon = 'INCONCLUSIVE';

      const detail = res.outcome === 'passed'
        ? res.testCase.description
        : res.outcome === 'inconclusive'
        ? (res.inconclusiveReason || 'Unverified')
        : (res.error || res.roundTrip?.diffDescription || 'Failure');

      lines.push(`| ${icon} | \`${res.testCase.category}\` | ${res.testCase.name} | ${res.durationMs}ms | ${detail.replace(/\|/g, '\\|')} |`);
    }

    return lines.join('\n');
  }

  private static formatRiskBadge(score: number): string {
    if (score >= 70) return `${c.bgRed}${c.white} ${score}/100 HIGH RISK ${c.reset}`;
    if (score >= 30) return `${c.bgYellow}${c.white} ${score}/100 MEDIUM RISK ${c.reset}`;
    return `${c.green}${score}/100 LOW RISK${c.reset}`;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return char;
      }
    });
  }
}
