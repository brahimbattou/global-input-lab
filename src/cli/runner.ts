/**
 * GlobalInputLab - Test Runner
 * Executes active data integrity tests against HTTP endpoints or shell processes.
 * Enforces strict response verification, separating transport status from data integrity.
 * (c) 2026 Brahim Battou. MIT License.
 */

import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import { RoundTripVerifier } from '../core/round-trip.js';
import { TestSuiteManager } from '../core/test-suites.js';
import { SingleTestResult, TestCase, TestOutcome, TestRunOptions, TestRunReport } from '../types.js';

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
        } else if (options.targetCommand) {
          const res = await this.probeCommand(tc, options.targetCommand, options);
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
   * Probes an HTTP endpoint, separating transport status from actual data preservation
   */
  public async probeHttpEndpoint(
    tc: TestCase,
    targetUrl: string,
    options: TestRunOptions
  ): Promise<SingleTestResult> {
    const start = Date.now();

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
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => (responseBody += chunk));
          res.on('end', () => {
            const durationMs = Date.now() - start;
            const statusCode = res.statusCode || 0;
            const transportOk = statusCode >= 200 && statusCode < 300;

            if (!transportOk) {
              return resolve({
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
                  return resolve({
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
                return resolve({
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
              return resolve({
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

            resolve({
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
        resolve({
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
        resolve({
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
   * Avoids shell interpolation vulnerabilities.
   */
  public async probeCommand(
    tc: TestCase,
    commandStr: string,
    options: TestRunOptions
  ): Promise<SingleTestResult> {
    const start = Date.now();

    // Parse command into binary and arguments safely without running through a shell
    const parts = commandStr.trim().split(/\s+/);
    const binary = parts[0];
    const baseArgs = parts.slice(1);
    const fullArgs = [...baseArgs, tc.payload];

    return new Promise<SingleTestResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(binary, fullArgs, {
        shell: false, // CRITICAL: shell execution disabled to prevent command injection
        timeout: options.timeoutMs || 5000,
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString('utf8');
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString('utf8');
      });

      child.on('error', (err) => {
        resolve({
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
        if (signal === 'SIGTERM' && timedOut) {
          return resolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs,
            error: `Process timed out after ${options.timeoutMs || 5000}ms`,
          });
        }

        const transportOk = code === 0;
        if (!transportOk) {
          return resolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs,
            error: `Process exited with code ${code}: ${stderr.trim()}`,
          });
        }

        const trimmedOut = stdout.trim();
        const rt = this.roundTripVerifier.verify(tc.payload, trimmedOut);
        const passed = rt.identical;

        resolve({
          testCase: tc,
          outcome: passed ? 'passed' : 'failed',
          passed,
          transportOk: true,
          dataPreserved: passed,
          durationMs,
          receivedPayload: stdout,
          extractedPayload: trimmedOut,
          roundTrip: rt,
          error: passed ? undefined : (rt.diffDescription || 'Process output did not match input payload.'),
        });
      });
    });
  }
}
