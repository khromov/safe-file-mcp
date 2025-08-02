import { HttpTransport } from '@tmcp/transport-http';
import express, { type Request, type Response } from 'express';
import { createServer } from './mcp.js';
import logger from './logger.js';
import { getVersion } from './lib/version.js';

const buildType = process.env.COCO_BUILD_TYPE || 'none';
const mode = process.env.CONTEXT_CODER_MODE || 'mini';
const version = getVersion();
logger.info(
  `Starting 🥥 Coco MCP Server v${version} (HTTP) using build type ${buildType} (${mode} mode)`
);

// Store server instance globally for health check and cleanup
let serverInstance: any = null;
let transport: HttpTransport | null = null;

// Export function to start the server
export async function startHttpServer(port?: number): Promise<void> {
  const PORT = port || process.env.COCO_PORT || 3001;

  const app = express();

  // Add JSON body parsing middleware for MCP requests
  app.use(express.json());

  // Create the MCP server
  const { server, cleanup } = await createServer();
  serverInstance = server;

  // Create HTTP transport
  transport = new HttpTransport(server);

  // Main MCP endpoint - delegate all /mcp requests to tmcp transport
  app.all('/mcp*', async (req: Request, res: Response) => {
    logger.debug(`Received MCP ${req.method} request to ${req.path}`);

    if (!transport) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Transport not initialized',
        },
        id: req?.body?.id,
      });
      return;
    }

    try {
      // Convert Express request to standard Request object
      const url = `http://localhost:${PORT}${req.path}`;
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        }
      });

      // Create a standard Request object
      const standardRequest = new globalThis.Request(url, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      // Get response from tmcp transport
      const response = await transport.respond(standardRequest);

      if (response === null) {
        // Transport couldn't handle this request
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found',
          },
          id: req?.body?.id,
        });
        return;
      }

      // Copy headers from Response to Express response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Set status code
      res.status(response.status);

      // Handle different response types
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE response - stream it
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(decoder.decode(value, { stream: true }));
            }
          } finally {
            reader.releaseLock();
          }
        }
        res.end();
      } else {
        // Regular JSON response
        const text = await response.text();
        res.send(text);
      }
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: req?.body?.id,
        });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: getVersion(),
      mode: mode,
      buildType: buildType,
      timestamp: new Date().toISOString(),
    });
  });

  // Start Express server
  const expressServer = app.listen(PORT, () => {
    logger.info(`🥥 Coco MCP Server listening on port ${PORT} (${mode} mode)`);
  });

  // Handle server shutdown
  const gracefulShutdown = async () => {
    logger.info('Shutting down 🥥 Coco server...');

    // Close Express server
    expressServer.close(() => {
      logger.info('Express server closed');
    });

    // Cleanup MCP server
    await cleanup();

    logger.info('🥥 Coco server shutdown complete');
    process.exit(0);
  };

  // Handle both SIGINT (Ctrl+C) and SIGTERM (Docker stop)
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}
