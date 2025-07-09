import path from 'path';
import fs from 'fs/promises';

export function validateRelativePath(relativePath: string): void {
  const pathToNormalize =
    relativePath.startsWith('./') || relativePath === '.' ? relativePath : './' + relativePath;
  const normalized = path.normalize(pathToNormalize);
  if (normalized.includes('..')) {
    throw new Error(`Path cannot contain parent directory references (got: ${relativePath})`);
  }
}

export function resolveRelativePath(relativePath: string, rootDir: string): string {
  if (!relativePath.startsWith('./')) {
    relativePath = './' + relativePath;
  }
  const cleanPath = relativePath.slice(2);
  return path.join(rootDir, cleanPath);
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
