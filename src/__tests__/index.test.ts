import { describe, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

describe('index.ts refactoring verification', () => {
  it('should contain startHttpServer and startStdioServer function calls', async () => {
    // Read the source file to verify our refactoring
    const indexPath = path.join(process.cwd(), 'src', 'index.ts');
    const indexContent = await fs.readFile(indexPath, 'utf-8');

    // Verify that we're calling the exported functions instead of relying on import side effects
    expect(indexContent).toContain('startHttpServer(serverPort)');
    expect(indexContent).toContain('startStdioServer()');

    // Verify we're not overriding process.env.COCO_PORT
    expect(indexContent).not.toContain('process.env.COCO_PORT = options.port');

    // Verify we store the port locally instead
    expect(indexContent).toContain('const serverPort = options.port');
  });

  it('should verify stdio module exports startStdioServer', async () => {
    // Read the stdio source file to verify our refactoring
    const stdioPath = path.join(process.cwd(), 'src', 'stdio.ts');
    const stdioContent = await fs.readFile(stdioPath, 'utf-8');

    // Verify we export the function instead of executing on import
    expect(stdioContent).toContain('export async function startStdioServer');

    // Verify we don't have the old immediate execution
    expect(stdioContent).not.toContain('runStdioServer()');
  });

  it('should verify streamableHttp module exports startHttpServer', async () => {
    // Read the HTTP source file to verify our refactoring
    const httpPath = path.join(process.cwd(), 'src', 'streamableHttp.ts');
    const httpContent = await fs.readFile(httpPath, 'utf-8');

    // Verify we export the function
    expect(httpContent).toContain('export async function startHttpServer');

    // Verify the function accepts optional port parameter
    expect(httpContent).toContain('port?: number');
  });
});
