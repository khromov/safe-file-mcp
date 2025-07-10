#!/usr/bin/env node

import logger from './logger.js';

// Determine transport mode from environment variable or command-line argument
const transportMode = process.env.MCP_TRANSPORT || 
  (process.argv.includes('--stdio') ? 'stdio' : 'http');

async function run() {
  try {
    if (transportMode === 'stdio') {
      // Import and run the stdio server
      // In stdio mode, no logs should go to stdout
      await import('./stdio.js');
    } else {
      // Import and run the streamable HTTP server
      await import('./streamableHttp.js');
    }
  } catch (error) {
    logger.error('Error running server:', error);
    process.exit(1);
  }
}

run();
