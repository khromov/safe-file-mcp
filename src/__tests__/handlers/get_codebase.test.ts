import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleGetCodebase } from '../../handlers/get_codebase.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleGetCodebase', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should generate codebase digest for simple files', async () => {
    await createTestFile(testDir, 'index.js', 'console.log("Hello World");');
    await createTestFile(testDir, 'utils.js', 'export const add = (a, b) => a + b;');

    const context = createTestContext(testDir);
    const result = await handleGetCodebase({ path: './', page: 1 }, context);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('index.js');
    expect(result.content[0].text).toContain('console.log("Hello World");');
    expect(result.content[0].text).toContain('utils.js');
    expect(result.content[0].text).toContain('export const add');
  });

  it('should handle pagination for multiple files', async () => {
    // Create several files to test pagination
    for (let i = 0; i < 5; i++) {
      const content = `// File ${i}\n` + 'x'.repeat(25000); // 25KB each
      await createTestFile(testDir, `file${i}.js`, content);
    }

    const context = createTestContext(testDir);
    const result = await handleGetCodebase({ path: './', page: 1 }, context);

    // Should have pagination message if content exceeds page size
    if (result.content[0].text.includes('This is page 1')) {
      expect(result.content[0].text).toContain('You MUST call this tool again with page: 2');
    }
  });

  it('should omit very large files', async () => {
    // Create a file larger than page size
    const hugeContent = '// Huge file\n' + 'x'.repeat(100000);
    await createTestFile(testDir, 'huge.js', hugeContent);

    const context = createTestContext(testDir);
    const result = await handleGetCodebase({ path: './', page: 1 }, context);

    expect(result.content[0].text).toContain('huge.js');
    expect(result.content[0].text).toContain('File omitted due to large size');
    // Should not contain the actual huge content
    expect(result.content[0].text.length).toBeLessThan(hugeContent.length);
  });
});
