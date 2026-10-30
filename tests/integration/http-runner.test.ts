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
