# 🥥 Coco - Context Coder MCP

Coco provides AI models with full-context awareness of entire codebases through the Model Context Protocol. Unlike traditional file-access tools that require reading files one by one, Coco's `get_codebase` command instantly digests and understands your entire project structure, giving AI assistants the complete context they need to write better code that fits your existing patterns and architecture.

## Installation

Run Coco using Docker Compose by adding this to a `docker-compose.yml` file:

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

The MCP endpoint will be available at `http://localhost:3001/mcp`.

### Claude Desktop Setup

1. Open Claude Desktop, go to **Settings** → **Developer** → **Edit Config**
2. Add this to your configuration file:

```json
{
  "mcpServers": {
    "coco": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

3. Restart Claude Desktop

The config file location:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## Configuration

Mount a specific directory:

```yaml
volumes:
  - ./src:/app # Only expose src directory
```

Use a different port:

```yaml
ports:
  - '8080:3001' # Available at localhost:8080
```

Environment variables:

- `NODE_ENV`: Set to `production` (default) or `development`
- `PORT`: Override default port 3001

## Available Tools

| Tool                | Purpose                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **`get_codebase_size`** | **Check codebase size and token counts - LLMs should call this first to ensure codebase isn't too large** |
| **`get_codebase`**  | **Generate AI-digestible summary of entire codebase (paginated) - Call after checking size**      |
| `read_file`         | Read file contents (only use when specifically asked to re-read or for debugging)                |
| `write_file`        | Create or overwrite files                                                                        |
| `create_directory`  | Create directories                                                                               |
| `list_directory`    | List directory contents (only use when specifically asked or for debugging)                      |
| `directory_tree`    | Get directory structure as JSON (only use when specifically asked or for debugging)              |
| `move_file`         | Move or rename files                                                                             |
| `search_files`      | Search by pattern                                                                                |
| `execute_command`   | Run shell commands                                                                               |

All file operations use relative paths starting with `./`. Parent directory access (`../`) is blocked.

## Development

Clone and install dependencies:

```bash
npm install
```

Build and run:

```bash
npm run build
npm start
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

Coco implements the MCP specification using streamable HTTP transport. Sessions are maintained via the `mcp-session-id` header. The server supports request/response patterns, server-sent events for streaming, and session resumability.

## Security

File system access is restricted to the mounted directory. Operations that would escape the sandbox are rejected. The server validates all paths and blocks directory traversal attempts.

## License

MIT