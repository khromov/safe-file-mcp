#!/usr/bin/env node

import { program } from 'commander';
import logger, { configureLogger } from './logger.js';
import { getVersion } from './lib/version.js';

// Async function to run the server
async function runServer(options: any, _command: any) {
  // Store port from command line argument (don't override env)
  const serverPort = options.port;

  // Store token limits from command line arguments
  if (options.claudeTokenLimit) {
    process.env.COCO_CLAUDE_TOKEN_LIMIT = options.claudeTokenLimit.toString();
  }
  if (options.gptTokenLimit) {
    process.env.COCO_GPT_TOKEN_LIMIT = options.gptTokenLimit.toString();
  }

  // Determine mode based on command line flags
  // Default to full for npx usage, mini/full passed explicitly by Docker entrypoint
  let isFullMode = true; // Default to full

  if (options.mini) {
    isFullMode = false;
  } else if (options.full) {
    isFullMode = true;
  }

  let transportMode = 'http'; // Default to http
  if (process.env.COCO_MCP_TRANSPORT) {
    transportMode = process.env.COCO_MCP_TRANSPORT;
  } else if (options.stdio) {
    transportMode = 'stdio';
  }

  // Set the mode globally for other modules to access
  const mode = isFullMode ? 'full' : 'mini';
  process.env.CONTEXT_CODER_MODE = mode;

  if (options.editFileMode || options.edit) {
    process.env.CONTEXT_CODER_EDIT_MODE = 'true';
  }

  // Configure logger with the resolved transport mode
  configureLogger(transportMode);

  // Log startup information
  logger.info(`Current directory: ${process.cwd()}`);

  try {
    if (transportMode === 'stdio') {
      const { startStdioServer } = await import('./stdio.js');
      await startStdioServer();
    } else {
      const { startHttpServer } = await import('./streamableHttp.js');
      await startHttpServer(serverPort);
    }
  } catch (error) {
    logger.error('Error running server:', error);
    process.exit(1);
  }
}

// Configure the main program
program
  .version(getVersion())
  .name('context-coder')
  .description('Context Coder: MCP server for full-context coding')
  .option('-m, --mini', 'run in mini mode (only core tools)')
  .option('-f, --full', 'run in full mode (all tools)')
  .option('-s, --stdio', 'use stdio transport instead of HTTP')
  .option('-e, --edit', 'use edit_file tool instead of write_file (partial edits)')
  .option('--edit-file-mode', 'use edit_file tool instead of write_file (partial edits)')
  .option('-p, --port <number>', 'port to listen on (default: 3001)', parseInt)
  .option(
    '--large-repo-token-limit-claude <number>',
    'set Claude token limit for large repository detection (default: 150000)',
    parseInt
  )
  .option(
    '--claude-limit <number>',
    'short version: set Claude token limit for large repository detection',
    parseInt
  )
  .option(
    '--large-repo-token-limit-gpt <number>',
    'set GPT token limit for large repository detection (default: 128000)',
    parseInt
  )
  .option(
    '--gpt-limit <number>',
    'short version: set GPT token limit for large repository detection',
    parseInt
  )
  .action((options) => {
    // Handle both long and short versions of token limit flags
    // Short versions take precedence if both are provided
    const claudeTokenLimit = options.claudeLimit || options.largeRepoTokenLimitClaude;
    const gptTokenLimit = options.gptLimit || options.largeRepoTokenLimitGpt;

    // Update options object with resolved values
    if (claudeTokenLimit) {
      options.claudeTokenLimit = claudeTokenLimit;
    }
    if (gptTokenLimit) {
      options.gptTokenLimit = gptTokenLimit;
    }

    // Run the server with resolved options
    runServer(options, undefined);
  });

// Add the 'ls' subcommand
program
  .command('ls')
  .description('List all files that will be included in the codebase analysis')
  .option('--sort-by <type>', 'Sort by "size" or "path"', 'size')
  .option('-r, --reverse', 'Reverse sort order (ascending instead of descending)')
  .option('-d, --directory <dir>', 'Directory to analyze', '.')
  .action(async (options) => {
    // Import and run the list functionality
    const { listFiles } = await import('./list-files-cli.js');
    await listFiles(options);
  });

// Parse command line arguments
program.parse(process.argv);
