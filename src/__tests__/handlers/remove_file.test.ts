import { handleRemoveFile } from '../../handlers/remove_file.js';
import { HandlerContext } from '../../types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('remove_file handler', () => {
  let testDir: string;
  let context: HandlerContext;

  beforeEach(async () => {
    // Create a unique test directory for each test
    testDir = path.join(__dirname, 'test-handlers-temp', `remove-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(testDir, { recursive: true });
    
    context = {
      absoluteRootDir: testDir,
    };
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('successful file removal', () => {
    it('should remove a file successfully', async () => {
      // Create a test file
      const testFilePath = path.join(testDir, 'test.txt');
      await fs.writeFile(testFilePath, 'test content');

      // Remove the file
      const result = await handleRemoveFile({ path: 'test.txt' }, context);

      // Verify response
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Successfully removed file test.txt');
      expect(result.isError).toBeUndefined();

      // Verify file is actually removed
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });

    it('should remove a file with ./ prefix', async () => {
      // Create a test file
      const testFilePath = path.join(testDir, 'test.txt');
      await fs.writeFile(testFilePath, 'test content');

      // Remove the file with ./ prefix
      const result = await handleRemoveFile({ path: './test.txt' }, context);

      // Verify response
      expect(result.content[0].text).toBe('Successfully removed file test.txt');

      // Verify file is actually removed
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });

    it('should remove a file in a subdirectory', async () => {
      // Create subdirectory and file
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir);
      const testFilePath = path.join(subDir, 'nested.txt');
      await fs.writeFile(testFilePath, 'nested content');

      // Remove the file
      const result = await handleRemoveFile({ path: 'subdir/nested.txt' }, context);

      // Verify response
      expect(result.content[0].text).toBe('Successfully removed file subdir/nested.txt');

      // Verify file is actually removed
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });
  });

  describe('error cases', () => {
    it('should throw error for missing arguments', async () => {
      await expect(handleRemoveFile({}, context)).rejects.toThrow(
        'Invalid arguments for remove_file'
      );
    });

    it('should throw error for invalid path type', async () => {
      await expect(handleRemoveFile({ path: 123 }, context)).rejects.toThrow(
        'Invalid arguments for remove_file'
      );
    });

    it('should throw error for non-existent file', async () => {
      await expect(handleRemoveFile({ path: 'nonexistent.txt' }, context)).rejects.toThrow(
        'File not found: nonexistent.txt'
      );
    });

    it('should throw error when trying to remove a directory', async () => {
      // Create a directory
      const dirPath = path.join(testDir, 'testdir');
      await fs.mkdir(dirPath);

      await expect(handleRemoveFile({ path: 'testdir' }, context)).rejects.toThrow(
        'Cannot remove directory with remove_file. Use a directory removal command instead.'
      );
    });

    it('should throw error for parent directory traversal', async () => {
      await expect(handleRemoveFile({ path: '../outside.txt' }, context)).rejects.toThrow(
        'Path cannot contain parent directory references'
      );
    });

    it('should throw error for complex parent directory traversal', async () => {
      await expect(handleRemoveFile({ path: 'subdir/../../outside.txt' }, context)).rejects.toThrow(
        'Path cannot contain parent directory references'
      );
    });

    it('should throw error for Windows-style parent directory traversal', async () => {
      await expect(handleRemoveFile({ path: 'subdir\\..\\..\\outside.txt' }, context)).rejects.toThrow(
        'Path cannot contain parent directory references'
      );
    });
  });

  describe('path normalization', () => {
    it('should handle empty path gracefully', async () => {
      await expect(handleRemoveFile({ path: '' }, context)).rejects.toThrow();
    });

    it('should handle current directory reference', async () => {
      await expect(handleRemoveFile({ path: '.' }, context)).rejects.toThrow();
    });

    it('should handle various path formats', async () => {
      // Create test files
      const testFilePath1 = path.join(testDir, 'file1.txt');
      const testFilePath2 = path.join(testDir, 'file2.txt');
      await fs.writeFile(testFilePath1, 'content1');
      await fs.writeFile(testFilePath2, 'content2');

      // Test different path formats
      await handleRemoveFile({ path: './file1.txt' }, context);
      await handleRemoveFile({ path: 'file2.txt' }, context);

      // Verify both files are removed
      await expect(fs.access(testFilePath1)).rejects.toThrow();
      await expect(fs.access(testFilePath2)).rejects.toThrow();
    });
  });

  describe('file system edge cases', () => {
    it('should handle files with special characters in name', async () => {
      const specialFileName = 'test file with spaces & symbols!.txt';
      const testFilePath = path.join(testDir, specialFileName);
      await fs.writeFile(testFilePath, 'special content');

      const result = await handleRemoveFile({ path: specialFileName }, context);

      expect(result.content[0].text).toBe(`Successfully removed file ${specialFileName}`);
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });

    it('should handle removing a file with no extension', async () => {
      const testFilePath = path.join(testDir, 'README');
      await fs.writeFile(testFilePath, 'readme content');

      const result = await handleRemoveFile({ path: 'README' }, context);

      expect(result.content[0].text).toBe('Successfully removed file README');
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });

    it('should handle deeply nested file paths', async () => {
      const deepPath = 'level1/level2/level3/level4';
      const fullDeepPath = path.join(testDir, deepPath);
      await fs.mkdir(fullDeepPath, { recursive: true });
      
      const testFilePath = path.join(fullDeepPath, 'deep.txt');
      await fs.writeFile(testFilePath, 'deep content');

      const result = await handleRemoveFile({ path: `${deepPath}/deep.txt` }, context);

      expect(result.content[0].text).toBe(`Successfully removed file ${deepPath}/deep.txt`);
      await expect(fs.access(testFilePath)).rejects.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple file removals concurrently', async () => {
      // Create multiple test files
      const filePromises = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDir, `concurrent-${i}.txt`);
        filePromises.push(fs.writeFile(filePath, `content ${i}`));
      }
      await Promise.all(filePromises);

      // Remove all files concurrently
      const removePromises = [];
      for (let i = 0; i < 5; i++) {
        removePromises.push(handleRemoveFile({ path: `concurrent-${i}.txt` }, context));
      }
      const results = await Promise.all(removePromises);

      // Verify all operations succeeded
      results.forEach((result, i) => {
        expect(result.content[0].text).toBe(`Successfully removed file concurrent-${i}.txt`);
      });

      // Verify all files are removed
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDir, `concurrent-${i}.txt`);
        await expect(fs.access(filePath)).rejects.toThrow();
      }
    });
  });
});
