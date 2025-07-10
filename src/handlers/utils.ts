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
  // Handle empty path or current directory references as root directory
  if (!relativePath || relativePath === '' || relativePath === '.') {
    return rootDir;
  }

  // Strip leading './' if present
  const cleanPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath;
  return path.join(rootDir, cleanPath);
}

/**
 * Format a path for display by removing the leading './' if present.
 * This provides cleaner output in user-facing messages.
 *
 * @param filePath - The path to format
 * @returns The formatted path without leading './'
 *
 * @example
 * formatDisplayPath('./src/index.ts') // returns 'src/index.ts'
 * formatDisplayPath('src/index.ts')   // returns 'src/index.ts'
 * formatDisplayPath('')               // returns '(root)'
 * formatDisplayPath('.')              // returns '(root)'
 * formatDisplayPath('./')             // returns '(root)'
 */
export function formatDisplayPath(filePath: string): string {
  // Handle empty path or current directory references
  if (!filePath || filePath === '' || filePath === '.' || filePath === './') {
    return '(root)';
  }

  // Remove leading './' if present
  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}

/**
 * Normalize a file path for display by converting absolute paths to relative paths
 * and handling paths that are already relative.
 *
 * @param filePath - The file path to normalize
 * @param inputDir - The input directory to make paths relative to
 * @returns The normalized path for display
 */
export function normalizeDisplayPath(filePath: string, inputDir: string): string {
  return path.isAbsolute(filePath) ? path.relative(inputDir, filePath) : filePath;
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
