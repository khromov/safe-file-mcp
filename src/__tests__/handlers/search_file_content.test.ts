import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleSearchFileContent } from '../../handlers/search_file_content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('search_file_content handler', () => {
  const testDir = path.join(__dirname, 'test-search-temp');
  const context = { absoluteRootDir: testDir };

  beforeAll(async () => {
    // Create test directory and files
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files with different content
    await fs.writeFile(
      path.join(testDir, 'test1.ts'),
      `function testFunction() {
  console.log("Hello world");
  return 42;
}

export default testFunction;`
    );

    await fs.writeFile(
      path.join(testDir, 'test2.js'),
      `// This file contains console statements
console.log("Starting application");

function main() {
  console.error("Error occurred");
  return true;
}

module.exports = { main };`
    );

    await fs.writeFile(
      path.join(testDir, 'config.json'),
      `{
  "name": "test-app",
  "version": "1.0.0",
  "description": "A test application"
}`
    );
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should search for literal text and return matches with context', async () => {
    const args = {
      path: '',
      pattern: 'console.log',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: []
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    expect(text).toContain('Found');
    expect(text).toContain('console.log');
    expect(text).toContain('test1.ts');
    expect(text).toContain('test2.js');
  });

  it('should support regex patterns', async () => {
    const args = {
      path: '',
      pattern: 'console\\.(log|error)',
      useRegex: true,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: []
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    expect(text).toContain('Found');
    expect(text).toContain('match');
  });

  it('should respect case sensitivity option', async () => {
    const args = {
      path: '',
      pattern: 'CONSOLE',
      useRegex: false,
      caseSensitive: true,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: []
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    expect(text).toContain('No matches found');
  });

  it('should exclude files based on patterns', async () => {
    const args = {
      path: '',
      pattern: 'test',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: ['*.json']
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    // Should not find matches in config.json due to exclusion
    expect(text).not.toContain('config.json');
  });

  it('should handle empty results', async () => {
    const args = {
      path: '',
      pattern: 'nonexistentpattern123',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: []
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('No matches found');
  });

  it('should validate invalid regex patterns', async () => {
    const args = {
      path: '',
      pattern: '[invalid regex',
      useRegex: true,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: []
    };

    await expect(handleSearchFileContent(args, context)).rejects.toThrow(/Invalid regex pattern/);
  });
});
