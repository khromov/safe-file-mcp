import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  writeMultipleFiles,
  validateRelativePath,
  resolveRelativePath,
  FileToWrite,
} from '../batch-file-operations.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('batch-file-operations', () => {
  const TEST_DIR = path.join(__dirname, 'test-batch-temp');

  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('validateRelativePath', () => {
    it('should accept valid relative paths', () => {
      expect(() => validateRelativePath('./file.txt')).not.toThrow();
      expect(() => validateRelativePath('file.txt')).not.toThrow();
      expect(() => validateRelativePath('./folder/file.txt')).not.toThrow();
      expect(() => validateRelativePath('folder/subfolder/file.txt')).not.toThrow();
      expect(() => validateRelativePath('.')).not.toThrow();
      expect(() => validateRelativePath('./')).not.toThrow();
    });

    it('should reject paths with parent directory references', () => {
      expect(() => validateRelativePath('../file.txt')).toThrow(
        'Path cannot contain parent directory references'
      );
      expect(() => validateRelativePath('./folder/../file.txt')).toThrow(
        'Path cannot contain parent directory references'
      );
      expect(() => validateRelativePath('folder/../../file.txt')).toThrow(
        'Path cannot contain parent directory references'
      );
    });
  });

  describe('resolveRelativePath', () => {
    it('should resolve relative paths correctly', () => {
      const rootDir = '/test/root';
      
      expect(resolveRelativePath('./file.txt', rootDir)).toBe('/test/root/file.txt');
      expect(resolveRelativePath('file.txt', rootDir)).toBe('/test/root/file.txt');
      expect(resolveRelativePath('./folder/file.txt', rootDir)).toBe('/test/root/folder/file.txt');
      expect(resolveRelativePath('folder/subfolder/file.txt', rootDir)).toBe('/test/root/folder/subfolder/file.txt');
    });

    it('should handle edge cases', () => {
      const rootDir = '/test/root';
      
      expect(resolveRelativePath('.', rootDir)).toBe('/test/root');
      expect(resolveRelativePath('./', rootDir)).toBe('/test/root');
    });
  });

  describe('writeMultipleFiles', () => {
    it('should write multiple files successfully', async () => {
      const files: FileToWrite[] = [
        { path: './test1.txt', content: 'Content of test1' },
        { path: './test2.txt', content: 'Content of test2' },
        { path: './subfolder/test3.txt', content: 'Content of test3' },
      ];

      const result = await writeMultipleFiles(files, TEST_DIR);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);

      // Verify all files were written correctly
      for (const file of files) {
        const content = await fs.readFile(path.join(TEST_DIR, file.path.slice(2)), 'utf-8');
        expect(content).toBe(file.content);
      }

      // Verify summary format
      expect(result.summary).toContain('Successfully wrote 3 file(s)');
      expect(result.summary).toContain('✓ ./test1.txt');
      expect(result.summary).toContain('✓ ./test2.txt');
      expect(result.summary).toContain('✓ ./subfolder/test3.txt');
    });

    it('should handle mixed success and failure scenarios', async () => {
      const files: FileToWrite[] = [
        { path: './valid1.txt', content: 'Valid content 1' },
        { path: '../invalid.txt', content: 'This should fail due to path validation' },
        { path: './valid2.txt', content: 'Valid content 2' },
      ];

      const result = await writeMultipleFiles(files, TEST_DIR);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(3);

      // Check individual results
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].path).toBe('./valid1.txt');

      expect(result.results[1].success).toBe(false);
      expect(result.results[1].path).toBe('../invalid.txt');
      expect(result.results[1].error).toContain('Path cannot contain parent directory references');

      expect(result.results[2].success).toBe(true);
      expect(result.results[2].path).toBe('./valid2.txt');

      // Verify successful files were written
      const content1 = await fs.readFile(path.join(TEST_DIR, 'valid1.txt'), 'utf-8');
      expect(content1).toBe('Valid content 1');

      const content2 = await fs.readFile(path.join(TEST_DIR, 'valid2.txt'), 'utf-8');
      expect(content2).toBe('Valid content 2');

      // Verify summary includes both successes and failures
      expect(result.summary).toContain('Successfully wrote 2 file(s), 1 failed');
      expect(result.summary).toContain('✓ ./valid1.txt');
      expect(result.summary).toContain('✗ ../invalid.txt');
      expect(result.summary).toContain('✓ ./valid2.txt');
    });

    it('should create nested directories as needed', async () => {
      const files: FileToWrite[] = [
        { path: './deep/nested/folder/file1.txt', content: 'Deep file 1' },
        { path: './another/path/file2.txt', content: 'Deep file 2' },
      ];

      const result = await writeMultipleFiles(files, TEST_DIR);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);

      // Verify files exist and directories were created
      const content1 = await fs.readFile(path.join(TEST_DIR, 'deep/nested/folder/file1.txt'), 'utf-8');
      expect(content1).toBe('Deep file 1');

      const content2 = await fs.readFile(path.join(TEST_DIR, 'another/path/file2.txt'), 'utf-8');
      expect(content2).toBe('Deep file 2');

      // Verify directories exist
      const deepStat = await fs.stat(path.join(TEST_DIR, 'deep/nested/folder'));
      expect(deepStat.isDirectory()).toBe(true);

      const anotherStat = await fs.stat(path.join(TEST_DIR, 'another/path'));
      expect(anotherStat.isDirectory()).toBe(true);
    });

    it('should handle empty files array', async () => {
      const result = await writeMultipleFiles([], TEST_DIR);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.summary).toContain('Successfully wrote 0 file(s)');
    });

    it('should handle files with paths without ./ prefix', async () => {
      const files: FileToWrite[] = [
        { path: 'no-prefix.txt', content: 'Content without prefix' },
        { path: 'folder/no-prefix2.txt', content: 'Content without prefix 2' },
      ];

      const result = await writeMultipleFiles(files, TEST_DIR);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);

      // Verify files were written
      const content1 = await fs.readFile(path.join(TEST_DIR, 'no-prefix.txt'), 'utf-8');
      expect(content1).toBe('Content without prefix');

      const content2 = await fs.readFile(path.join(TEST_DIR, 'folder/no-prefix2.txt'), 'utf-8');
      expect(content2).toBe('Content without prefix 2');
    });

    it('should overwrite existing files', async () => {
      // First, create a file
      const initialFile: FileToWrite[] = [
        { path: './overwrite-test.txt', content: 'Initial content' },
      ];

      await writeMultipleFiles(initialFile, TEST_DIR);

      // Verify initial content
      let content = await fs.readFile(path.join(TEST_DIR, 'overwrite-test.txt'), 'utf-8');
      expect(content).toBe('Initial content');

      // Now overwrite it
      const newFiles: FileToWrite[] = [
        { path: './overwrite-test.txt', content: 'New content' },
      ];

      const result = await writeMultipleFiles(newFiles, TEST_DIR);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);

      // Verify new content
      content = await fs.readFile(path.join(TEST_DIR, 'overwrite-test.txt'), 'utf-8');
      expect(content).toBe('New content');
    });

    it('should handle large number of files efficiently', async () => {
      // Create 50 files to test batch performance
      const files: FileToWrite[] = Array.from({ length: 50 }, (_, i) => ({
        path: `./batch/file-${i.toString().padStart(3, '0')}.txt`,
        content: `Content for file ${i}`,
      }));

      const startTime = Date.now();
      const result = await writeMultipleFiles(files, TEST_DIR);
      const endTime = Date.now();

      expect(result.successCount).toBe(50);
      expect(result.failureCount).toBe(0);

      // Verify some random files
      const randomIndices = [0, 24, 49];
      for (const i of randomIndices) {
        const content = await fs.readFile(
          path.join(TEST_DIR, `batch/file-${i.toString().padStart(3, '0')}.txt`),
          'utf-8'
        );
        expect(content).toBe(`Content for file ${i}`);
      }

      // Performance should be reasonable (this is quite lenient)
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle special characters in file content', async () => {
      const files: FileToWrite[] = [
        { path: './unicode.txt', content: '🥥 Coco supports Unicode! 中文 العربية' },
        { path: './json.txt', content: '{"key": "value", "array": [1, 2, 3]}' },
        { path: './multiline.txt', content: 'Line 1\nLine 2\r\nLine 3\n\nEmpty line above' },
      ];

      const result = await writeMultipleFiles(files, TEST_DIR);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);

      // Verify content integrity
      const unicodeContent = await fs.readFile(path.join(TEST_DIR, 'unicode.txt'), 'utf-8');
      expect(unicodeContent).toBe('🥥 Coco supports Unicode! 中文 العربية');

      const jsonContent = await fs.readFile(path.join(TEST_DIR, 'json.txt'), 'utf-8');
      expect(jsonContent).toBe('{"key": "value", "array": [1, 2, 3]}');

      const multilineContent = await fs.readFile(path.join(TEST_DIR, 'multiline.txt'), 'utf-8');
      expect(multilineContent).toBe('Line 1\nLine 2\r\nLine 3\n\nEmpty line above');
    });
  });
});
