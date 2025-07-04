# 🥥 Coco - Context Coder

**Coco** (Context Coder) is an MCP server that provides secure file system operations and code analysis capabilities to AI models. It enables AI assistants to safely read, write, and analyze code within your project directory.

## Quick Start

Add Coco to your project using Docker Compose:

### 1. Create a `docker-compose.yml` file in your project root:

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco-context-coder:latest
    ports:
      - "3001:3001"
    volumes:
      - ./:/app
    working_dir: /app
    environment:
      - NODE_ENV=production
```

### 2. Start Coco:

```bash
docker-compose up -d coco
```

### 3. Configure your AI tool to connect to Coco:

The server will be available at `http://localhost:3001/mcp`

## What Coco Provides

Coco gives AI models the ability to:

- 📁 **Browse files** - Navigate and explore your project structure
- 📄 **Read files** - Access file contents individually or in batches
- ✏️ **Write files** - Create or modify files with atomic operations
- 🔍 **Search** - Find files matching patterns across your codebase
- 📊 **Analyze code** - Generate comprehensive codebase summaries using ai-digest
- 🖥️ **Execute commands** - Run shell commands with timeout protection
- 📂 **Manage directories** - Create, move, and organize project structure

## Security Features

- 🔒 All operations are restricted to your mounted directory
- 🚫 Parent directory access (`../`) is blocked
- ⚛️ Atomic file operations prevent corruption
- ⏱️ Command execution has built-in timeouts

## Available Tools

| Tool | Description |
|------|-------------|
| `read_root_directory` | Start here - lists all files in your project |
| `read_file` | Read a single file's contents |
| `read_multiple_files` | Read multiple files efficiently |
| `write_file` | Create or overwrite a file |
| `create_directory` | Create new directories |
| `list_directory` | List directory contents with type indicators |
| `list_directory_with_sizes` | List with file sizes and sorting options |
| `directory_tree` | Get full project structure as JSON |
| `move_file` | Move or rename files and directories |
| `search_files` | Search for files by pattern |
| `get_file_info` | Get detailed file metadata |
| `execute_command` | Run shell commands safely |
| `get_codebase` | Generate AI-friendly codebase summary (paginated) |

## Advanced Configuration

### Custom Port

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco-context-coder:latest
    ports:
      - "8080:3001"  # Map to port 8080 on host
    volumes:
      - ./:/app
```

### Mount Specific Directory

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco-context-coder:latest
    ports:
      - "3001:3001"
    volumes:
      - ./src:/app  # Only mount src directory
    working_dir: /app
```

### With Other Services

```yaml
services:
  coco:
    image: ghcr.io/khromov/coco-context-coder:latest
    ports:
      - "3001:3001"
    volumes:
      - ./:/app
    networks:
      - dev-network

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    networks:
      - dev-network

networks:
  dev-network:
    driver: bridge
```

## Usage Tips

1. **Always start with `read_root_directory`** to understand the project structure
2. **Use relative paths** starting with `./` for all file operations
3. **Use `get_codebase`** for comprehensive code analysis (results are paginated)
4. **Batch operations** with `read_multiple_files` for better performance

## Path Examples

- Root directory: `./`
- File in root: `./package.json`
- Subdirectory: `./src/`
- Nested file: `./src/components/Button.tsx`

## Building Custom Image

If you want to extend Coco:

```dockerfile
FROM ghcr.io/khromov/coco-context-coder:latest

# Add your customizations here
```

## Troubleshooting

### Permission Issues
Ensure the mounted directory has appropriate read/write permissions:
```bash
chmod -R 755 ./your-project
```

### Connection Refused
Check if the port is already in use:
```bash
lsof -i :3001
```

### View Logs
```bash
docker-compose logs -f coco
```

## About the Name

**Coco** stands for **Co**ntext **Co**der - it provides rich context about your code to AI models while maintaining security and control over file system access.

## License

MIT License - See LICENSE file for details
