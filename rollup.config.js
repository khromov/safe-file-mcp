import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
// import preserveShebang from 'rollup-plugin-preserve-shebang';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false,
    banner: '#!/usr/bin/env node',
    inlineDynamicImports: true,
  },
  external: [
    // Node.js built-ins
    'fs',
    'fs/promises',
    'path',
    'crypto',
    'child_process',
    'url',
    'util',
    'stream',
    'events',
    'buffer',
    'os',
    'http',
    'https',
    'net',
    'tls',
    'zlib',
    'querystring',
    'readline',
    'cluster',
    'worker_threads',
    'perf_hooks',
    'async_hooks',
    'dns',
    'dgram',
    'vm',
    'v8',
    'inspector',
    'repl',
    'tty',
    'domain',
    'punycode',
    'string_decoder',
    'timers',
    'console',
    'process',
    'global',
    '__dirname',
    '__filename',
    'module',
    'require',
    
    // External dependencies that should remain external
    '@modelcontextprotocol/sdk/server/index.js',
    '@modelcontextprotocol/sdk/types.js',
    '@modelcontextprotocol/sdk/server/stdio.js',
    '@modelcontextprotocol/sdk/server/streamableHttp.js',
    '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js',
    'ai-digest',
    'commander',
    'express',
    'ignore',
    'minimatch',
    'winston',
    'zod',
    'zod-to-json-schema',
    
    // Node.js module imports with extensions
    /^node:/,
  ],
  plugins: [
    // Note: Using banner in output config instead of preserveShebang to avoid duplication
    
    // Resolve node modules
    resolve({
      preferBuiltins: true,
      exportConditions: ['node'],
    }),
    
    // Convert CommonJS to ES modules
    commonjs(),
    
    // Handle JSON imports
    json(),
    
    // Compile TypeScript
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false,
      sourceMap: false,
    }),
    
    // Copy instructions.md to dist folder
    copy({
      targets: [
        { src: 'instructions.md', dest: 'dist' }
      ]
    }),
  ],
  
  // Suppress warnings about circular dependencies and mixed imports
  onwarn(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.code === 'MIXED_EXPORTS') return;
    if (warning.code === 'PREFER_NAMED_EXPORTS') return;
    
    // Use default for everything else
    warn(warning);
  },
};