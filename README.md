# 🥥 Coco - Context Coder MCP

Coco provides AI models with full-context awareness of entire codebases through the Model Context Protocol. Unlike traditional file-access tools that require reading files one by one, Coco's `get_codebase` command instantly digests and understands your entire project structure, giving AI assistants the complete context they need to write better code that fits your existing patterns and architecture.

## Installation

Coco supports two transport modes:

- **HTTP mode** (recommended as default): For remote connections and multiple clients
- **stdio mode** (less convenient): For better stability with Claude Desktop

### Method 1: Docker with stdio Mode (Recommended for Claude Desktop)

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Important note: You need to manually replace `/Users/YOUR_USERNAME/GitHub/YOUR_REPO` with your project path every time you want to switch projects.**

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
        "/Users/YOUR_USERNAME/GitHub/YOUR_REPO:/app",
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

### Method 2: Docker Compose with HTTP Mode

Create a `docker-compose.yml` file in the project(s) you want to work on.

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco:latest
    ports:
      - '3001:3001'
    volumes:
      - ./:/app
    working_dir: /app
```

Start the service:

```bash
docker-compose up
```

Then add to Claude Desktop config:

```json
{
  "mcpServers": {
    "coco": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Since `docker-compose up` already knows which folder it's running in, we can easily switch between projects by launching `docker-compose up` in different directories.

## Configuration

### Volume Mounts

Mount a specific directory:

```yaml
volumes:
  - ./src:/app # Only expose src directory
```

### Environment Variables

- `NODE_ENV`: Set to `production` (default) or `development`
- `MCP_TRANSPORT`: Set to `stdio` or `http` (default: `http`)
- `PORT`: Override default port 3001 (HTTP mode only)

## Available Tools

| Tool                    | Purpose                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| **`get_codebase_size`** | **Check codebase size and token counts - LLMs should call this first to ensure codebase isn't too large** |
| **`get_codebase`**      | **Generate AI-digestible summary of entire codebase (paginated) - Call after checking size**              |
| `read_file`             | Read file contents (only use when specifically asked to re-read or for debugging)                         |
| `write_file`            | Create or overwrite files                                                                                 |
| `create_directory`      | Create directories                                                                                        |
| `list_directory`        | List directory contents (only use when specifically asked or for debugging)                               |
| `directory_tree`        | Get directory structure as JSON (only use when specifically asked or for debugging)                       |
| `move_file`             | Move or rename files                                                                                      |
| `search_files`          | Search by pattern                                                                                         |
| `execute_command`       | Run shell commands                                                                                        |

All file operations use relative paths starting with `./`. Parent directory access (`../`) is blocked.

## Development

Clone and install dependencies:

```bash
npm install
```

Build and run:

```bash
npm run build
npm start  # HTTP mode
npm start -- --stdio  # stdio mode
```

Development mode with auto-reload:

```bash
npm run dev
```

In development mode, file operations are sandboxed to the `./mount` directory.

## Docker Build

Build a custom image:

```dockerfile
FROM ghcr.io/khromov/coco:latest
# Add customizations
```

Or build from source:

```bash
docker build -t my-coco .
```

## Protocol

Coco implements the MCP specification with support for both transport modes:

- **stdio mode**: Direct communication via stdin/stdout
- **HTTP mode**: Streamable HTTP transport with session management via `mcp-session-id` header

## Security

File system access is restricted to the mounted directory. Operations that would escape the sandbox are rejected. The server validates all paths and blocks directory traversal attempts.

## Troubleshooting

### stdio Mode Issues

- Ensure Docker is running with `-i` flag (interactive)
- Check that volume paths are absolute
- Logs go to stderr and won't interfere with stdio communication

### HTTP Mode Issues

- Verify port 3001 is not in use
- Check Docker logs: `docker-compose logs`
- Ensure `mcp-session-id` header is preserved by any proxies

## License

MIT
