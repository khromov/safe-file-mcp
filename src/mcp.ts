import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getTools, ToolWithHandler } from './tools.js';
import { HandlerContext } from './types.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read instructions file, but don't fail if it doesn't exist
let instructions = '';
try {
  instructions = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');
} catch (error) {
  logger.warn('Warning: instructions.md not found, continuing without instructions');
}

// Define prompts for Claude Desktop and Claude Code
const prompts = [
  {
    name: 'claude-desktop-context-coder',
    title: 'Claude Desktop: Context Coder Setup',
    description:
      'Default starting prompt for using Context Coder with Claude Desktop. This prompt configures Claude to use the MCP tools properly and establishes the workflow.',
    arguments: [],
  },
  {
    name: 'claude-code-context-coder',
    title: 'Claude Code: Context Coder Setup',
    description:
      "Default starting prompt for using Context Coder with Claude Code. This prompt explains how to use both Claude Code's built-in tools and Context Coder together.",
    arguments: [],
  },
];

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
      version: '1.0.0',
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
    const toolsWithoutHandlers: Tool[] = tools.map(({ handler, ...tool }) => tool);
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

  // Add prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    const prompt = prompts.find((p) => p.name === name);

    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    if (name === 'claude-desktop-context-coder') {
      return {
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: "Use the Context Coder MCP to edit files. Remember that partial edits are not allowed, always write out the edited files in full through the MCP. You MUST call the get_codebase_size and get_codebase MCP tools at the start of every new chat. Do not call read_file, as you already have the codebase via get_codebase - use this reference instead. ONLY call read_file if you can't find the file in your context. Do not create any artifacts unless the user asks for it, just call the write_file tool directly with the updated code. If you get cut off when writing code and the user asks you to continue, continue from the last successfully written file to not omit anything.",
            },
          },
        ],
      };
    } else if (name === 'claude-code-context-coder') {
      return {
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You have access to both Claude Code's built-in file tools and the Context Coder MCP for enhanced codebase analysis. Follow this workflow:

1. ALWAYS start every new chat by calling get_codebase_size and get_codebase MCP tools to ingest and understand the full project context
2. Use Context Coder's codebase analysis as your primary reference - avoid reading files since you already have the complete codebase, only read file if you are missing something or if the user specifically requests it.
3. Remember: Context Coder gives you full codebase context, Claude Code gives you precise editing control - use both strategically`,
            },
          },
        ],
      };
    }

    // Should not reach here
    throw new Error(`Prompt implementation missing: ${name}`);
  });

  const cleanup = async () => {
    // Add any cleanup logic here if needed
  };

  return { server, cleanup };
};
