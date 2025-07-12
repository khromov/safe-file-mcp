#!/usr/bin/env node

import logger from './logger.js';

const transportMode = process.env.MCP_TRANSPORT || 
  (process.argv.includes('--http') ? 'http' : 'stdio');

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
