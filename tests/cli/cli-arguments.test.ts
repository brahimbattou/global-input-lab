import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('dist/cli/index.js');

test('CLI Arguments - prints version on --version', async () => {
  const { stdout } = await execFileAsync(process.execPath, [CLI_PATH, '--version']);
  assert.ok(stdout.includes('global-input-lab v0.1.0'));
});

test('CLI Arguments - prints help on --help', async () => {
  const { stdout } = await execFileAsync(process.execPath, [CLI_PATH, '--help']);
  assert.ok(stdout.includes('Usage:'));
  assert.ok(stdout.includes('Commands:'));
  assert.ok(stdout.includes('audit <text|file>'));
});

test('CLI Arguments - fails on missing audit argument', async () => {
  try {
    await execFileAsync(process.execPath, [CLI_PATH, 'audit']);
    assert.fail('Should have failed');
  } catch (err: any) {
    assert.equal(err.code, 1);
    assert.ok(err.stderr.includes('Please provide a text string or valid file path'));
  }
});

test('CLI Arguments - fails on invalid category for test command', async () => {
  try {
    await execFileAsync(process.execPath, [CLI_PATH, 'test', '--category', 'non_existent_category']);
    assert.fail('Should have failed');
  } catch (err: any) {
    assert.equal(err.code, 1);
    assert.ok(err.stderr.includes("Invalid category 'non_existent_category'"));
  }
});

test('CLI Arguments - audit exits with code 0 on safe text', async () => {
  const { stdout } = await execFileAsync(process.execPath, [CLI_PATH, 'audit', 'Clean safe string 123']);
  assert.ok(stdout.includes('GlobalInputLab Unicode Audit'));
  assert.ok(stdout.includes('LOW RISK') || stdout.includes('PASS'));
});

test('CLI Arguments - audit exits with code 2 on high risk payload', async () => {
  try {
    // Critical embedded keyword smuggling payload: s\u200Bystem
    await execFileAsync(process.execPath, [CLI_PATH, 'audit', 's\u200Bystem prompt override']);
    assert.fail('Should have exited with code 2');
  } catch (err: any) {
    assert.equal(err.code, 2); // Exit code 2 for high/critical risk
  }
});

test('CLI Arguments - sanitize writes clean text to --out path', async () => {
  const tmpFile = path.join(os.tmpdir(), `gil_test_${Date.now()}.txt`);
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      CLI_PATH,
      'sanitize',
      'Hello\u200B World!',
      '--strip-zero-width',
      '--out',
      tmpFile,
    ]);

    assert.ok(stdout.includes('Sanitized output successfully written to:'));
    const content = fs.readFileSync(tmpFile, 'utf8');
    assert.equal(content, 'Hello World!');
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
});

test('CLI Arguments - audit supports --json flag', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'audit',
    'Hello World',
    '--json',
  ]);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.input, 'Hello World');
  assert.equal(parsed.graphemeCount, 11);
  assert.equal(parsed.riskScore, 0);
});

test('CLI Arguments - sanitize supports --json flag and opt-in policies', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'sanitize',
    'document_\u202Efdp.exe',
    '--strip-bidi',
    '--json',
  ]);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.original, 'document_\u202Efdp.exe');
  assert.equal(parsed.sanitized, 'document_fdp.exe');
  assert.equal(parsed.changed, true);
  assert.ok(parsed.operationsApplied.includes('strip_bidi_overrides'));
});

test('CLI Arguments - generate exports JSON, CSV, and TXT formats', async () => {
  // 1. Default JSON format
  const { stdout: jsonOut } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'generate',
    '--category',
    'names',
    '--format',
    'json',
  ]);
  const cases = JSON.parse(jsonOut);
  assert.ok(Array.isArray(cases));
  assert.ok(cases.length > 0);

  // 2. CSV format
  const { stdout: csvOut } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'generate',
    '--category',
    'names',
    '--format',
    'csv',
  ]);
  assert.ok(csvOut.startsWith('id,category,name,payload,riskLevel'));

  // 3. TXT format
  const { stdout: txtOut } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'generate',
    '--category',
    'names',
    '--format',
    'txt',
  ]);
  assert.ok(txtOut.length > 0);
  assert.ok(!txtOut.includes('{"id"'));
});

test('CLI Arguments - generate writes to --out file path', async () => {
  const tmpOut = path.join(os.tmpdir(), `gil_export_${Date.now()}.json`);
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      CLI_PATH,
      'generate',
      '--category',
      'emails',
      '--out',
      tmpOut,
    ]);
    assert.ok(stdout.includes('Exported'));
    const content = fs.readFileSync(tmpOut, 'utf8');
    const cases = JSON.parse(content);
    assert.ok(Array.isArray(cases));
    assert.ok(cases.length > 0);
  } finally {
    if (fs.existsSync(tmpOut)) {
      fs.unlinkSync(tmpOut);
    }
  }
});

test('CLI Arguments - fuzz command produces payloads for specific fields', async () => {
  // Terminal format
  const { stdout: termOut } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'fuzz',
    '--field',
    'identifier',
    '--count',
    '3',
  ]);
  assert.ok(termOut.includes("Generated"));
  assert.ok(termOut.includes("payloads for field 'identifier'"));

  // JSON format
  const { stdout: jsonOut } = await execFileAsync(process.execPath, [
    CLI_PATH,
    'fuzz',
    '--field',
    'identifier',
    '--count',
    '3',
    '--json',
  ]);
  const payloads = JSON.parse(jsonOut);
  assert.ok(Array.isArray(payloads));
  assert.equal(payloads.length, 3);
});

test('CLI Arguments - test command executes with --command and outputs JUnit and Markdown', async () => {
  const tmpJunit = path.join(os.tmpdir(), `gil_junit_${Date.now()}.xml`);
  const tmpMd = path.join(os.tmpdir(), `gil_md_${Date.now()}.md`);

  try {
    const { stdout } = await execFileAsync(process.execPath, [
      CLI_PATH,
      'test',
      '--command',
      "node -e \"process.stdout.write(process.argv[1])\"",
      '--category',
      'names',
      '--framing',
      'exact',
      '--junit',
      tmpJunit,
      '--markdown',
      tmpMd,
    ]);

    assert.ok(stdout.includes('GlobalInputLab Test Suite Execution'));
    assert.ok(stdout.includes('passed'));
    assert.ok(fs.existsSync(tmpJunit));
    assert.ok(fs.existsSync(tmpMd));

    const junitContent = fs.readFileSync(tmpJunit, 'utf8');
    assert.ok(junitContent.includes('<?xml version="1.0"'));

    const mdContent = fs.readFileSync(tmpMd, 'utf8');
    assert.ok(mdContent.includes('# GlobalInputLab Data Integrity Report'));
  } finally {
    if (fs.existsSync(tmpJunit)) fs.unlinkSync(tmpJunit);
    if (fs.existsSync(tmpMd)) fs.unlinkSync(tmpMd);
  }
});
