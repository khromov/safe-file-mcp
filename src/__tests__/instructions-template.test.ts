import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Instructions Template Processing', () => {
  let originalEditMode: string | undefined;

  beforeEach(() => {
    // Save original edit mode
    originalEditMode = process.env.CONTEXT_CODER_EDIT_MODE;
  });

  afterEach(() => {
    // Restore original edit mode
    if (originalEditMode !== undefined) {
      process.env.CONTEXT_CODER_EDIT_MODE = originalEditMode;
    } else {
      delete process.env.CONTEXT_CODER_EDIT_MODE;
    }
  });

  describe('processInstructionsForEditMode', () => {
    const sampleInstructions = `
### 4. Modify with Confidence

Use editing tools to make changes:

{EDIT_FILE_TOOL_LIST}
- \`write_file\` - Create or completely overwrite files
- \`create_directory\` - Set up new directories

{EDITING_STRATEGY}

## Best Practices

3. {EFFICIENT_EDITING_PRACTICE}
    `;

    it('should replace placeholders when edit mode is enabled', () => {
      const result = processInstructionsForTestMode(sampleInstructions, true);

      // Check that placeholders are replaced
      expect(result).not.toContain('{EDIT_FILE_TOOL_LIST}');
      expect(result).not.toContain('{EDITING_STRATEGY}');
      expect(result).not.toContain('{EFFICIENT_EDITING_PRACTICE}');

      // Check that edit_file content is included
      expect(result).toContain('- `edit_file` - Make line-based partial edits to files');
      expect(result).toContain('Use `edit_file` for small, targeted changes');
      expect(result).toContain('write_file` when rewriting entire files');
    });

    it('should replace placeholders when edit mode is disabled', () => {
      const result = processInstructionsForTestMode(sampleInstructions, false);

      // Check that placeholders are replaced
      expect(result).not.toContain('{EDIT_FILE_TOOL_LIST}');
      expect(result).not.toContain('{EDITING_STRATEGY}');
      expect(result).not.toContain('{EFFICIENT_EDITING_PRACTICE}');

      // Check that edit_file content is NOT included
      expect(result).not.toContain('edit_file');

      // Check that correct content is included
      expect(result).toContain('Use `write_file` to create or completely overwrite files');
      expect(result).toContain('complete file rewrites');
    });

    it('should handle empty EDIT_FILE_TOOL_LIST placeholder correctly', () => {
      const result = processInstructionsForTestMode(sampleInstructions, false);

      // Check that the line with EDIT_FILE_TOOL_LIST is empty when edit mode is disabled
      const lines = result.split('\n');
      const editFileToolListLineIndex = lines.findIndex(
        (line) => line.includes('- `write_file`') && lines[lines.indexOf(line) - 1] === ''
      );

      expect(editFileToolListLineIndex).toBeGreaterThan(-1);
    });
  });
});

// Helper function that mimics the logic from mcp.ts
function processInstructionsForTestMode(instructions: string, editModeEnabled: boolean): string {
  let processed = instructions;

  if (editModeEnabled) {
    // Replace placeholders with edit_file enabled content
    processed = processed.replace(
      '{EDIT_FILE_TOOL_LIST}',
      '- `edit_file` - Make line-based partial edits to files'
    );
    processed = processed.replace(
      '{EDITING_STRATEGY}',
      '**Editing Strategy**: Use `edit_file` for small, targeted changes and `write_file` when rewriting entire files or making extensive changes.'
    );
    processed = processed.replace(
      '{EFFICIENT_EDITING_PRACTICE}',
      '**Efficient Editing**: Use `edit_file` for small changes, `write_file` for larger edits'
    );
  } else {
    // Replace placeholders with edit_file disabled content
    processed = processed.replace('{EDIT_FILE_TOOL_LIST}', '');
    processed = processed.replace(
      '{EDITING_STRATEGY}',
      '**Editing Strategy**: Use `write_file` to create or completely overwrite files with new content.'
    );
    processed = processed.replace(
      '{EFFICIENT_EDITING_PRACTICE}',
      '**Efficient Editing**: Use `write_file` for complete file rewrites'
    );
  }

  return processed;
}
