# 🥥 Coco - Context Coder MCP

Coco provides secure file system access to AI models through the Model Context Protocol. It enables AI assistants to read, write, and analyze code within a designated directory while enforcing security boundaries.

## Installation

Run Coco using Docker Compose by adding this to a `docker-compose.yml` file:

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco:latest
    ports:
      - "3001:3001"
    volumes:
      - ./:/app
    working_dir: /app
```

Start the service:
```bash
docker-compose up
```

The MCP endpoint will be available at `http://localhost:3001/mcp`.

You should now add it to Claude Desktop or any other LLM tool you have. 

#### Claude Desktop instructions

TODO

## Configuration

Mount a specific directory:
```yaml
volumes:
  - ./src:/app  # Only expose src directory
```

Use a different port:
```yaml
ports:
  - "8080:3001"  # Available at localhost:8080
```

Environment variables:
- `NODE_ENV`: Set to `production` (default) or `development`
- `PORT`: Override default port 3001

## Available Tools

| Tool | Purpose |
|------|---------|
| `read_root_directory` | List contents of the root directory |
| `read_file` | Read file contents |
| `read_multiple_files` | Batch read multiple files |
| `write_file` | Create or overwrite files |
| `create_directory` | Create directories |
| `list_directory` | List directory contents |
| `list_directory_with_sizes` | List with file sizes |
| `directory_tree` | Get directory structure as JSON |
| `move_file` | Move or rename files |
| `search_files` | Search by pattern |
| `get_file_info` | Get file metadata |
| `execute_command` | Run shell commands |
| `get_codebase` | Generate code summary (paginated) |

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