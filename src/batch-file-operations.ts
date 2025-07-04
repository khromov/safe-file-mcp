import fs from 'fs/promises';
import path from 'path';
import { writeFileSecure } from './file-operations.js';

export interface FileToWrite {
  path: string;
  content: string;
}

export interface WriteResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface WriteBatchResult {
  results: WriteResult[];
  successCount: number;
  failureCount: number;
  summary: string;
}

/**
 * Validate that a path is relative and within bounds
 */
export function validateRelativePath(relativePath: string): void {
  // Check for parent directory references in the original path before normalization
  if (relativePath.includes('..')) {
    throw new Error(`Path cannot contain parent directory references (got: ${relativePath})`);
  }

  // Normalize the path (add ./ prefix if missing for consistency)
  const pathToNormalize =
    relativePath.startsWith('./') || relativePath === '.' ? relativePath : './' + relativePath;

  // Additional normalization check as a safety measure
  const normalized = path.normalize(pathToNormalize);
  if (normalized.includes('..')) {
    throw new Error(`Path cannot contain parent directory references (got: ${relativePath})`);
  }
}

/**
 * Resolve relative paths to the actual file system location
 */
export function resolveRelativePath(relativePath: string, rootDir: string): string {
  // Ensure the path starts with ./
  if (!relativePath.startsWith('./')) {
    relativePath = './' + relativePath;
  }

  // Remove ./ prefix and resolve against root directory
  const cleanPath = relativePath.slice(2);
  return path.join(rootDir, cleanPath);
}

/**
 * Write multiple files in a batch operation with parallel processing
 */
export async function writeMultipleFiles(
  files: FileToWrite[],
  rootDir: string
): Promise<WriteBatchResult> {
  const results = await Promise.all(
    files.map(async (file): Promise<WriteResult> => {
      try {
        validateRelativePath(file.path);
        const absolutePath = resolveRelativePath(file.path, rootDir);

        // Ensure parent directory exists
        const parentDir = path.dirname(absolutePath);
        await fs.mkdir(parentDir, { recursive: true });

        await writeFileSecure(absolutePath, file.content);
        return {
          path: file.path,
          success: true,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          path: file.path,
          success: false,
          error: errorMessage,
        };
      }
    })
  );

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  const formattedResults = results.map((result) =>
    result.success ? `✓ ${result.path}` : `✗ ${result.path}: ${result.error}`
  );

  const summary = `Successfully wrote ${successCount} file(s)${
    failureCount > 0 ? `, ${failureCount} failed` : ''
  }:\n\n${formattedResults.join('\n')}`;

  return {
    results,
    successCount,
    failureCount,
    summary,
  };
}
