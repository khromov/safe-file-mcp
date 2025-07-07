import path from 'path';

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
