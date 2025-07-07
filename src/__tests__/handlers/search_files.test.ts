import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleSearchFiles } from '../../handlers/search_files.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleSearchFiles', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should find files matching pattern', async () => {
    // Create test files
    await createTestFile(testDir, 'test1.js', 'content');
    await createTestFile(testDir, 'test2.js', 'content');
    await createTestFile(testDir, 'other.js', 'content');
    await createTestFile(testDir, 'src/test3.js', 'content');

    const context = createTestContext(testDir);
    const result = await handleSearchFiles(
      {
        path: './',
        pattern: 'test',
      },
      context
    );

    const files = result.content[0].text.split('\n');
    expect(files).toHaveLength(3);
    expect(files.some((f) => f.includes('test1.js'))).toBe(true);
    expect(files.some((f) => f.includes('test2.js'))).toBe(true);
    expect(files.some((f) => f.includes('src/test3.js'))).toBe(true);
    expect(files.some((f) => f.includes('other.js'))).toBe(false);
  });

  it('should exclude files based on patterns', async () => {
    await createTestFile(testDir, 'app.test.js', 'test');
    await createTestFile(testDir, 'src/component.test.js', 'test');
    await createTestFile(testDir, 'node_modules/lib.test.js', 'test');

    const context = createTestContext(testDir);
    const result = await handleSearchFiles(
      {
        path: './',
        pattern: 'test',
        excludePatterns: ['node_modules'],
      },
      context
    );

    const files = result.content[0].text.split('\n');
    expect(files.some((f) => f.includes('app.test.js'))).toBe(true);
    expect(files.some((f) => f.includes('component.test.js'))).toBe(true);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('should return message when no matches found', async () => {
    await createTestFile(testDir, 'file.txt', 'content');

    const context = createTestContext(testDir);
    const result = await handleSearchFiles(
      {
        path: './',
        pattern: 'nonexistent',
      },
      context
    );

    expect(result.content[0].text).toBe('No matches found');
  });
});
