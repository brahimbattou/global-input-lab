import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { TestRunner } from '../../src/cli/runner.js';
import { TestCase } from '../../src/types.js';

const dummyTestCase: TestCase = {
  id: 'test_accent_01',
  category: 'names',
  name: 'European Accented Name',
  description: 'José-María',
  payload: 'José-María',
  expectedBehavior: 'Must preserve accents',
  tags: ['accent'],
  riskLevel: 'warning',
};

// Helper to launch an ephemeral test HTTP server
function createMockServer(handler: http.RequestListener): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

test('HTTP Runner - passes when server echoes identical UTF-8 payload', async () => {
  const { server, url } = await createMockServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parsed = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ echo: parsed.input }));
    });
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'passed');
    assert.equal(result.passed, true);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, true);
    assert.equal(result.statusCode, 200);
    assert.equal(result.extractedPayload, dummyTestCase.payload);
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails when server returns HTTP 200 but mangles/corrupts payload', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    // Mangled response: accents stripped
    res.end(JSON.stringify({ echo: 'Jose-Maria' }));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.transportOk, true); // Transport was 200
    assert.equal(result.dataPreserved, false); // But data was corrupted
    assert.ok(result.error?.includes('Mismatch at character index'));
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails when configured jsonPath is missing in response', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result: { wrongKey: 'something' } }));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {
      jsonPath: 'result.user.name',
    });

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.ok(result.error?.includes("jsonPath 'result.user.name' not found"));
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails when response is invalid JSON with jsonPath option', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Not a json object');
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {
      jsonPath: 'data.content',
    });

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.ok(result.error?.includes('not valid JSON'));
  } finally {
    server.close();
  }
});

test('HTTP Runner - marks response INCONCLUSIVE when HTTP 200/204 returns no echoable data', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(204); // No content
    res.end();
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'inconclusive');
    assert.equal(result.passed, false);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, null);
    assert.ok(result.inconclusiveReason?.includes('no echoable data'));
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails on HTTP 4xx client errors', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Request' }));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.transportOk, false);
    assert.equal(result.statusCode, 400);
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails on HTTP 5xx server errors', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.transportOk, false);
    assert.equal(result.statusCode, 500);
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails when request times out', async () => {
  const { server, url } = await createMockServer((req, res) => {
    // Deliberately do not answer to trigger timeout
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {
      timeoutMs: 150, // Short timeout for test
    });

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.ok(result.error?.includes('timed out'));
  } finally {
    server.close();
  }
});

test('HTTP Runner - fails gracefully on network connection failure', async () => {
  const runner = new TestRunner();
  // Port 59999 where nothing is listening
  const result = await runner.probeHttpEndpoint(dummyTestCase, 'http://127.0.0.1:59999', {
    timeoutMs: 500,
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.passed, false);
  assert.ok(result.error?.includes('ECONNREFUSED') || result.error?.includes('connection failed'));
});

test('HTTP Runner - fails safely when response exceeds maxResponseBytes', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Write a payload larger than 100 bytes
    res.write('{"data":"' + 'A'.repeat(500) + '"}');
    res.end();
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {
      maxResponseBytes: 100, // 100 byte limit
    });

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.ok(result.error?.includes('exceeded maximum permitted size'));
  } finally {
    server.close();
  }
});

const ufffdTestCase: TestCase = {
  id: 'test_ufffd_01',
  category: 'symbols' as any,
  name: 'Unicode Replacement Character',
  description: 'Payload is U+FFFD',
  payload: '\uFFFD',
  expectedBehavior: 'Must preserve U+FFFD as valid UTF-8 (EF BF BD)',
  tags: ['replacement', 'boundary'],
  riskLevel: 'warning',
};

// Regression A: Invalid sequence: Expected U+FFFD, response byte 0x80 -> FAILED
test('HTTP Runner - rejects U+FFFD payload when response is invalid raw byte 0x80 (reproduction case)', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(Buffer.from([0x80])); // Invalid single UTF-8 byte
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(ufffdTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.dataPreserved, false);
    assert.ok(result.error?.includes('Malformed or truncated UTF-8') || result.error?.includes('Byte mismatch'));
  } finally {
    server.close();
  }
});

// Regression B: Valid U+FFFD: Response bytes EF BF BD -> PASSED
test('HTTP Runner - accepts valid UTF-8 encoding of U+FFFD (0xEF 0xBF 0xBD)', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(Buffer.from([0xEF, 0xBF, 0xBD])); // Valid 3-byte UTF-8 encoding of U+FFFD
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(ufffdTestCase, url, {});

    assert.equal(result.outcome, 'passed');
    assert.equal(result.passed, true);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, true);
  } finally {
    server.close();
  }
});

