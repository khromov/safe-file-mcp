import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleListDirectory } from '../../handlers/list_directory.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';
import fs from 'fs/promises';
import path from 'path';

describe('handleListDirectory', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should list files and directories', async () => {
    // Create some files and directories
    await createTestFile(testDir, 'file1.txt', 'content');
    await createTestFile(testDir, 'file2.js', 'code');
    await fs.mkdir(path.join(testDir, 'subdir1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'subdir2'), { recursive: true });

    const context = createTestContext(testDir);
    const result = await handleListDirectory({ path: './' }, context);

    const output = result.content[0].text;
    expect(output).toContain('[FILE] file1.txt');
    expect(output).toContain('[FILE] file2.js');
    expect(output).toContain('[DIR] subdir1');
    expect(output).toContain('[DIR] subdir2');
  });

  it('should handle empty directory', async () => {
    const context = createTestContext(testDir);
    const result = await handleListDirectory({ path: './' }, context);

    expect(result.content[0].text).toBe('');
  });

  it('should list contents of subdirectory', async () => {
    await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    await createTestFile(testDir, 'subdir/nested.txt', 'nested content');

    const context = createTestContext(testDir);
    const result = await handleListDirectory({ path: './subdir' }, context);

    expect(result.content[0].text).toBe('[FILE] nested.txt');
  });
});
