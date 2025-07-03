# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MCP "Everything" Server - Development Guidelines

## Build, Test & Run Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript and copies instructions.md to dist/
- Watch mode: `npm run watch` - Watches for changes and rebuilds automatically  
- Run server: `npm run start` - Starts the MCP server using streamable HTTP transport
- Development: `npm run dev` - Starts the server with auto-restart on code changes (uses nodemon)

## Architecture Overview

This is a comprehensive MCP (Model Context Protocol) server that implements all protocol features for testing and demonstration purposes. The server uses streamable HTTP transport exclusively.

### Core Components
- `everything.ts` - Main server implementation with all MCP features (tools, resources, prompts, sampling)
- `index.ts` - Entry point that starts the streamable HTTP server
- `streamableHttp.ts` - Streamable HTTP transport with session management
- `mcp.ts` - File system operations server with relative path support

### File System Access
- **All file operations use relative paths starting with `./`**
- In development mode: `./` maps to the local `./mount` directory
- In production (Docker): `./` maps to the mounted volume at `/app/mount`
- First operation should always be `read_root_directory` to understand available files

### Transport Architecture
The server uses streamable HTTP transport providing:
- Modern HTTP with streaming capabilities
- Session resumability
- WebSocket-like bidirectional communication over HTTP

### MCP Protocol Implementation
- **Tools**: 13 file system tools + echo tool
  - `read_root_directory` - Lists root directory contents (call this first!)
  - `read_file` - Read file contents with optional head/tail
  - `write_file` - Create or overwrite files
  - `edit_file` - Make line-based edits with diff preview
  - `create_directory` - Create directories
  - `list_directory` - List directory contents
  - `list_directory_with_sizes` - List with file sizes
  - `directory_tree` - Get JSON tree structure
  - `move_file` - Move or rename files
  - `search_files` - Recursive file search
  - `get_file_info` - Get file metadata
  - And more...
- **Prompts**: 1 prompt - complex_prompt (demonstrates argument handling)

## Code Style Guidelines
- Use ES modules with `.js` extension in import paths
- Strictly type all functions and variables with TypeScript
- Follow zod schema patterns for tool input validation
- Prefer async/await over callbacks and Promise chains
- Place all imports at top of file, grouped by external then internal
- Use descriptive variable names that clearly indicate purpose
- Implement proper cleanup for timers and resources in server shutdown
- Follow camelCase for variables/functions, PascalCase for types/classes, UPPER_CASE for constants
- Handle errors with try/catch blocks and provide clear error messages
- Use consistent indentation (2 spaces) and trailing commas in multi-line objects

## Key Dependencies
- `@modelcontextprotocol/sdk` - Core MCP protocol implementation
- `zod` - Schema validation for tool inputs
- `express` - HTTP server for SSE and streamable HTTP transports
- `zod-to-json-schema` - Convert zod schemas to JSON schema format
- `diff` - Create unified diffs for file edits
- `minimatch` - Pattern matching for file searches

## Server Features
- Relative path enforcement (all paths must start with `./`)
- Secure file operations with validation
- Memory-efficient head/tail file reading
- Atomic file writes to prevent corruption
- Git-style diff generation for file edits
- Recursive directory tree generation
- Pattern-based file search with exclusions
- Session management for HTTP transports

## Testing Notes
- Development mode uses `./mount` directory as root
- Production mode uses Docker mounted volume as root
- All paths are validated to prevent directory traversal
- No formal test suite - this is a demo/testing server for MCP protocol features

## Package Information
- Published as `@modelcontextprotocol/server-everything`
- Binary executable: `mcp-server-everything`
- Can be run via npx without installation: `npx -y @modelcontextprotocol/server-everything`
- Only supports streamable HTTP transport (runs on HTTP server by default)