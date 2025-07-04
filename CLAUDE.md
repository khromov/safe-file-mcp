# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🥥 Coco MCP Server - Development Guidelines

## Build, Test & Run Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript and copies instructions.md to dist/
- Watch mode: `npm run watch` - Watches for changes and rebuilds automatically  
- Run server: `npm run start` - Starts the MCP server using streamable HTTP transport
- Development: `npm run dev` - Starts the server with auto-restart on code changes (uses nodemon)

## Architecture Overview

🥥 Coco (Context Coder) is a comprehensive MCP (Model Context Protocol) server that implements file system operations with secure relative path handling. The server uses streamable HTTP transport exclusively and is designed to provide AI models with safe, controlled access to file system context.

### Core Components
- `mcp.ts` - Main MCP server implementation with file system tools
- `index.ts` - Entry point that starts the streamable HTTP server
- `streamableHttp.ts` - Streamable HTTP transport with session management
- `file-operations.ts` - File system utilities and operations
- `types.ts` - TypeScript type definitions
- `codebase-digest.ts` - AI-digest integration for codebase summarization

### Transport Architecture
The server uses streamable HTTP transport providing:
- Modern HTTP with streaming capabilities
- Session resumability
- WebSocket-like bidirectional communication over HTTP

### MCP Protocol Implementation
- **Tools**: 13 file system tools + get_codebase tool
- **Prompts**: 1 prompt - complex_prompt (demonstrates argument handling)

## File System Operations

All file operations use relative paths starting with "./":
- Root directory access: "./"
- Files in root: "./file.txt"
- Subdirectories: "./folder/file.txt"

In development mode, "./" transparently maps to the local "./mount" folder.
In production mode, "./" maps to the container's working directory.

## Code Style Guidelines
- Use ES modules with `.js` extension in import paths
- Strictly type all functions and variables with TypeScript
- Follow zod schema patterns for tool input validation
- Prefer async/await over callbacks and Promise chains
- Place all imports at top of file, grouped by external then internal
- Use descriptive variable names that clearly indicate purpose
- Implement proper cleanup for resources in server shutdown
- Follow camelCase for variables/functions, PascalCase for types/classes, UPPER_CASE for constants
- Handle errors with try/catch blocks and provide clear error messages
- Use consistent indentation (2 spaces) and trailing commas in multi-line objects

## Key Dependencies
- `@modelcontextprotocol/sdk` - Core MCP protocol implementation
- `zod` - Schema validation for tool inputs
- `express` - HTTP server for streamable HTTP transport
- `zod-to-json-schema` - Convert zod schemas to JSON schema format
- `minimatch` - Pattern matching for file searches
- `ignore` - Gitignore-style pattern matching
- `ai-digest` - Generate comprehensive codebase summaries

## Server Features
- Secure relative path handling (no absolute paths or parent directory access)
- Atomic file operations to prevent race conditions
- Memory-efficient file reading with paginated codebase digest
- Directory tree visualization
- File search with pattern matching and exclusions
- Detailed file metadata retrieval
- Command execution with timeout and environment control
- AI-digest integration for codebase understanding

## Testing Notes
- Start with `read_root_directory` to explore the file system
- All paths must be relative and start with "./"
- Parent directory references ("..") are blocked for security
- File operations include proper error handling and validation
- Use `get_codebase` for comprehensive code analysis

## Package Information
- Published as `@modelcontextprotocol/coco-context-coder`
- Binary executable: `coco-mcp-server`
- Can be run via npx without installation: `npx -y @modelcontextprotocol/coco-context-coder`
- Only supports streamable HTTP transport (runs on HTTP server by default)

## About 🥥 Coco
Coco (Context Coder) provides AI models with controlled, contextual access to codebases and file systems. The name reflects its dual purpose: providing rich context about code while maintaining security boundaries.
