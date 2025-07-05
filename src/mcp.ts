import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { spawn } from 'child_process';
import {
  searchFiles,
  buildTree,
  writeFileSecure,
} from './file-operations.js';
import { ToolInput } from './types.js';
import { generateCodebaseDigest } from './codebase-digest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read instructions file, but don't fail if it doesn't exist
let instructions = '';
try {
  instructions = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');
} catch (error) {
  console.error('Warning: instructions.md not found, continuing without instructions');
}

// File system schema definitions
const ReadFileArgsSchema = z.object({
  path: z
    .string()
    .describe(
      'Relative path from root directory (e.g., "file.txt", "folder/file.txt", "./file.txt")'
    ),
});

const WriteFileArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
  content: z.string(),
});

const CreateDirectoryArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
});

const ListDirectoryArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (use "./" or "." for root)'),
});

const DirectoryTreeArgsSchema = z.object({
  path: z
    .string()
    .optional()
    .default('./')
    .transform((p) => p || './')
    .describe('Relative path from root directory, with or without "./" prefix (defaults to root)'),
});

const MoveFileArgsSchema = z.object({
  source: z.string().describe('Relative path from root directory'),
  destination: z.string().describe('Relative path from root directory'),
});

const SearchFilesArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
  pattern: z.string(),
  excludePatterns: z.array(z.string()).optional().default([]),
});

const ExecuteCommandArgsSchema = z.object({
  command: z
    .string()
    .describe('The full command to execute (e.g., "npx -y ai-digest", "ls -la", "node script.js")'),
  timeout: z
    .number()
    .optional()
    .default(60000)
    .describe('Command timeout in milliseconds (default: 60 seconds)'),
  env: z.record(z.string()).optional().describe('Environment variables to set for the command'),
});

const GetCodebaseArgsSchema = z.object({
  path: z
    .string()
    .optional()
    .default('./')
    .describe('Relative path from root directory to analyze (defaults to root)'),
  page: z.number().optional().default(1).describe('Page number for pagination (defaults to 1)'),
});

// Helper function to resolve relative paths to the actual file system location
function resolveRelativePath(relativePath: string, rootDir: string): string {
  // Ensure the path starts with ./
  if (!relativePath.startsWith('./')) {
    relativePath = './' + relativePath;
  }

  // Remove ./ prefix and resolve against root directory
  const cleanPath = relativePath.slice(2);
  return path.join(rootDir, cleanPath);
}

