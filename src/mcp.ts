import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tools, ToolWithHandler } from './tools.js';
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

export const createServer = async () => {
  // Determine the root directory based on environment
  const ROOT_DIR = process.env.NODE_ENV === 'development' ? './mount' : './';

  // Resolve to absolute path for internal use only
  const absoluteRootDir = path.resolve(ROOT_DIR);

  const server = new Server(
    {
      name: 'coco-mcp',
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

  const cleanup = async () => {
    // Add any cleanup logic here if needed
  };

  return { server, cleanup };
};
