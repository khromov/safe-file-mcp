import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getTools } from './tools.js';
import { HandlerContext } from './types.js';
import logger from './logger.js';
import { prompts, getPromptContent } from './lib/prompts.js';
import { getVersion } from './lib/version.js';

/**
 * Process instructions.md content based on edit mode
 * Replaces template placeholders with appropriate content
 */
function processInstructionsForEditMode(instructions: string, editModeEnabled: boolean): string {
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read instructions file, but don't fail if it doesn't exist
let instructions = '';
try {
  instructions = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');

  // Process instructions based on edit mode
  const editModeEnabled = process.env.CONTEXT_CODER_EDIT_MODE === 'true';
  instructions = processInstructionsForEditMode(instructions, editModeEnabled);
} catch {
  logger.warn('Warning: instructions.md not found, continuing without instructions');
}

export const createServer = async () => {
  // Determine the root directory based on environment
  const ROOT_DIR = process.env.COCO_DEV === 'true' ? './mount' : './';

  // Resolve to absolute path for internal use only
  const absoluteRootDir = path.resolve(ROOT_DIR);

  // Get tools based on current mode
  const tools = getTools();

  const server = new Server(
    {
      name: 'context-coder',
      version: getVersion(),
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
      instructions,
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Convert ToolWithHandler[] to Tool[] for the response
    const toolsWithoutHandlers: Tool[] = tools.map(({ handler: _handler, ...tool }) => tool);
    return { tools: toolsWithoutHandlers };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool by name
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Error: Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Create handler context
    const context: HandlerContext = {
      absoluteRootDir,
    };

    // Execute the handler
    try {
      return await tool.handler(args, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async (data, requestHandler) => {
  const userAgent = requestHandler.requestInfo?.headers?.['user-agent'] || '';
  const isClaudeCode = userAgent.includes('claude-code');
  const isClaudeDesktop = userAgent.includes('claude-desktop');
  
  logger.info(
    `👤 User-Agent: ${userAgent}, Claude Code: ${isClaudeCode}, Claude Desktop: ${isClaudeDesktop}`
  );

  // Find available prompts
  const claudeCodePrompt = prompts.find(p => p.name === 'context-coder-claude-code');
  const claudeDesktopPrompt = prompts.find(p => p.name === 'context-coder-claude-desktop');

  // Filter prompts based on user agent
  const filteredPrompts: Prompt[] = (() => {
    if (isClaudeCode && claudeCodePrompt) return [claudeCodePrompt];
    if (isClaudeDesktop && claudeDesktopPrompt) return [claudeDesktopPrompt];
    return [claudeCodePrompt, claudeDesktopPrompt].filter(Boolean);
  })();

  logger.info(`📜 Returned ${filteredPrompts.length} prompts`);
  return { prompts: filteredPrompts };
});

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const prompt = prompts.find((p) => p.name === name);

    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    const promptMessages = getPromptContent(name, args);

    return {
      description: prompt.description,
      messages: promptMessages,
    };
  });

  const cleanup = async () => {
    // Add any cleanup logic here if needed
  };

  return { server, cleanup };
};
