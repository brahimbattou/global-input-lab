/**
 * GlobalInputLab - Test Runner
 * Executes active data integrity tests against HTTP endpoints or shell processes.
 * Enforces strict response verification, separating transport status from data integrity.
 * Hardened with resource boundaries, exact stdout framing, and timeout management.
 * (c) 2026 Brahim Battou. MIT License.
 */

import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import { RoundTripVerifier } from '../core/round-trip.js';
import { TestSuiteManager } from '../core/test-suites.js';
import { OutputFramingPolicy, SingleTestResult, TestCase, TestOutcome, TestRunOptions, TestRunReport } from '../types.js';

/**
 * Safely parses a command line string into an executable and argument array,
 * respecting double and single quotes without invoking a shell.
 */
export function parseCommandLine(cmd: string): { executable: string; args: string[] } {
  const tokens: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }

  const executable = tokens[0] || '';
  const args = tokens.slice(1);
  return { executable, args };
}

export class TestRunner {
  private suiteManager: TestSuiteManager;
  private roundTripVerifier: RoundTripVerifier;

  constructor() {
    this.suiteManager = new TestSuiteManager();
    this.roundTripVerifier = new RoundTripVerifier();
  }

  /**
   * Helper to extract a nested property from a parsed JSON object using dot notation
   */
  public extractJsonPath(obj: any, path: string): any {
    if (!path) return obj;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Runs the test suite against an HTTP endpoint, shell command, or local serialization engine
   */
  public async run(options: TestRunOptions = {}): Promise<TestRunReport> {
    const startTime = Date.now();
    let testCases: TestCase[] = [];

    if (options.categories && options.categories.length > 0) {
      for (const cat of options.categories) {
        testCases.push(...this.suiteManager.getTestCases(cat));
      }
    } else {
      testCases = this.suiteManager.getTestCases();
    }

    const results: SingleTestResult[] = [];
    let passed = 0;
    let failed = 0;
    let inconclusive = 0;

    for (const tc of testCases) {
      const tcStart = Date.now();
      try {
        if (options.targetUrl) {
          const res = await this.probeHttpEndpoint(tc, options.targetUrl, options);
          results.push(res);
          if (res.outcome === 'passed') passed++;
          else if (res.outcome === 'failed') failed++;
          else inconclusive++;
        } else if (options.targetCommand || options.commandConfig) {
          const res = await this.probeCommand(tc, options.targetCommand || '', options);
          results.push(res);
          if (res.outcome === 'passed') passed++;
          else if (res.outcome === 'failed') failed++;
          else inconclusive++;
        } else {
          // Local serialization & encoding self-test mode
          const jsonRes = this.roundTripVerifier.verifyJsonSerialization(tc.payload);
          const uriRes = this.roundTripVerifier.verifyUriEncoding(tc.payload);
          const isOk = jsonRes.identical && uriRes.identical;

          const durationMs = Date.now() - tcStart;
          const outcome: TestOutcome = isOk ? 'passed' : 'failed';

          results.push({
            testCase: tc,
            outcome,
            passed: isOk,
            transportOk: true,
            dataPreserved: isOk,
            durationMs,
            roundTrip: jsonRes,
            error: !isOk ? (jsonRes.diffDescription || uriRes.diffDescription) : undefined,
          });

          if (isOk) passed++;
          else failed++;
        }
      } catch (err) {
        const durationMs = Date.now() - tcStart;
        results.push({
          testCase: tc,
          outcome: 'failed',
          passed: false,
          transportOk: false,
          dataPreserved: false,
          durationMs,
          error: (err as Error).message,
        });
        failed++;
      }
    }

    const totalDuration = Date.now() - startTime;
    let summary = '';
    if (failed === 0 && inconclusive === 0) {
      summary = `All ${passed} tests passed with verified data integrity.`;
    } else if (failed === 0 && inconclusive > 0) {
      summary = `${passed} passed, ${inconclusive} inconclusive (responses did not echo submitted data).`;
    } else {
      summary = `${failed} failed, ${passed} passed, ${inconclusive} inconclusive out of ${testCases.length} tests.`;
    }

    return {
      total: testCases.length,
      passed,
      failed,
      inconclusive,
      durationMs: totalDuration,
      results,
      summary,
    };
  }

  /**
   * Probes an HTTP endpoint, separating transport status from actual data preservation.
   * Enforces configurable maximum response body size to avoid unbounded memory accumulation.
   */
  public async probeHttpEndpoint(
    tc: TestCase,
    targetUrl: string,
    options: TestRunOptions
  ): Promise<SingleTestResult> {
    const start = Date.now();
    const maxBytes = options.maxResponseBytes || 10 * 1024 * 1024; // 10MB default

    let url: URL;
    try {
      url = new URL(targetUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return {
          testCase: tc,
          outcome: 'failed',
          passed: false,
          transportOk: false,
          dataPreserved: false,
          durationMs: 0,
          error: `Invalid URL protocol '${url.protocol}'. Only http: and https: are permitted.`,
        };
      }
    } catch (e) {
      return {
        testCase: tc,
        outcome: 'failed',
        passed: false,
        transportOk: false,
        dataPreserved: false,
        durationMs: 0,
        error: `Malformed target URL: ${(e as Error).message}`,
      };
    }

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const bodyTemplate = options.bodyTemplate || '{"input": "{PAYLOAD}"}';
    const escapedPayload = JSON.stringify(tc.payload).slice(1, -1);
    const postData = bodyTemplate.replace('{PAYLOAD}', escapedPayload);

    return new Promise<SingleTestResult>((resolve) => {
      let isResolved = false;
      const safeResolve = (res: SingleTestResult) => {
        if (!isResolved) {
          isResolved = true;
          resolve(res);
        }
      };

      const req = client.request(
        url,
        {
          method: options.method || 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(postData, 'utf8'),
            'User-Agent': 'GlobalInputLab/0.1.0',
            ...(options.headers || {}),
          },
          timeout: options.timeoutMs || 5000,
        },
        (res: http.IncomingMessage) => {
          let responseBody = '';
          let receivedBytes = 0;
          res.setEncoding('utf8');

          res.on('data', (chunk: string) => {
            receivedBytes += Buffer.byteLength(chunk, 'utf8');
            if (receivedBytes > maxBytes) {
              req.destroy();
              return safeResolve({
                testCase: tc,
                outcome: 'failed',
                passed: false,
                transportOk: false,
                dataPreserved: false,
                statusCode: res.statusCode || 0,
                durationMs: Date.now() - start,
                error: `HTTP response exceeded maximum permitted size of ${maxBytes} bytes.`,
              });
            }
            responseBody += chunk;
          });

          res.on('end', () => {
            const durationMs = Date.now() - start;
            const statusCode = res.statusCode || 0;
            const transportOk = statusCode >= 200 && statusCode < 300;

            if (!transportOk) {
              return safeResolve({
                testCase: tc,
                outcome: 'failed',
                passed: false,
                transportOk: false,
                dataPreserved: false,
                statusCode,
                durationMs,
                receivedPayload: responseBody,
                error: `HTTP transport failure with status code ${statusCode}`,
              });
            }

            // Transport is OK (2xx). Now rigorously verify Data Integrity:
            let extractedPayload: string | undefined;

            if (options.jsonPath) {
              try {
                const parsed = JSON.parse(responseBody);
                const extracted = this.extractJsonPath(parsed, options.jsonPath);
                if (extracted === undefined) {
                  return safeResolve({
                    testCase: tc,
                    outcome: 'failed',
                    passed: false,
                    transportOk: true,
                    dataPreserved: false,
                    statusCode,
                    durationMs,
                    receivedPayload: responseBody,
                    error: `Configured jsonPath '${options.jsonPath}' not found in JSON response`,
                  });
                }
                extractedPayload = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
              } catch (e) {
                return safeResolve({
                  testCase: tc,
                  outcome: 'failed',
                  passed: false,
                  transportOk: true,
                  dataPreserved: false,
                  statusCode,
                  durationMs,
                  receivedPayload: responseBody,
                  error: `Response was not valid JSON to evaluate jsonPath '${options.jsonPath}': ${(e as Error).message}`,
                });
              }
            } else {
              // Attempt smart auto-extraction
              try {
                const parsed = JSON.parse(responseBody);
                if (typeof parsed === 'string') {
                  extractedPayload = parsed;
                } else if (parsed && typeof parsed.input === 'string') {
                  extractedPayload = parsed.input;
                } else if (parsed && typeof parsed.echo === 'string') {
                  extractedPayload = parsed.echo;
                } else if (parsed && typeof parsed.data === 'string') {
                  extractedPayload = parsed.data;
                }
              } catch {
                // Raw text response
                if (responseBody.trim().length > 0) {
                  extractedPayload = responseBody;
                }
              }
            }

            // If no echo payload could be extracted (e.g. HTTP 204 No Content, or standard acknowledgment like {"status":"ok"})
            if (extractedPayload === undefined) {
              return safeResolve({
                testCase: tc,
                outcome: 'inconclusive',
                passed: false,
                transportOk: true,
                dataPreserved: null,
                statusCode,
                durationMs,
                receivedPayload: responseBody,
                inconclusiveReason: 'Server returned HTTP 2xx, but response contained no echoable data to verify byte-preservation.',
              });
            }

            // Verify Round Trip between expected payload and extracted payload
            const rt = this.roundTripVerifier.verify(tc.payload, extractedPayload);
            const passed = rt.identical;
            const outcome: TestOutcome = passed ? 'passed' : 'failed';

            safeResolve({
              testCase: tc,
              outcome,
              passed,
              transportOk: true,
              dataPreserved: passed,
              statusCode,
              durationMs,
              receivedPayload: responseBody,
              extractedPayload,
              roundTrip: rt,
              error: passed ? undefined : (rt.diffDescription || 'Extracted response payload did not match submitted vector.'),
            });
          });
        }
      );

      req.on('error', (err: Error) => {
        safeResolve({
          testCase: tc,
          outcome: 'failed',
          passed: false,
          transportOk: false,
          dataPreserved: false,
          durationMs: Date.now() - start,
          error: `Network connection failed: ${err.message}`,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        safeResolve({
          testCase: tc,
          outcome: 'failed',
          passed: false,
          transportOk: false,
          dataPreserved: false,
          durationMs: Date.now() - start,
          error: `Request timed out after ${options.timeoutMs || 5000}ms`,
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Probes a local executable safely using spawn with explicit argument array and shell disabled.
   * Avoids shell interpolation vulnerabilities, applies explicit output framing (exact, strip-trailing-newline, or trim),
   * sets timedOut flag properly, and bounds stdout accumulation.
   */
  public async probeCommand(
    tc: TestCase,
    commandStr: string,
    options: TestRunOptions
  ): Promise<SingleTestResult> {
    const start = Date.now();
    const maxBytes = options.maxResponseBytes || 10 * 1024 * 1024;
    const framing: OutputFramingPolicy = options.outputFraming || 'exact';
    const timeoutMs = options.timeoutMs || 5000;

    let binary: string;
    let fullArgs: string[];

    if (options.commandConfig) {
      binary = options.commandConfig.executable;
      fullArgs = [...(options.commandConfig.args || []), tc.payload];
    } else {
      const parsed = parseCommandLine(commandStr);
      binary = parsed.executable;
      fullArgs = [...parsed.args, tc.payload];
    }

    if (!binary) {
      return {
        testCase: tc,
        outcome: 'failed',
        passed: false,
        transportOk: false,
        dataPreserved: false,
        durationMs: 0,
        error: 'No executable specified for command probe.',
      };
    }

    return new Promise<SingleTestResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;
      let timedOut = false;
      let isResolved = false;

      const safeResolve = (res: SingleTestResult) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          resolve(res);
        }
      };

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGTERM');
          setTimeout(() => {
            try { child.kill('SIGKILL'); } catch {}
          }, 500);
        } catch {}
      }, timeoutMs);

      const child = spawn(binary, fullArgs, {
        shell: false, // CRITICAL: shell execution disabled to prevent command injection
      });

      child.stdout.on('data', (data: Buffer) => {
        stdoutBytes += data.length;
        if (stdoutBytes > maxBytes) {
          child.kill('SIGKILL');
          return safeResolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs: Date.now() - start,
            error: `Process output exceeded maximum permitted size of ${maxBytes} bytes.`,
          });
        }
        stdout += data.toString('utf8');
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString('utf8');
      });

      child.on('error', (err) => {
        safeResolve({
          testCase: tc,
          outcome: 'failed',
          passed: false,
          transportOk: false,
          dataPreserved: false,
          durationMs: Date.now() - start,
          error: `Failed to execute process '${binary}': ${err.message}`,
        });
      });

      child.on('close', (code, signal) => {
        const durationMs = Date.now() - start;

        if (timedOut || signal === 'SIGTERM') {
          return safeResolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs,
            error: `Process timed out after ${timeoutMs}ms`,
          });
        }

        const transportOk = code === 0;
        if (!transportOk) {
          return safeResolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs,
            error: `Process exited with code ${code}: ${stderr.trim()}`,
          });
        }

        // Apply explicit output framing policy
        let extractedPayload: string;
        if (framing === 'exact') {
          // Default: exact preservation - NEVER silently trim whitespace!
          extractedPayload = stdout;
        } else if (framing === 'strip-trailing-newline') {
          // Strip only a single trailing newline if present, preserving leading whitespace
          extractedPayload = stdout.replace(/\r?\n$/, '');
        } else {
          // Explicit 'trim' opted in
          extractedPayload = stdout.trim();
        }

        const rt = this.roundTripVerifier.verify(tc.payload, extractedPayload);
        const passed = rt.identical;

        safeResolve({
          testCase: tc,
          outcome: passed ? 'passed' : 'failed',
          passed,
          transportOk: true,
          dataPreserved: passed,
          durationMs,
          receivedPayload: stdout,
          extractedPayload,
          roundTrip: rt,
          error: passed ? undefined : (rt.diffDescription || 'Process output did not match input payload.'),
        });
      });
    });
  }
}
