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
import { StringDecoder } from 'string_decoder';
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
            'User-Agent': 'GlobalInputLab/0.2.0',
            ...(options.headers || {}),
          },
          timeout: options.timeoutMs || 5000,
        },
        (res: http.IncomingMessage) => {
          const bodyChunks: Buffer[] = [];
          let receivedBytes = 0;

          res.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
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
            bodyChunks.push(chunk);
          });

          res.on('end', () => {
            const fullRawBuffer = Buffer.concat(bodyChunks);
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
                receivedBytes: fullRawBuffer,
                error: `HTTP transport failure with status code ${statusCode}`,
              });
            }

            // 1. Explicitly check response charset in Content-Type header
            const contentType = res.headers['content-type'] || '';
            const charsetMatch = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)["']?/i);
            if (charsetMatch) {
              const charset = charsetMatch[1].toLowerCase();
              if (charset !== 'utf-8' && charset !== 'utf8') {
                return safeResolve({
                  testCase: tc,
                  outcome: 'failed',
                  passed: false,
                  transportOk: true,
                  dataPreserved: false,
                  statusCode,
                  durationMs,
                  receivedBytes: fullRawBuffer,
                  error: `Unsupported response charset '${charsetMatch[1]}'. Only UTF-8 is supported for data integrity verification.`,
                });
              }
            }

            // 2. Strict UTF-8 validation before ANY lossy string decoding
            let responseBody = '';
            if (fullRawBuffer.length > 0) {
              try {
                const strictDecoder = new TextDecoder('utf-8', { fatal: true });
                responseBody = strictDecoder.decode(fullRawBuffer);
              } catch (err) {
                return safeResolve({
                  testCase: tc,
                  outcome: 'failed',
                  passed: false,
                  transportOk: true,
                  dataPreserved: false,
                  statusCode,
                  durationMs,
                  receivedBytes: fullRawBuffer,
                  error: `Malformed or truncated UTF-8 in HTTP response: ${(err as Error).message}`,
                });
              }
            }

            // 3. Check for empty response (e.g. HTTP 204 or empty HTTP 200)
            if (fullRawBuffer.length === 0) {
              return safeResolve({
                testCase: tc,
                outcome: 'inconclusive',
                passed: false,
                transportOk: true,
                dataPreserved: null,
                statusCode,
                durationMs,
                receivedBytes: fullRawBuffer,
                inconclusiveReason: 'Server returned HTTP 2xx, but response contained no echoable data to verify byte-preservation.',
              });
            }

            // 4. Distinguish between JSON response vs Direct Raw-Text response
            let isJson = false;
            let parsedJson: unknown;

            if (options.jsonPath) {
              // Explicit jsonPath requested: response MUST be valid JSON
              isJson = true;
              try {
                parsedJson = JSON.parse(responseBody);
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
                  receivedBytes: fullRawBuffer,
                  error: `Response was not valid JSON to evaluate jsonPath '${options.jsonPath}': ${(e as Error).message}`,
                });
              }
            } else {
              // Check if Content-Type is JSON or payload is JSON object/array
              const isJsonContentType = contentType.toLowerCase().includes('application/json');
              const trimmed = responseBody.trim();
              if (isJsonContentType || (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                  parsedJson = JSON.parse(responseBody);
                  isJson = true;
                } catch (e) {
                  if (isJsonContentType) {
                    return safeResolve({
                      testCase: tc,
                      outcome: 'failed',
                      passed: false,
                      transportOk: true,
                      dataPreserved: false,
                      statusCode,
                      durationMs,
                      receivedPayload: responseBody,
                      receivedBytes: fullRawBuffer,
                      error: `Response declared Content-Type application/json but contained invalid JSON: ${(e as Error).message}`,
                    });
                  }
                  // Not valid JSON despite braces, treat as raw text
                  isJson = false;
                }
              }
            }

            // Case A: JSON Response
            if (isJson) {
              let extractedPayload: string | undefined;

              if (options.jsonPath) {
                const extracted = this.extractJsonPath(parsedJson, options.jsonPath);
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
                    receivedBytes: fullRawBuffer,
                    error: `Configured jsonPath '${options.jsonPath}' not found in JSON response`,
                  });
                }
                extractedPayload = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
              } else {
                if (typeof parsedJson === 'string') {
                  extractedPayload = parsedJson;
                } else if (parsedJson && typeof parsedJson === 'object') {
                  const obj = parsedJson as Record<string, unknown>;
                  if (typeof obj.input === 'string') {
                    extractedPayload = obj.input;
                  } else if (typeof obj.echo === 'string') {
                    extractedPayload = obj.echo;
                  } else if (typeof obj.data === 'string') {
                    extractedPayload = obj.data;
                  } else if (typeof obj.payload === 'string') {
                    extractedPayload = obj.payload;
                  } else if (typeof obj.result === 'string') {
                    extractedPayload = obj.result;
                  }
                }
              }

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
                  receivedBytes: fullRawBuffer,
                  inconclusiveReason: 'Server returned HTTP 2xx JSON response, but response contained no echoable data to verify byte-preservation.',
                });
              }

              // Verify extracted string payload against submitted vector
              const rt = this.roundTripVerifier.verify(tc.payload, extractedPayload);
              const passed = rt.identical;
              const outcome: TestOutcome = passed ? 'passed' : 'failed';

              return safeResolve({
                testCase: tc,
                outcome,
                passed,
                transportOk: true,
                dataPreserved: passed,
                statusCode,
                durationMs,
                receivedPayload: responseBody,
                extractedPayload,
                receivedBytes: fullRawBuffer,
                extractedBytes: Buffer.from(extractedPayload, 'utf8'),
                roundTrip: rt,
                error: passed ? undefined : (rt.diffDescription || 'Extracted response payload did not match submitted vector.'),
              });
            }

            // Case B: Direct Raw-Text Response
            // Compare extracted raw response bytes against expected UTF-8 payload bytes
            let extractedRaw = fullRawBuffer;
            const framing = options.outputFraming || 'exact';
            if (framing === 'strip-trailing-newline') {
              if (extractedRaw.length >= 2 && extractedRaw[extractedRaw.length - 2] === 0x0D && extractedRaw[extractedRaw.length - 1] === 0x0A) {
                extractedRaw = extractedRaw.subarray(0, extractedRaw.length - 2);
              } else if (extractedRaw.length >= 1 && (extractedRaw[extractedRaw.length - 1] === 0x0A || extractedRaw[extractedRaw.length - 1] === 0x0D)) {
                extractedRaw = extractedRaw.subarray(0, extractedRaw.length - 1);
              }
            } else if (framing === 'trim') {
              let startIdx = 0;
              let endIdx = extractedRaw.length;
              while (startIdx < endIdx && [0x20, 0x09, 0x0A, 0x0D].includes(extractedRaw[startIdx])) {
                startIdx++;
              }
              while (endIdx > startIdx && [0x20, 0x09, 0x0A, 0x0D].includes(extractedRaw[endIdx - 1])) {
                endIdx--;
              }
              extractedRaw = extractedRaw.subarray(startIdx, endIdx);
            }

            if (extractedRaw.length === 0) {
              return safeResolve({
                testCase: tc,
                outcome: 'inconclusive',
                passed: false,
                transportOk: true,
                dataPreserved: null,
                statusCode,
                durationMs,
                receivedPayload: responseBody,
                receivedBytes: fullRawBuffer,
                inconclusiveReason: 'Server returned HTTP 2xx raw response, but body was empty.',
              });
            }

            const expectedRawBytes = Buffer.from(tc.payload, 'utf8');
            const rt = this.roundTripVerifier.verify(expectedRawBytes, extractedRaw);
            const passed = rt.identical;
            const outcome: TestOutcome = passed ? 'passed' : 'failed';

            return safeResolve({
              testCase: tc,
              outcome,
              passed,
              transportOk: true,
              dataPreserved: passed,
              statusCode,
              durationMs,
              receivedPayload: responseBody,
              extractedPayload: responseBody,
              receivedBytes: fullRawBuffer,
              extractedBytes: extractedRaw,
              roundTrip: rt,
              error: passed ? undefined : (rt.diffDescription || 'Extracted raw response bytes did not match expected UTF-8 payload bytes.'),
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

    const maxStderrBytes = options.maxStderrBytes || options.maxResponseBytes || 10 * 1024 * 1024;

    return new Promise<SingleTestResult>((resolve) => {
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      const stdoutDecoder = new StringDecoder('utf8');
      const stderrDecoder = new StringDecoder('utf8');
      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;
      let stderrBytes = 0;
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
        stdoutChunks.push(data);
        stdout += stdoutDecoder.write(data);
      });

      child.stderr.on('data', (data: Buffer) => {
        stderrBytes += data.length;
        if (stderrBytes > maxStderrBytes) {
          child.kill('SIGKILL');
          return safeResolve({
            testCase: tc,
            outcome: 'failed',
            passed: false,
            transportOk: false,
            dataPreserved: false,
            durationMs: Date.now() - start,
            error: `Process stderr exceeded maximum permitted size of ${maxStderrBytes} bytes.`,
          });
        }
        stderrChunks.push(data);
        stderr += stderrDecoder.write(data);
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
        stdout += stdoutDecoder.end();
        stderr += stderrDecoder.end();
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

        const rawStdoutBuffer = Buffer.concat(stdoutChunks);
        const expectedBuffer = Buffer.from(tc.payload, 'utf8');

        // Apply explicit output framing policy at the raw byte level
        let extractedBuffer: Buffer;
        if (framing === 'exact') {
          // Default: exact preservation - NEVER silently trim whitespace!
          extractedBuffer = rawStdoutBuffer;
        } else if (framing === 'strip-trailing-newline') {
          // Strip only a single trailing \r\n or \n if present, preserving leading whitespace
          if (rawStdoutBuffer.length >= 2 && rawStdoutBuffer[rawStdoutBuffer.length - 2] === 0x0d && rawStdoutBuffer[rawStdoutBuffer.length - 1] === 0x0a) {
            extractedBuffer = rawStdoutBuffer.subarray(0, rawStdoutBuffer.length - 2);
          } else if (rawStdoutBuffer.length >= 1 && rawStdoutBuffer[rawStdoutBuffer.length - 1] === 0x0a) {
            extractedBuffer = rawStdoutBuffer.subarray(0, rawStdoutBuffer.length - 1);
          } else {
            extractedBuffer = rawStdoutBuffer;
          }
        } else {
          // Explicit 'trim' opted in: strip leading and trailing ASCII whitespace
          let s = 0;
          while (s < rawStdoutBuffer.length && [0x20, 0x09, 0x0a, 0x0d].includes(rawStdoutBuffer[s])) {
            s++;
          }
          let e = rawStdoutBuffer.length;
          while (e > s && [0x20, 0x09, 0x0a, 0x0d].includes(rawStdoutBuffer[e - 1])) {
            e--;
          }
          extractedBuffer = rawStdoutBuffer.subarray(s, e);
        }

        // Direct raw byte comparison BEFORE string decoding
        const byteExactMatch = extractedBuffer.equals(expectedBuffer);

        // Decode string representations for payload extraction and display
        const receivedPayload = rawStdoutBuffer.toString('utf8');
        const extractedPayload = extractedBuffer.toString('utf8');

        // RoundTrip verification passing raw byte buffers directly to avoid re-encoding mask
        const rt = this.roundTripVerifier.verify(expectedBuffer, extractedBuffer);
        const passed = byteExactMatch && rt.identical;

        safeResolve({
          testCase: tc,
          outcome: passed ? 'passed' : 'failed',
          passed,
          transportOk: true,
          dataPreserved: passed,
          durationMs,
          receivedPayload,
          extractedPayload,
          receivedBytes: rawStdoutBuffer,
          extractedBytes: extractedBuffer,
          roundTrip: rt,
          error: passed ? undefined : (rt.diffDescription || 'Process output raw byte sequence did not match input payload.'),
        });
      });
    });
  }
}