// Validate that a path is relative and within bounds
function validateRelativePath(relativePath: string): void {
  // Normalize the path (add ./ prefix if missing for consistency)
  const pathToNormalize =
    relativePath.startsWith('./') || relativePath === '.' ? relativePath : './' + relativePath;

  // Normalize the path and check for directory traversal
  const normalized = path.normalize(pathToNormalize);
  if (normalized.includes('..')) {
    throw new Error(`Path cannot contain parent directory references (got: ${relativePath})`);
  }
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
    const tools: Tool[] = [
      {
        name: 'get_codebase',
        description:
          'Generate a a merged markdown file of the entire codebase.' +
          'Results are paginated.' +
          'If more content exists, a message will prompt to call again with the next page number. ' +
          'IMPORTANT: You should start each new conversation by calling get_codebase first to get the code into the context.',
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
          'Returns stdout, stderr, and exit code.',
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema) as ToolInput,
      },
    ];

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle file system tools
    try {
      switch (name) {
        case 'read_file': {
          const parsed = ReadFileArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
          }

          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          const content = await fs.readFile(absolutePath, 'utf-8');
          return {
            content: [{ type: 'text', text: content }],
          };
        }

        case 'write_file': {
          const parsed = WriteFileArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          // Ensure parent directory exists
          const parentDir = path.dirname(absolutePath);
          await fs.mkdir(parentDir, { recursive: true });

          await writeFileSecure(absolutePath, parsed.data.content);
          return {
            content: [{ type: 'text', text: `Successfully wrote to ${parsed.data.path}` }],
          };
        }

        case 'create_directory': {
          const parsed = CreateDirectoryArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          await fs.mkdir(absolutePath, { recursive: true });
          return {
            content: [{ type: 'text', text: `Successfully created directory ${parsed.data.path}` }],
          };
        }

        case 'list_directory': {
          const parsed = ListDirectoryArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const entries = await fs.readdir(absolutePath, { withFileTypes: true });
          const formatted = entries
            .map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`)
            .join('\n');
          return {
            content: [{ type: 'text', text: formatted }],
          };
        }

        case 'directory_tree': {
          const parsed = DirectoryTreeArgsSchema.safeParse(args || {});
          if (!parsed.success) {
            throw new Error(`Invalid arguments for directory_tree: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          const treeData = await buildTree(absolutePath, [absoluteRootDir], absoluteRootDir);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(treeData, null, 2),
              },
            ],
          };
        }

        case 'move_file': {
          const parsed = MoveFileArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.source);
          validateRelativePath(parsed.data.destination);
          const absoluteSource = resolveRelativePath(parsed.data.source, absoluteRootDir);
          const absoluteDest = resolveRelativePath(parsed.data.destination, absoluteRootDir);

          // Ensure destination parent directory exists
          const destParentDir = path.dirname(absoluteDest);
          await fs.mkdir(destParentDir, { recursive: true });

          await fs.rename(absoluteSource, absoluteDest);
          return {
            content: [
              {
                type: 'text',
                text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}`,
              },
            ],
          };
        }

        case 'search_files': {
          const parsed = SearchFilesArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const results = await searchFiles(
            absolutePath,
            parsed.data.pattern,
            parsed.data.excludePatterns
          );

          // Convert absolute paths back to relative paths for display
          const relativePaths = results.map((absPath) => {
            const relPath = path.relative(absoluteRootDir, absPath);
            return './' + relPath;
          });

          return {
            content: [
              {
                type: 'text',
                text: relativePaths.length > 0 ? relativePaths.join('\n') : 'No matches found',
              },
            ],
          };
        }

        case 'get_codebase': {
          const parsed = GetCodebaseArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for get_codebase: ${parsed.error}`);
          }

          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          try {
            const result = await generateCodebaseDigest({
              inputDir: absolutePath,
              page: parsed.data.page,
              pageSize: 99000, // Claude Desktop limits to 100,000 characters per page, so we leave some buffer
            });

            // The message is already in the correct format from codebase-digest.ts
            let content = result.content;

            return {
              content: [{ type: 'text', text: content }],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate codebase digest: ${errorMessage}`);
          }
        }

        case 'execute_command': {
          const parsed = ExecuteCommandArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for execute_command: ${parsed.error}`);
          }

          // Parse the command string into command and args
          const commandParts = parsed.data.command.trim().split(/\s+/);
          const command = commandParts[0];
          const commandArgs = commandParts.slice(1);

          // Merge environment variables
          const env = {
            ...process.env,
            ...parsed.data.env,
          };

          return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            const errorChunks: Buffer[] = [];

            // Spawn the child process
            const child = spawn(command, commandArgs, {
              cwd: absoluteRootDir,
              env,
              shell: false, // Use false for security - prevents shell injection
            });

            // Set up timeout
            const timeoutId = setTimeout(() => {
              child.kill('SIGTERM');
              setTimeout(() => {
                if (!child.killed) {
                  child.kill('SIGKILL');
                }
              }, 5000); // Give 5 seconds for graceful shutdown
            }, parsed.data.timeout);

            // Collect stdout
            child.stdout.on('data', (data) => {
              chunks.push(data);
            });

            // Collect stderr
            child.stderr.on('data', (data) => {
              errorChunks.push(data);
            });

            // Handle process exit
            child.on('close', (code, signal) => {
              clearTimeout(timeoutId);

              const stdout = Buffer.concat(chunks).toString('utf-8');
              const stderr = Buffer.concat(errorChunks).toString('utf-8');

              let output = '';

              if (stdout) {
                output += `=== stdout ===\n${stdout}\n`;
              }

              if (stderr) {
                output += `=== stderr ===\n${stderr}\n`;
              }

              output += `=== exit code: ${code ?? 'null'} ===`;

              if (signal) {
                output += `\n=== killed by signal: ${signal} ===`;
              }

              resolve({
                content: [{ type: 'text', text: output.trim() }],
                isError: code !== 0,
              });
            });

            // Handle spawn errors
            child.on('error', (error) => {
              clearTimeout(timeoutId);
              resolve({
                content: [{ type: 'text', text: `Failed to execute command: ${error.message}` }],
                isError: true,
              });
            });
          });
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
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
