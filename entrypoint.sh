#!/bin/sh

# Entrypoint script for Coco MCP Docker container
# Handles both stdio and HTTP transport modes
#
# Environment variables:
#   MCP_TRANSPORT - Set to "stdio" for stdio mode, anything else defaults to HTTP mode
#
# Usage:
#   This script is automatically used as the Docker entrypoint
#   It determines the transport mode and starts the appropriate server

if [ "$MCP_TRANSPORT" = "stdio" ]; then
  echo "Starting Coco MCP in stdio mode..." >&2
  exec node /opt/mcp-server/dist/index.js --stdio
else
  echo "Starting Coco MCP in HTTP mode (port ${PORT:-3001})..." >&2
  exec node /opt/mcp-server/dist/index.js
fi
