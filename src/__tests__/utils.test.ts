import { describe, it, expect } from '@jest/globals';
import { formatDisplayPath } from '../handlers/utils.js';

describe('formatDisplayPath', () => {
  it('should remove leading ./ from paths', () => {
    expect(formatDisplayPath('./src/index.ts')).toBe('src/index.ts');
    expect(formatDisplayPath('./file.txt')).toBe('file.txt');
    expect(formatDisplayPath('./deeply/nested/path.js')).toBe('deeply/nested/path.js');
  });

  it('should return paths without ./ unchanged', () => {
    expect(formatDisplayPath('src/index.ts')).toBe('src/index.ts');
    expect(formatDisplayPath('file.txt')).toBe('file.txt');
    expect(formatDisplayPath('deeply/nested/path.js')).toBe('deeply/nested/path.js');
  });

  it('should handle root directory references', () => {
    expect(formatDisplayPath('')).toBe('(root)');
    expect(formatDisplayPath('.')).toBe('(root)');
    expect(formatDisplayPath('./')).toBe('(root)');
  });

  it('should handle edge cases', () => {
    // Path that starts with . but not ./
    expect(formatDisplayPath('.hidden-file')).toBe('.hidden-file');
    expect(formatDisplayPath('.config/settings.json')).toBe('.config/settings.json');

    // Path with ./ in the middle
    expect(formatDisplayPath('src/./utils.ts')).toBe('src/./utils.ts');
  });
});
