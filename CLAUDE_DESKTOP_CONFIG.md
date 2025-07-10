# Claude Desktop Configuration Examples

## stdio Mode with Docker (Recommended)

Add this to your Claude Desktop configuration file:

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
        "-v",
        "/Users/yourname/projects:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
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
        "-v",
        "C:\\Users\\yourname\\projects:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
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
        "run",
        "--rm",
        "-i",
        "-v",
        "/Users/yourname/project1:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
      ]
    },
    "coco-project2": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/Users/yourname/project2:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:main",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
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
        "run",
        "--rm",
        "-i",
        "-v",
        "/Users/yourname/test-project:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "-e",
        "NODE_ENV=development",
        "ghcr.io/khromov/coco:main",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
      ]
    }
  }
}
```

## Local Build Configuration

If you've built Coco locally:

```json
{
  "mcpServers": {
    "coco-local": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/path/to/your/project:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "coco-mcp:latest",
        "node",
        "/opt/mcp-server/dist/index.js",
        "--stdio"
      ]
    }
  }
}
```

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
4. **Check Logs**: If something isn't working, check Docker logs: `docker logs <container-id>`
