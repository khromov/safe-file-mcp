import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleWriteFile } from '../../handlers/write_file.js';
import {
  setupTestDir,
  cleanupTestDir,
  createTestContext,
  fileExists,
  readTestFile,
  createTestFile,
} from './test-utils.js';

describe('handleWriteFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should create a new file', async () => {
    const context = createTestContext(testDir);
    const content = 'This is new file content';

    const result = await handleWriteFile({ path: './newfile.txt', content }, context);

    expect(result.content[0].text).toBe('Successfully wrote to ./newfile.txt');
    expect(await fileExists(testDir, 'newfile.txt')).toBe(true);
    expect(await readTestFile(testDir, 'newfile.txt')).toBe(content);
  });

  it('should overwrite existing file', async () => {
    await createTestFile(testDir, 'existing.txt', 'old content');

    const context = createTestContext(testDir);
    const newContent = 'new content';

    const result = await handleWriteFile({ path: './existing.txt', content: newContent }, context);

    expect(result.content[0].text).toBe('Successfully wrote to ./existing.txt');
    expect(await readTestFile(testDir, 'existing.txt')).toBe(newContent);
  });

  it('should create file in nested directory', async () => {
    const context = createTestContext(testDir);
    const content = 'nested file content';

    const result = await handleWriteFile({ path: './deeply/nested/file.txt', content }, context);

    expect(result.content[0].text).toBe('Successfully wrote to ./deeply/nested/file.txt');
    expect(await fileExists(testDir, 'deeply/nested/file.txt')).toBe(true);
    expect(await readTestFile(testDir, 'deeply/nested/file.txt')).toBe(content);
  });
});
