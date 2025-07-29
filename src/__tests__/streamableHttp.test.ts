import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Simple integration test for the HTTP server startup function

describe('startHttpServer', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should export startHttpServer function', async () => {
    const { startHttpServer } = await import('../streamableHttp.js');
    expect(typeof startHttpServer).toBe('function');
  });

  it('should be an async function', async () => {
    const { startHttpServer } = await import('../streamableHttp.js');
    expect(startHttpServer.constructor.name).toBe('AsyncFunction');
  });

  it('should accept optional port parameter', async () => {
    // Test that the function signature accepts the port parameter
    // This is verified by TypeScript compilation, but we can check the function length
    const { startHttpServer } = await import('../streamableHttp.js');
    // The function should accept 0 or 1 parameters (port is optional)
    expect(startHttpServer.length).toBeLessThanOrEqual(1);
  });
});
