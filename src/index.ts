#!/usr/bin/env node

import logger from './logger.js';

// Parse command line arguments
// Default to "full" and "http" mode for npx context-coder command (Claude Desktop usage)
// Claude Code should use the `--mini` flag and `--stdio` flag to run in mini mode with stdio transport
const hasExplicitMiniMode = process.argv.includes('--mini');
const hasExplicitFullMode = process.argv.includes('--full');
const hasExplicitStdioMode = process.argv.includes('--stdio');

// Determine mode with proper priority:
// 1. Command line flags (--mini, --full)
// 2. BUILD_TYPE environment variable (for Docker builds)
// 3. Default to full (for npx usage)
let isFullMode = true; // Default to full

if (hasExplicitMiniMode) {
  isFullMode = false;
} else if (hasExplicitFullMode) {
  isFullMode = true;
} else if (process.env.BUILD_TYPE === 'mini') {
  isFullMode = false;
} else if (process.env.BUILD_TYPE === 'full') {
  isFullMode = true;
}

let transportMode = 'http'; // Default to http
if (process.env.MCP_TRANSPORT) {
  transportMode = process.env.MCP_TRANSPORT;
} else if (hasExplicitStdioMode) {
  transportMode = 'stdio';
}

// Set the mode globally for other modules to access
const mode = isFullMode ? 'full' : 'mini';
process.env.CONTEXT_CODER_MODE = mode;

// Log startup information
logger.info(`Current directory: ${process.cwd()}`);

async function run() {
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

run();
