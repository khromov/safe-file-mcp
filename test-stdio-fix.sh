#!/bin/bash

# Test script to verify stdio mode works without stdout pollution

echo "Testing Coco MCP stdio mode fix..."
echo "=================================="
echo

# First, build the Docker image locally
echo "Building Docker image..."
docker build -t coco-mcp-test . || {
    echo "Failed to build Docker image"
    exit 1
}

# Create a test MCP request
cat > test-mcp-request.json << 'EOF'
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}
EOF

# Run the container and send the test request
echo
echo "Testing stdio communication..."
echo "Sending initialization request..."
echo

# Run docker with the test request
response=$(cat test-mcp-request.json | docker run --rm -i \
    -v "$(pwd):/app" \
    -w /app \
    -e MCP_TRANSPORT=stdio \
    coco-mcp-test \
    node /opt/mcp-server/dist/index.js --stdio 2>/dev/null | head -n 1)

# Check if we got a valid JSON response
if echo "$response" | jq . > /dev/null 2>&1; then
    echo "✅ Success! Got valid JSON response:"
    echo "$response" | jq .
    echo
    echo "The stdio mode is now working correctly without stdout pollution."
else
    echo "❌ Failed! Response is not valid JSON:"
    echo "$response"
    echo
    echo "There may still be stdout pollution issues."
    exit 1
fi

# Clean up
rm -f test-mcp-request.json

echo
echo "Test complete!"
