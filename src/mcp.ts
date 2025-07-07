import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import {
  searchFiles,
  buildTree,
  writeFileSecure,
} from './file-operations.js';
import { generateCodebaseDigest, getCodebaseSize } from './codebase-digest.js';
import { tools } from './tools.js';
import {
  ReadFileArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  DirectoryTreeArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  ExecuteCommandArgsSchema,
  GetCodebaseArgsSchema,
  GetCodebaseSizeArgsSchema,
} from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read instructions file, but don't fail if it doesn't exist
let instructions = '';
try {
  instructions = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');
} catch (error) {
  console.error('Warning: instructions.md not found, continuing without instructions');
}

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
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle file system tools
    try {
      switch (name) {
        case 'get_codebase_size': {
          const parsed = GetCodebaseSizeArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for get_codebase_size: ${parsed.error}`);
          }

          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          try {
            console.log(`Getting file statistics for path: ${absolutePath}`);
            
            const result = await getCodebaseSize({
              inputDir: absolutePath
            });

            console.log(`Total Claude tokens: ${result.totalClaudeTokens}, Total GPT tokens: ${result.totalGptTokens}`);
            
            return {
              content: [{ type: 'text', text: result.content }],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get codebase statistics: ${errorMessage}`);
          }
        }

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
            console.log(`Generating codebase digest for path: ${absolutePath}`);
            const result = await generateCodebaseDigest({
              inputDir: absolutePath,
              page: parsed.data.page,
              pageSize: 99000, // Claude Desktop limits to 100,000 characters per page, so we leave some buffer
            });
            console.log(`Generated codebase digest with length: ${result.content.length}`);

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
