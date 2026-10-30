import test from 'node:test';
import assert from 'node:assert/strict';
import { TestRunner } from '../../src/cli/runner.js';
import { TestCase } from '../../src/types.js';

const SAMPLE_TC: TestCase = {
  id: 'test-exact-echo',
  category: 'names',
  name: 'Sample Unicode Name',
  description: 'Test payload for command probing',
  payload: 'José María',
  expectedBehavior: 'Must be echoed exactly byte-for-byte',
  tags: ['test'],
  riskLevel: 'info',
};

test('probeCommand - verifies correct exact echo without modification', async () => {
  const runner = new TestRunner();
  // node -e "process.stdout.write(process.argv[1])"
  const cmd = `node -e "process.stdout.write(process.argv[1])"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'passed');
  assert.equal(res.passed, true);
  assert.equal(res.transportOk, true);
  assert.equal(res.dataPreserved, true);
  assert.equal(res.extractedPayload, SAMPLE_TC.payload);
});

test('probeCommand - detects leading whitespace corruption in exact framing', async () => {
  const runner = new TestRunner();
  // Corrupts output by injecting an extra leading space
  const cmd = `node -e "process.stdout.write(' ' + process.argv[1])"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.transportOk, true);
  assert.equal(res.dataPreserved, false);
  assert.ok(res.error?.includes('Mismatch'));
});

test('probeCommand - detects trailing whitespace corruption in exact framing', async () => {
  const runner = new TestRunner();
  // Corrupts output by appending an extra trailing space
  const cmd = `node -e "process.stdout.write(process.argv[1] + ' ')"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
});

test('probeCommand - detects additional newline characters in exact framing', async () => {
  const runner = new TestRunner();
  // console.log adds an extra newline (\n)
  const cmd = `node -e "console.log(process.argv[1])"`;

  // In default 'exact' mode, extra newline is detected as corruption:
  const resExact = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });
  assert.equal(resExact.outcome, 'failed');
  assert.equal(resExact.passed, false);

  // When policy explicitly allows stripping trailing newline:
  const resStripNewline = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'strip-trailing-newline' });
  assert.equal(resStripNewline.outcome, 'passed');
  assert.equal(resStripNewline.passed, true);
});

test('probeCommand - detects missing characters', async () => {
  const runner = new TestRunner();
  // Drops the first character
  const cmd = `node -e "process.stdout.write(process.argv[1].slice(1))"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
});

test('probeCommand - detects wrong output', async () => {
  const runner = new TestRunner();
  const cmd = `node -e "process.stdout.write('completely_wrong_data')"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
});

test('probeCommand - handles process timeout accurately', async () => {
  const runner = new TestRunner();
  // Hangs for 5000ms, while timeout is set to 100ms
  const cmd = `node -e "setTimeout(() => {}, 5000)"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { timeoutMs: 100 });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.transportOk, false);
  assert.ok(res.error?.includes('timed out after 100ms'));
});

test('probeCommand - handles invalid executable gracefully', async () => {
  const runner = new TestRunner();
  const res = await runner.probeCommand(SAMPLE_TC, 'non_existent_binary_xyz_12345', {});

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.transportOk, false);
  assert.ok(res.error?.includes('Failed to execute process'));
});

test('probeCommand - supports arguments containing spaces without shell interpolation', async () => {
  const runner = new TestRunner();
  // Evaluates script with space in second argument
  const cmd = `node -e "process.stdout.write(process.argv[1])"`;
  const res = await runner.probeCommand(
    { ...SAMPLE_TC, payload: 'Payload With Multiple Spaces' },
    cmd,
    { outputFraming: 'exact' }
  );

  assert.equal(res.outcome, 'passed');
  assert.equal(res.extractedPayload, 'Payload With Multiple Spaces');
});
