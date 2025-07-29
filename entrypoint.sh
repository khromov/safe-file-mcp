#!/bin/sh

# Determine mode flag based on COCO_BUILD_TYPE
MODE_FLAG=""
if [ "$COCO_BUILD_TYPE" = "mini" ]; then
  MODE_FLAG="--mini"
elif [ "$COCO_BUILD_TYPE" = "full" ]; then
  MODE_FLAG="--full"
elif [ "$COCO_BUILD_TYPE" = "edit" ]; then
  MODE_FLAG="--full --edit-file-mode"
fi

if [ "$COCO_MCP_TRANSPORT" = "stdio" ]; then
  # In stdio mode, all logs MUST go to stderr to avoid breaking the protocol
  exec node /opt/mcp-server/dist/index.js --stdio $MODE_FLAG
else
  # HTTP mode can log normally
  echo "Starting Coco MCP in HTTP mode (port ${COCO_PORT:-3001})..." >&2
  exec node /opt/mcp-server/dist/index.js $MODE_FLAG "$@"
fi
