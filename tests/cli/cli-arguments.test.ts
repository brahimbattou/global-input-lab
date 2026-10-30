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
