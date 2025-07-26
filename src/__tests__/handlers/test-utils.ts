import '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { HandlerContext } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEST_BASE_DIR = path.join(__dirname, 'test-handlers-temp');

export async function setupTestDir(): Promise<string> {
  const testDir = path.join(
    TEST_BASE_DIR,
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

export async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

export function createTestContext(testDir: string): HandlerContext {
  return {
    absoluteRootDir: testDir,
  };
}

// Helper to create test files
export async function createTestFile(
  testDir: string,
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(testDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
}

// Helper to check if file exists
export async function fileExists(testDir: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(testDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

// Helper to read file content
export async function readTestFile(testDir: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(testDir, relativePath), 'utf-8');
}
