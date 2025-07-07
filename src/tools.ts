import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GetCodebaseSizeArgsSchema,
  GetCodebaseArgsSchema,
  ReadFileArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  DirectoryTreeArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  ExecuteCommandArgsSchema,
} from './schemas.js';
import { ToolInput } from './types.js';

export const tools: Tool[] = [
  {
    name: 'get_codebase_size',
    description:
      'Check the codebase size and token counts before processing. ' +
      'Returns token counts for Claude and ChatGPT, warns if the codebase is too large, ' +
      'and shows the largest files. ' +
      'IMPORTANT: You should ALWAYS run this tool at the start of EVERY NEW CONVERSATION before any other operations. ' +
      'After running this tool, you should then call get_codebase to retrieve the actual code.',
    inputSchema: zodToJsonSchema(GetCodebaseSizeArgsSchema) as ToolInput,
  },
  {
    name: 'get_codebase',
    description:
      'Generate a a merged markdown file of the entire codebase.' +
      'Results are paginated.' +
      'If more content exists, a message will prompt to call again with the next page number.',
    inputSchema: zodToJsonSchema(GetCodebaseArgsSchema) as ToolInput,
  },
  {
    name: 'read_file',
    description:
      'Read the complete contents of a file from the file system. ' +
      "Use relative paths with or without './' prefix (e.g., 'file.txt', './file.txt', 'folder/file.txt'). " +
      'IMPORTANT: You should NEVER call this unless the user specifically asks to re-read a file OR you get stuck and need it to debug something.',
    inputSchema: zodToJsonSchema(ReadFileArgsSchema) as ToolInput,
  },
  {
    name: 'write_file',
    description:
      'Create a new file or completely overwrite an existing file with new content. ' +
      "Use relative paths with or without './' prefix (e.g., 'newfile.txt', './folder/file.txt'). " +
      'You must write out the file in full each time you call write_file.',
    inputSchema: zodToJsonSchema(WriteFileArgsSchema) as ToolInput,
  },
  {
    name: 'create_directory',
    description:
      'Create a new directory or ensure a directory exists. ' +
      "Use relative paths with or without './' prefix (e.g., 'newfolder', './parent/child'). " +
      'Can create multiple nested directories in one operation.',
    inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema) as ToolInput,
  },
  {
    name: 'list_directory',
    description:
      'Get a detailed listing of all files and directories in a specified path. ' +
      "Use relative paths with or without './' prefix (use './' or '.' for root directory). " +
      'Results show [FILE] and [DIR] prefixes to distinguish between files and directories. ' +
      'IMPORTANT: You should NEVER call this unless the user specifically asks to find all the files in a directory or use this tool OR you get stuck and need it to debug something.',
    inputSchema: zodToJsonSchema(ListDirectoryArgsSchema) as ToolInput,
  },
  {
    name: 'directory_tree',
    description:
      'Get a recursive tree view of files and directories as a JSON structure. ' +
      'Path is optional - if not provided, shows the root directory. ' +
      'Returns a structured view of the entire directory hierarchy. ' +
      'IMPORTANT: You should NEVER call this UNLESS the user specifically asks for it OR you get stuck and need it to debug something.',
    inputSchema: zodToJsonSchema(DirectoryTreeArgsSchema) as ToolInput,
  },
  {
    name: 'move_file',
    description:
      'Move or rename files and directories. ' +
      "Use relative paths with or without './' prefix for both source and destination. " +
      'Can move files between directories and rename them in a single operation.',
    inputSchema: zodToJsonSchema(MoveFileArgsSchema) as ToolInput,
  },
  {
    name: 'search_files',
    description:
      'Recursively search for files and directories matching a pattern. ' +
      "Use relative paths with or without './' prefix for the search root. " +
      'The search is case-insensitive and matches partial names.',
    inputSchema: zodToJsonSchema(SearchFilesArgsSchema) as ToolInput,
  },
  {
    name: 'execute_command',
    description:
      'Execute a shell command with controlled environment. ' +
      "Pass the full command as a string (e.g., 'npx -y ai-digest', 'ls -la'). " +
      'Commands are executed with a 60-second timeout to prevent hanging. ' +
      'Returns stdout, stderr, and exit code. ' +
      'Available CLI tools include: fzf (fuzzy finder), gh (GitHub CLI), jq (JSON processor), ' +
      'dig/nslookup (DNS tools), iptables/ipset (network tools), claude-code (Claude CLI).',
    inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema) as ToolInput,
  },
];
