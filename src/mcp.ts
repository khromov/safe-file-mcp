import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { z } from "zod";
import { spawn } from "child_process";
import {
  getFileStats,
  searchFiles,
  formatSize,
  buildTree,
  writeFileSecure,
} from './file-operations.js';
import { ToolInput } from './types.js';
import aiDigest from 'ai-digest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read instructions file, but don't fail if it doesn't exist
let instructions = "";
try {
  instructions = readFileSync(join(__dirname, "instructions.md"), "utf-8");
} catch (error) {
  console.error("Warning: instructions.md not found, continuing without instructions");
}

// File system schema definitions
const ReadFileArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (e.g., "file.txt", "folder/file.txt", "./file.txt")')
});

const ReadMultipleFilesArgsSchema = z.object({
  paths: z.array(z.string()).describe('Array of relative paths from root directory (with or without "./" prefix)'),
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

const ListDirectoryWithSizesArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
  sortBy: z.enum(['name', 'size']).optional().default('name').describe('Sort entries by name or size'),
});

const DirectoryTreeArgsSchema = z.object({
  path: z.string().optional().default('./').transform(p => p || './').describe('Relative path from root directory, with or without "./" prefix (defaults to root)'),
});

const MoveFileArgsSchema = z.object({
  source: z.string().describe('Relative path from root directory'),
  destination: z.string().describe('Relative path from root directory'),
});

const SearchFilesArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
  pattern: z.string(),
  excludePatterns: z.array(z.string()).optional().default([])
});

const GetFileInfoArgsSchema = z.object({
  path: z.string().describe('Relative path from root directory (with or without "./" prefix)'),
});

const ExecuteCommandArgsSchema = z.object({
  command: z.string().describe('The full command to execute (e.g., "npx -y ai-digest", "ls -la", "node script.js")'),
  timeout: z.number().optional().default(60000).describe('Command timeout in milliseconds (default: 60 seconds)'),
  env: z.record(z.string()).optional().describe('Environment variables to set for the command')
});

