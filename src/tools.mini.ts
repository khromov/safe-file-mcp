import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GetCodebaseSizeArgsSchema,
  GetCodebaseArgsSchema,
  GetCodebaseTopLargestFilesArgsSchema,
} from './schemas.js';
import { ToolInput, ToolHandler } from './types.js';

// Import handlers
import { handleGetCodebaseSize } from './handlers/get_codebase_size.js';
import { handleGetCodebase } from './handlers/get_codebase.js';
import { handleGetCodebaseTopLargestFiles } from './handlers/get_codebase_top_largest_files.js';

// Extend Tool type to include handler
export interface ToolWithHandler extends Tool {
  handler: ToolHandler;
}

export const tools: ToolWithHandler[] = [
  {
    name: 'get_codebase_size',
    description:
      'Check the codebase size and token counts before processing. ' +
      'Returns token counts for Claude and ChatGPT, warns if the codebase is too large, ' +
      'and shows the largest files. ' +
      'IMPORTANT: You should ALWAYS run this tool at the start of EVERY NEW CONVERSATION before any other operations. ' +
      'After running this tool, you should then call get_codebase to retrieve the actual code.',
    inputSchema: zodToJsonSchema(GetCodebaseSizeArgsSchema) as ToolInput,
    handler: handleGetCodebaseSize,
  },
  {
    name: 'get_codebase',
    description:
      'Generate a a merged markdown file of the entire codebase.' +
      'Results are paginated.' +
      'If more content exists, a message will prompt to call again with the next page number.',
    inputSchema: zodToJsonSchema(GetCodebaseArgsSchema) as ToolInput,
    handler: handleGetCodebase,
  },
  {
    name: 'get_codebase_top_largest_files',
    description:
      'Returns the top X largest files in the codebase. ' +
      'Use this tool when users want to see more large files beyond the initial 10 shown in get_codebase_size. ' +
      'Helpful for identifying which files to add to .cocoignore for large codebases.',
    inputSchema: zodToJsonSchema(GetCodebaseTopLargestFilesArgsSchema) as ToolInput,
    handler: handleGetCodebaseTopLargestFiles,
  },
];
