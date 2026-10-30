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

test('probeCommand - preserves Euro symbol (€) split across multiple stdout chunks', async () => {
  const runner = new TestRunner();
  const euroTc: TestCase = {
    ...SAMPLE_TC,
    id: 'euro-chunk-test',
    payload: '€',
  };

  // 0xE2 in chunk 1, 0x82 0xAC in chunk 2
  const cmd = `node -e "process.stdout.write(Buffer.from([0xE2])); setTimeout(() => { process.stdout.write(Buffer.from([0x82, 0xAC])); }, 25);"`;
  const res = await runner.probeCommand(euroTc, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'passed');
  assert.equal(res.passed, true);
  assert.equal(res.dataPreserved, true);
  assert.equal(res.extractedPayload, '€');
  assert.ok(!res.extractedPayload.includes('\uFFFD'));
});

test('probeCommand - preserves Arabic, Chinese, Emoji, and mixed text split across stream chunk boundaries', async () => {
  const runner = new TestRunner();

  // 1. Emoji 😀 (0xF0 0x9F 0x98 0x80) split 2 bytes + 2 bytes
  const emojiTc: TestCase = { ...SAMPLE_TC, id: 'emoji-split', payload: '😀' };
  const emojiCmd = `node -e "process.stdout.write(Buffer.from([0xF0, 0x9F])); setTimeout(() => { process.stdout.write(Buffer.from([0x98, 0x80])); }, 20);"`;
  const emojiRes = await runner.probeCommand(emojiTc, emojiCmd, { outputFraming: 'exact' });
  assert.equal(emojiRes.outcome, 'passed');
  assert.equal(emojiRes.extractedPayload, '😀');
  assert.ok(!emojiRes.extractedPayload?.includes('\uFFFD'));

  // 2. Chinese 世界 (0xE4 0xB8 0x96, 0xE7 0x95 0x8C) split across 3 chunks
  const cjkTc: TestCase = { ...SAMPLE_TC, id: 'cjk-split', payload: '世界' };
  const cjkCmd = `node -e "process.stdout.write(Buffer.from([0xE4, 0xB8])); setTimeout(() => { process.stdout.write(Buffer.from([0x96, 0xE7])); setTimeout(() => { process.stdout.write(Buffer.from([0x95, 0x8C])); }, 15); }, 15);"`;
  const cjkRes = await runner.probeCommand(cjkTc, cjkCmd, { outputFraming: 'exact' });
  assert.equal(cjkRes.outcome, 'passed');
  assert.equal(cjkRes.extractedPayload, '世界');
  assert.ok(!cjkRes.extractedPayload?.includes('\uFFFD'));

  // 3. Arabic مرحبا split across chunks
  const arabicStr = 'مرحبا';
  const arabicTc: TestCase = { ...SAMPLE_TC, id: 'arabic-split', payload: arabicStr };
  const arabicBuf = Buffer.from(arabicStr, 'utf8');
  const half = Math.floor(arabicBuf.length / 2);
  const b1 = Array.from(arabicBuf.subarray(0, half));
  const b2 = Array.from(arabicBuf.subarray(half));
  const arabicCmd = `node -e "process.stdout.write(Buffer.from(${JSON.stringify(b1)})); setTimeout(() => { process.stdout.write(Buffer.from(${JSON.stringify(b2)})); }, 20);"`;
  const arabicRes = await runner.probeCommand(arabicTc, arabicCmd, { outputFraming: 'exact' });
  assert.equal(arabicRes.outcome, 'passed');
  assert.equal(arabicRes.extractedPayload, arabicStr);
  assert.ok(!arabicRes.extractedPayload?.includes('\uFFFD'));

  // 4. Mixed multilingual string: "Hello € 世界 مرحبا 😀!" split across multiple writes
  const mixedStr = 'Hello € 世界 مرحبا 😀!';
  const mixedTc: TestCase = { ...SAMPLE_TC, id: 'mixed-split', payload: mixedStr };
  const mixedBuf = Buffer.from(mixedStr, 'utf8');
  // Split into 3-byte chunks to stress test boundary reconstruction
  const chunk1 = Array.from(mixedBuf.subarray(0, 7));
  const chunk2 = Array.from(mixedBuf.subarray(7, 16));
  const chunk3 = Array.from(mixedBuf.subarray(16));
  const mixedCmd = `node -e "process.stdout.write(Buffer.from(${JSON.stringify(chunk1)})); setTimeout(() => { process.stdout.write(Buffer.from(${JSON.stringify(chunk2)})); setTimeout(() => { process.stdout.write(Buffer.from(${JSON.stringify(chunk3)})); }, 15); }, 15);"`;
  const mixedRes = await runner.probeCommand(mixedTc, mixedCmd, { outputFraming: 'exact' });
  assert.equal(mixedRes.outcome, 'passed');
  assert.equal(mixedRes.extractedPayload, mixedStr);
  assert.ok(!mixedRes.extractedPayload?.includes('\uFFFD'));
});

test('probeCommand - bounds and safely handles large stderr output without memory exhaustion', async () => {
  const runner = new TestRunner();
  // Process outputs 10KB of stderr, but limit is 500 bytes
  const cmd = `node -e "for (let i = 0; i < 100; i++) process.stderr.write('x'.repeat(100));"`;
  const res = await runner.probeCommand(SAMPLE_TC, cmd, { maxStderrBytes: 500 });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.transportOk, false);
  assert.ok(res.error?.includes('stderr exceeded maximum permitted size of 500 bytes'));
});

