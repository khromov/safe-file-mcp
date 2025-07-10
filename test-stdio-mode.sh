#!/bin/bash

# Example script to test Coco MCP in stdio mode
# This demonstrates how the stdio transport works

echo "Testing Coco MCP stdio mode..."
echo "================================"

# Build the project first
echo "Building project..."
npm run build

# Create a test directory if it doesn't exist
mkdir -p test-workspace
cd test-workspace

# Create some test files
echo "Creating test files..."
echo "console.log('Hello from test file');" > test.js
echo "# Test Project" > README.md
mkdir -p src
echo "export const version = '1.0.0';" > src/version.ts

# Run Coco in stdio mode and send MCP commands
echo "Running Coco in stdio mode..."
echo ""
echo "Sending initialization request..."

# Example of MCP communication via stdio
# Note: In real usage, an MCP client would handle this protocol
cat << 'EOF' | MCP_TRANSPORT=stdio node ../dist/index.js --stdio
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-01","clientInfo":{"name":"test-client","version":"1.0.0"},"capabilities":{}},"id":1}
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_codebase_size","arguments":{"path":"./"}},"id":3}
{"jsonrpc":"2.0","method":"close","params":{},"id":4}
EOF

echo ""
echo "Test complete!"
echo ""
echo "To use with Claude Desktop, add this to your config:"
echo '
{
  "mcpServers": {
    "coco": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "'$(pwd)':/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
'

# Clean up
cd ..
# rm -rf test-workspace
