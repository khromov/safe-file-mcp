import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleCreateDirectory } from '../../handlers/create_directory.js';
import { setupTestDir, cleanupTestDir, createTestContext } from './test-utils.js';
import fs from 'fs/promises';
import path from 'path';

describe('handleCreateDirectory', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should create a single directory', async () => {
    const context = createTestContext(testDir);
    const result = await handleCreateDirectory({ path: './newdir' }, context);

    expect(result.content[0].text).toBe('Successfully created directory newdir');

    const stats = await fs.stat(path.join(testDir, 'newdir'));
    expect(stats.isDirectory()).toBe(true);
  });

  it('should create nested directories', async () => {
    const context = createTestContext(testDir);
    const result = await handleCreateDirectory({ path: './parent/child/grandchild' }, context);

    expect(result.content[0].text).toBe('Successfully created directory parent/child/grandchild');

    const stats = await fs.stat(path.join(testDir, 'parent/child/grandchild'));
    expect(stats.isDirectory()).toBe(true);
  });

  it('should handle existing directory gracefully', async () => {
    // Pre-create the directory
    await fs.mkdir(path.join(testDir, 'existing'), { recursive: true });

    const context = createTestContext(testDir);
    const result = await handleCreateDirectory({ path: './existing' }, context);

    // Should succeed without error but with different message
    expect(result.content[0].text).toBe('Directory existing already exists');
  });

  it('should handle empty path as root', async () => {
    const context = createTestContext(testDir);
    const result = await handleCreateDirectory({ path: '' }, context);

    expect(result.content[0].text).toBe('Directory (root) already exists');
  });
});
