import test from 'node:test';
import assert from 'node:assert/strict';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TestRunner } from '../../src/cli/runner.js';
import { ReportFormatter } from '../../src/cli/formatters.js';

const execAsync = promisify(exec);

test('TestRunner - executes local integrity self-test suite', async () => {
  const runner = new TestRunner();
  const report = await runner.run({
    categories: ['names', 'emails', 'emoji_zwj'],
  });

  assert.ok(report.total > 0);
  assert.equal(report.failed, 0);
  assert.equal(report.passed, report.total);
});

test('ReportFormatter - formats JUnit XML and Markdown accurately', async () => {
  const runner = new TestRunner();
  const report = await runner.run({ categories: ['names'] });

  const xml = ReportFormatter.toJUnitXml(report);
  assert.ok(xml.includes('<?xml version="1.0"'));
  assert.ok(xml.includes('<testsuites'));
  assert.ok(xml.includes('failures="0"'));

  const md = ReportFormatter.toMarkdown(report);
  assert.ok(md.includes('# GlobalInputLab Data Integrity Report'));
  assert.ok(md.includes('| Status | Category | Test Case |'));
});
