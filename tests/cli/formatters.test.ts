import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportFormatter } from '../../src/cli/formatters.js';
import { AuditReport, TestRunReport } from '../../src/types.js';

test('ReportFormatter - formatAuditTerminal with clean report', () => {
  const cleanReport: AuditReport = {
    input: 'Clean safe text',
    codePointCount: 15,
    byteLengthUtf8: 15,
    byteLengthUtf16: 30,
    graphemeCount: 15,
    normalization: {
      nfc: 'Clean safe text',
      nfd: 'Clean safe text',
      nfkc: 'Clean safe text',
      nfkd: 'Clean safe text',
      isNFC: true,
      isNFD: true,
      isNFKC: true,
      isNFKD: true,
    },
    hasBidi: false,
    hasZeroWidth: false,
    hasHomoglyphs: false,
    hasZalgo: false,
    anomalies: [],
    riskScore: 0,
    diagnosticView: 'Clean safe text',
    summary: 'No known Unicode integrity or security patterns detected.',
  };

  const output = ReportFormatter.formatAuditTerminal(cleanReport);
  assert.ok(output.includes('=== GlobalInputLab Unicode Audit ==='));
  assert.ok(output.includes('Clean safe text'));
  assert.ok(output.includes('Visual Graphemes:'));
  assert.ok(output.includes('0/100 LOW RISK'));
  assert.ok(output.includes('[PASS] No security or encoding anomalies detected.'));
});

test('ReportFormatter - formatAuditTerminal with anomalies and high risk', () => {
  const riskyReport: AuditReport = {
    input: 's\u200Bystem \u202Ereversed.exe \u0430dmin',
    codePointCount: 26,
    byteLengthUtf8: 30,
    byteLengthUtf16: 52,
    graphemeCount: 26,
    normalization: {
      nfc: 's\u200Bystem \u202Ereversed.exe \u0430dmin',
      nfd: 's\u200Bystem \u202Ereversed.exe \u0430dmin',
      nfkc: 's\u200Bystem \u202Ereversed.exe \u0430dmin',
      nfkd: 's\u200Bystem \u202Ereversed.exe \u0430dmin',
      isNFC: false,
      isNFD: false,
      isNFKC: false,
      isNFKD: false,
    },
    hasBidi: true,
    hasZeroWidth: true,
    hasHomoglyphs: true,
    hasZalgo: true,
    anomalies: [
      {
        type: 'zero_width',
        severity: 'critical',
        codePoint: 0x200b,
        hex: 'U+200B',
        char: '\u200B',
        position: 1,
        name: 'ZERO WIDTH SPACE',
        description: 'Critical zero-width smuggling inside keyword token',
        recommendation: 'Strip zero-width characters and review payload',
      },
      {
        type: 'bidi_override',
        severity: 'warning',
        codePoint: 0x202e,
        hex: 'U+202E',
        char: '\u202E',
        position: 8,
        name: 'RIGHT-TO-LEFT OVERRIDE',
        description: 'Trojan Source vector',
        recommendation: 'Neutralize or escape directional overrides',
      },
      {
        type: 'homoglyph',
        severity: 'info',
        codePoint: 0x0430,
        hex: 'U+0430',
        char: '\u0430',
        position: 22,
        name: 'HOMOGLYPH_CYRILLIC',
        description: 'Standard Cyrillic character',
        recommendation: 'Retain as international text',
      },
    ],
    riskScore: 75,
    diagnosticView: 's[U+200B:ZWSP]ystem [U+202E:RLO]reversed.exe \u0430dmin',
    summary: 'CRITICAL RISK: Detected high-severity anomalies',
  };

  const output = ReportFormatter.formatAuditTerminal(riskyReport);
  assert.ok(output.includes('75/100 HIGH RISK'));
  assert.ok(output.includes('CRIT'));
  assert.ok(output.includes('WARN'));
  assert.ok(output.includes('INFO'));
  assert.ok(output.includes('ZERO WIDTH SPACE'));
  assert.ok(output.includes('RIGHT-TO-LEFT OVERRIDE'));
});

test('ReportFormatter - formatTestRunTerminal with passed, failed, and inconclusive results', () => {
  const report: TestRunReport = {
    total: 3,
    passed: 1,
    failed: 1,
    inconclusive: 1,
    durationMs: 45,
    results: [
      {
        testCase: {
          id: 'test-pass',
          category: 'names',
          name: 'Passing Name',
          description: 'Valid name',
          payload: 'José',
          expectedBehavior: 'Preserved',
          tags: ['name'],
          riskLevel: 'info',
        },
        outcome: 'passed',
        passed: true,
        transportOk: true,
        dataPreserved: true,
        durationMs: 10,
      },
      {
        testCase: {
          id: 'test-fail',
          category: 'security_adversarial',
          name: 'Failing Injection',
          description: 'Corrupted payload',
          payload: 'test\u200B',
          expectedBehavior: 'Echoed',
          tags: ['security'],
          riskLevel: 'critical',
        },
        outcome: 'failed',
        passed: false,
        transportOk: true,
        dataPreserved: false,
        durationMs: 15,
        error: 'Payload corrupted by server',
        roundTrip: {
          original: 'test\u200B',
          processed: 'test',
          identical: false,
          bytePreserved: false,
          lengthDelta: -1,
          introducedReplacementChar: false,
          diffDescription: 'Length mismatch: expected 5, got 4',
        },
      },
      {
        testCase: {
          id: 'test-inconc',
          category: 'emails',
          name: 'Inconclusive Email',
          description: 'No echo data',
          payload: 'test@example.com',
          expectedBehavior: 'Echoed',
          tags: ['email'],
          riskLevel: 'info',
        },
        outcome: 'inconclusive',
        passed: false,
        transportOk: true,
        dataPreserved: null,
        durationMs: 20,
        inconclusiveReason: 'Server returned HTTP 204 No Content',
      },
    ],
    summary: '1 failed, 1 passed, 1 inconclusive out of 3 tests.',
  };

  const terminalOutput = ReportFormatter.formatTestRunTerminal(report);
  assert.ok(terminalOutput.includes('[PASS]'));
  assert.ok(terminalOutput.includes('[FAIL]'));
  assert.ok(terminalOutput.includes('[INCONC]'));
  assert.ok(terminalOutput.includes('Payload corrupted by server'));
  assert.ok(terminalOutput.includes('Length mismatch'));
  assert.ok(terminalOutput.includes('HTTP 204 No Content'));

  const xml = ReportFormatter.toJUnitXml(report);
  assert.ok(xml.includes('tests="3"'));
  assert.ok(xml.includes('failures="1"'));
  assert.ok(xml.includes('<failure message="Payload corrupted by server"'));
  assert.ok(xml.includes('<skipped message="Server returned HTTP 204 No Content"'));

  const md = ReportFormatter.toMarkdown(report);
  assert.ok(md.includes('| Status | Category | Test Case | Duration | Details |'));
  assert.ok(md.includes('| PASS | `names` | Passing Name | 10ms | Valid name |'));
  assert.ok(md.includes('| FAIL | `security_adversarial` | Failing Injection | 15ms | Payload corrupted by server |'));
  assert.ok(md.includes('| INCONCLUSIVE | `emails` | Inconclusive Email | 20ms | Server returned HTTP 204 No Content |'));
});

