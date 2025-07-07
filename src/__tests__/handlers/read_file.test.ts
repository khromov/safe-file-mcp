import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleReadFile } from '../../handlers/read_file.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleReadFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should read existing file content', async () => {
    const content = 'Hello, World!\nThis is a test file.';
    await createTestFile(testDir, 'test.txt', content);

    const context = createTestContext(testDir);
    const result = await handleReadFile({ path: './test.txt' }, context);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe(content);
  });

  it('should handle file not found error', async () => {
    const context = createTestContext(testDir);
    
    await expect(handleReadFile({ path: './nonexistent.txt' }, context))
      .rejects.toThrow('ENOENT');
  });

  it('should reject parent directory access', async () => {
    const context = createTestContext(testDir);
    
    await expect(handleReadFile({ path: '../outside.txt' }, context))
      .rejects.toThrow('Path cannot contain parent directory references');
  });
});
