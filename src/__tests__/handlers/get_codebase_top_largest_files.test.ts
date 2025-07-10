import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleGetCodebaseTopLargestFiles } from '../../handlers/get_codebase_top_largest_files.js';
import { setupTestDir, cleanupTestDir, createTestContext, createTestFile } from './test-utils.js';

describe('handleGetCodebaseTopLargestFiles', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  it('should return top N largest files with default count', async () => {
    // Create 25 files with different sizes
    for (let i = 0; i < 25; i++) {
      const size = (25 - i) * 100; // Decreasing sizes from 2500 to 100 chars
      await createTestFile(testDir, `file${i}.js`, 'x'.repeat(size));
    }

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles({ path: './' }, context);

    const output = result.content[0].text;

    // Should show default 20 files
    expect(output).toContain('## Top Largest Files');
    expect(output).toContain('Found 25 total files. Showing the top 20 largest:');

    // Check that files are listed in order (largest first)
    expect(output).toContain('1. `file0.js`'); // Largest
    expect(output).toContain('20. `file19.js`'); // 20th largest

    // Should show "and X more files" message
    expect(output).toContain('... and 5 more files.');

    // Should show summary
    expect(output).toContain('## Total Summary');
    expect(output).toContain('**Total Claude tokens**:');
    expect(output).toContain('**Total GPT tokens**:');
    expect(output).toContain('**Total files**: 25');
  });

  it('should return custom number of files when specified', async () => {
    // Create 10 files
    for (let i = 0; i < 10; i++) {
      await createTestFile(testDir, `file${i}.js`, 'x'.repeat((10 - i) * 100));
    }

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles(
      {
        path: './',
        count: 5,
      },
      context
    );

    const output = result.content[0].text;

    // Should show only 5 files
    expect(output).toContain('## Top Largest Files');
    expect(output).toContain('Found 10 total files. Showing the top 5 largest:');

    // Count the number of file entries
    const fileMatches = output.match(/\d+\. `file\d+\.js`/g) || [];
    expect(fileMatches.length).toBe(5);

    expect(output).toContain('... and 5 more files.');
  });

  it('should handle fewer files than requested count', async () => {
    // Create only 3 files
    await createTestFile(testDir, 'small.js', 'small');
    await createTestFile(testDir, 'medium.js', 'x'.repeat(100));
    await createTestFile(testDir, 'large.js', 'x'.repeat(1000));

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles(
      {
        path: './',
        count: 10,
      },
      context
    );

    const output = result.content[0].text;

    // Should show all 3 files even though we requested 10
    expect(output).toContain('## Top Largest Files');
    expect(output).toContain('Found 3 total files. Showing the top 3 largest:');

    // Should not show "more files" message
    expect(output).not.toContain('... and');

    // All files should be listed
    expect(output).toContain('large.js');
    expect(output).toContain('medium.js');
    expect(output).toContain('small.js');
  });

  it('should handle empty directory', async () => {
    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles({ path: './' }, context);

    const output = result.content[0].text;

    expect(output).toContain('## Top Largest Files');
    expect(output).toContain('No files found in the specified directory.');
    expect(output).toContain('**Total files**: 0');
  });

  it('should show file sizes in KB with 2 decimal places', async () => {
    // Create files with specific sizes
    await createTestFile(testDir, 'exact1kb.js', 'x'.repeat(1024)); // Exactly 1 KB
    await createTestFile(testDir, 'partial.js', 'x'.repeat(1536)); // 1.5 KB
    await createTestFile(testDir, 'small.js', 'x'.repeat(512)); // 0.5 KB

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles({ path: './' }, context);

    const output = result.content[0].text;

    // Check file size formatting - allow for small variations due to file system overhead
    expect(output).toMatch(/partial\.js` - 1\.5\d KB/); // Should be around 1.50-1.59 KB
    expect(output).toMatch(/exact1kb\.js` - 1\.0\d KB/); // Should be around 1.00-1.09 KB
    expect(output).toMatch(/small\.js` - 0\.5\d KB/); // Should be around 0.50-0.59 KB
  });

  it('should handle large number of files efficiently', async () => {
    // Create 50 files to test performance
    for (let i = 0; i < 50; i++) {
      const size = (50 - i) * 50; // Different sizes
      await createTestFile(testDir, `file${i.toString().padStart(2, '0')}.js`, 'x'.repeat(size));
    }

    const context = createTestContext(testDir);
    const result = await handleGetCodebaseTopLargestFiles(
      {
        path: './',
        count: 30,
      },
      context
    );

    const output = result.content[0].text;

    expect(output).toContain('## Top Largest Files');
    expect(output).toContain('Found 50 total files. Showing the top 30 largest:');

    // Count file entries
    const fileMatches = output.match(/\d+\. `file\d+\.js`/g) || [];
    expect(fileMatches.length).toBe(30);

    expect(output).toContain('... and 20 more files.');
    expect(output).toContain('**Total files**: 50');
  });
});
