import { describe, it, expect } from '@jest/globals';
import { formatDisplayPath } from '../handlers/utils.js';
import { validateRelativePath } from '../handlers/utils.js';

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

describe('validateRelativePath', () => {
  it('should accept valid relative paths', () => {
    expect(() => validateRelativePath('./src/index.ts')).not.toThrow();
    expect(() => validateRelativePath('src/index.ts')).not.toThrow();
    expect(() => validateRelativePath('file.txt')).not.toThrow();
    expect(() => validateRelativePath('')).not.toThrow();
    expect(() => validateRelativePath('.')).not.toThrow();
    expect(() => validateRelativePath('./')).not.toThrow();
  });

  it('should accept SvelteKit route patterns', () => {
    // These should all be valid - they contain dots but no actual parent references
    expect(() => validateRelativePath('src/routes/mcp/[...rest]/+server.ts')).not.toThrow();
    expect(() => validateRelativePath('./src/routes/[id]/+page.svelte')).not.toThrow();
    expect(() => validateRelativePath('src/routes/[slug]/+layout.ts')).not.toThrow();
    expect(() => validateRelativePath('src/routes/(app)/[...catchall]/+page.svelte')).not.toThrow();
    expect(() => validateRelativePath('src/routes/[id]/edit/+page.server.ts')).not.toThrow();
    expect(() => validateRelativePath('components/[...props].svelte')).not.toThrow();
  });

  it('should accept paths with dots in filenames', () => {
    expect(() => validateRelativePath('file.name.with.dots.txt')).not.toThrow();
    expect(() => validateRelativePath('src/my.config.js')).not.toThrow();
    expect(() => validateRelativePath('.env.local')).not.toThrow();
    expect(() => validateRelativePath('.eslint...rc.js')).not.toThrow();
    expect(() => validateRelativePath('folder.with.dots/file.txt')).not.toThrow();
  });

  it('should reject actual parent directory references', () => {
    expect(() => validateRelativePath('../outside.txt')).toThrow(
      'Path cannot contain parent directory references'
    );
    expect(() => validateRelativePath('./src/../outside.txt')).toThrow(
      'Path cannot contain parent directory references'
    );
    expect(() => validateRelativePath('src/../../outside.txt')).toThrow(
      'Path cannot contain parent directory references'
    );
    expect(() => validateRelativePath('../')).toThrow(
      'Path cannot contain parent directory references'
    );
    expect(() => validateRelativePath('src/../')).toThrow(
      'Path cannot contain parent directory references'
    );
  });

  it('should reject paths that would escape the sandbox after normalization', () => {
    expect(() => validateRelativePath('src/subdir/../../../outside.txt')).toThrow(
      'Path cannot contain parent directory references'
    );
    expect(() => validateRelativePath('./folder/../..')).toThrow(
      'Path cannot contain parent directory references'
    );
  });

  it('should handle complex paths with mixed valid and invalid patterns', () => {
    // Valid: dots in filenames, not parent references
    expect(() => validateRelativePath('src/routes/[...rest]/+page.svelte')).not.toThrow();

    // Invalid: actual parent reference mixed with SvelteKit syntax
    expect(() => validateRelativePath('src/routes/../[...rest]/+page.svelte')).toThrow(
      'Path cannot contain parent directory references'
    );
  });
});
