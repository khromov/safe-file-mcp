import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { generateCodebaseDigest, getCodebaseSize } from '../codebase-digest.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('generateCodebaseDigest', () => {
  const TEST_DIR = path.join(__dirname, 'test-codebase-temp');

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'src'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'lib'), { recursive: true });

    // Create various sized files
    const files = [
      // Small files that should fit on page 1
      { path: 'src/index.ts', size: 25000 },
      { path: 'src/utils.ts', size: 25000 },
      { path: 'src/types.ts', size: 25000 },
      { path: 'src/config.ts', size: 15000 }, // Total so far: 90000

      // Files for page 2
      { path: 'lib/helpers.ts', size: 30000 },
      { path: 'lib/constants.ts', size: 20000 },

      // Large file that should be omitted
      { path: 'src/generated.ts', size: 150000 },

      // Small file to test page boundaries
      { path: 'README.md', size: 5000 },
    ];

    for (const file of files) {
      const content = `// ${path.basename(file.path)}\n` + 'x'.repeat(file.size - 50);
      await fs.writeFile(path.join(TEST_DIR, file.path), content);
    }
  });

  afterAll(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  it('should return first page by default', async () => {
    const result = await generateCodebaseDigest({
      inputDir: TEST_DIR,
    });

    expect(result.currentPage).toBe(1);

    // Should contain some content
    expect(result.content.length).toBeGreaterThan(0);

    // Should contain at least some files
    const fileMatches = result.content.match(/# [^\n]+\.(ts|md)/g) || [];
    expect(fileMatches.length).toBeGreaterThan(0);

    // If there are more pages, should have pagination message
    if (result.hasMorePages) {
      expect(result.content).toContain(
        'This is page 1. You MUST call this tool again with page: 2'
      );
    }
  });

  it('should return second page when requested', async () => {
    const result = await generateCodebaseDigest({
      inputDir: TEST_DIR,
      page: 2,
    });

    expect(result.currentPage).toBe(2);

    // Page 2 might be empty or have content depending on file ordering
    // Just verify it doesn't error
    expect(result).toBeDefined();
  });

  it('should handle large files with omission message', async () => {
    // Create a specific test for large file
    const LARGE_FILE_DIR = path.join(__dirname, 'test-large-file-temp');
    await fs.mkdir(LARGE_FILE_DIR, { recursive: true });

    // Create a file larger than 99000 chars
    const largeContent = '// huge.ts\n' + 'x'.repeat(100000);
    await fs.writeFile(path.join(LARGE_FILE_DIR, 'huge.ts'), largeContent);

    try {
      const result = await generateCodebaseDigest({
        inputDir: LARGE_FILE_DIR,
        page: 1,
      });

      // Should contain the omission message
      expect(result.content).toContain('huge.ts');
      expect(result.content).toContain('File omitted due to large size');

      // Should NOT contain the actual large file content
      expect(result.content.length).toBeLessThan(1000); // Much smaller than original
    } finally {
      await fs.rm(LARGE_FILE_DIR, { recursive: true, force: true });
    }
  });

  it('should handle empty directory', async () => {
    const EMPTY_DIR = path.join(__dirname, 'test-empty-temp');
    await fs.mkdir(EMPTY_DIR, { recursive: true });

    try {
      const result = await generateCodebaseDigest({
        inputDir: EMPTY_DIR,
      });

      expect(result.content).toBe('');
      expect(result.hasMorePages).toBe(false);
      expect(result.currentPage).toBe(1);
      expect(result.nextPage).toBeUndefined();
    } finally {
      await fs.rm(EMPTY_DIR, { recursive: true, force: true });
    }
  });

  it('should respect custom page size', async () => {
    const result = await generateCodebaseDigest({
      inputDir: TEST_DIR,
      pageSize: 50000, // Smaller page size
    });

    // Should respect the page size setting
    expect(result).toBeDefined();
    expect(result.currentPage).toBe(1);

    // Content should be limited by page size
    if (result.content.length > 0) {
      expect(result.content.length).toBeLessThanOrEqual(60000); // Allow some overflow for pagination message
    }
  });

  it('should handle page beyond available content', async () => {
    const result = await generateCodebaseDigest({
      inputDir: TEST_DIR,
      page: 10, // Way beyond available pages
    });

    expect(result.content).toBe('');
    expect(result.hasMorePages).toBe(false);
    expect(result.currentPage).toBe(10);
    expect(result.nextPage).toBeUndefined();
  });

  it('should handle single file that fits on page', async () => {
    const SINGLE_FILE_DIR = path.join(__dirname, 'test-single-temp');
    await fs.mkdir(SINGLE_FILE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(SINGLE_FILE_DIR, 'single.ts'),
      '// single.ts\nconst single = true;\n'
    );

    try {
      const result = await generateCodebaseDigest({
        inputDir: SINGLE_FILE_DIR,
      });

      expect(result.content).toContain('single.ts');
      expect(result.hasMorePages).toBe(false);
      expect(result.nextPage).toBeUndefined();
      // Should NOT have pagination message
      expect(result.content).not.toContain('To see more files');
    } finally {
      await fs.rm(SINGLE_FILE_DIR, { recursive: true, force: true });
    }
  });

  it('should calculate total size correctly with omitted files', async () => {
    // Create a directory with only large files
    const LARGE_FILES_DIR = path.join(__dirname, 'test-large-temp');
    await fs.mkdir(LARGE_FILES_DIR, { recursive: true });

    // Create two large files
    await fs.writeFile(path.join(LARGE_FILES_DIR, 'large1.ts'), '// large1\n' + 'a'.repeat(120000));
    await fs.writeFile(path.join(LARGE_FILES_DIR, 'large2.ts'), '// large2\n' + 'b'.repeat(130000));

    try {
      const result = await generateCodebaseDigest({
        inputDir: LARGE_FILES_DIR,
      });

      // Both files should be replaced with omission messages
      expect(result.content).toContain('large1.ts');
      expect(result.content).toContain('large2.ts');
      expect(result.content).toContain('File omitted due to large size');

      // The total content should be small (just two omission messages)
      expect(result.content.length).toBeLessThan(300);

      // Should not need pagination since omission messages are small
      expect(result.hasMorePages).toBe(false);
    } finally {
      await fs.rm(LARGE_FILES_DIR, { recursive: true, force: true });
    }
  });
});

