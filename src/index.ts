#!/usr/bin/env node

import { program } from 'commander';
import logger from './logger.js';

// Get package.json for version
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let packageJson: any;
try {
  const packageJsonPath = join(__dirname, '..', 'package.json');
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
} catch (error) {
  // If package.json is not found, use a default version
  packageJson = { version: '1.0.5' };
}

// Async function to run the server
async function runServer(options: any, command: any) {
  // Determine mode based on command line flags
  // Default to full for npx usage, mini/full passed explicitly by Docker entrypoint
  let isFullMode = true; // Default to full

  if (options.mini) {
    isFullMode = false;
  } else if (options.full) {
    isFullMode = true;
  }

  let transportMode = 'http'; // Default to http
  if (process.env.MCP_TRANSPORT) {
    transportMode = process.env.MCP_TRANSPORT;
  } else if (options.stdio) {
    transportMode = 'stdio';
  }

  // Set the mode globally for other modules to access
  const mode = isFullMode ? 'full' : 'mini';
  process.env.CONTEXT_CODER_MODE = mode;

  // Log startup information
  logger.info(`Current directory: ${process.cwd()}`);

  try {
    if (transportMode === 'stdio') {
      await import('./stdio.js');
    } else {
      await import('./streamableHttp.js');
    }
  } catch (error) {
    logger.error('Error running server:', error);
    process.exit(1);
  }
}

// Configure the main program
program
  .version(packageJson.version)
  .name('context-coder')
  .description('Context Coder: MCP server for full-context coding')
  .option('--mini', 'run in mini mode (only core tools)')
  .option('--full', 'run in full mode (all tools)')
  .option('--stdio', 'use stdio transport instead of HTTP')
  .action(runServer);

// Add the 'ls' subcommand
program
  .command('ls')
  .description('List all files that will be included in the codebase analysis')
  .option('--sort-by <type>', 'Sort by "size" or "path"', 'size')
  .option('-r, --reverse', 'Reverse sort order (ascending instead of descending)')
  .option('--directory <dir>', 'Directory to analyze', '.')
  .action(async (options) => {
    // Import and run the list functionality
    const { listFiles } = await import('./list-files-cli.js');
    await listFiles(options);
  });

// Parse command line arguments
program.parse(process.argv);
