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
#
# IMPORTANT: In stdio mode, stdout is reserved for MCP protocol messages only
# All log messages must go to stderr

if [ "$MCP_TRANSPORT" = "stdio" ]; then
  # In stdio mode, all logs MUST go to stderr to avoid breaking the protocol
  exec node /opt/mcp-server/dist/index.js --stdio
else
  # HTTP mode can log normally
  echo "Starting Coco MCP in HTTP mode (port ${PORT:-3001})..." >&2
  exec node /opt/mcp-server/dist/index.js
fi
