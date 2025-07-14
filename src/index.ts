#!/usr/bin/env node

import logger from './logger.js';

// Parse command line arguments
const isFullMode = process.argv.includes('--full');
const transportMode = process.env.MCP_TRANSPORT || 
  (process.argv.includes('--http') ? 'http' : 'stdio');

// Set the mode globally for other modules to access
process.env.CONTEXT_CODER_MODE = isFullMode ? 'full' : 'mini';

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
