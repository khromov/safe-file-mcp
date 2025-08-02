import { HttpTransport } from '@tmcp/transport-http';
import express, { Request, Response } from 'express';
import { createServer } from './mcp.js';
import logger from './logger.js';
import { getVersion } from './lib/version.js';

const buildType = process.env.COCO_BUILD_TYPE || 'none';
const mode = process.env.CONTEXT_CODER_MODE || 'mini';
const version = getVersion();
logger.info(
  `Starting 🥥 Coco MCP Server v${version} (HTTP) using build type ${buildType} (${mode} mode)`
);

// Store server instance globally for health check
let serverInstance: any = null;

// Export function to start the server
export async function startHttpServer(port?: number): Promise<void> {
  const PORT = port || process.env.COCO_PORT || 3001;
  
  const app = express();

  // Create the MCP server
  const { server, cleanup } = await createServer();
  serverInstance = server;

  // Create HTTP transport
  const transport = new HttpTransport(server);

  // Main MCP endpoint - delegate all /mcp requests to tmcp transport
  app.all('/mcp*', async (req: Request, res: Response) => {
    logger.debug(`Received MCP ${req.method} request to ${req.path}`);
    
    try {
      const response = await transport.respond(req);
      
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
      
      // Return the response from tmcp
      return response;
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
