import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import { visualizer } from 'rollup-plugin-visualizer';
import { spawn } from 'child_process';
// import preserveShebang from 'rollup-plugin-preserve-shebang';

// Custom plugin to run server after build in watch mode
function runServerPlugin() {
  let serverProcess = null;
  
  return {
    name: 'run-server',
    writeBundle() {
      // Only run in watch mode
      if (!this.meta.watchMode) return;
      
      // Kill existing server process
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
      }
      
      // Start new server process
      console.log('🔄 Restarting server...');
      const serverArgs = process.env.ROLLUP_SERVER_ARGS ? process.env.ROLLUP_SERVER_ARGS.split(' ') : [];
      serverProcess = spawn('node', ['dist/index.js', ...serverArgs], {
        stdio: 'inherit',
        env: {
          ...process.env,
          COCO_DEV: 'true',
          COCO_PORT: process.env.COCO_PORT || '3002',
        },
      });
      
      // Handle server process exit
      serverProcess.on('exit', (code, signal) => {
        if (signal !== 'SIGTERM') {
          console.log(`Server exited with code ${code}, signal ${signal}`);
        }
      });
    },
    
    // Clean up on rollup exit
    buildEnd() {
      if (serverProcess && this.meta.watchMode) {
        process.on('exit', () => {
          if (serverProcess) {
            serverProcess.kill('SIGTERM');
          }
        });
        
        process.on('SIGINT', () => {
          if (serverProcess) {
            serverProcess.kill('SIGTERM');
          }
          process.exit(0);
        });
      }
    }
  };
}

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
    // Only keep Node.js built-ins as external - bundle all npm dependencies
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
    
    // Node.js module imports with extensions
    /^node:/,
  ],
  plugins: [
    // Note: Using banner in output config instead of preserveShebang to avoid duplication
    
    // Run server after build in watch mode
    runServerPlugin(),
    
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
    
    // Bundle analyzer - generates stats.html for bundle visualization
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
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