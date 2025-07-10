import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleDirectoryTree } from '../../handlers/directory_tree.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';
import fs from 'fs/promises';
import path from 'path';

describe('handleDirectoryTree', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should generate tree structure', async () => {
    // Create a nested structure
    await createTestFile(testDir, 'index.js', 'main');
    await createTestFile(testDir, 'src/app.js', 'app');
    await createTestFile(testDir, 'src/utils/helper.js', 'helper');
    await fs.mkdir(path.join(testDir, 'empty-dir'), { recursive: true });

    const context = createTestContext(testDir);
    const result = await handleDirectoryTree({ path: './' }, context);

    const tree = JSON.parse(result.content[0].text);

    // Check root level
    expect(tree).toHaveLength(3); // index.js, src, empty-dir

    const indexFile = tree.find((item: any) => item.name === 'index.js');
    expect(indexFile?.type).toBe('file');

    const srcDir = tree.find((item: any) => item.name === 'src');
    expect(srcDir?.type).toBe('directory');
    expect(srcDir?.children).toBeDefined();

    // Check nested structure
    const appFile = srcDir.children.find((item: any) => item.name === 'app.js');
    expect(appFile?.type).toBe('file');

    const utilsDir = srcDir.children.find((item: any) => item.name === 'utils');
    expect(utilsDir?.type).toBe('directory');
    expect(utilsDir?.children).toHaveLength(1);
  });

  it('should handle empty directory', async () => {
    const context = createTestContext(testDir);
    const result = await handleDirectoryTree({ path: './' }, context);

    const tree = JSON.parse(result.content[0].text);
    expect(tree).toEqual([]);
  });

  it('should handle empty path as root', async () => {
    await createTestFile(testDir, 'test.js', 'content');

    const context = createTestContext(testDir);
    const result = await handleDirectoryTree({ path: '' }, context);

    const tree = JSON.parse(result.content[0].text);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('test.js');
  });
});
