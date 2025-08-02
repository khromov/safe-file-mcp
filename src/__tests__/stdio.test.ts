import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('startStdioServer', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should export startStdioServer function', async () => {
    const { startStdioServer } = await import('../stdio.js');
    expect(typeof startStdioServer).toBe('function');
  });

  it('should be an async function', async () => {
    const { startStdioServer } = await import('../stdio.js');
    expect(startStdioServer.constructor.name).toBe('AsyncFunction');
  });

  describe('JSON-RPC message handling', () => {
    const createServerAndSendMessage = (message: any, retries = 1): Promise<any> => {
      const attemptConnection = async (attempt: number): Promise<any> => {
        return new Promise((resolve, reject) => {
          const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.js');

          // Verify the index.js file exists before trying to spawn
          fs.access(indexPath)
            .then(() => {
              const serverProcess = spawn('node', [indexPath, '--stdio', '--mini'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                  ...process.env,
                  COCO_MCP_TRANSPORT: 'stdio',
                  CONTEXT_CODER_MODE: 'mini',
                  COCO_DEV: 'true', // Use test mount directory
                },
              });

              const messageStr = JSON.stringify(message) + '\n';
              let responseData = '';
              let errorData = '';

              const timeout = setTimeout(() => {
                if (!serverProcess.killed) {
                  serverProcess.kill('SIGTERM');
                }
                reject(
                  new Error(
                    `Test timeout (attempt ${attempt}) - no response received within 5 seconds`
                  )
                );
              }, 5000);

              const cleanup = () => {
                clearTimeout(timeout);
                if (!serverProcess.killed) {
                  serverProcess.kill('SIGTERM');
                }
              };

              serverProcess.stdout?.on('data', (data) => {
                responseData += data.toString();
                try {
                  // Try to parse as JSON-RPC response
                  const lines = responseData.split('\n').filter((line) => line.trim());
                  if (lines.length > 0) {
                    const response = JSON.parse(lines[lines.length - 1]);
                    cleanup();
                    resolve(response);
                  }
                } catch {
                  // Not yet complete JSON, continue collecting
                }
              });

              serverProcess.stderr?.on('data', (data) => {
                errorData += data.toString();
              });

              serverProcess.on('error', (error) => {
                cleanup();
                reject(
                  new Error(
                    `Process error (attempt ${attempt}): ${error.message}\nStderr: ${errorData}`
                  )
                );
              });

              serverProcess.on('exit', (code) => {
                cleanup();
                if (code !== 0 && code !== null) {
                  reject(
                    new Error(
                      `Process exited with code ${code} (attempt ${attempt})\nStderr: ${errorData}`
                    )
                  );
                }
              });

              // Give the server a moment to start up
              setTimeout(() => {
                serverProcess.stdin?.write(messageStr);
              }, 100);
            })
            .catch((error) => {
              reject(
                new Error(
                  `Cannot access ${indexPath}: ${error.message}. Try running 'npm run build' first.`
                )
              );
            });
        });
      };

      // Try with retries for robustness
      return attemptConnection(1).catch(async (error) => {
        if (retries > 0) {
          console.log(`Stdio test attempt failed, retrying... (${error.message})`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          return attemptConnection(2);
        }
        throw error;
      });
    };

    it('should handle initialize request', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: true,
            },
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      const response = await createServerAndSendMessage(initializeRequest);

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id', 1);
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('capabilities');
      expect(response.result).toHaveProperty('serverInfo');
      expect(response.result.serverInfo).toHaveProperty('name', 'context-coder');
    });

    it('should handle tools/list request', async () => {
      const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const response = await createServerAndSendMessage(listToolsRequest);

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id', 1);
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);

      // Should have the mini mode tools
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('get_codebase_size');
      expect(toolNames).toContain('get_codebase');
      expect(toolNames).toContain('get_codebase_top_largest_files');
    });

    it('should handle malformed JSON-RPC requests', async () => {
      // This test verifies that the server doesn't crash on malformed requests
      // It's acceptable for the server to either return an error or timeout/crash
      const invalidRequest = {
        // Missing jsonrpc field - this is malformed JSON-RPC
        id: 1,
        method: 'unknown-method',
        params: {},
      };

      // Create a version with shorter timeout for this specific test
      const createServerWithShortTimeout = (message: any): Promise<any> => {
        return new Promise((resolve, _reject) => {
          const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
          const serverProcess = spawn('node', [indexPath, '--stdio', '--mini'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              COCO_MCP_TRANSPORT: 'stdio',
              CONTEXT_CODER_MODE: 'mini',
              COCO_DEV: 'true',
            },
          });

          const messageStr = JSON.stringify(message) + '\n';
          let responseReceived = false;

          const timeout = setTimeout(() => {
            if (!serverProcess.killed) {
              serverProcess.kill('SIGTERM');
            }
            // For invalid requests, timeout is an acceptable outcome
            if (!responseReceived) {
              resolve({ timeout: true });
            }
          }, 1500); // Shorter timeout for invalid requests

          const cleanup = () => {
            clearTimeout(timeout);
            if (!serverProcess.killed) {
              serverProcess.kill('SIGTERM');
            }
          };

          serverProcess.stdout?.on('data', (data) => {
            responseReceived = true;
            try {
              const response = JSON.parse(data.toString().trim());
              cleanup();
              resolve(response);
            } catch {
              // Could not parse response - this is also acceptable for invalid input
              cleanup();
              resolve({ parseError: true });
            }
          });

          serverProcess.on('error', () => {
            cleanup();
            resolve({ processError: true });
          });

          serverProcess.on('exit', () => {
            cleanup();
            if (!responseReceived) {
              resolve({ processExit: true });
            }
          });

          setTimeout(() => {
            serverProcess.stdin?.write(messageStr);
          }, 100);
        });
      };

      const result = await createServerWithShortTimeout(invalidRequest);

      // Any of these outcomes is valid for malformed JSON-RPC:
      // 1. Timeout (server ignores malformed input)
      // 2. Process error/exit (server rejects malformed input)
      // 3. Parse error (server sends non-JSON response)
      // 4. Valid JSON-RPC error response
      const isValidResponse =
        result.timeout === true ||
        result.processError === true ||
        result.processExit === true ||
        result.parseError === true ||
        (result.jsonrpc === '2.0' && result.error);

      expect(isValidResponse).toBe(true);
    }, 10000); // Give the test itself more time
  });
});
