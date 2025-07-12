# 🥥 Context Coder MCP (aka. Coco)

Context Coder provides AI models with full-context awareness of entire codebases through the Model Context Protocol. Context Coder's `get_codebase` command creates a merged representation of your entire project structure, giving AI assistants the complete context they need to write better code that fits your existing patterns and architecture.

## Quick Start

Context Coder comes in two modes:

- **Mini Mode (default)**: Provides codebase analysis tools only (`get_codebase`, `get_codebase_size`, etc.)
- **Full Mode**: Includes all file operation tools (`read_file`, `write_file`, `create_directory`, etc.)

### Mini Mode (Recommended)

For codebase analysis only:

```bash
npx context-coder
```

### Full Mode

For complete file system operations:

```bash
npx context-coder --full
```

### MCP Client Configuration

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "context-coder": {
      "command": "npx",
      "args": ["context-coder"]
    }
  }
}
```

For full mode:

```json
{
  "mcpServers": {
    "context-coder": {
      "command": "npx",
      "args": ["context-coder", "--full"]
    }
  }
}
```

## Available Versions

- **Context Coder (npm package)**: Available via `npx context-coder` 
  - Mini mode (default): Codebase analysis tools only
  - Full mode (`--full` flag): Complete file system operations
- **Coco Docker Images**: Docker-based versions for containerized deployment
  - **Coco (Full)**: Complete file system operations with all tools
  - **Coco Mini**: Lightweight version with only essential codebase analysis tools

## Getting started

### Method 1: NPX (Recommended)

Use the npm package directly with npx:

```json
{
  "mcpServers": {
    "context-coder": {
      "command": "npx",
      "args": ["context-coder"]
    }
  }
}
```

Add this to your Claude Desktop configuration, then restart Claude Desktop. Context Coder will run in stdio mode automatically.

### Method 2: Claude Desktop + Docker

<details>
<summary>Setup instructions</summary>

Create a `docker-compose.yml` file in the project(s) you want to work on.

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco:full
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

Then add to Claude Desktop config and restart Claude Desktop afterwards:

```json
{
  "mcpServers": {
    "coco": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3001/mcp"]
    }
  }
}
```

**Recommended setup and starting prompt**: Create a Claude Project and add this to your project instructions:

```
Use the Coco MCP to edit files. Remember that partial edits are not allowed, always write out the edited files in full through the MCP. You MUST call the get_codebase_size and get_codebase MCP tools at the start of every new chat. Do not call read_file, as you already have the codebase via get_codebase - use this reference instead. Do not create any artifacts unless the user asks for it, just call the write_file tool directly with the updated code.
```

Since `docker-compose up` already knows which folder it's running in, we can easily switch between projects by launching `docker-compose up` in different directories.

</details>

### Method 3: Claude Code

<details>
<summary>Setup instructions</summary>

**Option A: NPX (Recommended)**

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "context-coder": {
      "command": "npx",
      "args": ["context-coder"]
    }
  }
}
```

**Option B: Direct Docker**

Create `.mcp.json` in your project root:

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
        "./:/app",
        "-w",
        "/app",
        "-e",
        "MCP_TRANSPORT=stdio",
        "ghcr.io/khromov/coco:mini"
      ]
    }
  }
}
```

**Option C: Via HTTP + mcp-remote**

For [Claude Code](https://claude.ai/code), create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "coco": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:3001/mcp"
      ],
      "env": {}
    }
  }
}
```

And create `docker-compose.yml`:

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco:mini
    ports:
      - "3001:3001"
    volumes:
      - ./:/app
    working_dir: /app
    environment:
      - MCP_TRANSPORT=http
    restart: unless-stopped
```

Start Coco with `docker-compose up` and Claude Code will automatically connect.

*The reason for using the `mini` build is that Claude Code already comes with file editing tools built-in.*

**Recommended starting prompt**: Add this at the start of your `CLAUDE.md` file.

```
You have access to both Claude Code's built-in file tools and the Coco MCP for enhanced codebase analysis. Follow this workflow:

1. ALWAYS start every new chat by calling get_codebase_size and get_codebase MCP tools to ingest and understand the full project context
2. Use Coco's codebase analysis as your primary reference - avoid reading files since you already have the complete codebase, only read file if you are missing something or if the user specifically requests it.
3. Remember: Coco gives you full codebase context, Claude Code gives you precise editing control - use both strategically
```

</details>

## Configuration

<details>
<summary>Volume Mounts and Environment Variables</summary>

### Volume Mounts

Mount a specific directory:

```yaml
volumes:
  - ./src:/app # Only expose src directory
```

### Environment Variables

- `COCO_DEV`: "true" or "false" to mount the `./mount` folder instead of using `/app`
- `MCP_TRANSPORT`: Set to `stdio` or `http` (default: `http`)
- `PORT`: Override default port 3001 (HTTP mode only)

</details>

## Available Tools

| Tool                                | Purpose                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`get_codebase_size`**             | **Check codebase size and token counts - LLMs should call this first to ensure codebase isn't too large** |
| **`get_codebase`**                  | **Generate AI-digestible summary of entire codebase (paginated) - Call after checking size**              |
| `get_codebase_top_largest_files`    | Get top X largest files in codebase - helpful for identifying files to add to .cocoignore                |
| `read_file`                         | Read file contents (only use when specifically asked to re-read or for debugging)                         |
| `write_file`                        | Create or overwrite files                                                                                 |
| `create_directory`                  | Create directories                                                                                        |
| `list_directory`                    | List directory contents (only use when specifically asked or for debugging)                               |
| `directory_tree`                    | Get directory structure as JSON (only use when specifically asked or for debugging)                       |
| `move_file`                         | Move or rename files                                                                                      |
| `search_files`                      | Search by pattern                                                                                         |
| `execute_command`                   | Run shell commands                                                                                        |

All file operations use relative paths starting with `./`. Parent directory access (`../`) is blocked.

## Development

<details>
<summary>Development setup and commands</summary>

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

</details>

## Docker Build

<details>
<summary>Docker build instructions</summary>

Build both versions:

```bash
./build-all.sh
```

Or build individually:

```bash
# Full version
docker build -t coco:latest .

# Mini version
docker build --target release-mini --build-arg BUILD_TYPE=mini -t coco:mini .
```

Build a custom image:

```dockerfile
FROM ghcr.io/khromov/coco:full
# Add customizations
```

Or build from source:

```bash
docker build -t my-coco .
```

</details>

## Protocol

Coco implements the MCP specification with support for both transport modes:

- **stdio mode**: Direct communication via stdin/stdout
- **HTTP mode**: Streamable HTTP transport with session management via `mcp-session-id` header

## Security

File system access is restricted to the mounted directory. Operations that would escape the sandbox are rejected. The server validates all paths and blocks directory traversal attempts.

## Troubleshooting

<details>
<summary>Common issues and solutions</summary>

### stdio Mode Issues

- Ensure Docker is running with `-i` flag (interactive)
- Check that volume paths are absolute
- Logs go to stderr and won't interfere with stdio communication

### HTTP Mode Issues

- Verify port 3001 is not in use
- Check Docker logs: `docker-compose logs`
- Ensure `mcp-session-id` header is preserved by any proxies

</details>

## License

MIT
