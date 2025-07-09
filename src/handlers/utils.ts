import path from 'path';
import fs from 'fs/promises';

export function validateRelativePath(relativePath: string): void {
  // Handle empty path as current directory
  if (!relativePath || relativePath === '') {
    return;
  }

  const pathToNormalize =
    relativePath.startsWith('./') || relativePath === '.' ? relativePath : './' + relativePath;
  const normalized = path.normalize(pathToNormalize);
  if (normalized.includes('..')) {
    throw new Error(`Path cannot contain parent directory references (got: ${relativePath})`);
  }
}

export function resolveRelativePath(relativePath: string, rootDir: string): string {
  // Handle empty path as root directory
  if (!relativePath || relativePath === '') {
    return rootDir;
  }

  // Handle '.' as root directory
  if (relativePath === '.') {
    return rootDir;
  }

  // Strip leading './' if present
  if (relativePath.startsWith('./')) {
    relativePath = relativePath.slice(2);
  }

  return path.join(rootDir, relativePath);
}

/**
 * Check if .cocoignore file exists in the given directory
 * @param inputDir - The directory to check for .cocoignore
 * @returns '.cocoignore' if it exists, undefined otherwise (to fallback to .aidigestignore)
 */
export async function getIgnoreFile(inputDir: string): Promise<string | undefined> {
  try {
    const cocoIgnorePath = path.join(inputDir, '.cocoignore');
    await fs.access(cocoIgnorePath);
    return '.cocoignore';
  } catch {
    // .cocoignore doesn't exist, let ai-digest use default .aidigestignore
    return undefined;
  }
}
