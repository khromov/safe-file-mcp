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

    // Create a file specifically for testing line number accuracy
    await fs.writeFile(
      path.join(testDir, 'line-test.txt'),
      `line 1
line 2 with target
line 3
line 4
line 5`
    );

    // Create a .cocoignore file to test ignore functionality
    await fs.writeFile(
      path.join(testDir, '.cocoignore'),
      `*.json
node_modules/
dist/`
    );

    // Create a file that would be ignored
    await fs.writeFile(
      path.join(testDir, 'ignored.json'),
      `{
  "ignored": true,
  "test": "this should not be found"
}`
    );

    // Create a node_modules directory with a file
    await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'node_modules', 'module.js'),
      `// This is in node_modules
console.log("I should be ignored by default");
var moduleTest = "test pattern in node_modules";`
    );
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should display correct line numbers and context markers', async () => {
    const args = {
      path: '',
      pattern: 'target',
      useRegex: false,
      caseSensitive: false,
      contextLines: 2,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    expect(text).toContain('Found');
    expect(text).toContain('line-test.txt');
    expect(text).toContain('Line 2:'); // Should report line 2
    
    // Check that the context shows correct line numbers and marker
    expect(text).toContain('  1: line 1');           // Line before match
    expect(text).toContain('> 2: line 2 with target'); // Match line with marker
    expect(text).toContain('  3: line 3');           // Line after match
    expect(text).toContain('  4: line 4');           // Second line after match
    
    // Should NOT contain line 0 (bug was showing 0-based indexing)
    expect(text).not.toContain('  0:');
    expect(text).not.toContain('> 0:');
  });

  it('should search for literal text and return matches with context', async () => {
    const args = {
      path: '',
      pattern: 'console.log',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    expect(text).toContain('Found');
    expect(text).toContain('console.log');
    expect(text).toContain('test1.ts');
    expect(text).toContain('test2.js');
    // Should not contain ignored files
    expect(text).not.toContain('node_modules');
  });

  it('should support regex patterns', async () => {
    const args = {
      path: '',
      pattern: 'console\\.(log|error)',
      useRegex: true,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
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
      excludePatterns: [],
      includeAllFiles: false
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
      excludePatterns: ['*.ts'],
      includeAllFiles: false
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    // Should not find matches in .ts files due to exclusion
    expect(text).not.toContain('test1.ts');
  });

  it('should respect .cocoignore by default (includeAllFiles=false)', async () => {
    const args = {
      path: '',
      pattern: 'test',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    // Should not find matches in ignored files (.json files are in .cocoignore)
    expect(text).not.toContain('config.json');
    expect(text).not.toContain('ignored.json');
    expect(text).not.toContain('node_modules');
  });

  it('should ignore .cocoignore when includeAllFiles=true', async () => {
    const args = {
      path: '',
      pattern: 'moduleTest',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: true
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const text = result.content[0].text;
    // Should find matches in previously ignored files
    expect(text).toContain('node_modules');
    expect(text).toContain('moduleTest');
  });

  it('should provide tip when no matches found with includeAllFiles=false', async () => {
    const args = {
      path: '',
      pattern: 'nonexistentpattern123',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text;
    expect(text).toContain('No matches found');
    expect(text).toContain('includeAllFiles: true');
  });

  it('should not provide tip when no matches found with includeAllFiles=true', async () => {
    const args = {
      path: '',
      pattern: 'nonexistentpattern123',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: true
    };

    const result = await handleSearchFileContent(args, context);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text;
    expect(text).toContain('No matches found');
    expect(text).not.toContain('includeAllFiles: true');
  });

  it('should handle empty results', async () => {
    const args = {
      path: '',
      pattern: 'nonexistentpattern123',
      useRegex: false,
      caseSensitive: false,
      contextLines: 1,
      maxResults: 10,
      excludePatterns: [],
      includeAllFiles: false
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
      excludePatterns: [],
      includeAllFiles: false
    };

    await expect(handleSearchFileContent(args, context)).rejects.toThrow(/Invalid regex pattern/);
  });
});
