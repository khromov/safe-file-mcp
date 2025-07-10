#!/bin/sh

if [ "$MCP_TRANSPORT" = "stdio" ]; then
  # In stdio mode, all logs MUST go to stderr to avoid breaking the protocol
  exec node /opt/mcp-server/dist/index.js --stdio
else
  # HTTP mode can log normally
  echo "Starting Coco MCP in HTTP mode (port ${PORT:-3001})..." >&2
  exec node /opt/mcp-server/dist/index.js "$@"
fi
