#!/usr/bin/env node

// Only streamableHttp transport is supported
async function run() {
  try {
    // Import and run the streamable HTTP server
    await import('./streamableHttp.js');
  } catch (error) {
    console.error('Error running server:', error);
    process.exit(1);
  }
}

run();