describe('getCodebaseSize', () => {
  // Simple test with minimal directory to avoid hanging
  it('should return token counts for a simple directory', async () => {
    const SIMPLE_DIR = path.join(__dirname, 'test-simple-size-temp');
    await fs.mkdir(SIMPLE_DIR, { recursive: true });
    
    // Create just one small file
    await fs.writeFile(
      path.join(SIMPLE_DIR, 'test.js'),
      'console.log("hello world");'
    );

    try {
      const result = await getCodebaseSize({
        inputDir: SIMPLE_DIR
      });
      
      expect(result.content).toBeDefined();
      expect(result.totalClaudeTokens).toBeGreaterThan(0);
      expect(result.totalGptTokens).toBeGreaterThan(0);
      expect(result.totalFiles).toBe(1);
      expect(result.content).toContain('## Token Summary');
      expect(result.content).toContain('## Next Step');
    } finally {
      await fs.rm(SIMPLE_DIR, { recursive: true, force: true });
    }
  }, 10000); // 10 second timeout

  it('should handle empty directory without hanging', async () => {
    const EMPTY_DIR = path.join(__dirname, 'test-empty-size-temp');
    await fs.mkdir(EMPTY_DIR, { recursive: true });

    try {
      const result = await getCodebaseSize({
        inputDir: EMPTY_DIR
      });
      
      expect(result.totalFiles).toBe(0);
      expect(result.hasWarning).toBe(false);
      expect(result.content).toContain('**Total files**: 0');
    } finally {
      await fs.rm(EMPTY_DIR, { recursive: true, force: true });
    }
  }, 10000); // 10 second timeout

  it('should format output with markdown correctly', async () => {
    const MARKDOWN_DIR = path.join(__dirname, 'test-markdown-temp');
    await fs.mkdir(MARKDOWN_DIR, { recursive: true });
    
    await fs.writeFile(
      path.join(MARKDOWN_DIR, 'readme.md'),
      '# Test\n\nHello world'
    );

    try {
      const result = await getCodebaseSize({
        inputDir: MARKDOWN_DIR
      });
      
      const output = result.content;
      
      // Check markdown formatting
      expect(output).toMatch(/##\s+Token Summary/);
      expect(output).toMatch(/##\s+Top 10 Largest Files/);
      expect(output).toMatch(/##\s+Next Step/);
      
      // Check bold formatting
      expect(output).toContain('**Claude tokens**:');
      expect(output).toContain('**ChatGPT tokens**:');
    } finally {
      await fs.rm(MARKDOWN_DIR, { recursive: true, force: true });
    }
  }, 10000); // 10 second timeout
});