const GetCodebaseArgsSchema = z.object({
  path: z.string().optional().default('./').describe('Relative path from root directory to analyze (defaults to root)'),
  page: z.number().optional().default(1).describe('Page number for pagination (defaults to 1)')
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
  const pathToNormalize = relativePath.startsWith('./') || relativePath === '.' 
    ? relativePath 
    : './' + relativePath;
  
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
      name: "secure-filesystem-server",
      version: "0.3.0",
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
      instructions
    }
  );

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'complex_prompt',
          description: "A prompt with arguments",
          arguments: [
            {
              name: "temperature",
              description: "Temperature setting",
              required: true,
            },
            {
              name: "style",
              description: "Output style",
              required: false,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'complex_prompt') {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `This is a complex prompt with arguments: temperature=${args?.temperature}, style=${args?.style}`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I understand. You've provided a complex prompt with temperature and style arguments. How would you like me to proceed?",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please generate an image with the following parameters.",
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: "read_root_directory",
        description:
          "Read the contents of the root directory. This should be your first command when exploring the file system. " +
          "After calling this, use relative paths for all other file operations " +
          "(e.g., 'file.txt' or './file.txt' for a file in root, 'folder/file.txt' or './folder/file.txt' for a file in a subdirectory).",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "read_file",
        description:
          "Read the complete contents of a file from the file system. " +
          "Use relative paths with or without './' prefix (e.g., 'file.txt', './file.txt', 'folder/file.txt').",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema) as ToolInput,
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. " +
          "Use relative paths with or without './' prefix for each file. " +
          "More efficient than reading files one by one when you need to analyze or compare multiple files.",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema) as ToolInput,
      },
      {
        name: "write_file",
        description:
          "Create a new file or completely overwrite an existing file with new content. " +
          "Use relative paths with or without './' prefix (e.g., 'newfile.txt', './folder/file.txt'). " +
          "Use with caution as it will overwrite existing files without warning.",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema) as ToolInput,
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. " +
          "Use relative paths with or without './' prefix (e.g., 'newfolder', './parent/child'). " +
          "Can create multiple nested directories in one operation.",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema) as ToolInput,
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Use relative paths with or without './' prefix (use './' or '.' for root directory). " +
          "Results show [FILE] and [DIR] prefixes to distinguish between files and directories.",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema) as ToolInput,
      },
      {
        name: "list_directory_with_sizes",
        description:
          "Get a detailed listing of all files and directories in a specified path, including file sizes. " +
          "Use relative paths with or without './' prefix (use './' or '.' for root directory). " +
          "Results can be sorted by name or size.",
        inputSchema: zodToJsonSchema(ListDirectoryWithSizesArgsSchema) as ToolInput,
      },
      {
        name: "directory_tree",
        description:
            "Get a recursive tree view of files and directories as a JSON structure. " +
            "Path is optional - if not provided, shows the root directory. " +
            "Returns a structured view of the entire directory hierarchy.",
        inputSchema: zodToJsonSchema(DirectoryTreeArgsSchema) as ToolInput,
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. " +
          "Use relative paths with or without './' prefix for both source and destination. " +
          "Can move files between directories and rename them in a single operation.",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema) as ToolInput,
      },
      {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "Use relative paths with or without './' prefix for the search root. " +
          "The search is case-insensitive and matches partial names.",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema) as ToolInput,
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory. " +
          "Use relative paths with or without './' prefix (e.g., 'file.txt', './folder'). " +
          "Returns information including size, timestamps, permissions, and type.",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema) as ToolInput,
      },
      {
        name: "execute_command",
        description:
          "Execute a shell command with controlled environment. " +
          "Pass the full command as a string (e.g., 'npx -y ai-digest', 'ls -la'). " +
          "Commands are executed with a 60-second timeout to prevent hanging. " +
          "Returns stdout, stderr, and exit code.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema) as ToolInput,
      },
      {
        name: "get_codebase",
        description:
          "Generate a comprehensive digest of the codebase using ai-digest. " +
          "Returns a structured summary of all code files in the specified directory. " +
          "Results are paginated (100,000 characters per page). " +
          "If more content exists, a message will prompt to call again with the next page number.",
        inputSchema: zodToJsonSchema(GetCodebaseArgsSchema) as ToolInput,
      },
    ];

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle file system tools
    try {
      switch (name) {
        case "read_root_directory": {
          try {
            const entries = await fs.readdir(absoluteRootDir, { withFileTypes: true });
            const formatted = entries
              .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
              .join("\n");
            
            const instructions = "\n\nUse relative paths for all file operations (with or without './' prefix). " +
              "For example: 'file.txt' or './file.txt' for files in root, 'folder/file.txt' or './folder/file.txt' for files in subdirectories.";
            
            return {
              content: [{ type: "text", text: formatted + instructions }],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read root directory: ${errorMessage}`);
          }
        }

        case "read_file": {
          const parsed = ReadFileArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
          }
          
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          
          const content = await fs.readFile(absolutePath, "utf-8");
          return {
            content: [{ type: "text", text: content }],
          };
        }

        case "read_multiple_files": {
          const parsed = ReadMultipleFilesArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for read_multiple_files: ${parsed.error}`);
          }
          const results = await Promise.all(
            parsed.data.paths.map(async (filePath: string) => {
              try {
                validateRelativePath(filePath);
                const absolutePath = resolveRelativePath(filePath, absoluteRootDir);
                const content = await fs.readFile(absolutePath, "utf-8");
                return `${filePath}:\n${content}\n`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return `${filePath}: Error - ${errorMessage}`;
              }
            }),
          );
          return {
            content: [{ type: "text", text: results.join("\n---\n") }],
          };
        }

        case "write_file": {
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
            content: [{ type: "text", text: `Successfully wrote to ${parsed.data.path}` }],
          };
        }

        case "create_directory": {
          const parsed = CreateDirectoryArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          await fs.mkdir(absolutePath, { recursive: true });
          return {
            content: [{ type: "text", text: `Successfully created directory ${parsed.data.path}` }],
          };
        }

        case "list_directory": {
          const parsed = ListDirectoryArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const entries = await fs.readdir(absolutePath, { withFileTypes: true });
          const formatted = entries
            .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
            .join("\n");
          return {
            content: [{ type: "text", text: formatted }],
          };
        }

        case "list_directory_with_sizes": {
          const parsed = ListDirectoryWithSizesArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for list_directory_with_sizes: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const entries = await fs.readdir(absolutePath, { withFileTypes: true });
          
          const detailedEntries = await Promise.all(
            entries.map(async (entry) => {
              const entryPath = path.join(absolutePath, entry.name);
              try {
                const stats = await fs.stat(entryPath);
                return {
                  name: entry.name,
                  isDirectory: entry.isDirectory(),
                  size: stats.size,
                  mtime: stats.mtime
                };
              } catch (error) {
                return {
                  name: entry.name,
                  isDirectory: entry.isDirectory(),
                  size: 0,
                  mtime: new Date(0)
                };
              }
            })
          );
          
          const sortedEntries = [...detailedEntries].sort((a, b) => {
            if (parsed.data.sortBy === 'size') {
              return b.size - a.size;
            }
            return a.name.localeCompare(b.name);
          });
          
          const formattedEntries = sortedEntries.map(entry => 
            `${entry.isDirectory ? "[DIR]" : "[FILE]"} ${entry.name.padEnd(30)} ${
              entry.isDirectory ? "" : formatSize(entry.size).padStart(10)
            }`
          );
          
          const totalFiles = detailedEntries.filter(e => !e.isDirectory).length;
          const totalDirs = detailedEntries.filter(e => e.isDirectory).length;
          const totalSize = detailedEntries.reduce((sum, entry) => sum + (entry.isDirectory ? 0 : entry.size), 0);
          
          const summary = [
            "",
            `Total: ${totalFiles} files, ${totalDirs} directories`,
            `Combined size: ${formatSize(totalSize)}`
          ];
          
          return {
            content: [{ 
              type: "text", 
              text: [...formattedEntries, ...summary].join("\n") 
            }],
          };
        }

        case "directory_tree": {
          const parsed = DirectoryTreeArgsSchema.safeParse(args || {});
          if (!parsed.success) {
            throw new Error(`Invalid arguments for directory_tree: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);

          const treeData = await buildTree(absolutePath, [absoluteRootDir], absoluteRootDir);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(treeData, null, 2)
            }],
          };
        }

        case "move_file": {
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
            content: [{ type: "text", text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}` }],
          };
        }

        case "search_files": {
          const parsed = SearchFilesArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const results = await searchFiles(absolutePath, parsed.data.pattern, parsed.data.excludePatterns);
          
          // Convert absolute paths back to relative paths for display
          const relativePaths = results.map(absPath => {
            const relPath = path.relative(absoluteRootDir, absPath);
            return './' + relPath;
          });
          
          return {
            content: [{ type: "text", text: relativePaths.length > 0 ? relativePaths.join("\n") : "No matches found" }],
          };
        }

        case "get_file_info": {
          const parsed = GetFileInfoArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for get_file_info: ${parsed.error}`);
          }
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          const info = await getFileStats(absolutePath);
          return {
            content: [{ type: "text", text: Object.entries(info)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n") }],
          };
        }

        case "get_codebase": {
          const parsed = GetCodebaseArgsSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for get_codebase: ${parsed.error}`);
          }
          
          validateRelativePath(parsed.data.path);
          const absolutePath = resolveRelativePath(parsed.data.path, absoluteRootDir);
          
          try {
            const { files } = await aiDigest.generateDigestFiles({
              inputDir: absolutePath,
              silent: true
            });

            const PAGE_SIZE = 99000; // Claude Desktop limits to 100,000 characters per page, so we leave some buffer
            const requestedPage = parsed.data.page;
            
            let currentPage = 1;
            let currentPageContent = '';
            let currentPageCharCount = 0;
            let totalCharCount = 0;
            
            for (const file of files) {
              let fileContent = file.content;
              let fileCharCount = fileContent.length;
              
              // If file is larger than page size, replace with omission message
              if (fileCharCount > PAGE_SIZE) {
                const omissionMessage = `# ${file.fileName}\nFile omitted due to large size (${fileCharCount.toLocaleString()} characters)\n`;
                fileContent = omissionMessage;
                fileCharCount = omissionMessage.length;
              }
              
              // Check if adding this file would exceed the page size
              if (currentPageCharCount + fileCharCount > PAGE_SIZE && currentPageCharCount > 0) {
                // Move to next page
                if (currentPage === requestedPage) {
                  // We've collected the requested page, stop here
                  break;
                }
                currentPage++;
                currentPageContent = '';
                currentPageCharCount = 0;
              }
              
              // Add file to current page if we're on the requested page
              if (currentPage === requestedPage) {
                currentPageContent += fileContent;
                currentPageCharCount += fileCharCount;
              }
              
              totalCharCount += fileCharCount;
            }
            
            // Check if there are more pages
            const hasMorePages = totalCharCount > requestedPage * PAGE_SIZE;
            
            if (hasMorePages) {
              currentPageContent += `\n\n---\nThis is page ${requestedPage}. To see more files, call this tool again with page: ${requestedPage + 1}\n`;
            }
            
            return {
              content: [{ type: "text", text: currentPageContent }],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate codebase digest: ${errorMessage}`);
          }
        }

        case "execute_command": {
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
            ...parsed.data.env
          };

          return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            const errorChunks: Buffer[] = [];
            
            // Spawn the child process
            const child = spawn(command, commandArgs, {
              cwd: absoluteRootDir,
              env,
              shell: false // Use false for security - prevents shell injection
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
                content: [{ type: "text", text: output.trim() }],
                isError: code !== 0
              });
            });

            // Handle spawn errors
            child.on('error', (error) => {
              clearTimeout(timeoutId);
              resolve({
                content: [{ type: "text", text: `Failed to execute command: ${error.message}` }],
                isError: true
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
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  const cleanup = async () => {
    // Add any cleanup logic here if needed
  };

  return { server, cleanup };
};