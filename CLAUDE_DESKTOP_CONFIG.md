# Claude Desktop Configuration Examples

## stdio Mode with Docker (Fixed)

The stdio mode has been fixed to ensure no stdout pollution. All log messages now go to stderr, leaving stdout exclusively for MCP protocol messages.

### macOS/Linux Example

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "coco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "/Users/yourname/projects:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
```

### Windows Example

Location: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "C:\\Users\\yourname\\projects:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
```

## Local Build Example (For Testing)

If you've built the image locally with the fixes:

```json
{
  "mcpServers": {
    "coco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "/path/to/your/project:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "coco-mcp:latest",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
```

## Multiple Project Configuration

You can configure multiple Coco instances for different projects:

```json
{
  "mcpServers": {
    "coco-project1": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/Users/yourname/project1:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    },
    "coco-project2": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/Users/yourname/project2:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
```

## Development Mode Configuration

For development/testing with the mount directory:

```json
{
  "mcpServers": {
    "coco-dev": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/Users/yourname/test-project:/app",
        "-w", "/app",
        "-e", "MCP_TRANSPORT=stdio",
        "-e", "NODE_ENV=development",
        "ghcr.io/khromov/coco:main",
        "node", "/opt/mcp-server/dist/index.js", "--stdio"
      ]
    }
  }
}
```

## Troubleshooting

### "Expected ',' or ']' after array element in JSON" Error

If you see this error, it means there's stdout pollution. This has been fixed in the latest version. Make sure you:

1. Use the latest image or rebuild locally
2. Ensure `MCP_TRANSPORT=stdio` is set
3. All logs should go to stderr (they won't interfere with the protocol)

### Viewing Logs

Since all logs go to stderr in stdio mode, you can still see them in Claude Desktop's developer console or by running the container manually:

```bash
docker run --rm -i \
  -v "/path/to/project:/app" \
  -w /app \
  -e MCP_TRANSPORT=stdio \
  ghcr.io/khromov/coco:main \
  node /opt/mcp-server/dist/index.js --stdio \
  2>coco-debug.log
```

Then check `coco-debug.log` for debug output.

## HTTP Mode Configuration (Alternative)

If you prefer the HTTP mode:

```json
{
  "mcpServers": {
    "coco-http": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Note: You'll need to have the Docker container running separately:
```bash
docker-compose up
```

## Tips

1. **Path Format**: Always use absolute paths for volume mounts
2. **Multiple Projects**: Create separate MCP server entries for different projects
3. **Restart Claude**: After updating the config, restart Claude Desktop
4. **Check Logs**: Logs now go to stderr and won't interfere with stdio communication
5. **Test First**: Use the provided test script to verify stdio mode works before configuring Claude Desktop
