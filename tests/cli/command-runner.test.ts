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

  // 3. Arabic مرحبا (0xD9 0x85 0xD8 0xB1 0xD8 | 0xAD 0xD8 0xA8 0xD8 0xA7) split mid-character across chunks
  const arabicStr = 'مرحبا';
  const arabicTc: TestCase = { ...SAMPLE_TC, id: 'arabic-split', payload: arabicStr };
  const arabicCmd = `node -e "process.stdout.write(Buffer.from('d985d8b1d8', 'hex')); setTimeout(() => { process.stdout.write(Buffer.from('add8a8d8a7', 'hex')); }, 20);"`;
  const arabicRes = await runner.probeCommand(arabicTc, arabicCmd, { outputFraming: 'exact' });
  assert.equal(arabicRes.outcome, 'passed');
  assert.equal(arabicRes.extractedPayload, arabicStr);
  assert.ok(!arabicRes.extractedPayload?.includes('\uFFFD'));

  // 4. Mixed multilingual string: "Hello € 世界 مرحبا 😀!" split across multiple writes
  const mixedStr = 'Hello € 世界 مرحبا 😀!';
  const mixedTc: TestCase = { ...SAMPLE_TC, id: 'mixed-split', payload: mixedStr };
  // Split at byte 7 (mid-€) and byte 16 to stress test boundary reconstruction
  const mixedCmd = `node -e "process.stdout.write(Buffer.from('48656c6c6f20e2', 'hex')); setTimeout(() => { process.stdout.write(Buffer.from('82ac20e4b896e7958c', 'hex')); setTimeout(() => { process.stdout.write(Buffer.from('20d985d8b1d8add8a8d8a720f09f988021', 'hex')); }, 15); }, 15);"`;
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
test('probeCommand - rejects U+FFFD payload when output is invalid byte 0x80 instead of 0xEF 0xBF 0xBD', async () => {
  const runner = new TestRunner();
  const tc: TestCase = { ...SAMPLE_TC, id: 'repl-char-test', payload: '\uFFFD' };
  // Subprocess outputs single invalid UTF-8 byte 0x80 instead of 3-byte sequence [0xEF, 0xBF, 0xBD]
  const cmd = `node -e "process.stdout.write(Buffer.from([0x80]));"`;
  const res = await runner.probeCommand(tc, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed', 'Invalid byte 0x80 must fail even though decoding yields replacement char');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
  assert.ok(res.error?.includes('Byte mismatch at offset 0'));
  assert.ok(res.error?.includes('expected 0xEF, received 0x80'));
});

test('probeCommand - accepts valid UTF-8 encoding of U+FFFD (0xEF 0xBF 0xBD)', async () => {
  const runner = new TestRunner();
  const tc: TestCase = { ...SAMPLE_TC, id: 'valid-repl-char', payload: '\uFFFD' };
  const cmd = `node -e "process.stdout.write(Buffer.from([0xEF, 0xBF, 0xBD]));"`;
  const res = await runner.probeCommand(tc, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'passed', 'Properly encoded U+FFFD must pass byte verification');
  assert.equal(res.passed, true);
  assert.equal(res.dataPreserved, true);
  assert.equal(res.extractedPayload, '\uFFFD');
});

test('probeCommand - detects invalid continuation bytes in multi-byte sequences', async () => {
  const runner = new TestRunner();
  const tc: TestCase = { ...SAMPLE_TC, id: 'invalid-continuation', payload: '€' }; // expected [0xE2, 0x82, 0xAC]
  const cmd = `node -e "process.stdout.write(Buffer.from([0xE2, 0x28, 0xAC]));"`; // 0x28 is invalid continuation byte
  const res = await runner.probeCommand(tc, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
  assert.ok(res.error?.includes('Byte mismatch at offset 1'));
  assert.ok(res.error?.includes('expected 0x82, received 0x28'));
});

test('probeCommand - detects truncated UTF-8 sequences', async () => {
  const runner = new TestRunner();
  const tc: TestCase = { ...SAMPLE_TC, id: 'truncated-seq', payload: '€' }; // expected [0xE2, 0x82, 0xAC] (3 bytes)
  const cmd = `node -e "process.stdout.write(Buffer.from([0xE2, 0x82]));"`; // missing 3rd byte
  const res = await runner.probeCommand(tc, cmd, { outputFraming: 'exact' });

  assert.equal(res.outcome, 'failed');
  assert.equal(res.passed, false);
  assert.equal(res.dataPreserved, false);
  assert.ok(res.error?.includes('Byte mismatch at offset 2'));
  assert.ok(res.error?.includes('expected 0xAC, received EOF'));
});

