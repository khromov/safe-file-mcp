import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleExecuteCommand } from '../../handlers/execute_command.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleExecuteCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should execute successful command', async () => {
    const context = createTestContext(testDir);
    const result = await handleExecuteCommand({ 
      command: 'echo Hello World' 
    }, context);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('=== stdout ===');
    expect(result.content[0].text).toContain('Hello World');
    expect(result.content[0].text).toContain('=== exit code: 0 ===');
  });

  it('should handle command failure', async () => {
    const context = createTestContext(testDir);
    const result = await handleExecuteCommand({ 
      command: 'ls /nonexistent-directory-12345' 
    }, context);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('=== stderr ===');
    expect(result.content[0].text).not.toContain('=== exit code: 0 ===');
  });

  it('should execute command in the correct directory', async () => {
    // Create a test file in the directory
    await createTestFile(testDir, 'test.txt', 'test content');
    
    const context = createTestContext(testDir);
    const result = await handleExecuteCommand({ 
      command: 'ls' 
    }, context);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('test.txt');
  });

  it('should handle command timeout', async () => {
    const context = createTestContext(testDir);
    const result = await handleExecuteCommand({ 
      command: process.platform === 'win32' ? 'timeout /t 5' : 'sleep 5',
      timeout: 100 // 100ms timeout
    }, context);

    expect(result.content[0].text).toContain('=== killed by signal: SIGTERM ===');
  }, 10000); // Increase test timeout
});