// Regression C: Invalid continuation byte -> FAILED
test('HTTP Runner - rejects response with invalid continuation byte in multibyte sequence', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    // 0xC3 starts a 2-byte sequence, but 0x28 is ASCII '(' instead of 0x80..0xBF
    res.end(Buffer.from([0xC3, 0x28]));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.dataPreserved, false);
    assert.ok(result.error?.includes('Malformed or truncated UTF-8'));
  } finally {
    server.close();
  }
});

// Regression D: Truncated multibyte sequence -> FAILED
test('HTTP Runner - rejects response with truncated multibyte sequence', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    // 0xE2 0x82 is Euro symbol missing its 3rd byte (0xAC)
    res.end(Buffer.from([0xE2, 0x82]));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.dataPreserved, false);
    assert.ok(result.error?.includes('Malformed or truncated UTF-8'));
  } finally {
    server.close();
  }
});

// Regression E: Multibyte UTF-8 sequence split across response chunks -> PASSED
test('HTTP Runner - preserves multibyte UTF-8 sequence split across response stream chunks', async () => {
  const euroTestCase: TestCase = {
    id: 'test_euro_01',
    category: 'text_multilingual',
    name: 'Euro Currency Symbol',
    description: 'Euro symbol € (0xE2 0x82 0xAC)',
    payload: '€',
    expectedBehavior: 'Must preserve € split across chunks',
    tags: ['currency', 'stream'],
    riskLevel: 'info',
  };

  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    // Split 3-byte Euro character: 2 bytes in chunk 1, 1 byte in chunk 2
    res.write(Buffer.from([0xE2, 0x82]));
    setTimeout(() => {
      res.write(Buffer.from([0xAC]));
      res.end();
    }, 20);
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(euroTestCase, url, {});

    assert.equal(result.outcome, 'passed');
    assert.equal(result.passed, true);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, true);
    assert.equal(result.extractedPayload, '€');
  } finally {
    server.close();
  }
});

// Regression F: JSON response with valid UTF-8 and an extracted echo payload -> PASSED
test('HTTP Runner - accepts JSON response with valid UTF-8 and extracted echo payload', async () => {
  const arabicEmojiTestCase: TestCase = {
    id: 'test_arabic_emoji_01',
    category: 'text_multilingual',
    name: 'Arabic and Emoji Text',
    description: 'مرحبا 🚀',
    payload: 'مرحبا 🚀',
    expectedBehavior: 'Must preserve Arabic and rocket emoji',
    tags: ['arabic', 'emoji'],
    riskLevel: 'info',
  };

  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ echo: 'مرحبا 🚀' }));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(arabicEmojiTestCase, url, {});

    assert.equal(result.outcome, 'passed');
    assert.equal(result.passed, true);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, true);
    assert.equal(result.extractedPayload, 'مرحبا 🚀');
  } finally {
    server.close();
  }
});

// Regression G: JSON response containing malformed UTF-8 -> FAILED
test('HTTP Runner - rejects JSON response containing malformed UTF-8 bytes', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    // JSON envelope containing invalid byte 0x80 inside string
    const malformedJson = Buffer.concat([
      Buffer.from('{"echo": "bad-'),
      Buffer.from([0x80]),
      Buffer.from('"}'),
    ]);
    res.end(malformedJson);
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.dataPreserved, false);
    assert.ok(result.error?.includes('Malformed or truncated UTF-8'));
  } finally {
    server.close();
  }
});

// Regression H: A normal HTTP 200 acknowledgement without echo data -> INCONCLUSIVE
test('HTTP Runner - marks normal HTTP 200 acknowledgement without echo data as INCONCLUSIVE', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Payload received successfully' }));
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'inconclusive');
    assert.equal(result.passed, false);
    assert.equal(result.transportOk, true);
    assert.equal(result.dataPreserved, null);
    assert.ok(result.inconclusiveReason?.includes('contained no echoable data'));
  } finally {
    server.close();
  }
});

// Regression I: Unsupported charset in Content-Type header -> FAILED
test('HTTP Runner - rejects response specifying unsupported charset (e.g. ISO-8859-1)', async () => {
  const { server, url } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=iso-8859-1' });
    res.end('Some response');
  });

  try {
    const runner = new TestRunner();
    const result = await runner.probeHttpEndpoint(dummyTestCase, url, {});

    assert.equal(result.outcome, 'failed');
    assert.equal(result.passed, false);
    assert.equal(result.dataPreserved, false);
    assert.ok(result.error?.includes('Unsupported response charset'));
  } finally {
    server.close();
  }
});

