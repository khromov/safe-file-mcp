import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleGetCodebaseSize } from '../../handlers/get_codebase_size.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleGetCodebaseSize', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should calculate size for a simple directory', async () => {
    // Create a few test files
    await createTestFile(testDir, 'file1.js', 'console.log("hello");');
    await createTestFile(testDir, 'file2.ts', 'export const test = true;');
    await createTestFile(testDir, 'readme.md', '# Test Project\n\nThis is a test.');

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseSize({ path: './' }, context);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('## Token Summary');
    expect(result.content[0].text).toContain('**Total files**: 3');
    expect(result.content[0].text).toContain('## Next Step');
  });

  it('should handle empty directory', async () => {
    const context = createTestContext(testDir);
    const result = await handleGetCodebaseSize({ path: './' }, context);

    expect(result.content[0].text).toContain('**Total files**: 0');
    expect(result.content[0].text).not.toContain('WARNING');
  });

  it('should show file list with sizes', async () => {
    // Create files with large enough content to exceed Claude token limit
    // Need to create content that results in > 150,000 tokens
    // Tokens are roughly 4 characters, so we need ~600,000 chars
    const largeContent = 'x'.repeat(600000); // Large enough to hit Claude limit
    await createTestFile(testDir, 'small.js', 'const x = 1;');
    await createTestFile(testDir, 'medium.js', 'x'.repeat(50000));
    await createTestFile(testDir, 'large.js', largeContent);

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseSize({ path: './' }, context);

    expect(result.content[0].text).toContain('## Top 25 Largest Files');
    expect(result.content[0].text).toContain('large.js');
    expect(result.content[0].text).toContain('medium.js');
    expect(result.content[0].text).toContain('small.js');
  });
});
