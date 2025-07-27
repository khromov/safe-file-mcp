import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getPromptContent } from '../lib/prompts.js';

describe('Edit Mode Conditional Logic', () => {
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

  describe('Prompt Content Generation', () => {
    it('should include edit_file when edit mode is enabled', () => {
      // Set edit mode enabled (default)
      process.env.CONTEXT_CODER_EDIT_MODE = 'true';

      const desktopPrompt = getPromptContent('context-coder-claude-desktop');
      const codePrompt = getPromptContent('context-coder-claude-code');

      // Check desktop prompt includes edit_file
      expect(desktopPrompt[0].content.text).toContain('edit_file');
      expect(desktopPrompt[0].content.text).toContain('line-based partial edits');

      // Check code prompt includes edit_file
      expect(codePrompt[0].content.text).toContain('edit_file');
      expect(codePrompt[0].content.text).toContain('line-based partial edits');
    });

    it('should exclude edit_file when edit mode is disabled', () => {
      // Set edit mode disabled
      process.env.CONTEXT_CODER_EDIT_MODE = 'false';

      const desktopPrompt = getPromptContent('context-coder-claude-desktop');
      const codePrompt = getPromptContent('context-coder-claude-code');

      // Check desktop prompt excludes edit_file
      expect(desktopPrompt[0].content.text).not.toContain('edit_file');
      expect(desktopPrompt[0].content.text).toContain('write_file tool for complete file rewrites');

      // Check code prompt excludes edit_file
      expect(codePrompt[0].content.text).not.toContain('edit_file');
      expect(codePrompt[0].content.text).toContain('write_file tool for complete file rewrites');
    });

    it('should default to edit mode enabled when env var is not set', () => {
      // Remove env var to test default behavior
      delete process.env.CONTEXT_CODER_EDIT_MODE;

      const desktopPrompt = getPromptContent('context-coder-claude-desktop');

      // Should default to edit mode enabled
      expect(desktopPrompt[0].content.text).toContain('edit_file');
    });
  });

  describe('Instructions Processing', () => {
    it('should process instructions correctly for both modes', () => {
      // Sample instructions with placeholders (like the real instructions.md)
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

      // Test with edit mode enabled
      const enabledResult = processInstructionsForTestMode(sampleInstructions, true);
      expect(enabledResult).toContain('edit_file');
      expect(enabledResult).toContain('line-based partial edits');
      expect(enabledResult).not.toContain('{EDIT_FILE_TOOL_LIST}'); // Placeholder should be replaced

      // Test with edit mode disabled
      const disabledResult = processInstructionsForTestMode(sampleInstructions, false);
      expect(disabledResult).not.toContain('edit_file');
      expect(disabledResult).toContain('Use `write_file` to create or completely overwrite files');
      expect(disabledResult).not.toContain('{EDITING_STRATEGY}'); // Placeholder should be replaced
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
      '- `edit_file` - Make line-based partial edits to files (enabled by default)'
    );
    processed = processed.replace(
      '{EDITING_STRATEGY}',
      '**Editing Strategy**: Use `edit_file` for small, targeted changes and `write_file` when rewriting entire files or making extensive changes. The `edit_file` tool is enabled by default and provides more efficient editing for small modifications.'
    );
    processed = processed.replace(
      '{EFFICIENT_EDITING_PRACTICE}',
      '**Efficient Editing**: Use `edit_file` for small changes, `write_file` for complete rewrites'
    );
  } else {
    // Replace placeholders with edit_file disabled content
    processed = processed.replace(
      '{EDIT_FILE_TOOL_LIST}',
      ''
    );
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
